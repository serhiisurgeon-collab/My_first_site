import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {externalAssets} from '../../tools/seo/test-assets.mjs';
const base=process.env.SITE_BASE_URL || 'http://127.0.0.1:8156';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
let checks=0;
try {
 for(const width of [360,390,768,1024,1280,1920]) {
  const page=await browser.newPage({viewport:{width,height:900}});
  await page.route(/^https:\/\//,externalAssets);
  await page.goto(base+'/project/project_blood/blood_html.html');
  const cards=page.locator('.card-interactive');
  assert.equal(await page.locator('.text-disclosure').count(),4);
  for(let i=0;i<4;i++) {
   const card=cards.nth(i),text=card.locator('[data-collapsible-text]'),button=card.locator('.text-disclosure');
   await card.scrollIntoViewIfNeeded();
   await card.hover();
   await page.waitForTimeout(600);
   assert.equal(await text.evaluate(e=>getComputedStyle(e).webkitLineClamp),'5');
   await button.click({timeout:5000});
   assert.equal(await button.getAttribute('aria-expanded'),'true');
   assert.equal(await button.textContent(),'Показати менше');
   assert.equal(await text.evaluate(e=>e.scrollHeight<=e.clientHeight+1),true);
   await button.click({timeout:5000});
   assert.equal(await button.getAttribute('aria-expanded'),'false');
   assert.equal(await button.textContent(),'Більше…');
   // Keyboard reopening and collapsing, without a mouse click.
   await button.focus(); await page.keyboard.press('Enter');
   assert.equal(await button.getAttribute('aria-expanded'),'true');
   await page.keyboard.press('Space');
   assert.equal(await button.getAttribute('aria-expanded'),'false');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   checks++;
  }
  await page.close();
 }
 const page=await browser.newPage({javaScriptEnabled:false});
 await page.route(/^https:\/\//,externalAssets);
 await page.goto(base+'/project/project_blood/blood_html.html');
 assert.equal(await page.locator('.is-collapsed').count(),0);
 assert.equal(await page.locator('[data-collapsible-text]').count(),4);
 console.log(`PASS ${checks} card/viewport cases: mouse + keyboard expand/collapse; five lines; no horizontal overflow; no-JS full text`);
} finally {await browser.close();}
