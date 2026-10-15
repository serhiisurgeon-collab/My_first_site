import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {externalAssets} from '../../tools/seo/test-assets.mjs';
const base=process.env.SITE_BASE_URL||'http://127.0.0.1:8156';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try {
 for(const lang of ['uk','en']) {
  const page=await browser.newPage();await page.route(/^https:\/\//,externalAssets);
  for(const path of lang==='uk'?['/','/projects.html']:['/en/index-en.html','/en/projects-en.html']) {
   await page.goto(base+path);
   const card=page.locator('article').filter({has:page.locator('h3',{hasText:'Spanish by Serhii'})});
   assert.equal(await card.count(),1);
   assert.match(await card.textContent(),lang==='uk'?/німецька/:/German/);
   const link=card.locator('a[href*="spanish-bot"]');
   assert.equal(await link.count(),1);
   const url=new URL(await link.getAttribute('href'),base+path);
   assert.equal(url.pathname,lang==='uk'?'/spanish-bot.html':'/en/spanish-bot-en.html');
   const popup=page.waitForEvent('popup');await link.click();const opened=await popup;await opened.waitForLoadState();
   assert.equal(new URL(opened.url()).pathname,url.pathname);await opened.close();
  }
  await page.goto(base+(lang==='uk'?'/spanish-bot.html':'/en/spanish-bot-en.html'));
  await page.locator('.site-search-trigger').click();await page.locator('.site-search__input').fill(lang==='uk'?'німецька':'German');
  const result=page.locator('.site-search a').filter({hasText:'Spanish by Serhii'});
  await result.first().waitFor();assert.ok(await result.count()>=1);
  assert.equal(new URL(await result.first().getAttribute('href')).pathname,lang==='uk'?'/spanish-bot.html':'/en/spanish-bot-en.html');
  await page.close();
 }
 console.log('PASS four home/project card links open the right language; UA/EN search finds the bot by German');
} finally {await browser.close();}
