// Backend-only helpers, no credentials/configuration and no executable production CLI.
// Caller must be a separately authorized, trusted Admin SDK process.
export async function exportGoogleAuth(auth,projectId) {
 const users=[];let token;for(let page=0;page<100;page++){
  const result=await auth.listUsers(1000,token);
  for(const user of result.users){if(!user.providerData.length||user.providerData.some(p=>p.providerId!=='google.com'))throw Error('Only Google-only accounts supported; do not drop other providers');
   const entry={uid:user.uid,disabled:user.disabled,providerData:user.providerData.map(p=>Object.fromEntries(Object.entries(p).filter(([k])=>['uid','providerId','displayName','email','photoURL'].includes(k)))),metadata:Object.fromEntries([['creationTime',user.metadata.creationTime],['lastSignInTime',user.metadata.lastSignInTime]].filter(([,v])=>v!=null))};
   for(const field of ['email','emailVerified','displayName','photoURL'])if(user[field]!==undefined)entry[field]=user[field];users.push(entry);}
  token=result.pageToken;if(!token)break;if(page===99)throw Error('Auth export safety limit');
 }
 const snapshot={schemaVersion:1,projectId,exportedAt:new Date().toISOString(),count:users.length,users};validateGoogleAuth(snapshot);return snapshot;
}
export function validateGoogleAuth(snapshot){
 if(!snapshot||snapshot.schemaVersion!==1||typeof snapshot.projectId!=='string'||!Array.isArray(snapshot.users)||snapshot.count!==snapshot.users.length)throw Error('Invalid Auth snapshot/count');
 const ids=new Set(),providers=new Set();for(const u of snapshot.users){if(typeof u.uid!=='string'||!u.uid.length||u.uid.length>128||ids.has(u.uid)||typeof u.disabled!=='boolean'||!Array.isArray(u.providerData)||u.providerData.length!==1||u.providerData[0].providerId!=='google.com'||typeof u.providerData[0].uid!=='string'||!u.providerData[0].uid||providers.has(u.providerData[0].uid))throw Error('Invalid/duplicate UID or Google provider mapping');
  if(Object.keys(u).some(k=>!['uid','disabled','providerData','metadata','email','emailVerified','displayName','photoURL'].includes(k)))throw Error('Unexpected Auth field (claims/passwords/tokens are not imported)');
  for(const field of ['email','displayName','photoURL'])if(u[field]!==undefined&&typeof u[field]!=='string')throw Error('Invalid Auth profile type');if(u.emailVerified!==undefined&&typeof u.emailVerified!=='boolean')throw Error('Invalid email verification type');const provider=u.providerData[0];if(Object.keys(provider).some(k=>!['uid','providerId','displayName','email','photoURL'].includes(k)))throw Error('Unexpected provider field');for(const field of ['uid','providerId','displayName','email','photoURL'])if(provider[field]!==undefined&&typeof provider[field]!=='string')throw Error('Invalid provider type');if(u.metadata&&(typeof u.metadata!=='object'||Array.isArray(u.metadata)||Object.keys(u.metadata).some(k=>!['creationTime','lastSignInTime'].includes(k))))throw Error('Invalid Auth metadata');for(const value of Object.values(u.metadata||{}))if(value!==undefined&&(!value||!Number.isFinite(Date.parse(value))))throw Error('Invalid Auth metadata timestamp');
  ids.add(u.uid);providers.add(u.providerData[0].uid);
 }return snapshot;
}
export async function previewGoogleAuth(auth,snapshot,revokedUids) {
 validateGoogleAuth(snapshot);if(!Array.isArray(revokedUids)||revokedUids.some(u=>typeof u!=='string'))throw Error('Explicit current account-deletion list required');
 const current=[];let token;do{const r=await auth.listUsers(1000,token);current.push(...r.users);token=r.pageToken;if(current.length>100000)throw Error('Auth preview safety limit');}while(token);
 return {sourceProjectId:snapshot.projectId,create:snapshot.users.filter(u=>!revokedUids.includes(u.uid)).map(u=>u.uid),skipRevoked:snapshot.users.filter(u=>revokedUids.includes(u.uid)).map(u=>u.uid),existingTargetUids:current.map(u=>u.uid)};
}
export async function importGoogleAuthQuarantined(auth,snapshot,revokedUids) {
 const plan=await previewGoogleAuth(auth,snapshot,revokedUids);if(plan.existingTargetUids.length)throw Error('Auth target must be empty; refusing overwrite/provider collision');
 const users=snapshot.users.filter(u=>!revokedUids.includes(u.uid));
 for(let i=0;i<users.length;i+=1000){const result=await auth.importUsers(users.slice(i,i+1000).map(u=>({...u,disabled:true})));if(result.failureCount)throw Error('Partial Auth import: stop and review failed indices '+result.errors.map(e=>i+e.index).join(','));}
 for(const user of users){const restored=await auth.getUser(user.uid);if(!restored.disabled||restored.providerData.length!==1||restored.providerData[0].providerId!=='google.com'||restored.providerData[0].uid!==user.providerData[0].uid)throw Error('Auth mapping verification failed '+user.uid);for(const field of ['email','emailVerified','displayName','photoURL'])if(user[field]!==undefined&&restored[field]!==user[field])throw Error('Auth profile verification failed '+user.uid);for(const field of ['creationTime','lastSignInTime'])if(user.metadata?.[field]&&Date.parse(user.metadata[field])!==Date.parse(restored.metadata[field]))throw Error('Auth metadata verification failed '+user.uid);}
 return plan;
}
