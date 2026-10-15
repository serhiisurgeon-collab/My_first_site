import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {externalAssets} from '../../tools/seo/test-assets.mjs';
const require=createRequire(import.meta.url), {phraseIndex}=require('../../spanish-bot.js');
const data=JSON.parse(await readFile(new URL('../../data/phrases.json',import.meta.url)));
assert.equal(data.phrases.length,30);
const start=Date.parse(data.cycle_start_utc);
assert.equal(phraseIndex(start-1,data.cycle_start_utc),29);
for(let i=0;i<60;i++) assert.equal(phraseIndex(start+i*86400000,data.cycle_start_utc),i%30);
const base=process.env.SITE_BASE_URL || 'http://127.0.0.1:8156';
const artifacts=process.env.SCREENSHOT_DIR || '/workspace/artifacts/spanish-four-languages';
await mkdir(artifacts,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
let cases=0;
try {
 for(const lang of ['uk','en']) for(const width of [360,390,768,1440]) {
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400) failed.push(r.url());});
  await page.route(/^https:\/\//,externalAssets);
  const path=lang==='uk'?'/spanish-bot.html':'/en/spanish-bot-en.html';
  await page.goto(base+path); await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(()=>/UTC\+0/.test(document.querySelector('#phrase-date').textContent)&&!document.querySelector('#phrase-date').textContent.includes('30'));
  assert.equal(await page.locator('.bot-feature').count(),6);
  assert.equal(await page.locator('.bot-plan__features li').count(),8);
  assert.equal(await page.locator('h1').count(),1);
  assert.match(await page.locator('h1').textContent(),lang==='uk'?/Чотири мови/:/Four languages/);
  const canonical='https://serhiipelishenko.com'+path;
  assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),canonical);
  assert.equal(await page.locator('link[rel=canonical]').count(),1);
  assert.equal(await page.locator('meta[property="og:url"]').getAttribute('content'),canonical);
  for(const language of ['uk','en']) assert.equal(await page.locator(`link[hreflang="${language}"]`).count(),1);
  for(const a of await page.locator('a[href*="t.me/"]').all()) assert.equal(await a.getAttribute('href'),'https://t.me/serhii_spanish_bot');
  assert.equal(await page.locator('#phrase-uk').getAttribute('lang'),'uk');
  assert.equal(await page.locator('#phrase-en').getAttribute('lang'),'en');
  const index=phraseIndex(Date.now(),data.cycle_start_utc);
  assert.equal(await page.locator('#phrase-es').textContent(),data.phrases[index].es);
  assert.equal(await page.locator('#phrase-example-translation').textContent(),data.phrases[index]['example_'+lang]);
  const nav=page.locator('.site-nav__links a[href*="projects"]');
  assert.equal(await nav.getAttribute('aria-current'),'page');
  if(width<901){
   const menu=page.locator('.site-nav__toggle'); await menu.click();
   assert.equal(await menu.getAttribute('aria-expanded'),'true');
   await menu.click();assert.equal(await menu.getAttribute('aria-expanded'),'false');
  }
  await page.locator('.bot-actions a[href="#features"]').click();
  await page.waitForTimeout(1100);
  for(const card of await page.locator('.bot-feature').all()) {
   await card.scrollIntoViewIfNeeded();await page.waitForTimeout(1100);
   assert.equal(await card.evaluate(e=>getComputedStyle(e).opacity),'1');
  }
  await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(900);
  await page.locator('.bot-feature').first().scrollIntoViewIfNeeded();await page.waitForTimeout(1100);
  assert.equal(await page.locator('.bot-feature').first().evaluate(e=>getComputedStyle(e).opacity),'1');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  if([390,1440].includes(width)){
   // Reveal all sections before capturing the complete composition.
   await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(200);
   await page.screenshot({path:`${artifacts}/${lang}-${width}.png`,fullPage:true});
  }
  const other=page.locator('.site-nav__language-option[lang="'+(lang==='uk'?'en':'uk')+'"]');
  await other.click();await page.waitForURL(base+(lang==='uk'?'/en/spanish-bot-en.html':'/spanish-bot.html'));
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  await page.close();cases++;
 }
 // Actual UTC rollover in a tab left open, including a 30-day wrap.
 const page=await browser.newPage({timezoneId:'Pacific/Honolulu'});await page.route(/^https:\/\//,externalAssets);
 await page.clock.install({time:new Date(start+29*86400000+86399000)});
 await page.goto(base+'/spanish-bot.html');await page.waitForTimeout(100);
 assert.equal(await page.locator('#phrase-es').textContent(),data.phrases[29].es);
 await page.clock.fastForward(1100);
 assert.equal(await page.locator('#phrase-es').textContent(),data.phrases[0].es);
 await page.close();
 for(const lang of ['uk','en']) for(const mode of ['no-js','reduced-motion','json-failure']) {
  const page=await browser.newPage({viewport:{width:390,height:844},javaScriptEnabled:mode!=='no-js',reducedMotion:mode==='reduced-motion'?'reduce':'no-preference'});
  await page.route(/^https:\/\//,externalAssets);
  if(mode==='json-failure') await page.route('**/data/phrases.json',r=>r.abort());
  await page.goto(base+(lang==='uk'?'/spanish-bot.html':'/en/spanish-bot-en.html'));
  for(const card of await page.locator('.bot-feature').all()) {
   await card.scrollIntoViewIfNeeded();await page.waitForTimeout(1000);
   assert.equal(await card.evaluate(e=>getComputedStyle(e).opacity),'1');
  }
  assert.ok((await page.locator('#phrase-es').textContent()).length>0);
  await page.close();cases++;
 }
 console.log(`PASS ${cases} responsive/navigation/fallback cases; 60 UTC index cases; live UTC midnight cycle wrap; six-card re-entry; metadata; menu and language links; Telegram URLs; no local 404 or page errors`);
} finally {await browser.close();}
