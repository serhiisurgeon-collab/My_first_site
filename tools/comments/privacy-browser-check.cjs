// Only synthetic loopback emulator projects. No real Google OAuth.
const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs/promises');
const {execFileSync,execFile}=require('node:child_process');const exec=require('node:util').promisify(execFile);
const base=process.env.COMMENTS_TEST_ORIGIN||'http://127.0.0.1:8133';if(!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base))throw Error('Loopback origin required');
const encode=v=>Buffer.from(JSON.stringify(v)).toString('base64url');const token=uid=>encode({alg:'none',typ:'JWT'})+'.'+encode({iss:'https://accounts.google.com',aud:'demo-key',sub:uid+'-google',email:(uid==='demo-admin'?'admin':'reader')+'@example.test',email_verified:true,name:uid==='demo-admin'?'Demo admin':'Demo reader',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600})+'.';
(async()=>{
 const servedConfig=await (await fetch(base+'/js/comments/config.js')).text();
 if(!/projectId["']?\s*:\s*["']demo-serhii-comments["']/.test(servedConfig)||!servedConfig.includes('firestorePort'))throw Error('Refusing browser test: start serve-local.py without --web-config (loopback emulators only)');
 const reset=await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-serhii-comments/databases/(default)/documents',{method:'DELETE'});assert(reset.ok);execFileSync(process.execPath,['tools/comments/seed.mjs']);
 const {localServices}=await import('./local.mjs');const {deleteApp}=await import('firebase-admin/app');const {readCurrent}=await import('./restore.mjs');const {db,app}=localServices('demo-serhii-comments');
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});let checks=0;const check=(v,label)=>{assert.ok(v,label);checks++;};const assets=new Map();
 const out='/tmp/comments-privacy-review';await fs.mkdir(out,{recursive:true});
 const settings=(visibility,enabled=false)=>({visibility,enabled,moderationMode:'pre',schemaVersion:2});
 async function open(lang,width,adminEntry=false){
  const ctx=await browser.newContext({viewport:{width,height:844}});await ctx.route(/^https:\/\/(apis\.google\.com|fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com)\//,async r=>{try{const url=r.request().url();if(!assets.has(url))assets.set(url,exec('curl',['--fail','--silent','--show-error','--max-time','30',url],{encoding:'buffer',maxBuffer:10*1024*1024}));const a=await assets.get(url);await r.fulfill({body:a.stdout,contentType:url.includes('fonts.googleapis.com')||url.endsWith('.css')?'text/css':url.includes('apis.google.com')?'application/javascript':'application/octet-stream'});}catch{await r.abort();}});
  const p=await ctx.newPage();await p.route('**/marked.min.js',r=>r.fulfill({path:'/tmp/article-check-marked.js',contentType:'application/javascript'}));
  await p.route('**/js/comments/api.js*',async r=>{const response=await r.fetch();let body=await response.text();body=body.replace("login:()=>f.signInWithPopup(auth,new f.GoogleAuthProvider())","login:()=>f.signInWithCredential(auth,f.GoogleAuthProvider.credential(window.__fakeToken))");await r.fulfill({response,body});});
  const path=lang==='uk'?'/article.html?article=how-kaolin-works':'/en/article-en.html?article=how-kaolin-works-en';await p.goto(base+path+'&commentsEmulator=1'+(adminEntry?'&commentsAdmin=1':''));await p.waitForFunction(()=>['ready','hidden'].includes(document.querySelector('#comments')?.dataset.state));return p;
 }
 async function login(p,uid){await p.evaluate(t=>window.__fakeToken=t,token(uid));await p.locator('.comments-auth button').click();if(uid==='demo-admin')await p.locator('.comments-admin').waitFor();else await p.getByText('Demo reader',{exact:false}).first().waitFor();await p.waitForTimeout(100);}
 try{
  await db.doc('settings/comments').set(settings('visible',true));
  for(const width of [1280,390,360])for(const lang of ['uk','en']){
   const p=await open(lang,width);await login(p,'demo-reader');await p.locator('#comment-text').waitFor();
   const box=p.locator('.comments-confirmation input'),submit=p.locator('.comments-form button[type=submit]');
   check(!(await box.isChecked())&&await submit.isDisabled(),'confirmation initially unchecked and submit disabled');
   check(await p.locator('#comments-publication-notice').innerText().then(t=>t.includes(lang==='uk'?'пацієнтів':'patients')),'patient information prohibition');
   check(await p.locator('.comments-form > a').getAttribute('href').then(h=>h.endsWith(lang==='uk'?'/policy.html':'/en/policy-en.html')),'localized privacy link');
   await p.locator('#comment-text').fill('Long example '+ 'long-word-'.repeat(40));await box.check();check(await submit.isEnabled(),'explicit confirmation enables submit');
   await p.locator('#comment-text').fill('Changed contribution');check(!(await box.isChecked())&&await submit.isDisabled(),'editing invalidates confirmation');
   await box.focus();await p.keyboard.press('Tab');await p.keyboard.press('Shift+Tab');check(await box.evaluate(e=>getComputedStyle(e).outlineStyle!=='none'),'checkbox focus visible');await p.keyboard.press('Space');check(await box.isChecked(),'keyboard confirmation');
   await p.getByText(lang==='uk'?'Видно лише вам і модератору':'Visible only to you and the moderator',{exact:false}).first().waitFor();check(true,'pending remains accessible after published ownership pages');
   check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
   await p.locator('.comments-form').scrollIntoViewIfNeeded();await p.screenshot({path:out+'/'+lang+'-'+width+'-confirmation.png'});
   check(await p.evaluate(()=>devicePixelRatio===1&&visualViewport.scale===1),'100 percent screenshots');await p.context().close();
  }
  const p=await open('uk',390);await login(p,'demo-reader');
  check(await p.evaluate(()=>Object.keys(sessionStorage).some(k=>k.includes('authUser'))),'Auth state in sessionStorage');
  check(await p.evaluate(()=>!Object.keys(localStorage).some(k=>k.includes('authUser'))),'no persistent localStorage Auth state');
  await p.reload();try{await p.locator('#comment-text').waitFor();}catch(e){console.error('Reload UI:',await p.locator('#comments').innerText());throw e;}check(true,'reload retains sign-in');
  await p.goto(base+'/article.html?article=medical-app-without-internet');await p.locator('#comment-text').waitFor();
  await p.locator('#comment-text').fill('Privacy review shared UA/EN contribution');await p.locator('.comments-confirmation input').check();await p.locator('.comments-form button[type=submit]').click();
  await p.getByText('Ваш коментар очікує схвалення.',{exact:true}).waitFor();
  const own=await db.collection('commentOwners').where('articleId','==','a-0004').get();const owner=own.docs[0];const publicRecord=(await db.doc('comments/'+owner.id).get()).data();
  check(!Object.hasOwn(publicRecord,'authorUid'),'stored public document has no UID');
  check(owner.data().confirmation.accepted===true&&owner.data().confirmation.version==='comments-publication-2026-10-v1'&&owner.data().confirmation.confirmedAt.isEqual(publicRecord.createdAt),'private confirmation version and exact server timestamp');
  await p.goto(base+'/en/article-en.html?article=medical-app-without-internet');await p.getByText('Privacy review shared UA/EN contribution',{exact:true}).waitFor();check(true,'pending UA contribution available in EN same tab');
  await p.locator('.comments-auth button').click();await p.getByRole('button',{name:'Sign in with Google',exact:true}).waitFor();await p.reload();await p.getByRole('button',{name:'Sign in with Google',exact:true}).waitFor();check(true,'logout survives reload');
  await login(p,'demo-reader');await p.locator('#comment-text').waitFor();const ctx=p.context();await p.close();const reopened=await ctx.newPage();await reopened.goto(base+'/article.html?article=how-kaolin-works');await reopened.getByRole('button',{name:'Увійти через Google',exact:true}).waitFor();check(true,'new tab after closure does not inherit sign-in');await ctx.close();
  check((await db.doc('comments/'+owner.id).get()).exists,'session ending retains comment');const account=await localServices('demo-serhii-comments').auth.listUsers();check(account.users.some(u=>u.uid==='demo-reader'),'Auth account retained');
  const admin=await open('en',390);await login(admin,'demo-admin');await admin.goto(base+'/en/article-en.html?article=medical-app-without-internet');await admin.locator('.comments-admin').waitFor();await admin.locator('.comments-admin [data-comment-id="'+owner.id+'"]').getByRole('button',{name:'Approve',exact:true}).click();await admin.locator('.comments-list [data-comment-id="'+owner.id+'"]').waitFor();check(true,'actual moderation works with private ownership');await admin.context().close();
  for(const lang of ['uk','en']){
   const fail=await open(lang,360);await fail.context().close();
   const context=await browser.newContext({viewport:{width:360,height:844}});await context.route('**/marked.min.js',r=>r.fulfill({path:'/tmp/article-check-marked.js',contentType:'application/javascript'}));await context.route('http://127.0.0.1:8080/**',r=>r.abort('failed'));const page=await context.newPage();await page.goto(base+(lang==='uk'?'/article.html?article=how-kaolin-works':'/en/article-en.html?article=how-kaolin-works-en'));await page.locator('#comments[data-state=error]').waitFor({timeout:20000});check((await page.locator('#articleContent').innerText()).length>1000,'article available when Firebase inaccessible');await context.close();
  }
  for(const lang of ['uk','en'])for(const width of [1280,390,360]){
   const context=await browser.newContext({viewport:{width,height:844}});const p=await context.newPage();await p.goto(base+(lang==='uk'?'/policy.html':'/en/policy-en.html'));check(await p.locator('.privacy-item').count()===13,'policy retains 13 sections');await p.locator('.privacy-item').evaluateAll(es=>es.forEach(e=>e.open=true));check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'policy no horizontal overflow');check(!(await p.locator('body').innerText()).match(/Draft update|Проєкт оновлення/),'no public draft markers');await p.screenshot({path:out+'/'+lang+'-'+width+'-policy.png'});await context.close();
  }
  console.log(JSON.stringify({result:'PASS',checks,widths:[1280,390,360],languages:['uk','en'],screenshots:out,scope:'Real Web SDK with loopback emulators; real Google OAuth and browser session restoration NOT RUN'},null,2));
 }finally{await browser.close();await db.terminate();await deleteApp(app);}
})().catch(e=>{console.error(e);process.exitCode=1});
