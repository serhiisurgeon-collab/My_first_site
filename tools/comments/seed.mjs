import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { localServices } from './local.mjs';
export async function seed(db,auth) {
  const map=JSON.parse(await readFile(new URL('../../firebase/article-map.json',import.meta.url),'utf8'));
  const batch=db.batch();for(const article of map.articles)batch.set(db.doc('articles/'+article.id),{slug:article.slug,aliases:article.aliases});
  batch.set(db.doc('settings/comments'),{enabled:true,moderationMode:'pre',schemaVersion:1});batch.set(db.doc('control/state'),{frozen:false,ownerUid:null});batch.set(db.doc('admins/demo-admin'),{role:'admin'});
  const start=Date.now()-86400000;
  for(let i=0;i<23;i++)batch.set(db.doc('comments/demo-'+String(i).padStart(2,'0')),{articleId:'a-0001',authorUid:'demo-reader',authorName:'Demo reader',text:i===0?'<img src=x onerror="alert(1)"> This remains plain text.':'Local demonstration comment '+i,parentId:null,depth:0,status:'published',createdAt:Timestamp.fromMillis(start+i*1000),updatedAt:Timestamp.fromMillis(start+i*1000)});
  batch.set(db.doc('comments/demo-reply'),{articleId:'a-0001',authorUid:'demo-reader',authorName:'Demo reader',text:'Reply preserved when the parent is deleted.',parentId:'demo-00',depth:1,status:'published',createdAt:Timestamp.fromMillis(start+30000),updatedAt:Timestamp.fromMillis(start+30000)});
  for(const[id,parentId,depth]of[['demo-depth-2','demo-reply',2],['demo-depth-3','demo-depth-2',3]])batch.set(db.doc('comments/'+id),{articleId:'a-0001',authorUid:'demo-reader',authorName:'Demo reader',text:'Deep reply and long text: '+ 'long-word-'.repeat(30),parentId,depth,status:'published',createdAt:Timestamp.fromMillis(start+30000+depth*1000),updatedAt:Timestamp.fromMillis(start+30000+depth*1000)});
  batch.set(db.doc('comments/demo-pending'),{articleId:'a-0001',authorUid:'demo-reader',authorName:'Demo reader',text:'Private pending demonstration.',parentId:null,depth:0,status:'pending',createdAt:Timestamp.fromMillis(start+40000),updatedAt:Timestamp.fromMillis(start+40000)});
  await batch.commit();
  const owners=db.batch();for(const d of (await db.collection('comments').get()).docs){const c=d.data();owners.set(db.doc('commentOwners/'+d.id),{authorUid:c.authorUid,articleId:c.articleId,createdAt:c.createdAt,confirmation:null});owners.update(d.ref,{schemaVersion:3,authorUid:FieldValue.delete()});}await owners.commit();
  for(const[uid,email,name]of[['demo-admin','admin@example.test','Demo admin'],['demo-reader','reader@example.test','Demo reader']]){
    try{await auth.getUser(uid);}catch{await auth.createUser({uid,email,displayName:name,emailVerified:true});}
    await auth.updateUser(uid,{providersToLink:[{providerId:'google.com',uid:uid+'-google',email,displayName:name}]});
  }
  return map;
}
if(import.meta.url===pathToFileURL(process.argv[1]).href){const{db,auth}=localServices();await seed(db,auth);console.log('Local demo data and fake Google identities seeded; no production writes.');await db.terminate();}
