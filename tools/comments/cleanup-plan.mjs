// Offline, explicit retention proposal. No Firestore/Auth client and no deletion.
import {readFile} from 'node:fs/promises';import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';
import {validateBackup,upgradePrivateBackup} from '../../js/comments/backup-format.js';
import {sanitizeRestoreBackup} from '../../js/comments/restore-safety.js';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const millis=t=>t.seconds*1000+t.nanoseconds/1e6;
export function cleanupPlan(input,policy,register) {
 const errors=validateBackup(input);if(errors.length)throw Error(errors.join('; '));
 if(!policy||policy.approved!==true||!Number.isFinite(Date.parse(policy.asOf)))throw Error('Explicit approved policy and asOf date required');
 if(Object.keys(policy).some(k=>!['approved','asOf','pendingDays','hiddenDays','emptyTombstoneDays','rateLimitDays','holds'].includes(k)))throw Error('Unknown retention policy key');
 for(const k of ['pendingDays','hiddenDays','emptyTombstoneDays','rateLimitDays'])if(policy[k]!==undefined&&(!Number.isInteger(policy[k])||policy[k]<=0))throw Error('Explicit positive retention days required: '+k);
 if(!Array.isArray(policy.holds)||policy.holds.some(x=>typeof x!=='string'))throw Error('Explicit holds list required');
 const b=upgradePrivateBackup(sanitizeRestoreBackup(input,register).backup),candidates=[],held=new Set(policy.holds),now=Date.parse(policy.asOf);if(now<Date.parse(b.exportedAt))throw Error('asOf predates the source backup');
 const referenced=new Set(Object.values(b.records.comments).map(c=>c.parentId).filter(Boolean));
 const old=(time,days)=>days!==undefined&&now-millis(time)>=days*86400000;
 for(const [id,c] of Object.entries(b.records.comments)){
  const path='comments/'+id;if(held.has(path)||held.has('commentOwners/'+id)||held.has('moderation/'+id)||referenced.has(id))continue;
  const days=c.status==='pending'?policy.pendingDays:c.status==='hidden'?policy.hiddenDays:c.status==='deleted'?policy.emptyTombstoneDays:undefined;
  if(!old(c.updatedAt,days))continue;
  const rates=Object.entries(b.records.rateLimits).filter(([,r])=>r.commentId===id);
  if(rates.some(([uid,r])=>held.has('rateLimits/'+uid)||!old(r.lastSubmittedAt,policy.rateLimitDays)))continue;
  // Published text is never selected. Historical deletion provenance must remain.
  if(c.status==='deleted'||(c.text===''&&c.authorName===''))continue;
  candidates.push({path,reason:`${c.status}: last update older than explicitly agreed ${days} days`});
  candidates.push({path:'commentOwners/'+id,reason:'Private pair of selected comment'});
  if(b.records.moderation[id]&&!held.has('moderation/'+id))candidates.push({path:'moderation/'+id,reason:'Moderation record of selected comment'});
 }
 for(const [uid,r] of Object.entries(b.records.rateLimits))if(!held.has('rateLimits/'+uid)&&old(r.lastSubmittedAt,policy.rateLimitDays))candidates.push({path:'rateLimits/'+uid,reason:'Last submission older than explicit rate-limit retention'});
 const plan={dryRun:true,sourceProjectId:b.projectId,sourceExportedAt:b.exportedAt,sourceSha256:hash(input),policySha256:hash(policy),candidates,count:candidates.length,notSelected:['Auth accounts','administrators','settings/control','article registry','blocks','published text','parents with replies','deletion provenance','held records']};
 return {...plan,planSha256:hash(plan)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.includes('--apply'))throw Error('Irreversible cleanup requires a separately approved exact list; this tool never deletes.');
 const [backup,policy,register]=process.argv.slice(2);if(!backup||!policy||!register)throw Error('Usage: node tools/comments/cleanup-plan.mjs PRIVATE-BACKUP.json AGREED-POLICY.json CURRENT-DELETION-REGISTER.json');
 const files=await Promise.all([backup,policy,register].map(async f=>{const bytes=await readFile(f);if(bytes.length>10*1024*1024)throw Error('Input safety limit exceeded');return JSON.parse(bytes);}));console.log(JSON.stringify(cleanupPlan(...files),null,2));
}
