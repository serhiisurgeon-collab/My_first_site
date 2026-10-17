import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import {execFileSync} from 'node:child_process';
import {externalAssets} from '../../tools/seo/test-assets.mjs';
const base=process.env.TEST_ORIGIN||'http://127.0.0.1:8169';
const output=process.env.TEST_OUTPUT||'/workspace/artifacts/layout-fixes-20261017';
await fs.mkdir(output,{recursive:true});
const xml=await (await fetch(base+'/sitemap.xml')).text();
const pages=[...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>new URL(m[1]).pathname);
pages.push('/article.html?article=npa-effectiveness','/en/article-en.html?article=npa-effectiveness');
const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
let count=0;
try {
 for(const width of [320,360,390,1280]) for(const path of (process.env.PROJECTS_ONLY ? [] : pages)){
  const p=await b.newPage({viewport:{width,height:900}});
  await p.route(/^https:\/\//,externalAssets);
  await p.addInitScript(()=>{try{sessionStorage.setItem('s-dose-partnership-shown','1')}catch{}});
  await p.goto(base+path);if(path.includes('?'))await p.waitForURL('**/articles/npa-effectiveness/');await p.evaluate(()=>document.fonts.ready);
  const geometry=await p.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,controls:[...document.querySelectorAll('.site-nav__brand,.site-search-trigger,.site-nav__language-switcher,.site-nav__toggle')].filter(e=>e.getBoundingClientRect().width).map(e=>({class:e.className,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right}))}));
  assert.ok(geometry.scroll<=width,`${path} ${width}: document overflow ${geometry.scroll}`);
  for(const r of geometry.controls)assert.ok(r.left>=0&&r.right<=width+.5,`${path} ${width}: clipped ${JSON.stringify(r)}`);
  const menu=p.locator('.site-nav__toggle');
  if(await menu.isVisible()){await menu.click();assert.equal(await menu.getAttribute('aria-expanded'),'true');await p.locator('.mobile-nav').waitFor({state:'visible'});await menu.click();assert.equal(await menu.getAttribute('aria-expanded'),'false');await p.waitForTimeout(400);}
  if(width===320&&['/','/en/index-en.html','/spanish-bot.html','/articles/ccp-equipment-capability/'].includes(path))await p.screenshot({path:output+'/'+path.replaceAll('/','_')+'320.png'});
  await p.close();count++;
 }
 // Remote photo is proxy-blocked here; use a loaded image of realistic dimensions.
 const photo=await sharp({create:{width:1200,height:800,channels:3,background:'#999'}}).jpeg().toBuffer();
 const reveal=execFileSync('curl',['-fLs','--max-time','25','https://cdn.jsdelivr.net/npm/scrollreveal@4.0.9/dist/scrollreveal.min.js']);
 for(const path of ['/project/2d_try.html','/project/project_blood/blood_html.html'])for(const width of [320,390,1280]){
  const p=await b.newPage({viewport:{width,height:900}});await p.route(/^https:\/\//,externalAssets);
  await p.route('https://images.squarespace-cdn.com/**',r=>r.fulfill({body:photo,contentType:'image/jpeg'}));
  await p.route('https://unpkg.com/scrollreveal',r=>r.fulfill({body:reveal,contentType:'application/javascript'}));
  await p.goto(base+path);if(path.includes('?'))await p.waitForURL('**/articles/npa-effectiveness/');await p.evaluate(()=>document.fonts.ready);
  for(const position of [0,1000,0]){await p.evaluate(y=>scrollTo(0,y),position);await p.waitForTimeout(1100);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),width,`${path} ${width}: animation overflow`);}
  if(path.includes('2d_try')){await p.locator('.card').hover();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),width);}
  await p.screenshot({path:output+'/'+(path.includes('2d_try')?'dune':'donor')+'-'+width+'.png'});await p.close();count++;
 }
 console.log(`PASS ${count} layout cases: header control bounds, menus, Dune card/hover, donor reveal/reset`);
}finally{await b.close();}
