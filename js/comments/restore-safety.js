import {validateBackup} from './backup-format.js';
const clone=v=>JSON.parse(JSON.stringify(v));
export function validateDeletionRegister(register,sourceProjectId) {
 if(!register||register.schemaVersion!==1||register.sourceProjectId!==sourceProjectId||!Number.isFinite(Date.parse(register.verifiedThrough))||!register.comments||typeof register.comments!=='object'||Array.isArray(register.comments))throw Error('Missing or invalid authoritative deletion register');
 for(const[id,r]of Object.entries(register.comments))if(!/^(?!__proto__$|constructor$|prototype$)[A-Za-z0-9_-]{1,128}$/.test(id)||!r||typeof r.articleId!=='string'||typeof r.authorUid!=='string'||typeof r.moderatorUid!=='string'||!['deleted','hidden'].includes(r.status)||r.at?.__type!=='timestamp'||!Number.isInteger(r.at.seconds)||r.at.seconds < -62135596800||r.at.seconds>253402300799||!Number.isInteger(r.at.nanoseconds)||r.at.nanoseconds<0||r.at.nanoseconds>=1e9)throw Error('Invalid deletion record '+id);
 return register;
}
// Merge monotonically: an older copy must never remove a known deletion.
// Coverage only reflects the supplied verified snapshot, not later unseen events.
export function buildDeletionRegister(currentBackup,previous=null) {
 const errors=validateBackup(currentBackup);if(errors.length)throw Error(errors.join('; '));
 if(previous)validateDeletionRegister(previous,currentBackup.projectId);
 if(previous&&Date.parse(previous.verifiedThrough)>Date.parse(currentBackup.exportedAt))throw Error('Refusing to replace newer deletion coverage with an older snapshot');
 const register={schemaVersion:1,sourceProjectId:currentBackup.projectId,verifiedThrough:currentBackup.exportedAt,comments:clone(previous?.comments||{})};
 for(const[id,c]of Object.entries(currentBackup.records.comments))if(c.status==='deleted'||(c.status==='hidden'&&c.text===''&&c.authorName==='')){
  const m=currentBackup.records.moderation[id];if(!m||m.action!=='delete')throw Error('Missing deletion provenance '+id);
  const known=register.comments[id];if(known&&(known.articleId!==c.articleId||known.authorUid!==c.authorUid))throw Error('Deletion identity changed '+id);if(known&&(known.at.seconds>m.at.seconds||(known.at.seconds===m.at.seconds&&known.at.nanoseconds>m.at.nanoseconds)))continue;
  register.comments[id]={articleId:c.articleId,authorUid:c.authorUid,status:c.status,at:clone(m.at),moderatorUid:m.moderatorUid};
 }
 return validateDeletionRegister(register,currentBackup.projectId);
}
export function sanitizeRestoreBackup(backup,register) {
 const errors=validateBackup(backup);if(!Number.isFinite(Date.parse(backup?.exportedAt)))throw Error('Missing backup export timestamp');if(errors.length)throw Error(errors.join('; '));validateDeletionRegister(register,backup.projectId);
 if(Date.parse(register.verifiedThrough)<Date.parse(backup.exportedAt))throw Error('Deletion coverage is older than backup');
 const result=clone(backup),suppressed=[];
 for(const[id,r]of Object.entries(register.comments)){
  const c=result.records.comments[id];if(!c)continue;
  if(c.articleId!==r.articleId||c.authorUid!==r.authorUid)throw Error('Deletion identity mismatch '+id);
  Object.assign(c,{text:'',authorName:'',status:r.status,updatedAt:clone(r.at)});
  result.records.moderation[id]={action:'delete',moderatorUid:r.moderatorUid,at:clone(r.at)};suppressed.push(id);
 }
 result.counts.moderation=Object.keys(result.records.moderation).length;
 const finalErrors=validateBackup(result);if(finalErrors.length)throw Error(finalErrors.join('; '));return {backup:result,suppressed};
}
