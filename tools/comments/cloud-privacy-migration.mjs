// Controlled operator migration. Default: read-only. No keys, Auth/IAM/Rules changes.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {initializeApp,applicationDefault,deleteApp} from 'firebase-admin/app';
import {getFirestore,Timestamp,FieldPath} from 'firebase-admin/firestore';
import {decode,encode,COLLECTIONS,validateBackup} from '../../js/comments/backup-format.js';
import {sanitizeRestoreBackup} from '../../js/comments/restore-safety.js';
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
export const migrationDigest=v=>createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
const names=[...COLLECTIONS,'settings','control'];
export function approvedMigration(source,register){
 const errors=validateBackup(source);if(errors.length)throw Error(errors.join('; '));
 if(source.schemaVersion===3)throw Error('Source is already schema3; no legacy migration to apply');
 if(source.records.settings.comments.enabled!==false)throw Error('Source must have enabled:false');
 const safe=sanitizeRestoreBackup(source,register).backup;
 // Migration never doubles as deletion. Stop if register requires suppression.
 for(const[id,c]of Object.entries(source.records.comments)){const out={...safe.records.comments[id]};delete out.schemaVersion;const old={...c};delete old.authorUid;if(migrationDigest(old)!==migrationDigest(out))throw Error('Deletion register requires changes; migration stopped: comments/'+id);}
 const count=Object.keys(source.records.comments).length;
 if(count>200)throw Error('Atomic migration safety limit: at most 200 comments; do not split manually');
 const expected=structuredClone(source.records);expected.commentOwners??={};
 const target=structuredClone(safe.records);
 const changes=Object.keys(source.records.comments).sort().map(id=>({commentPath:'comments/'+id,privatePath:'commentOwners/'+id,status:source.records.comments[id].status}));
 const plan={projectId:source.projectId,sourceExportedAt:source.exportedAt,sourceDataSha256:migrationDigest(expected),registerSha256:migrationDigest(register),targetDataSha256:migrationDigest(target),counts:{comments:count,privateRecords:count},changes};
 return {plan:{...plan,planSha256:migrationDigest(plan)},expected,target};
}
async function inventory(db,expected,tx=null){
 const records={};for(const name of names){const count=Object.keys(expected[name]??{}).length;if(count>1000)throw Error('Collection safety limit exceeded');const q=db.collection(name).orderBy(FieldPath.documentId()).limit(count+1);const snap=await(tx?tx.get(q):q.get());records[name]=Object.fromEntries(snap.docs.map(d=>[d.id,encode(d.data())]));}
 return records;
}
function equal(actual,expected){if(migrationDigest(actual)!==migrationDigest(expected))throw Error('Cloud inventory differs from approved backup; STOP without migration');}
export async function runControlledMigration(db,source,register,{apply=false,planSha256=null,adminUid=null,confirmProject=null}={}){
 const {plan,expected,target}=approvedMigration(source,register);
 equal(await inventory(db,expected),expected);
 if(!apply)return {result:'PASS',dryRun:true,...plan};
 if(confirmProject!==source.projectId||planSha256!==plan.planSha256)throw Error('Explicit project and approved plan SHA-256 required');
 if(!adminUid||expected.admins[adminUid]?.role!=='admin')throw Error('Existing verified administrator UID required; no administrator is created');
 const frozen=structuredClone(expected);frozen.control.state={frozen:true,ownerUid:adminUid};
 // Acquire only an unlocked state, comparing ALL approved records again.
 await db.runTransaction(async tx=>{equal(await inventory(db,expected,tx),expected);tx.update(db.doc('control/state'),frozen.control.state);});
 let committed=false;
 try{
  // All source comparisons and all comment/private pairs are one atomic transaction.
  await db.runTransaction(async tx=>{equal(await inventory(db,frozen,tx),frozen);for(const id of Object.keys(target.comments)){tx.create(db.doc('commentOwners/'+id),decode(target.commentOwners[id],Timestamp));tx.set(db.doc('comments/'+id),decode(target.comments[id],Timestamp));}},{maxAttempts:1});
  committed=true;
  const lockedTarget=structuredClone(target);lockedTarget.control.state=frozen.control.state;equal(await inventory(db,lockedTarget),lockedTarget);
 }finally{
  // Never unlock someone else's lock. Failure after commit is reported, not rolled back.
  await db.runTransaction(async tx=>{const ref=db.doc('control/state'),s=await tx.get(ref);if(s.data()?.frozen!==true||s.data()?.ownerUid!==adminUid)throw Error('Lock changed; not unlocking');tx.update(ref,{frozen:false,ownerUid:null});});
 }
 equal(await inventory(db,target),target);
 return {result:'PASS',dryRun:false,committed,...plan,enabled:false,controlUnlocked:true,fullComparison:'all paths, IDs, fields, types and timestamps match transformed target'};
}
async function operatorDb(projectId){
 if(projectId!=='serhii-comments-test')throw Error('Only existing serhii-comments-test is allowed in cloud mode');
 if(process.env.FIRESTORE_EMULATOR_HOST||process.env.FIREBASE_AUTH_EMULATOR_HOST||process.env.GOOGLE_APPLICATION_CREDENTIALS)throw Error('Cloud mode rejects emulator variables and credentials-file overrides');
 const file=process.platform==='win32'?join(process.env.APPDATA||'', 'gcloud','application_default_credentials.json'):join(homedir(),'.config','gcloud','application_default_credentials.json');
 const adc=JSON.parse(await readFile(file,'utf8'));if(adc.type!=='authorized_user'||adc.private_key)throw Error('Existing user ADC required; service account keys are not supported');
 const app=initializeApp({projectId,credential:applicationDefault()},'privacy-operator-'+Date.now());return {app,db:getFirestore(app)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const args=process.argv.slice(2),value=flag=>{const i=args.indexOf(flag);return i<0?null:args[i+1];};
 const input=value('--backup'),ledger=value('--deletion-register');if(!input||!ledger)throw Error('Required: --backup PRIVATE.json --deletion-register CURRENT.json; cloud dry-run by default');
 const load=async path=>{const b=await readFile(path);if(b.length>10*1024*1024)throw Error('Private input safety limit exceeded');return JSON.parse(b);};
 const source=await load(input),register=await load(ledger);approvedMigration(source,register);
 const {app,db}=await operatorDb(source.projectId);
 try{console.log(JSON.stringify(await runControlledMigration(db,source,register,{apply:args.includes('--apply'),planSha256:value('--plan-sha256'),adminUid:value('--admin-uid'),confirmProject:value('--confirm-project')}),null,2));}
 finally{await db.terminate();await deleteApp(app);}
}
