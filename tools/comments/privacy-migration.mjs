import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {validateBackup,upgradePrivateBackup} from '../../js/comments/backup-format.js';
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function migrationPlan(source) {
 const errors=validateBackup(source);if(errors.length)throw Error(errors.join('; '));
 const migrated=upgradePrivateBackup(source);
 const changes=source.schemaVersion===3?[]:Object.keys(source.records.comments).sort().map(id=>({commentPath:'comments/'+id,privatePath:'commentOwners/'+id,status:source.records.comments[id].status,removePublicFields:['authorUid'],addPublicFields:{schemaVersion:3},legacyConfirmation:null,reason:'Move existing Auth UID to private ownership; preserve content and timestamps'}));
 return {sourceProjectId:source.projectId,sourceExportedAt:source.exportedAt,sourceSha256:digest(source),targetSchemaVersion:3,counts:{commentsToMigrate:changes.length,privateRecordsToCreate:changes.length,existingConfirmationsInvented:0},changes,planSha256:digest(changes),migrated};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.includes('--apply'))throw Error('Cloud migration is not implemented or authorized by this tool. Dry-run only.');
 const file=process.argv[2];if(!file)throw Error('Usage: node tools/comments/privacy-migration.mjs PRIVATE-BACKUP.json (dry-run only)');
 const bytes=await readFile(file);if(bytes.length>10*1024*1024)throw Error('Backup safety limit exceeded');
 const {migrated,...plan}=migrationPlan(JSON.parse(bytes));console.log(JSON.stringify({dryRun:true,sourceFileSha256:createHash('sha256').update(bytes).digest('hex'),...plan},null,2));
}
