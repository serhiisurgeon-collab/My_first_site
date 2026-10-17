import {chromium} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {load} from 'cheerio';import{externalAssets}from'../../tools/seo/test-assets.mjs';
const origin=process.env.ARTICLE_TEST_ORIGIN||'http://127.0.0.1:8168';const slug='ccp-equipment-capability',out='/workspace/artifacts/ccp-equipment-review';await fs.mkdir(out,{recursive:true});
const api=`export async function createCommentsApi(){window.__commentsStarts=(window.__commentsStarts||0)+1;return {settings:async()=>({enabled:false,visibility:'visible',moderationMode:'pre'}),page:async()=>({items:[],hasMore:false}),onAuth:fn=>fn(null)}}`;
const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let cases=0;
try{for(const lang of ['uk','en'])for(const width of (process.env.CCP_NAV_ONLY?[]:[320,390,1280]))for(const slow of [false,true]){
 const context=await b.newContext({viewport:{width,height:900}});await context.route(/^https:\/\//,externalAssets);await context.route('**/js/comments/api.js*',r=>r.fulfill({contentType:'application/javascript',body:api}));
 if(slow)await context.route(/\.(?:js|css|json|webp|png)(?:\?.*)?$/,async r=>{if(r.request().url().startsWith(origin)){await new Promise(resolve=>setTimeout(resolve,350));}await r.fallback();});
 await context.addInitScript(()=>{window.__contentSnapshots=[];const record=()=>{const h=document.querySelector('h1');if(h)window.__contentSnapshots.push(h.textContent);};new MutationObserver(record).observe(document,{childList:true,subtree:true,characterData:true});});
 const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));const path=`/${lang==='en'?'en/':''}articles/${slug}/`,url=origin+path;
 const expected=JSON.parse(await fs.readFile(lang==='en'?'data/articles-en.json':'data/articles.json')).find(a=>a.slug===slug).title;
 const initialSource=load(await fs.readFile((lang==='en'?'en/':'')+'articles/'+slug+'/index.html','utf8'));const expectedBody=initialSource('#articleContent').text().replace(/\s+/g,' ').trim();
 const response=await p.goto(url);assert.equal(response.status(),200);assert.ok((await response.text()).includes(expected));await p.evaluate(()=>document.fonts.ready);await p.waitForFunction(()=>window.__commentsStarts===1);
 const check=async()=>{await p.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await p.waitForTimeout(100);
 assert.equal(await p.locator('h1').textContent(),expected);assert.equal(await p.locator('html').getAttribute('data-article-id'),'a-0006');assert.equal(await p.locator('link[rel=canonical]').getAttribute('href'),'https://serhiipelishenko.com'+path);
 assert.equal((await p.locator('#articleContent').textContent()).replace(/\s+/g,' ').trim(),expectedBody);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 const titleRect=await p.locator('h1').boundingBox(),nav=await p.locator('.site-nav').boundingBox();assert.ok(titleRect.y>=nav.y+nav.height);
 const snapshots=await p.evaluate(()=>window.__contentSnapshots);assert.ok(snapshots.length);assert.ok(snapshots.every(t=>t===expected),'foreign heading appeared');
 assert.equal(await p.locator('script[data-article-schema]').count(),1);assert.equal(await p.locator('script[src*="comments/index.js"]').count(),1);
 const imgs=p.locator('#articleContent img');assert.equal(await imgs.count(),2);
 for(const img of await imgs.all()){await img.scrollIntoViewIfNeeded();await p.waitForFunction(src=>{const i=[...document.images].find(i=>i.src===src);return i?.complete&&i.naturalWidth>0;},await img.getAttribute('src').then(s=>origin+s));const d=await img.evaluate(i=>({src:i.getAttribute('src'),w:i.naturalWidth,h:i.naturalHeight,r:i.getBoundingClientRect().width/i.getBoundingClientRect().height,width:i.getAttribute('width'),height:i.getAttribute('height')}));assert.match(d.src,/^\/content\/articles\/uk\/image\//);assert.equal(d.w,1536);assert.equal(d.h,1024);assert.equal(d.width,'1536');assert.equal(d.height,'1024');assert.ok(Math.abs(d.r-1.5)<.01);}
 assert.equal(await p.evaluate(()=>window.__commentsStarts),1);
 };
 await check();await p.reload();await p.waitForFunction(()=>window.__commentsStarts===1);await check();
 if(!slow&&[390,1280].includes(width)){await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:`${out}/${lang}-${width}-top.png`});await p.locator('#articleContent img').first().scrollIntoViewIfNeeded();await p.screenshot({path:`${out}/${lang}-${width}-image.png`});}
 const other=lang==='uk'?'en':'uk';await p.locator(`.site-nav__language-option[lang=${other}]`).click();await p.waitForURL(origin+`/${other==='en'?'en/':''}articles/${slug}/`);assert.equal(await p.locator('html').getAttribute('data-article-id'),'a-0006');await p.goBack();await p.waitForURL(url);assert.equal(await p.locator('h1').textContent(),expected);await p.goForward();await p.waitForURL(origin+`/${other==='en'?'en/':''}articles/${slug}/`);
 assert.deepEqual(errors,[]);await context.close();cases++;
}
// Real catalog links, including arriving from a different publication.
for(const lang of ['uk','en']){
 const p=await b.newPage({viewport:{width:390,height:844}});await p.route(/^https:\/\//,externalAssets);await p.route('**/js/comments/api.js*',r=>r.fulfill({contentType:'application/javascript',body:api}));
 const catalog=lang==='uk'?'/articles.html':'/en/articles-en.html',path=`/${lang==='en'?'en/':''}articles/${slug}/`;
 await p.goto(origin+`/${lang==='en'?'en/':''}articles/npa-effectiveness/`);await p.locator('.site-nav__toggle').click();await p.locator('.mobile-nav a[href*="articles"]').first().click();await p.waitForURL(origin+catalog);
 const card=p.locator('a[href="'+path+'"]').first();assert.ok(await card.count());await card.click();await p.waitForURL(origin+path);assert.equal(await p.locator('html').getAttribute('data-article-id'),'a-0006');await p.close();
 const context=await b.newContext({javaScriptEnabled:false,viewport:{width:320,height:844}});const q=await context.newPage();await q.goto(origin+path);assert.equal(await q.locator('h1').count(),1);assert.ok((await q.locator('#articleContent').textContent()).length>10000);assert.equal(await q.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await context.close();
}
console.log(`PASS ${cases} cold/slow UA/EN viewport cases + catalog/history/no-JS; no foreign heading, shared 1536x1024 images, single comments init, stable a-0006`);
}finally{await b.close();}
