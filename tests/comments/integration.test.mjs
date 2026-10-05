import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {Timestamp} from 'firebase-admin/firestore';
import {deleteApp} from 'firebase-admin/app';
import {PUBLICATION_NOTICE_VERSION} from '../../js/comments/publication.js';
import {createCommentsApi} from '../../js/comments/api.js';
import * as appSdk from 'firebase/app';
import * as authSdk from 'firebase/auth';
import * as firestoreSdk from 'firebase/firestore';
const f={...appSdk,...authSdk,...firestoreSdk};
import {localServices} from '../../tools/comments/local.mjs';
import {seed} from '../../tools/comments/seed.mjs';
import {applyRestore,previewRestore,readCurrent} from '../../tools/comments/restore.mjs';
import {buildDeletionRegister,sanitizeRestoreBackup} from '../../js/comments/restore-safety.js';
import {validateBackup,upgradePrivateBackup} from '../../js/comments/backup-format.js';
function googleToken(){const b=v=>Buffer.from(JSON.stringify(v)).toString('base64url');return b({alg:'none',typ:'JWT'})+'.'+b({iss:'https://accounts.google.com',aud:'demo-key',sub:'demo-admin-google',email:'admin@example.test',email_verified:true,name:'Demo admin',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600})+'.';}
test('201-comment export/restore, deletion suppression, interrupted export and owner recovery',async()=>{
 const projectId='demo-serhii-comments';const env=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8080,rules:await readFile('firebase/firestore.rules','utf8')}});
 const source=localServices(projectId),target=localServices('demo-serhii-comments-restored');let api;
 try{
  await env.clearFirestore();const map=await seed(source.db,source.auth);
  const bulk=source.db.batch();for(let i=0;i<174;i++)bulk.set(source.db.doc('comments/bulk-'+String(i).padStart(3,'0')),{schemaVersion:3,articleId:'a-0004',authorName:'Demo reader',text:'Bulk '+i,parentId:null,depth:0,status:i%3===0?'pending':'published',createdAt:new Timestamp(1700000000+i,123456000),updatedAt:new Timestamp(1700000000+i,123456000)});await bulk.commit();const owners=source.db.batch();for(let i=0;i<174;i++){const key='bulk-'+String(i).padStart(3,'0');owners.set(source.db.doc('commentOwners/'+key),{articleId:'a-0004',authorUid:'demo-reader',createdAt:new Timestamp(1700000000+i,123456000),confirmation:null});}await owners.commit();
  await source.db.doc('comments/demo-00').update({createdAt:new Timestamp(1700000000,123456789)});await source.db.doc('commentOwners/demo-00').update({createdAt:new Timestamp(1700000000,123456789)});
  await source.db.doc('blockedUsers/blocked-demo').set({blockedAt:Timestamp.now(),blockedBy:'demo-admin'});
  const pageSizes=[];const measuredSdk={...f,getDocs:async q=>{const r=await f.getDocs(q);if(r.docs[0]?.ref.parent.id==='comments')pageSizes.push(r.size);return r;}};
  api=await createCommentsApi({firebase:{apiKey:'demo-key',projectId,authDomain:projectId+'.firebaseapp.com'},emulators:{auth:'http://127.0.0.1:9099',firestoreHost:'127.0.0.1',firestorePort:8080}},measuredSdk);
  await f.signInWithCredential(api.auth,f.GoogleAuthProvider.credential(googleToken()));assert.equal(api.auth.currentUser.uid,'demo-admin');assert.equal(await api.isAdmin(),true);

  const backup=await api.exportBackup(map);assert.deepEqual(validateBackup(backup),[]);assert.equal(backup.records.comments['demo-00'].createdAt.nanoseconds,(await source.db.doc('comments/demo-00').get()).data().createdAt.nanoseconds);assert.equal(backup.counts.comments,201);assert.deepEqual(pageSizes,[100,100,1]);assert.equal((await source.db.doc('control/state').get()).data().frozen,false);
  for(const name of Object.keys(backup.records)){const result=await target.db.collection(name).get();for(const d of result.docs)await d.ref.delete();}
  const preview=await previewRestore(target.db,backup);assert.equal(preview.conflicts.length,0);assert.ok(preview.create.length>25);
  const restored=await applyRestore(target.db,backup);assert.equal(restored.create.length,0);assert.deepEqual(await readCurrent(target.db),backup.records);
  await target.db.doc('comments/demo-00').update({text:'Conflict must survive'});assert.ok((await previewRestore(target.db,backup)).conflicts.includes('comments/demo-00'));await assert.rejects(applyRestore(target.db,backup),/refusing to overwrite/);assert.equal((await target.db.doc('comments/demo-00').get()).data().text,'Conflict must survive');
  await api.moderate({id:'demo-00',status:'published'},'delete');assert.equal((await source.db.doc('comments/demo-00').get()).data().status,'deleted');assert.equal((await source.db.doc('comments/demo-reply').get()).data().parentId,'demo-00');
  const latest=await api.exportBackup(map);const register=buildDeletionRegister(latest);const safe=sanitizeRestoreBackup(backup,register);assert.equal(safe.backup.records.comments['demo-00'].text,'');assert.equal(safe.backup.records.comments['demo-00'].status,'deleted');assert.equal(safe.backup.records.comments['demo-reply'].parentId,'demo-00');for(const name of Object.keys(backup.records)){const docs=await target.db.collection(name).get();for(const d of docs.docs)await d.ref.delete();}await applyRestore(target.db,safe.backup);assert.deepEqual(await readCurrent(target.db),safe.backup.records);assert.equal((await target.db.doc('comments/demo-00').get()).data().text,'');
  const dir=await mkdtemp('/tmp/comments-private-cli-');try{const input=dir+'/old.json',ledger=dir+'/register.json';await writeFile(input,JSON.stringify(backup),{mode:0o600});await writeFile(ledger,JSON.stringify(register),{mode:0o600});const envVars={...process.env,COMMENTS_RESTORE_PROJECT:'demo-serhii-comments-restored'};const missingEndpointEnv={...envVars};delete missingEndpointEnv.FIRESTORE_EMULATOR_HOST;const noEndpoint=spawnSync(process.execPath,['tools/comments/restore.mjs',input],{env:missingEndpointEnv,encoding:'utf8'});assert.equal(noEndpoint.status,1);assert.match(noEndpoint.stderr,/Explicit loopback/);const corrupt=JSON.parse(JSON.stringify(backup));corrupt.counts.comments++;const corruptFile=dir+'/corrupt.json';await writeFile(corruptFile,JSON.stringify(corrupt));const bad=spawnSync(process.execPath,['tools/comments/restore.mjs',corruptFile],{env:envVars,encoding:'utf8'});assert.equal(bad.status,1);assert.match(bad.stderr,/Incomplete comments/);const denied=spawnSync(process.execPath,['tools/comments/restore.mjs',input,'--apply'],{env:envVars,encoding:'utf8'});assert.equal(denied.status,1);assert.match(denied.stderr,/deletion-register is required/);const args=['tools/comments/restore.mjs',input,'--deletion-register',ledger];const preview=spawnSync(process.execPath,args,{env:envVars,encoding:'utf8'});assert.equal(preview.status,0,preview.stderr);const report=JSON.parse(preview.stdout);assert.equal(report.plan.conflicts.length,0);assert.equal(report.plan.create.length,0);const nonempty=spawnSync(process.execPath,[...args,'--apply','--confirm-emulator-restore','--sha256',report.effectiveSha256],{env:envVars,encoding:'utf8'});assert.equal(nonempty.status,1);assert.match(nonempty.stderr,/Nonempty target/);const cleanTarget='demo-cli-empty-'+Date.now();const apply=spawnSync(process.execPath,[...args,'--apply','--confirm-emulator-restore','--sha256',report.effectiveSha256],{env:{...envVars,COMMENTS_RESTORE_PROJECT:cleanTarget},encoding:'utf8'});assert.equal(apply.status,0,apply.stderr);const verified=localServices(cleanTarget);try{assert.deepEqual(await readCurrent(verified.db),safe.backup.records);}finally{await verified.db.terminate();await deleteApp(verified.app);}assert.equal((await target.db.doc('comments/demo-00').get()).data().text,'');}finally{await rm(dir,{recursive:true,force:true});}
  await api.logout();await f.terminate(api.db);await appSdk.deleteApp(api.auth.app);api=null;
  let pages=0;const brokenSdk={...f,getDocs:async q=>{if(++pages===2)return new Promise(()=>{});return f.getDocs(q);}};
  const config={firebase:{apiKey:'demo-key',projectId,authDomain:projectId+'.firebaseapp.com'},emulators:{auth:'http://127.0.0.1:9099',firestoreHost:'127.0.0.1',firestorePort:8080}};api=await createCommentsApi(config,brokenSdk);await f.signInWithCredential(api.auth,f.GoogleAuthProvider.credential(googleToken()));
  await assert.rejects(api.exportBackup(map),/comments-service-timeout/);assert.equal((await source.db.doc('control/state').get()).data().frozen,true);await assert.rejects(api.page('a-0001'),/comments-service-stopped/);
  await api.logout();await appSdk.deleteApp(api.auth.app);api=null;
  api=await createCommentsApi(config,f);await f.signInWithCredential(api.auth,f.GoogleAuthProvider.credential(googleToken()));await api.unfreeze();assert.equal((await source.db.doc('control/state').get()).data().frozen,false);const recovered=await api.exportBackup(map);assert.equal(recovered.counts.comments,201);assert.deepEqual(recovered.records,safe.backup.records);const posted=await api.post('a-0004','Works after interrupted export',null,{accepted:true,version:PUBLICATION_NOTICE_VERSION});assert.equal(posted.status,'pending');
  const unchangedComments=(await readCurrent(source.db)).comments;
  for(const visibility of ['visible','hidden']){
   const setting=await api.setSettings({enabled:false,visibility,moderationMode:'pre'});assert.equal(setting.schemaVersion,2);assert.equal(setting.enabled,false);assert.equal(setting.visibility,visibility);
   assert.deepEqual((await readCurrent(source.db)).comments,unchangedComments);
   const snapshot=await api.exportBackup(map);assert.equal(snapshot.schemaVersion,3);assert.deepEqual(snapshot.records.settings.comments,setting);
   const isolated=localServices('demo-visibility-'+visibility+'-'+Date.now());try{assert.equal((await isolated.db.listCollections()).length,0);await applyRestore(isolated.db,snapshot);assert.deepEqual(await readCurrent(isolated.db),snapshot.records);}finally{await isolated.db.terminate();await deleteApp(isolated.app);}
  }
  await api.setSettings({visibility:'visible'});assert.equal((await api.settings()).enabled,false);
  const subset=await api.exportBackup({...map,articles:[...map.articles,{id:'a-0005',slug:'not-in-test-database',aliases:[]}]});assert.deepEqual(subset.articleMap,map);assert.deepEqual(validateBackup(subset),[]);


 }finally{if(api){await api.logout();await f.terminate(api.db);}await env.cleanup();await source.db.terminate();await target.db.terminate();await deleteApp(source.app);await deleteApp(target.app);}
});
