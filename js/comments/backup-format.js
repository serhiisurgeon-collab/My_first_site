import { validateSettings } from './settings.js';
export const SCHEMA_VERSION = 3;
export const COLLECTIONS = ['comments','articles','moderation','blockedUsers','rateLimits','admins','commentOwners'];
const idPattern = /^(?!__proto__$|prototype$|constructor$)[A-Za-z0-9_-]{1,128}$/;
export function encode(value) {
  if (value && typeof value.seconds === 'number' && typeof value.nanoseconds === 'number') {
    return { __type: 'timestamp', seconds: value.seconds, nanoseconds: value.nanoseconds };
  }
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,encode(v)]));
  return value;
}
export function decode(value, Timestamp) {
  if (value && value.__type === 'timestamp') return new Timestamp(value.seconds, value.nanoseconds);
  if (Array.isArray(value)) return value.map(v=>decode(v,Timestamp));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,decode(v,Timestamp)]));
  return value;
}
export function validateBackup(backup) {
  const errors = [];
  const validTime = t => t && t.__type === 'timestamp' && Object.keys(t).length===3 && Number.isInteger(t.seconds) && t.seconds >= -62135596800 && t.seconds <= 253402300799 && Number.isInteger(t.nanoseconds) && t.nanoseconds >= 0 && t.nanoseconds < 1e9;
  if (!backup || ![1, 2, SCHEMA_VERSION].includes(backup.schemaVersion) || typeof backup.projectId !== 'string' || !backup.articleMap || backup.articleMap.schemaVersion !== 1 || !Array.isArray(backup.articleMap.articles)) return ['Unsupported schema or missing article map'];
  const records = backup.records;
  if (records && Object.keys(records).some(k=>![...COLLECTIONS,'settings','control'].includes(k))) errors.push('Unexpected collection');
  if (!records || !backup.counts || backup.freezeUsed !== true) return ['Missing records/counts or unfrozen export'];
  const requiredCollections=backup.schemaVersion===3?COLLECTIONS:COLLECTIONS.filter(n=>n!=='commentOwners');
  if(backup.schemaVersion!==3&&Object.hasOwn(records,'commentOwners')&&(!records.commentOwners||Object.keys(records.commentOwners).length))errors.push('Unexpected legacy ownership records');
  for (const name of [...requiredCollections,'settings','control']) {
    const docs = records[name];
    if (!docs || typeof docs !== 'object' || Array.isArray(docs)) { errors.push(`Missing ${name}`); continue; }
    if (Object.keys(docs).length !== backup.counts[name]) errors.push(`Incomplete ${name}`);
    for (const id of Object.keys(docs)) if (!idPattern.test(id)) errors.push(`Invalid ID ${name}/${id}`);
  }
  if (errors.length) return errors;
  const exact=(v,keys)=>v && typeof v==='object' && !Array.isArray(v) && Object.keys(v).length===keys.length && keys.every(k=>Object.hasOwn(v,k));
  const known = new Set(backup.articleMap.articles.map(a=>a.id));
  if (Object.keys(records.articles).length !== known.size) errors.push('Incomplete article map');
  if (known.size !== backup.articleMap.articles.length) errors.push('Duplicate article IDs');
  for (const a of backup.articleMap.articles) if (!idPattern.test(a.id) || !idPattern.test(a.slug) || !Array.isArray(a.aliases) || a.aliases.some(v=>typeof v!=='string'||!idPattern.test(v)) || !records.articles[a.id] || !exact(records.articles[a.id],['slug','aliases']) || records.articles[a.id].slug !== a.slug || JSON.stringify(records.articles[a.id].aliases)!==JSON.stringify(a.aliases)) errors.push('Article registry mismatch');
  for (const [id,c] of Object.entries(records.comments)) {
    if (!known.has(c.articleId) || (backup.schemaVersion!==3 && (typeof c.authorUid !== 'string' || !idPattern.test(c.authorUid))) || typeof c.authorName !== 'string' || c.authorName.length > 120 || typeof c.text !== 'string' || c.text.length > 3000 || !['pending','published','hidden','deleted'].includes(c.status) || !Number.isInteger(c.depth) || c.depth < 0 || c.depth > 3 || !validTime(c.createdAt) || !validTime(c.updatedAt)) errors.push(`Invalid comment ${id}`);
    if (c.parentId !== null) {
      const parent=records.comments[c.parentId];
      if (!parent || parent.articleId !== c.articleId || parent.depth + 1 !== c.depth) errors.push(`Invalid parent ${id}`);
    } else if (c.depth !== 0) errors.push(`Invalid root depth ${id}`);
    if(['pending','published'].includes(c.status) && (!c.text || !c.authorName))errors.push(`Empty comment ${id}`);
    if (c.status === 'deleted' && (c.text !== '' || c.authorName !== '')) errors.push(`Invalid tombstone ${id}`);
    const publicKeys=['articleId','authorName','text','parentId','depth','status','createdAt','updatedAt',backup.schemaVersion===3?'schemaVersion':'authorUid'];
    if (backup.schemaVersion===3 && (c.schemaVersion!==3 || !records.commentOwners[id])) errors.push(`Missing private owner ${id}`);
    if (Object.keys(c).some(k=>!publicKeys.includes(k))) errors.push(`Unexpected private field ${id}`);
  }
  if(backup.schemaVersion===3) {
    const privateUids=new Set([...Object.values(records.commentOwners).map(o=>o?.authorUid),...Object.keys(records.admins),...Object.keys(records.rateLimits),...Object.keys(records.blockedUsers),...Object.values(records.moderation).map(o=>o?.moderatorUid)].filter(uid=>typeof uid==='string'));
    for(const [id,o] of Object.entries(records.commentOwners)) {
      const c=records.comments[id];
      if(!c||!validTime(c.createdAt)||!validTime(o?.createdAt)){errors.push(`Invalid private owner ${id}`);continue;}
      if(!o||typeof o!=='object'){errors.push(`Invalid private owner ${id}`);continue;}
      if(!exact(o,['authorUid','articleId','createdAt','confirmation']) || !c || typeof o.authorUid!=='string' || !idPattern.test(o.authorUid) || o.articleId!==c.articleId || !validTime(o.createdAt) || (o.createdAt.seconds!==c.createdAt.seconds||o.createdAt.nanoseconds!==c.createdAt.nanoseconds))errors.push(`Invalid private owner ${id}`);
      if(o.confirmation!==null && (!exact(o.confirmation,['accepted','version','confirmedAt']) || o.confirmation.accepted!==true || !['comments-publication-2026-10-v1','comments-publication-post-2026-10-v1'].includes(o.confirmation.version) || !validTime(o.confirmation.confirmedAt) || (o.confirmation.confirmedAt.seconds!==o.createdAt.seconds||o.confirmation.confirmedAt.nanoseconds!==o.createdAt.nanoseconds)))errors.push(`Invalid confirmation ${id}`);
    }
    const inspect=(value,uid)=>typeof value==='string'?(value===uid||(uid.length>=8&&value.includes(uid))):Array.isArray(value)?value.some(v=>inspect(v,uid)):value&&typeof value==='object'?Object.entries(value).some(([k,v])=>inspect(k,uid)||inspect(v,uid)):false;
    for(const name of ['comments','articles','settings'])for(const [id,data] of Object.entries(records[name]))for(const uid of privateUids)if(inspect(id,uid)||inspect(data,uid))errors.push(`Public data contains Auth UID ${name}/${id}`);
  }
  for (const [id,m] of Object.entries(records.moderation)) if (!exact(m,['moderatorUid','action','at']) || !records.comments[id] || typeof m.moderatorUid !== 'string' || !idPattern.test(m.moderatorUid) || !['approve','hide','delete'].includes(m.action) || !validTime(m.at)) errors.push(`Invalid moderation ${id}`);
  for (const [id,r] of Object.entries(records.rateLimits)) if (!exact(r,['lastSubmittedAt','commentId']) || !validTime(r.lastSubmittedAt) || !records.comments[r.commentId] || (backup.schemaVersion===3?records.commentOwners[r.commentId]?.authorUid:records.comments[r.commentId].authorUid) !== id) errors.push(`Invalid rate record ${id}`);
  for (const b of Object.values(records.blockedUsers)) if (!exact(b,['blockedAt','blockedBy']) || !validTime(b.blockedAt) || typeof b.blockedBy !== 'string' || !idPattern.test(b.blockedBy)) errors.push('Invalid block');
  for(const a of Object.values(records.admins))if(!exact(a,['role']) || a.role!=='admin')errors.push('Invalid administrator');
  const settings=records.settings.comments;
  if (Object.keys(records.settings).length !== 1 || !validateSettings(settings) || (backup.schemaVersion === 1 && settings.schemaVersion !== 1)) errors.push('Invalid settings');
  const control=records.control.state;
  if (Object.keys(records.control).length !== 1 || !exact(control,['frozen','ownerUid']) || control.frozen !== false || control.ownerUid !== null) errors.push('Invalid restore control');
  return errors;
}
function stable(value) {
  if(Array.isArray(value))return value.map(stable);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));
  return value;
}
export function restorePlan(backup, current) {
  const errors=validateBackup(backup);if(errors.length)throw new Error(errors.join('; '));
  const plan={create:[],unchanged:[],conflicts:[],extra:[]};
  for(const [name,docs] of Object.entries(backup.records)) {
    for(const [id,data] of Object.entries(docs)) {
      const old=current[name]?.[id];const path=`${name}/${id}`;
      if(old===undefined)plan.create.push(path);
      else if(JSON.stringify(stable(encode(old)))===JSON.stringify(stable(data)))plan.unchanged.push(path);
      else plan.conflicts.push(path);
    }
    for(const id of Object.keys(current[name]??{}))if(!Object.hasOwn(docs,id))plan.extra.push(`${name}/${id}`);
  }
  return plan;
}

// Offline conversion; identifiers/content/timestamps are preserved or conversion fails.
// Old records have no evidence of this new notice: confirmation remains null.
export function upgradePrivateBackup(backup) {
  const errors=validateBackup(backup);if(errors.length)throw Error(errors.join('; '));
  const result=JSON.parse(JSON.stringify(backup));
  if(result.schemaVersion===3)return result;
  result.records.commentOwners={};
  for(const [id,c] of Object.entries(result.records.comments)) {
    result.records.commentOwners[id]={authorUid:c.authorUid,articleId:c.articleId,createdAt:c.createdAt,confirmation:null};
    delete c.authorUid;c.schemaVersion=3;
  }
  result.schemaVersion=3;result.counts.commentOwners=Object.keys(result.records.commentOwners).length;
  const finalErrors=validateBackup(result);if(finalErrors.length)throw Error(finalErrors.join('; '));
  return result;
}
