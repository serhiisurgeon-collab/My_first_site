import {before,after,beforeEach,test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,getDocs,collection,query,where,limit,writeBatch,serverTimestamp,Timestamp,deleteDoc,updateDoc} from 'firebase/firestore';
import {createHash} from 'node:crypto';
let env;
const id=label=>createHash('sha256').update(label).digest('hex').slice(0,20);
const user=(uid='reader',provider='google.com')=>env.authenticatedContext(uid,{name:'Reader',firebase:{sign_in_provider:provider}}).firestore();
const anon=()=>env.unauthenticatedContext().firestore();
const comment=(change={})=>({schemaVersion:3,articleId:'a-0001',authorName:'Reader',text:'Hello',parentId:null,depth:0,status:'pending',createdAt:serverTimestamp(),updatedAt:serverTimestamp(),...change});
const owner=(uid='reader',change={})=>({authorUid:uid,articleId:'a-0001',createdAt:serverTimestamp(),confirmation:{accepted:true,version:'comments-publication-2026-10-v1',confirmedAt:serverTimestamp()},...change});
const denied=promise=>assert.rejects(promise,e=>e.code==='permission-denied');
function triple(db,label,{uid='reader',c={},o={},skip=null}={}){const b=writeBatch(db),key=id(label);if(skip!=='comment')b.set(doc(db,'comments',key),comment(c));if(skip!=='owner')b.set(doc(db,'commentOwners',key),owner(uid,o));if(skip!=='rate')b.set(doc(db,'rateLimits',uid),{commentId:key,lastSubmittedAt:serverTimestamp()});return b.commit();}
const privileged=work=>env.withSecurityRulesDisabled(c=>work(c.firestore()));
async function seedComment(label,c={},uid='reader'){await privileged(async db=>{const now=Timestamp.now();await setDoc(doc(db,'comments',id(label)),comment({createdAt:now,updatedAt:now,...c}));await setDoc(doc(db,'commentOwners',id(label)),owner(uid,{createdAt:now,articleId:c.articleId??'a-0001',confirmation:null}));});}
async function moderate(label,action,db=user('admin')){const key=id(label),snap=await getDoc(doc(db,'comments',key)),old=snap.data();const change={status:action==='approve'?'published':action==='hide'?'hidden':old.status==='published'||old.status==='deleted'?'deleted':'hidden',updatedAt:serverTimestamp()};if(action==='delete')Object.assign(change,{text:'',authorName:''});const b=writeBatch(db);b.update(doc(db,'comments',key),change);b.set(doc(db,'moderation',key),{moderatorUid:'admin',action,at:serverTimestamp()});return b.commit();}
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-comments-privacy-rules',firestore:{host:'127.0.0.1',port:8080,rules:await readFile('firebase/firestore.rules','utf8')}});});
after(async()=>{await env?.cleanup();});
beforeEach(async()=>{await env.clearFirestore();await privileged(async db=>{await Promise.all([setDoc(doc(db,'settings/comments'),{enabled:true,visibility:'visible',moderationMode:'pre',schemaVersion:2}),setDoc(doc(db,'control/state'),{frozen:false,ownerUid:null}),setDoc(doc(db,'admins/admin'),{role:'admin'}),setDoc(doc(db,'articles/a-0001'),{slug:'one',aliases:['one-en']}),setDoc(doc(db,'articles/a-0002'),{slug:'two',aliases:[]})]);});});
test('public SDK documents and IDs contain no Auth UID; legacy exposed documents fail closed',async()=>{
 await seedComment('public',{status:'published'});await seedComment('deleted',{status:'deleted',text:'',authorName:''});await seedComment('pending');
 for(const label of ['public','deleted']){const snap=await assertSucceeds(getDoc(doc(anon(),'comments',id(label))));assert(!Object.hasOwn(snap.data(),'authorUid'));assert(!Object.hasOwn(snap.data(),'confirmation'));assert.notEqual(snap.id,'reader');}
 await denied(getDoc(doc(anon(),'comments',id('pending'))));await denied(getDoc(doc(user('other'),'comments',id('pending'))));await assertSucceeds(getDoc(doc(user(),'comments',id('pending'))));
 const q=query(collection(anon(),'comments'),where('schemaVersion','==',3),where('status','in',['published','deleted']),limit(20));assert.equal((await assertSucceeds(getDocs(q))).size,2);
 await privileged(db=>setDoc(doc(db,'comments/legacy'),{authorUid:'reader',...comment({status:'published',createdAt:Timestamp.now(),updatedAt:Timestamp.now()}),schemaVersion:2}));await denied(getDoc(doc(anon(),'comments/legacy')));await assertSucceeds(getDoc(doc(user('admin'),'comments/legacy')));
 await denied(getDocs(query(collection(anon(),'comments'),where('status','==','published'),limit(20))));await denied(getDocs(query(collection(anon(),'comments'),where('schemaVersion','==',3),where('status','==','published'))));
});
test('private owners/confirmation protected for author and administrator; UID indexes not public',async()=>{
 await triple(user(),'own');const ref=db=>doc(db,'commentOwners',id('own'));await denied(getDoc(ref(anon())));await denied(getDoc(ref(user('other'))));const own=(await assertSucceeds(getDoc(ref(user())))).data();assert.equal(own.authorUid,'reader');assert.equal(own.confirmation.accepted,true);assert.equal(own.confirmation.confirmedAt.toMillis(),own.createdAt.toMillis());await assertSucceeds(getDoc(ref(user('admin'))));
 await assertSucceeds(getDocs(query(collection(user(),'commentOwners'),where('authorUid','==','reader'),limit(20))));await denied(getDocs(query(collection(user('other'),'commentOwners'),where('authorUid','==','reader'),limit(20))));await denied(getDocs(query(collection(anon(),'commentOwners'),limit(20))));
 for(const path of ['admins/admin','moderation/any','rateLimits/reader','blockedUsers/reader','control/state'])await denied(getDoc(doc(anon(),path)));
});
test('all three writes required; private creation cannot impersonate or rewrite authorship',async()=>{
 for(const skip of ['owner','rate','comment'])await denied(triple(user(),'missing-'+skip,{skip}));
 await denied(triple(user(),'spoof',{uid:'other'}));await denied(triple(user(),'name',{c:{authorName:'Administrator'}}));await denied(triple(user(),'extra',{c:{authorUid:'reader'}}));await denied(triple(user('reader','password'),'password'));
 await triple(user(),'good');await denied(updateDoc(doc(user(),'commentOwners',id('good')),{authorUid:'other'}));await denied(updateDoc(doc(user('admin'),'commentOwners',id('good')),{authorUid:'other'}));await denied(deleteDoc(doc(user(),'commentOwners',id('good'))));
});
test('notice version, server time, positive confirmation and matching private metadata required',async()=>{
 for(const [label,o] of [['null',{confirmation:null}],['false',{confirmation:{accepted:false,version:'comments-publication-2026-10-v1',confirmedAt:serverTimestamp()}}],['version',{confirmation:{accepted:true,version:'old',confirmedAt:serverTimestamp()}}],['time',{confirmation:{accepted:true,version:'comments-publication-2026-10-v1',confirmedAt:Timestamp.fromMillis(0)}}],['article',{articleId:'a-0002'}],['extra',{email:'not-public@example.test'}],['created',{createdAt:Timestamp.fromMillis(0)}]])await denied(triple(user(),label,{o}));
});
test('schema, article registry, bounds, initial status and token name enforced',async()=>{
 for(const [label,c] of [['schema',{schemaVersion:2}],['email',{email:'private@test'}],['status',{status:'published'}],['clock',{createdAt:Timestamp.fromMillis(0)}],['long',{text:'x'.repeat(3001)}],['empty',{text:''}],['article',{articleId:'unknown'}],['depth',{depth:1}],['type',{text:42}]])await denied(triple(user(),label,{c}));
 await triple(user(),'valid');await denied(updateDoc(doc(user(),'comments',id('valid')),{text:'Edited'}));
});
test('published replies preserve article/depth; depths 1/2/3 allowed, 4 and cross-article denied',async()=>{
 await seedComment('root',{status:'published'});let parent=id('root');
 for(let depth=1;depth<=3;depth++){const uid='level-'+depth,label='level-'+depth;await triple(user(uid),label,{uid,c:{parentId:parent,depth}});const c=(await getDoc(doc(user(uid),'comments',id(label)))).data();assert.equal(c.parentId,parent);assert.equal(c.articleId,'a-0001');await moderate(label,'approve');parent=id(label);}
 await denied(triple(user('four'),'four',{uid:'four',c:{parentId:parent,depth:4}}));await denied(triple(user('cross'),'cross',{uid:'cross',c:{articleId:'a-0002',parentId:id('root'),depth:1},o:{articleId:'a-0002'}}));await denied(triple(user('missing'),'missing',{uid:'missing',c:{parentId:id('no-parent'),depth:1}}));
 await seedComment('private-parent');await denied(triple(user('private'),'private',{uid:'private',c:{parentId:id('private-parent'),depth:1}}));
});
test('server 60-second limit survives direct SDK, parallel and batched attempts',async()=>{
 const outcomes=await Promise.allSettled([triple(user(),'parallel-1'),triple(user(),'parallel-2')]);assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);await denied(triple(user(),'fast'));await privileged(db=>updateDoc(doc(db,'rateLimits/reader'),{lastSubmittedAt:Timestamp.fromMillis(Date.now()-65000)}));await triple(user(),'later');
 await privileged(db=>deleteDoc(doc(db,'rateLimits/reader')));const db=user(),batch=writeBatch(db);for(const label of ['batch-1','batch-2']){batch.set(doc(db,'comments',id(label)),comment());batch.set(doc(db,'commentOwners',id(label)),owner());}batch.set(doc(db,'rateLimits/reader'),{commentId:id('batch-2'),lastSubmittedAt:serverTimestamp()});await denied(batch.commit());
});
test('blocking and three settings modes enforce permission without touching existing statuses',async()=>{
 await seedComment('published',{status:'published'});await seedComment('pending');await privileged(db=>setDoc(doc(db,'blockedUsers/reader'),{blockedAt:Timestamp.now(),blockedBy:'admin'}));await denied(triple(user(),'blocked'));await privileged(db=>deleteDoc(doc(db,'blockedUsers/reader')));
 for(const visibility of ['visible','hidden']){await privileged(db=>updateDoc(doc(db,'settings/comments'),{visibility,enabled:false}));await denied(triple(user(),'disabled-'+visibility));await denied(triple(user(),'reply-'+visibility,{c:{parentId:id('published'),depth:1}}));await assertSucceeds(getDoc(doc(anon(),'comments',id('published'))));assert.equal((await getDoc(doc(user(),'comments',id('pending')))).data().status,'pending');}
 await privileged(db=>updateDoc(doc(db,'settings/comments'),{visibility:'visible',enabled:true}));await triple(user(),'unblocked');
});
test('admin moderation requires audit; deletion erases name/text, keeps private ownership and replies',async()=>{
 await seedComment('parent',{status:'published'});await seedComment('reply',{status:'published',parentId:id('parent'),depth:1});await denied(updateDoc(doc(user('admin'),'comments',id('parent')),{status:'hidden',updatedAt:serverTimestamp()}));await denied(moderate('parent','hide',user()));await moderate('parent','delete');const c=(await getDoc(doc(anon(),'comments',id('parent')))).data();assert.equal(c.text,'');assert.equal(c.authorName,'');assert.equal(c.status,'deleted');assert(!Object.hasOwn(c,'authorUid'));assert.equal((await getDoc(doc(user(),'commentOwners',id('parent')))).data().authorUid,'reader');assert.equal((await getDoc(doc(anon(),'comments',id('reply')))).data().parentId,id('parent'));await denied(deleteDoc(doc(user('admin'),'comments',id('parent'))));await denied(moderate('parent','approve'));
});
test('read-only and hidden keep administrative moderation available',async()=>{
 for(const visibility of ['visible','hidden']){await seedComment(visibility);await privileged(db=>updateDoc(doc(db,'settings/comments'),{visibility,enabled:false}));await moderate(visibility,'approve');assert.equal((await getDoc(doc(anon(),'comments',id(visibility)))).data().status,'published');await moderate(visibility,'hide');await denied(getDoc(doc(anon(),'comments',id(visibility))));}
});
test('ordinary account cannot self-appoint or mutate/delete admins; fake token claim ineffective',async()=>{
 const db=user();await denied(setDoc(doc(db,'admins/reader'),{role:'admin'}));await denied(updateDoc(doc(db,'admins/admin'),{role:'reader'}));await denied(deleteDoc(doc(db,'admins/admin')));const fake=env.authenticatedContext('fake',{admin:true,role:'admin'}).firestore();await denied(updateDoc(doc(fake,'settings/comments'),{enabled:false}));
});
test('export lock still blocks posting/moderation/settings and only its owner may unlock',async()=>{
 const db=user('admin');await updateDoc(doc(db,'control/state'),{frozen:true,ownerUid:'admin'});await denied(triple(user(),'frozen'));await seedComment('to-moderate');await denied(moderate('to-moderate','approve'));await denied(updateDoc(doc(db,'settings/comments'),{enabled:false}));await privileged(d=>setDoc(doc(d,'admins/second'),{role:'admin'}));await denied(updateDoc(doc(user('second'),'control/state'),{frozen:false,ownerUid:null}));await assertSucceeds(getDocs(collection(db,'commentOwners')));await denied(getDocs(collection(user('second'),'commentOwners')));await updateDoc(doc(db,'control/state'),{frozen:false,ownerUid:null});
});
test('invalid hidden/enabled, downgrade and owner UID in public document ID rejected',async()=>{
 const db=user('admin');await denied(setDoc(doc(db,'settings/comments'),{enabled:true,visibility:'hidden',moderationMode:'pre',schemaVersion:2}));await denied(setDoc(doc(db,'settings/comments'),{enabled:true,moderationMode:'pre',schemaVersion:1}));const uid='abcdefghijklmnopqrst',u=user(uid),batch=writeBatch(u);batch.set(doc(u,'comments',uid),comment());batch.set(doc(u,'commentOwners',uid),owner(uid));batch.set(doc(u,'rateLimits',uid),{commentId:uid,lastSubmittedAt:serverTimestamp()});await denied(batch.commit());
});
test('post mode uses a separate immediate-publication notice and rejects pre notice',async()=>{
 await privileged(db=>updateDoc(doc(db,'settings/comments'),{moderationMode:'post'}));
 await denied(triple(user(),'post-wrong',{c:{status:'published'}}));
 await triple(user(),'post-correct',{c:{status:'published'},o:{confirmation:{accepted:true,version:'comments-publication-post-2026-10-v1',confirmedAt:serverTimestamp()}}});
 assert.equal((await getDoc(doc(anon(),'comments',id('post-correct')))).data().status,'published');
});
test('public settings/registry and direct reads enforce shape; schema filter excludes legacy UID data',async()=>{
 const a=(await assertSucceeds(getDoc(doc(anon(),'articles/a-0001')))).data();assert.deepEqual(Object.keys(a).sort(),['aliases','slug']);
 const s=(await assertSucceeds(getDoc(doc(anon(),'settings/comments')))).data();assert.deepEqual(Object.keys(s).sort(),['enabled','moderationMode','schemaVersion','visibility']);
 await assertSucceeds(getDocs(query(collection(anon(),'articles'),limit(100))));
 await privileged(async db=>{await updateDoc(doc(db,'articles/a-0001'),{authorUid:'reader'});await updateDoc(doc(db,'settings/comments'),{authorUid:'reader'});});
 await denied(getDoc(doc(anon(),'articles/a-0001')));await denied(getDoc(doc(anon(),'settings/comments')));
 await seedComment('contaminated',{status:'published',unexpectedUid:'reader'});await denied(getDoc(doc(anon(),'comments',id('contaminated'))));await privileged(db=>updateDoc(doc(db,'comments',id('contaminated')),{schemaVersion:2}));assert.equal((await assertSucceeds(getDocs(query(collection(anon(),'comments'),where('schemaVersion','==',3),where('status','==','published'),limit(20))))).size,0);
 await denied(triple(user(),'extra-unknown',{c:{unexpectedUid:'reader'}}));
});
