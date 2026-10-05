import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { FieldPath, Timestamp } from 'firebase-admin/firestore';
import { COLLECTIONS, decode, encode, restorePlan, validateBackup, upgradePrivateBackup } from '../../js/comments/backup-format.js';
import {sanitizeRestoreBackup} from '../../js/comments/restore-safety.js';
import { localServices } from './local.mjs';
export async function readCurrent(db) {
 const current={};for(const name of [...COLLECTIONS,'settings','control']){current[name]={};let last=null;for(let n=0;n<1000;n++){let q=db.collection(name).orderBy(FieldPath.documentId()).limit(100);if(last)q=q.startAfter(last);const result=await q.get();for(const d of result.docs)current[name][d.id]=encode(d.data());if(result.size<100)break;if(n===999)throw Error('Read safety limit');last=result.docs.at(-1);}}return current;
}
export async function previewRestore(db,backup){backup=upgradePrivateBackup(backup);const errors=validateBackup(backup);if(errors.length)throw Error(errors.join('; '));return restorePlan(backup,await readCurrent(db));}
export async function applyRestore(db,backup){
 backup=upgradePrivateBackup(backup);
 const plan=await previewRestore(db,backup);if(plan.conflicts.length||plan.extra.length)throw Error('Conflicts or extra data: refusing to overwrite. Use a clean isolated emulator project.');
 for(const path of plan.create){const[name,id]=path.split('/');await db.doc(path).create(decode(backup.records[name][id],Timestamp));}
 const verification=await previewRestore(db,backup);if(verification.create.length||verification.conflicts.length||verification.extra.length)throw Error('Restore verification failed');return verification;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(!process.env.FIRESTORE_EMULATOR_HOST || !/^(127\.0\.0\.1|localhost):\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST))throw Error('Explicit loopback FIRESTORE_EMULATOR_HOST is required');
 const file=process.argv[2];if(!file)throw Error('Usage: npm run comments:restore -- private-backup.json [--apply --confirm-emulator-restore --sha256 DIGEST]');
 const buffer=await readFile(file);if(buffer.length>10*1024*1024)throw Error('Backup exceeds the local 10 MiB safety limit');const sourceSha256=createHash('sha256').update(buffer).digest('hex');let backup=JSON.parse(buffer);const registerIndex=process.argv.indexOf('--deletion-register');let registerSha256=null;if(registerIndex>=0){if(!process.argv[registerIndex+1])throw Error('Missing deletion register path');const registerBytes=await readFile(process.argv[registerIndex+1]);if(registerBytes.length>10*1024*1024)throw Error('Deletion register too large');registerSha256=createHash('sha256').update(registerBytes).digest('hex');backup=sanitizeRestoreBackup(backup,JSON.parse(registerBytes)).backup;}if(process.argv.includes('--apply')&&registerIndex<0)throw Error('An up-to-date --deletion-register is required before apply');backup=upgradePrivateBackup(backup);const digest=createHash('sha256').update(JSON.stringify(backup)).digest('hex');const projectId=process.env.COMMENTS_RESTORE_PROJECT||'demo-serhii-comments-restored';const{db}=localServices(projectId);
 try{
  const plan=await previewRestore(db,backup);console.log(JSON.stringify({target:projectId,sourceSha256,registerSha256,effectiveSha256:digest,plan},null,2));
  if(process.argv.includes('--apply')){if((await db.listCollections()).length)throw Error('Nonempty target: a new empty isolated emulator database is required');const index=process.argv.indexOf('--sha256');if(!process.argv.includes('--confirm-emulator-restore')||index<0||process.argv[index+1]!==digest)throw Error('Explicit emulator confirmation and matching effective SHA-256 are required');await applyRestore(db,backup);console.log('Restore verified; no existing document was overwritten.');}
 }finally{await db.terminate();}
}
