import * as browserSdk from './firebase-sdk.js';
import { COLLECTIONS, SCHEMA_VERSION, encode, validateBackup } from './backup-format.js';
export async function createCommentsApi(config, f = browserSdk) {
  const app=f.initializeApp(config.firebase,'article-comments');
  const auth=f.getAuth(app);const db=f.getFirestore(app);
  if(config.emulators) {
    f.connectAuthEmulator(auth,config.emulators.auth,{disableWarnings:true});
    f.connectFirestoreEmulator(db,config.emulators.firestoreHost,config.emulators.firestorePort);
  }
  let stopped=false;
  async function request(work) {
    if(stopped)throw new Error('comments-service-stopped');
    let timer;
    try {return await Promise.race([work(),new Promise((_,reject)=>{timer=setTimeout(()=>{stopped=true;f.terminate(db).catch(()=>{});reject(new Error('comments-service-timeout'));},12000);})]);}
    finally{clearTimeout(timer);}
  }
  const get=path=>request(()=>f.getDoc(f.doc(db,path)));
  const settings=async()=>{const s=await get('settings/comments');if(!s.exists())throw new Error('missing-settings');return s.data();};
  async function page(articleId,{cursor=null,kind='published'}={}) {
    const filters=[f.where('articleId','==',articleId)];
    if(kind==='mine')filters.push(f.where('authorUid','==',auth.currentUser.uid));
    filters.push(kind==='published'?f.where('status','in',['published','deleted']):kind==='review'?f.where('status','in',['pending','hidden']):f.where('status','==','pending'));
    filters.push(f.orderBy('createdAt','asc'),f.limit(20));if(cursor)filters.push(f.startAfter(cursor));
    const result=await request(()=>f.getDocs(f.query(f.collection(db,'comments'),...filters)));
    return {items:result.docs.map(d=>({id:d.id,...d.data()})),cursor:result.docs.at(-1)??null,hasMore:result.size===20};
  }
  async function post(articleId,text,parent=null) {
    const user=auth.currentUser;if(!user)throw new Error('sign-in-required');const ref=f.doc(f.collection(db,'comments'));
    const id=await request(()=>f.runTransaction(db,async tx=>{
      const setting=await tx.get(f.doc(db,'settings/comments'));const rate=await tx.get(f.doc(db,'rateLimits',user.uid));
      // The server checks the authoritative request timestamp and paired writes.
      if(rate.exists()&&Date.now()-rate.data().lastSubmittedAt.toMillis()<60000)throw new Error('rate-limited');
      tx.set(ref,{articleId,authorUid:user.uid,authorName:user.displayName||'Google user',text,parentId:parent?.id??null,depth:parent?parent.depth+1:0,status:setting.data().moderationMode==='pre'?'pending':'published',createdAt:f.serverTimestamp(),updatedAt:f.serverTimestamp()});
      tx.set(f.doc(db,'rateLimits',user.uid),{lastSubmittedAt:f.serverTimestamp(),commentId:ref.id});return ref.id;
    },{maxAttempts:3}));
    const saved=await get(`comments/${id}`);return {id:saved.id,...saved.data()};
  }
  async function moderate(comment,action) {
    const status=action==='approve'?'published':action==='hide'?'hidden':(['published','deleted'].includes(comment.status)?'deleted':'hidden');
    const change={status,updatedAt:f.serverTimestamp()};if(action==='delete')Object.assign(change,{text:'',authorName:''});
    const batch=f.writeBatch(db);batch.update(f.doc(db,'comments',comment.id),change);batch.set(f.doc(db,'moderation',comment.id),{moderatorUid:auth.currentUser.uid,action,at:f.serverTimestamp()});await request(()=>batch.commit());
  }
  async function setMode(moderationMode) {const batch=f.writeBatch(db);batch.update(f.doc(db,'settings/comments'),{moderationMode});await request(()=>batch.commit());}
  async function block(uid,blocked) {const batch=f.writeBatch(db);const ref=f.doc(db,'blockedUsers',uid);if(blocked)batch.set(ref,{blockedBy:auth.currentUser.uid,blockedAt:f.serverTimestamp()});else batch.delete(ref);await request(()=>batch.commit());}
  async function blockedPage(cursor=null) {const parts=[f.orderBy(f.documentId()),f.limit(20)];if(cursor)parts.push(f.startAfter(cursor));const result=await request(()=>f.getDocs(f.query(f.collection(db,'blockedUsers'),...parts)));return {items:result.docs.map(d=>({id:d.id,...d.data()})),cursor:result.docs.at(-1),hasMore:result.size===20};}
  async function freeze() {return request(()=>f.runTransaction(db,async tx=>{const ref=f.doc(db,'control/state');const s=await tx.get(ref);if(s.data().frozen)throw new Error('backup-already-frozen');tx.update(ref,{frozen:true,ownerUid:auth.currentUser.uid});return s.data();},{maxAttempts:3}));}
  async function unfreeze() {await request(()=>f.runTransaction(db,async tx=>{const ref=f.doc(db,'control/state');const s=await tx.get(ref);if(!s.data().frozen)return;if(s.data().ownerUid!==auth.currentUser.uid)throw new Error('backup-owned-by-another-admin');tx.update(ref,{frozen:false,ownerUid:null});},{maxAttempts:3}));}
  async function exportBackup(articleMap) {
    const original=await freeze();const records={},counts={};let complete=false;
    try {
      for(const name of COLLECTIONS) {
        records[name]={};let cursor=null,pages=0;
        do {
          if(++pages>1000)throw new Error('export-safety-limit');const parts=[f.orderBy(f.documentId()),f.limit(100)];if(cursor)parts.push(f.startAfter(cursor));
          const result=await request(()=>f.getDocs(f.query(f.collection(db,name),...parts)));
          for(const d of result.docs){if(Object.hasOwn(records[name],d.id))throw new Error('duplicate-export-id');records[name][d.id]=encode(d.data());}
          cursor=result.size===100?result.docs.at(-1):null;
        }while(cursor);
        counts[name]=(await request(()=>f.getCountFromServer(f.collection(db,name)))).data().count;
        if(counts[name]!==Object.keys(records[name]).length)throw new Error('incomplete-export');
      }
      records.settings={comments:encode((await get('settings/comments')).data())};counts.settings=1;
      records.control={state:original};counts.control=1;
      const backup={schemaVersion:SCHEMA_VERSION,projectId:config.firebase.projectId,exportedAt:new Date().toISOString(),freezeUsed:true,articleMap,counts,records};
      const errors=validateBackup(backup);if(errors.length)throw new Error(errors.join('; '));complete=true;return backup;
    }finally {
      // A failed/partial export is never offered as a valid backup.
      // If networking failed, the lock remains until its owner unlocks it.
      if(!stopped)await unfreeze();
      if(!complete)console.warn('No complete backup was produced.');
    }
  }
  return {auth,db,onAuth:callback=>f.onAuthStateChanged(auth,callback),login:()=>f.signInWithPopup(auth,new f.GoogleAuthProvider()),logout:()=>f.signOut(auth),settings,page,post,moderate,block,setMode,blockedPage,exportBackup,unfreeze,isAdmin:async()=>{if(!auth.currentUser)return false;const record=await get(`admins/${auth.currentUser.uid}`);return record.exists()&&record.data().role==='admin';},isBlocked:async()=>auth.currentUser&&(await get(`blockedUsers/${auth.currentUser.uid}`)).exists()};
}
