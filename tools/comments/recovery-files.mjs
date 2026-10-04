import {readFile,writeFile,realpath} from 'node:fs/promises';
import {resolve,relative,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildDeletionRegister,sanitizeRestoreBackup} from '../../js/comments/restore-safety.js';
const[mode,input,registerPath,output]=process.argv.slice(2);
const load=async p=>{const b=await readFile(p);if(b.length>10*1024*1024)throw Error('File exceeds 10 MiB');return JSON.parse(b);};
async function save(path,data){const repo=fileURLToPath(new URL('../../',import.meta.url));const parent=await realpath(dirname(resolve(path)));const rel=relative(await realpath(repo),parent);if(rel===''||(!rel.startsWith('..')&&!rel.startsWith('/')))throw Error('Private recovery files must be outside the checkout');const body=JSON.stringify(data,null,2)+'\n';await writeFile(path,body,{mode:0o600,flag:'wx'});console.log(JSON.stringify({file:resolve(path),sha256:createHash('sha256').update(body).digest('hex')}));}
if(mode==='register'&&input&&registerPath){const latest=await load(input);const previous=output?await load(output):null;await save(registerPath,buildDeletionRegister(latest,previous));}
else if(mode==='sanitize'&&input&&registerPath&&output){const result=sanitizeRestoreBackup(await load(input),await load(registerPath));await save(output,result.backup);console.log(JSON.stringify({suppressedIds:result.suppressed}));}
else throw Error('Usage: register LATEST_EXPORT NEW_PRIVATE_REGISTER [PREVIOUS_REGISTER] | sanitize OLD_EXPORT REGISTER NEW_PRIVATE_BACKUP');
