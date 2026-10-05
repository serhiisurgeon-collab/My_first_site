import test from 'node:test';
import assert from 'node:assert/strict';
import { Timestamp } from 'firebase/firestore';
import { encode,decode,validateBackup,restorePlan,COLLECTIONS } from '../../js/comments/backup-format.js';
const time=encode(new Timestamp(1700000000,123456789));
function backup(){const time=encode(new Timestamp(1700000000,123456789));const records=Object.fromEntries(COLLECTIONS.map(c=>[c,{}]));records.articles={'a-0001':{slug:'one',aliases:[]}};records.comments={parent:{articleId:'a-0001',authorUid:'user',authorName:'Reader',text:'Hello',parentId:null,depth:0,status:'published',createdAt:time,updatedAt:time},reply:{articleId:'a-0001',authorUid:'user',authorName:'Reader',text:'Reply',parentId:'parent',depth:1,status:'pending',createdAt:time,updatedAt:time}};records.settings={comments:{enabled:true,moderationMode:'pre',schemaVersion:1}};records.control={state:{frozen:false,ownerUid:null}};return{schemaVersion:1,projectId:'demo-test',freezeUsed:true,articleMap:{schemaVersion:1,articles:[{id:'a-0001',slug:'one',aliases:[]}]},records,counts:Object.fromEntries(Object.entries(records).map(([k,v])=>[k,Object.keys(v).length]))};}
test('timestamps retain exact seconds and nanoseconds',()=>{assert.deepEqual(encode(decode(time,Timestamp)),time);});
test('complete backup validates; count mismatch and cross-article parents fail',()=>{const b=backup();assert.deepEqual(validateBackup(b),[]);b.counts.comments++;assert.match(validateBackup(b).join(' '),/Incomplete/);b.counts.comments--;b.records.comments.reply.articleId='different';assert.ok(validateBackup(b).length);});
test('restore preview reports creates, conflicts and extra documents without changes',()=>{const b=backup();const original=JSON.stringify(b);const plan=restorePlan(b,{comments:{parent:{...b.records.comments.parent,text:'different'},extra:{text:'old'}}});assert.ok(plan.conflicts.includes('comments/parent'));assert.ok(plan.extra.includes('comments/extra'));assert.ok(plan.create.includes('comments/reply'));assert.equal(JSON.stringify(b),original);});
test('malformed timestamps, injected public fields and unknown collections are rejected',()=>{for(const change of [b=>b.records.comments.parent.createdAt.nanoseconds=1e9,b=>b.records.comments.parent.email='private@example.test',b=>b.records.other={}]){const b=backup();change(b);assert.ok(validateBackup(b).length);}});
test('v1 backups remain valid; v2 read-only and hidden settings restore exactly',()=>{
 for(const visibility of ['visible','hidden']){
  const b=backup();b.schemaVersion=2;b.records.settings.comments={enabled:false,visibility,moderationMode:'pre',schemaVersion:2};
  assert.deepEqual(validateBackup(b),[]);assert.equal(restorePlan(b,b.records).conflicts.length,0);
 }
 const b=backup();assert.deepEqual(validateBackup(b),[]);
 b.records.settings.comments={enabled:false,visibility:'visible',moderationMode:'pre',schemaVersion:2};
 assert.ok(validateBackup(b).length);
 b.schemaVersion=2;b.records.settings.comments.enabled=true;b.records.settings.comments.visibility='hidden';assert.ok(validateBackup(b).length);
});

test('legacy conversion preserves content, timestamps and identifiers; no retroactive confirmation or public UID',async()=>{
 const {upgradePrivateBackup}=await import('../../js/comments/backup-format.js');const b=backup(),source=structuredClone(b),v3=upgradePrivateBackup(b);assert.deepEqual(b,source);assert.equal(v3.schemaVersion,3);assert.deepEqual(validateBackup(v3),[]);
 for(const [id,c] of Object.entries(b.records.comments)){assert.equal(v3.records.commentOwners[id].authorUid,c.authorUid);assert.equal(v3.records.commentOwners[id].confirmation,null);const old={...c};delete old.authorUid;assert.deepEqual(v3.records.comments[id],{...old,schemaVersion:3});}
 const exposed=structuredClone(v3);exposed.records.comments.parent.authorUid='user';assert.ok(validateBackup(exposed).length);
 const missing=structuredClone(v3);delete missing.records.commentOwners.parent;missing.counts.commentOwners--;assert.ok(validateBackup(missing).length);
 const mismatched=structuredClone(v3);mismatched.records.commentOwners.parent.articleId='other';assert.ok(validateBackup(mismatched).length);
 const forged=structuredClone(v3);forged.records.commentOwners.parent.confirmation={accepted:true,version:'unknown',confirmedAt:time};assert.ok(validateBackup(forged).length);
 const exposedId=backup();exposedId.records.comments.user=exposedId.records.comments.parent;delete exposedId.records.comments.parent;exposedId.records.comments.reply.parentId='user';assert.throws(()=>upgradePrivateBackup(exposedId),/Public data contains Auth UID/);
});
