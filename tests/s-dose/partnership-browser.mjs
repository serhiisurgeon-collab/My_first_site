import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { externalAssets } from '../../tools/seo/test-assets.mjs';
const real=process.env.SDOSE_REAL_BANNERS==='1';
const artifacts='/workspace/artifacts/s-dose-partnership';
if(real) await fs.mkdir(artifacts,{recursive:true});
const browser = await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const origin=process.env.TEST_ORIGIN || 'http://127.0.0.1:8150';
const fixture='<svg xmlns="http://www.w3.org/2000/svg" width="1734" height="907"><rect width="1734" height="907" fill="#031525"/></svg>';
let count=0;
async function page(context,{fail=false}={}){
 await context.route(/^https:\/\//,real?externalAssets:r=>r.abort());
 if(fail||!real) await context.route('**/s-dose-partnership-*.webp',r=>fail?r.abort():r.fulfill({contentType:'image/svg+xml',body:fixture}));
 return context.newPage();
}
try {
 for(const lang of ['uk','en'])for(const width of [1280,390,360]){
  const context=await browser.newContext({viewport:{width,height:800}});const p=await page(context);const errors=[];p.on('pageerror',e=>errors.push(e.message));
  const bannerRequests=[];p.on('request',r=>{if(r.url().includes('/s-dose-partnership-'))bannerRequests.push(r.url());});
  const url=lang==='en'?'/en/s-dose-en.html':'/s-dose.html';await p.goto(origin+url);const d=p.locator('dialog.s-dose-partnership');await d.waitFor({state:'visible'});
  assert.equal(await d.getAttribute('aria-label'),lang==='en'?'S-Dose publishing partnership':'Партнерство для S-Dose');
  assert.ok((await d.locator('img').getAttribute('src')).includes(lang==='en'?'-en.webp':'-uk.webp'));
  assert.ok(bannerRequests.length===1&&bannerRequests.every(u=>u.includes(lang==='en'?'-en.webp':'-uk.webp')));
  assert.equal(await d.locator('a').getAttribute('href'),'mailto:hello@serhiipelishenko.com?subject=S-Dose%20publishing%20partnership');
  assert.equal(await p.evaluate(()=>document.activeElement.className),'s-dose-partnership__close');
  if(real){await p.evaluate(()=>document.fonts.ready);await p.screenshot({path:`${artifacts}/${lang}-${width}.png`});const dimensions=await d.locator('img').evaluate(i=>({w:i.naturalWidth,h:i.naturalHeight}));assert.deepEqual(dimensions,{w:1734,h:907});}
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await p.keyboard.press('Shift+Tab');assert.equal(await p.evaluate(()=>document.activeElement.tagName),'A');await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.tagName),'BUTTON');
  await d.locator('img').click();assert.equal(await d.evaluate(e=>e.open),true);
  await p.keyboard.press('Escape');await d.waitFor({state:'hidden'});await p.waitForFunction(()=>document.activeElement.hasAttribute('data-partnership-open'));assert.equal(await p.evaluate(()=>document.activeElement.hasAttribute('data-partnership-open')),true);
  assert.equal(await p.evaluate(()=>document.body.style.overflow),'');
  await p.reload();assert.equal(await d.evaluate(e=>e.open),false);
  await p.locator('[data-partnership-open]').click();await d.waitFor({state:'visible'});await d.locator('button').click();await d.waitFor({state:'hidden'});
  await p.locator('[data-partnership-open]').click();await d.waitFor({state:'visible'});await p.mouse.click(2,2);await d.waitFor({state:'hidden'});
  await p.locator('.site-nav__language-option[lang="'+(lang==='en'?'uk':'en')+'"]').click();await p.waitForURL(origin+(lang==='en'?'/s-dose.html':'/en/s-dose-en.html'));assert.equal(await p.locator('dialog.s-dose-partnership').evaluate(e=>e.open),false);
  assert.deepEqual(errors,[]);await context.close();count++;
 }
 for(const fail of [false,true]){
  const context=await browser.newContext();await context.addInitScript(()=>Object.defineProperty(window,'sessionStorage',{get(){throw new DOMException('blocked','SecurityError')}}));const p=await page(context,{fail});await p.goto(origin+'/s-dose.html');assert.equal(await p.locator('dialog').evaluate(e=>e.open),false);await p.locator('[data-partnership-open]').click();
  if(fail){await p.locator('[data-partnership-status]').waitFor({state:'visible'});assert.equal(await p.locator('dialog').evaluate(e=>e.open),false);assert.ok(await p.locator('[data-partnership-status] a').getAttribute('href'));}else{await p.locator('dialog').waitFor({state:'visible'});await p.keyboard.press('Escape');}
  await context.close();count++;
 }

 for(const lang of ['uk','en']) {
  const context=await browser.newContext({viewport:{width:390,height:240},reducedMotion:'reduce'});const p=await page(context);await p.goto(origin+(lang==='uk'?'/s-dose.html':'/en/s-dose-en.html'));const d=p.locator('dialog');await d.waitFor({state:'visible'});await d.evaluate(e=>e.scrollTop=e.scrollHeight);const close=d.locator('button');assert.equal(await close.isVisible(),true);const rect=await close.boundingBox();assert.ok(rect.y>=0&&rect.y+rect.height<=240);assert.equal(await d.locator('a').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');await close.click();await context.close();count++;
 }
 for(const lang of ['uk','en']) {
  const context=await browser.newContext();const p=await page(context,{fail:true});await p.goto(origin+(lang==='uk'?'/s-dose.html':'/en/s-dose-en.html'));await p.waitForFunction(()=>document.querySelector('.s-dose-partnership img')?.complete);assert.equal(await p.locator('dialog').evaluate(e=>e.open),false);assert.equal(await p.evaluate(()=>sessionStorage.getItem('s-dose-partnership-shown')),null);await p.locator('[data-partnership-open]').click();await p.locator('[data-partnership-status]').waitFor({state:'visible'});await context.close();count++;
 }
 const context=await browser.newContext({javaScriptEnabled:false});const p=await page(context);await p.goto(origin+'/s-dose.html');assert.equal(await p.locator('h1').innerText(),'S-Dose');assert.equal(await p.locator('[data-partnership-open]').isVisible(),false);await context.close();count++;
 console.log(`PASS ${count} browser scenarios; ${real?'owner banners; screenshots at 100%':'synthetic image fixture only, not owner-banner visual approval'}`);
} finally {await browser.close();}
