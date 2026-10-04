import {before,after,beforeEach,test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,getDocs,collection,query,where,limit,writeBatch,serverTimestamp,Timestamp,deleteDoc,updateDoc} from 'firebase/firestore';
let env;
const user=(uid='reader',provider='google.com')=>env.authenticatedContext(uid,{name:'Reader',firebase:{sign_in_provider:provider}}).firestore();
const anon=()=>env.unauthenticatedContext().firestore();
const base=(change={})=>({articleId:'a-0001',authorUid:'reader',authorName:'Reader',text:'Hello',parentId:null,depth:0,status:'pending',createdAt:serverTimestamp(),updatedAt:serverTimestamp(),...change});
function pair(db,id,change={}){const b=writeBatch(db);b.set(doc(db,'comments',id),base(change));b.set(doc(db,'rateLimits',change.authorUid??'reader'),{commentId:id,lastSubmittedAt:serverTimestamp()});return b.commit();}
async function privileged(work){return env.withSecurityRulesDisabled(c=>work(c.firestore()));}
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-comments-rules',firestore:{host:'127.0.0.1',port:8080,rules:await readFile('firebase/firestore.rules','utf8')}});});
after(async()=>{await env?.cleanup();});
beforeEach(async()=>{await env.clearFirestore();await privileged(async db=>{await Promise.all([setDoc(doc(db,'settings/comments'),{enabled:true,moderationMode:'pre',schemaVersion:1}),setDoc(doc(db,'control/state'),{frozen:false,ownerUid:null}),setDoc(doc(db,'admins/admin'),{role:'admin'}),setDoc(doc(db,'articles/a-0001'),{slug:'one',aliases:[]}),setDoc(doc(db,'articles/a-0002'),{slug:'two',aliases:[]})]);});});
test('anonymous public reads are bounded; pending and private documents stay private',async()=>{await pair(user(),'pending');await privileged(db=>setDoc(doc(db,'comments/public'),base({status:'published',createdAt:Timestamp.now(),updatedAt:Timestamp.now()})));await assertSucceeds(getDoc(doc(anon(),'comments/public')));await assertFails(getDoc(doc(anon(),'comments/pending')));await assertFails(getDoc(doc(user('other'),'comments/pending')));await assertSucceeds(getDoc(doc(user(),'comments/pending')));await assertSucceeds(getDocs(query(collection(anon(),'comments'),where('status','in',['published','deleted']),limit(20))));await assertFails(getDocs(query(collection(anon(),'comments'),limit(20))));await assertFails(getDocs(query(collection(anon(),'comments'),where('status','==','published'))));for(const path of ['moderation/pending','blockedUsers/other','admins/admin','control/state'])await assertFails(getDoc(doc(anon(),path)));});
test('cannot impersonate author, token name, admin, or bypass Google sign-in',async()=>{await assertFails(pair(user(),'spoof',{authorUid:'other'}));await assertFails(pair(user(),'name',{authorName:'Administrator'}));await assertFails(setDoc(doc(user(),'admins/reader'),{role:'admin'}));const claimed=env.authenticatedContext('claimed',{admin:true,role:'admin',name:'Reader',firebase:{sign_in_provider:'google.com'}}).firestore();await assertFails(updateDoc(doc(claimed,'settings/comments'),{enabled:false}));await privileged(db=>setDoc(doc(db,'admins/fake'),{role:'reader'}));await assertFails(updateDoc(doc(user('fake'),'settings/comments'),{enabled:false}));await assertFails(pair(user('reader','password'),'password'));await assertFails(setDoc(doc(user(),'blockedUsers/other'),{blockedAt:serverTimestamp(),blockedBy:'reader'}));});
test('exact schema, status, timestamps, length and registered article are enforced',async()=>{for(const[id,change]of [['email',{email:'private@test'}],['status',{status:'published'}],['clock',{createdAt:Timestamp.now()}],['long',{text:'x'.repeat(3001)}],['empty',{text:''}],['article',{articleId:'unknown'}],['depth',{depth:1}],['types',{text:42}]])await assertFails(pair(user(),id,change));await assertFails(setDoc(doc(user(),'comments/alone'),base()));await assertSucceeds(pair(user(),'valid'));await assertFails(updateDoc(doc(user(),'comments/valid'),{text:'edited'}));});
test('blocked authors and disabled service cannot write directly',async()=>{await privileged(db=>setDoc(doc(db,'blockedUsers/reader'),{blockedAt:Timestamp.now(),blockedBy:'admin'}));await assertFails(pair(user(),'blocked'));await privileged(db=>deleteDoc(doc(db,'blockedUsers/reader')));await privileged(db=>updateDoc(doc(db,'settings/comments'),{enabled:false}));await assertFails(pair(user(),'off'));});
test('reply must target published parent in same article and valid depth',async()=>{await privileged(db=>setDoc(doc(db,'comments/parent'),base({articleId:'a-0002',status:'published',createdAt:Timestamp.now(),updatedAt:Timestamp.now()})));await assertFails(pair(user(),'cross',{parentId:'parent',depth:1}));await privileged(db=>updateDoc(doc(db,'comments/parent'),{articleId:'a-0001',status:'hidden'}));await assertFails(pair(user(),'private',{parentId:'parent',depth:1}));await privileged(db=>updateDoc(doc(db,'comments/parent'),{status:'published'}));await assertSucceeds(pair(user(),'reply',{parentId:'parent',depth:1}));});
test('atomic throttle rejects frequent, simultaneous and batched submissions',async()=>{const outcomes=await Promise.allSettled([pair(user(),'parallel-1'),pair(user(),'parallel-2')]);assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);await assertFails(pair(user(),'fast'));await privileged(db=>deleteDoc(doc(db,'rateLimits/reader')));const db=user(),b=writeBatch(db);for(const id of ['batch-1','batch-2'])b.set(doc(db,'comments',id),base());b.set(doc(db,'rateLimits/reader'),{commentId:'batch-2',lastSubmittedAt:serverTimestamp()});await assertFails(b.commit());});
test('post-moderation mode only allows published initial status',async()=>{await privileged(db=>updateDoc(doc(db,'settings/comments'),{moderationMode:'post'}));await assertFails(pair(user(),'pending'));await assertSucceeds(pair(user(),'published',{status:'published'}));});
test('admin moderation requires audit; deletion retains parent and replies',async()=>{await privileged(async db=>{await setDoc(doc(db,'comments/parent'),base({status:'published',createdAt:Timestamp.now(),updatedAt:Timestamp.now()}));await setDoc(doc(db,'comments/reply'),base({status:'published',parentId:'parent',depth:1,createdAt:Timestamp.now(),updatedAt:Timestamp.now()}));});const db=user('admin');await assertFails(updateDoc(doc(db,'comments/parent'),{status:'hidden',updatedAt:serverTimestamp()}));const b=writeBatch(db);b.update(doc(db,'comments/parent'),{text:'',authorName:'',status:'deleted',updatedAt:serverTimestamp()});b.set(doc(db,'moderation/parent'),{moderatorUid:'admin',action:'delete',at:serverTimestamp()});await assertSucceeds(b.commit());assert.equal((await getDoc(doc(anon(),'comments/parent'))).data().status,'deleted');assert.equal((await getDoc(doc(anon(),'comments/reply'))).data().parentId,'parent');await assertFails(deleteDoc(doc(db,'comments/parent')));});
test('freeze blocks both users and moderation; only lock owner can unlock/export unbounded',async()=>{const db=user('admin');await assertSucceeds(updateDoc(doc(db,'control/state'),{frozen:true,ownerUid:'admin'}));await assertFails(pair(user(),'frozen'));await assertFails(updateDoc(doc(db,'settings/comments'),{enabled:false}));await privileged(d=>setDoc(doc(d,'admins/second'),{role:'admin'}));await assertFails(updateDoc(doc(user('second'),'control/state'),{frozen:false,ownerUid:null}));await assertSucceeds(getDocs(collection(db,'comments')));await assertFails(getDocs(collection(user('second'),'comments')));await assertSucceeds(updateDoc(doc(db,'control/state'),{frozen:false,ownerUid:null}));});

const deniedExactly=promise=>assert.rejects(promise,error=>error.code==='permission-denied');
test('direct SDK throttle: second paired comment <60s denied and >=60s allowed without API limiter',async()=>{
 await assertSucceeds(pair(user(),'direct-first'));
 await deniedExactly(pair(user(),'direct-second'));
 await privileged(db=>updateDoc(doc(db,'rateLimits/reader'),{lastSubmittedAt:Timestamp.fromMillis(Date.now()-65000)}));
 await assertSucceeds(pair(user(),'direct-after-interval'));
});
test('direct SDK refuses missing rate pair and batched rate bypass with exact permission-denied',async()=>{
 await deniedExactly(setDoc(doc(user(),'comments/unpaired-direct'),base()));
 await assertSucceeds(pair(user(),'paired-first'));
 const db=user(),batch=writeBatch(db);batch.set(doc(db,'comments/batched-fast'),base());batch.set(doc(db,'rateLimits/reader'),{commentId:'batched-fast',lastSubmittedAt:serverTimestamp()});await deniedExactly(batch.commit());
});
test('direct SDK reply levels 1/2/3 allowed; depth 4, missing parent, wrong depth and cross article denied',async()=>{
 await privileged(db=>setDoc(doc(db,'comments/root-chain'),base({status:'published',createdAt:Timestamp.now(),updatedAt:Timestamp.now()})));
 let parentId='root-chain';
 for(let depth=1;depth<=3;depth++){
  const uid='level-'+depth,id='reply-chain-'+depth;
  await assertSucceeds(pair(user(uid),id,{authorUid:uid,parentId,depth}));
  const saved=await getDoc(doc(user(uid),'comments',id));assert.equal(saved.data().parentId,parentId);assert.equal(saved.data().articleId,'a-0001');assert.equal(saved.data().depth,depth);
  await privileged(db=>updateDoc(doc(db,'comments',id),{status:'published'}));parentId=id;
 }
 await deniedExactly(pair(user('four'),'depth-four',{authorUid:'four',parentId,depth:4}));
 await deniedExactly(pair(user('missing'),'missing-parent',{authorUid:'missing',parentId:'does-not-exist',depth:1}));
 await deniedExactly(pair(user('wrong'),'wrong-depth',{authorUid:'wrong',parentId:'root-chain',depth:2}));
 await deniedExactly(pair(user('cross'),'cross-article',{authorUid:'cross',articleId:'a-0002',parentId:'root-chain',depth:1}));
});
test('ordinary user cannot create, update or delete admin documents',async()=>{
 const db=user();await deniedExactly(setDoc(doc(db,'admins/reader'),{role:'admin'}));
 await deniedExactly(updateDoc(doc(db,'admins/admin'),{role:'reader'}));await deniedExactly(deleteDoc(doc(db,'admins/admin')));
 await privileged(d=>setDoc(doc(d,'admins/reader'),{role:'reader'}));await deniedExactly(updateDoc(doc(db,'admins/reader'),{role:'admin'}));await deniedExactly(deleteDoc(doc(db,'admins/reader')));
});
