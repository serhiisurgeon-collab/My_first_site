import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {externalAssets} from '../../tools/seo/test-assets.mjs';
const root=process.cwd();
const out=process.env.ABOUT_ARTIFACTS||'/workspace/work/about-profile/screenshots';
await fs.mkdir(out,{recursive:true});
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403).end();return}try{if((await fs.stat(file)).isDirectory())file=path.join(file,'index.html');res.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream'});res.end(await fs.readFile(file))}catch{res.writeHead(404).end()}});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
let cases=0;
const readBiography=async page=>(await page.locator("#profile-bio p").allTextContents()).map(text=>text.trim()).join("\n\n");
const inspect=()=>({overflow:document.documentElement.scrollWidth>innerWidth,h1:document.querySelector('h1').textContent,gallery:[...document.querySelectorAll('.profile-gallery-item img')].map(i=>({loaded:i.complete&&i.naturalWidth>0,alt:i.alt})),portrait:document.querySelector('.profile-portrait img').getBoundingClientRect().top,buttons:document.querySelector('.profile-actions').getBoundingClientRect().bottom});
async function verifyPortraitReflection(page) {
 const portrait=page.locator('.profile-portrait');
 const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await portrait.evaluate(e=>window.scrollTo({top:e.getBoundingClientRect().top+window.scrollY-150,behavior:'instant'}));
 await settle();
 await page.waitForFunction(()=>document.querySelector('.profile-portrait').style.getPropertyValue('--portrait-glint-angle'));
 const angle=()=>portrait.evaluate(e=>e.style.getPropertyValue('--portrait-glint-angle'));
 const before=await angle();
 const imageTop=await portrait.locator('img').evaluate(e=>e.getBoundingClientRect().top);
 await page.evaluate(()=>window.scrollBy({top:100,behavior:'instant'}));
 await settle();
 await page.waitForFunction(previous=>document.querySelector('.profile-portrait').style.getPropertyValue('--portrait-glint-angle')!==previous,before);
 const after=await angle();
 const image=await portrait.locator('img').evaluate(e=>({top:e.getBoundingClientRect().top,transform:getComputedStyle(e).transform}));
 assert.ok(Math.abs(imageTop-image.top-100)<1,'portrait scrolls normally without parallax');
 assert.equal(image.transform,'none');
 await page.waitForTimeout(100);
 assert.equal(await angle(),after,'reflection stops when scrolling stops');
 await page.evaluate(()=>window.scrollBy({top:-100,behavior:'instant'}));
 await page.waitForFunction(expected=>document.querySelector('.profile-portrait').style.getPropertyValue('--portrait-glint-angle')===expected,before);
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.waitForFunction(()=>!document.querySelector('.profile-portrait').style.getPropertyValue('--portrait-glint-angle'));
 await page.evaluate(()=>window.scrollBy({top:60,behavior:'instant'}));
 await page.waitForTimeout(100);
 assert.equal(await angle(),'','reduced motion keeps a static frame');
 assert.equal(await portrait.evaluate(e=>getComputedStyle(e).getPropertyValue('--portrait-glint-angle').trim()),'140deg');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.waitForFunction(()=>document.querySelector('.profile-portrait').style.getPropertyValue('--portrait-glint-angle'));
}
try {
 for(const lang of ['uk','en']) for(const width of [320,390,768,1024,1440]){
  const context=await browser.newContext({viewport:{width,height:960},acceptDownloads:true});await context.grantPermissions(['clipboard-read','clipboard-write'],{origin});await context.route(/^https:\/\//,externalAssets);
  const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));const route=lang==='uk'?'/about.html':'/en/about-en.html';await p.goto(origin+route);await p.evaluate(async()=>{await document.fonts.ready;return true});
  await verifyPortraitReflection(p);
  for(const img of await p.locator('.profile-gallery-item img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(i=>i.decode())}
  const data=await p.evaluate(inspect);assert.equal(data.overflow,false);assert.equal(await p.locator('h1').count(),1);assert.ok(data.gallery.every(i=>i.loaded&&i.alt));if(width<=760)assert.ok(data.portrait>=data.buttons,'mobile portrait follows introduction and buttons');
  const bio=await readBiography(p);const button=p.locator('[data-copy-bio]');await button.focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>document.querySelector('[data-copy-status]').textContent.length>0);assert.equal(await p.evaluate(()=>navigator.clipboard.readText()),bio);assert.equal(await button.evaluate(e=>e===document.activeElement),true);
  const downloadEvent=p.waitForEvent('download');await p.locator('a[download]').click();const download=await downloadEvent;assert.equal(download.suggestedFilename(),'serhii-pelishenko-professional-portrait.jpg');assert.deepEqual(await fs.readFile(await download.path()),await fs.readFile('assets/downloads/serhii-pelishenko-professional-portrait.jpg'));
  if(width===390||width===1440){await p.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await p.screenshot({path:path.join(out,`${lang}-${width}.png`),fullPage:true});await p.screenshot({path:path.join(out,`${lang}-${width}-hero.png`)});}
  const other=lang==='uk'?'en':'uk';await p.locator(`.site-nav__language-option[lang=${other}]`).click();await p.waitForURL(other==='en'?'**/en/about-en.html':'**/about.html');assert.equal(await p.locator('html').getAttribute('lang'),other);assert.deepEqual(errors,[]);
  await context.close();cases++;console.log(`PASS ${lang} ${width}px: layout, gallery, copy, focus, download and language switch`);
 }
 for(const lang of ['uk','en']){
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:900}});await context.route(/^https:\/\//,externalAssets);const p=await context.newPage();await p.goto(origin+(lang==='uk'?'/about.html':'/en/about-en.html'));assert.equal(await p.locator('[data-copy-bio]').isVisible(),false);assert.equal(await p.locator('#profile-bio').isVisible(),true);assert.equal(await p.locator('.profile-gallery-item').count(),3);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await context.close();cases++;
 }
 for(const failure of [false,true]){
  const context=await browser.newContext({viewport:{width:390,height:900},reducedMotion:'reduce'});await context.grantPermissions(['clipboard-read','clipboard-write'],{origin});await context.route(/^https:\/\//,externalAssets);
  await context.addInitScript(failure=>{Object.defineProperty(navigator.clipboard,'writeText',{value:async()=>{throw Error('Permission denied')}});if(failure)document.execCommand=()=>false},failure);
  const p=await context.newPage();await p.goto(origin+'/en/about-en.html');const button=p.locator('[data-copy-bio]');await button.click();await p.waitForFunction(()=>document.querySelector('[data-copy-status]').textContent.length>0);
  if(failure){assert.match(await p.locator('[data-copy-status]').textContent(),/copy it manually/);assert.equal(await p.locator('#profile-bio').evaluate(e=>e===document.activeElement),true);assert.equal(await p.evaluate(()=>getSelection().toString()),await readBiography(p));}
  else{assert.equal(await p.evaluate(()=>navigator.clipboard.readText()),await readBiography(p));assert.equal(await button.evaluate(e=>getComputedStyle(e).transitionDuration),'0s');assert.equal(await p.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior),'auto');}
  await context.close();cases++;
 }
 console.log(`PASS ${cases} About scenarios, including clipboard fallback/failure, no JS, reduced motion`);
} finally {await browser.close();await new Promise(r=>server.close(r))}
