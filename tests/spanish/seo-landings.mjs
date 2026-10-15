import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {load} from 'cheerio';
import {externalAssets} from '../../tools/seo/test-assets.mjs';
const base=process.env.SITE_BASE_URL||'http://127.0.0.1:8156';
const paths={uk:'/spanish-bot.html',en:'/en/spanish-bot-en.html',de:'/de/spanish-bot-de.html',es:'/es/spanish-bot-es.html'};
const dir='/workspace/artifacts/spanish-seo-four-locales';await mkdir(dir,{recursive:true});
const sitemap=await readFile('sitemap.xml','utf8');
for(const [lang,path] of Object.entries(paths)){
 const $=load(await readFile('.'+path,'utf8'));
 assert.equal($('html').attr('lang'),lang);assert.equal($('h1').length,1);
 assert.equal($('link[rel=canonical]').attr('href'),'https://serhiipelishenko.com'+path);
 assert.equal($('meta[property="og:url"]').attr('content'),'https://serhiipelishenko.com'+path);
 assert.equal($('meta[name="twitter:title"]').attr('content'),$('title').text());
 assert.equal($('link[hreflang]').length,4);
 for(const [l,p] of Object.entries(paths))assert.equal($(`link[hreflang=${l}]`).attr('href'),'https://serhiipelishenko.com'+p);
 assert.equal($('meta[name=robots]').length,0);assert.equal($('.bot-language').length,4);assert.equal($('.bot-language__sample').length,4);assert.equal($('.bot-faq article').length,7);assert.equal($('.bot-feature').length,6);
 assert.ok(sitemap.includes('https://serhiipelishenko.com'+path));
 assert.equal($('h2').length,5);
 if(lang==='uk'){assert.equal($('title').text(),'Telegram-бот для вивчення мов — Spanish by Serhii');assert.equal($('h1').text(),'Вивчайте українську, англійську, німецьку та іспанську в Telegram');}
 if(lang==='en'){assert.equal($('title').text(),'Telegram Language Learning Bot — Spanish by Serhii');assert.equal($('h1').text(),'Learn Ukrainian, English, German and Spanish in Telegram');}
assert.equal($('script[type="application/ld+json"]').length,0);
 for(const a of $('a[href*="t.me/"]').toArray()) {assert.equal($(a).attr('href'),'https://t.me/serhii_spanish_bot');assert.ok($(a).attr('data-telegram-location'));}
}
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let count=0;
try{
 for(const [lang,path] of Object.entries(paths))for(const width of [360,390,768,1024,1440]){
  const p=await browser.newPage({viewport:{width,height:900}}),errors=[],bad=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)bad.push(r.url());});
  await p.route(/^https:\/\//,externalAssets);await p.goto(base+path);await p.evaluate(()=>document.fonts.ready);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${lang} ${width} overflow`);
  assert.equal(await p.locator('.site-nav__language-option').count(),4);
  assert.equal(await p.locator('.site-nav__language-option[aria-current=page]').textContent(),lang==='uk'?'UA':lang.toUpperCase());
  const toggle=p.locator('.site-nav__toggle');if(await toggle.isVisible()){
   await toggle.click();await p.waitForTimeout(400);assert.equal(await toggle.getAttribute('aria-expanded'),'true');
   assert.ok(await p.locator('.mobile-nav').evaluate(e=>e.getBoundingClientRect().height>200));
   await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  }
  // All internal hrefs and resources resolve; fragments refer to actual targets.
  const missing=await p.evaluate(async()=>{
   const urls=[...new Set([...document.querySelectorAll('a[href],script[src],link[rel=stylesheet]')].map(e=>e.href||e.src).filter(v=>v&&v.startsWith(location.origin)))];
   return (await Promise.all(urls.map(async u=>{const url=new URL(u);if(url.pathname===location.pathname&&url.hash&&!document.getElementById(decodeURIComponent(url.hash.slice(1))))return u;const r=await fetch(url.pathname+url.search);return r.ok?null:u;}))).filter(Boolean);
  });assert.deepEqual(missing,[]);
  await p.locator('a[href="#features"]').click();await p.waitForTimeout(700);
  await p.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await p.locator('.bot-feature').first().evaluate(e=>getComputedStyle(e).opacity),'1');
  await p.evaluate(()=>scrollTo(0,0));
  if([390,1440].includes(width))await p.screenshot({path:`${dir}/${lang}-${width}.png`,fullPage:true});
  for(const [other,target] of Object.entries(paths)){await p.locator(`.site-nav__language-option[lang=${other}]`).click();await p.waitForURL(base+target);}
  assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);await p.close();count++;
 }
 // No JS: all substantive text, examples, FAQ and translations are present.
 for(const path of Object.values(paths)){
  const p=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:844}});await p.route(/^https:\/\//,externalAssets);await p.goto(base+path);
  assert.equal(await p.locator('.bot-language').count(),4);assert.equal(await p.locator('.bot-faq article').count(),7);
  assert.equal(await p.locator('.bot-feature').first().evaluate(e=>getComputedStyle(e).opacity),'1');
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await p.close();
 }
 // No analytics is loaded. Consent gate, deduplication and revocation work in isolation.
 const p=await browser.newPage();await p.goto(base+paths.uk);
 const events=await p.evaluate(async()=>{
  const {installTelegramAnalytics}=await import('/js/telegram-analytics.js');let consent=false;const sent=[];
  const config={hasAnalyticsConsent:()=>consent,sendEvent:(name,params)=>sent.push({name,params})};
  const first=installTelegramAnalytics(config),second=installTelegramAnalytics(config);
  const link=document.querySelector('a[data-telegram-location=hero]');link.addEventListener('click',e=>e.preventDefault());
  link.click();consent=true;link.click();consent=false;link.click();first();consent=true;link.click();
  return {sent,same:first===second};
 });assert.equal(events.same,true);assert.deepEqual(events.sent,[{name:'telegram_bot_click',params:{page_language:'uk',button_location:'hero'}}]);await p.close();
 console.log(`PASS ${count} four-language viewport cases, all internal links, mutual language switching, metadata and sitemap; four no-JS cases; consent-gated analytics adapter (not activated)`);
}finally{await browser.close();}
