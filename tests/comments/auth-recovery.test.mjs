import {test} from 'node:test';import assert from 'node:assert/strict';
import {deleteApp} from 'firebase-admin/app';
import {localServices} from '../../tools/comments/local.mjs';
import {exportGoogleAuth,previewGoogleAuth,importGoogleAuthQuarantined} from '../../tools/comments/auth-recovery.mjs';
test('Google Auth UID/provider restore stays disabled; revoked accounts and existing target cannot be overwritten',async()=>{
 const project='demo-auth-recovery-source',targetProject='demo-auth-recovery-target';const source=localServices(project),target=localServices(targetProject);
 try{
  for(const id of [project,targetProject]){const r=await fetch('http://127.0.0.1:9099/emulator/v1/projects/'+id+'/accounts',{method:'DELETE'});assert.ok(r.ok);}
  for(const uid of ['owner','revoked']){const imported=await source.auth.importUsers([{uid,email:uid+'@example.test',displayName:uid,emailVerified:true,providerData:[{providerId:'google.com',uid:'google-sub-'+uid,email:uid+'@example.test'}]}]);assert.equal(imported.failureCount,0);}
  const snapshot=await exportGoogleAuth(source.auth,project);assert.equal(snapshot.count,2);const plan=await previewGoogleAuth(target.auth,snapshot,['revoked']);assert.deepEqual(plan.create,['owner']);assert.deepEqual(plan.skipRevoked,['revoked']);await importGoogleAuthQuarantined(target.auth,snapshot,['revoked']);const restored=await target.auth.getUser('owner');assert.equal(restored.uid,'owner');assert.equal(restored.providerData[0].uid,'google-sub-owner');assert.equal(restored.disabled,true);await assert.rejects(target.auth.getUser('revoked'));await assert.rejects(importGoogleAuthQuarantined(target.auth,snapshot,['revoked']),/refusing overwrite/);
 }finally{await source.db.terminate();await target.db.terminate();await deleteApp(source.app);await deleteApp(target.app);}
});
