// Regression: reset:true ScrollReveal must not enlarge the mobile page after a return.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
import sharp from 'sharp';
import {externalAssets} from '../../tools/seo/test-assets.mjs';
const base=process.env.SITE_BASE_URL || 'http://127.0.0.1:8156';
const reveal=execFileSync('curl',['-fLs','--max-time','25','https://cdn.jsdelivr.net/npm/scrollreveal@4.0.9/dist/scrollreveal.min.js']);
// The remote photograph is unavailable in this environment. Exercise a loaded,
// full-width image instead of silently testing a collapsed broken image.
const image=await sharp({create:{width:1200,height:800,channels:3,background:'#999'}}).jpeg().toBuffer();
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
let passed=0;
try {
 for(const width of [360,390]) for(const [folder,file,selector] of [
  ['page_aboutus','aboutus_html.html','.blood-project-return__link'],
  ['page_contact','contact_html.html','.blood-project-return__link'],
  ['page_donor','donor_html.html','.donor-info__back'],
  ['page_news','news_html.html','.blood-news__back'],
 ]) {
  const context=await browser.newContext({viewport:{width,height:844}});
  await context.route(/^https:\/\//,externalAssets);
  await context.route('https://unpkg.com/scrollreveal',r=>r.fulfill({body:reveal,contentType:'application/javascript'}));
  await context.route('https://images.squarespace-cdn.com/**',r=>r.fulfill({body:image,contentType:'image/jpeg'}));
  const page=await context.newPage();
  const home=base+'/project/project_blood/blood_html.html';
  await page.goto(home);
  await page.goto(base+`/project/project_blood/${folder}/${file}`);
  await page.locator(selector).first().click();
  await page.waitForURL(home);
  for(const y of [1500,2500,0]) {
   await page.evaluate(y=>scrollTo(0,y),y);
   await page.waitForTimeout(1100);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width,`${folder}, ${width}px, scroll ${y}`);
  }
  assert.equal(await page.locator('.photo_room').evaluate(e=>getComputedStyle(e).transform),'none');
  await context.close(); passed++;
 }
 console.log(`PASS ${passed} mobile return routes with loaded image and real ScrollReveal`);
} finally {await browser.close();}
