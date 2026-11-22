import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { externalAssets } from '../seo/test-assets.mjs';
const origin=process.env.TEST_ORIGIN||'http://127.0.0.1:8134';
const routes=['/','/en/index-en.html','/about.html','/en/about-en.html','/projects.html','/en/projects-en.html','/articles.html','/en/articles-en.html','/contact.html','/en/contact-en.html','/404.html','/en/404.html','/policy.html','/en/policy-en.html','/s-dose.html','/en/s-dose-en.html','/spanish-bot.html','/en/spanish-bot-en.html','/de/spanish-bot-de.html','/es/spanish-bot-es.html','/articles/npa-effectiveness/','/en/articles/npa-effectiveness/'];
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const errors=[],badResponses=[],overflows=[];let cases=0;
try {
 const context=await browser.newContext();await context.route(/^https:\/\//,externalAssets);
 await context.route('**/js/comments/config.js',r=>r.fulfill({contentType:'application/javascript',body:'export const commentsConfig={enabled:false};'}));
 await context.addInitScript(()=>sessionStorage.setItem('s-dose-partnership-shown','1'));
 for(const route of routes)for(const width of [1440,390]){
  const page=await context.newPage();await page.setViewportSize({width,height:900});const key=route+'@'+width;
  page.on('console',message=>{if(message.type()==='error')errors.push({key,type:'console',message:message.text()})});
  page.on('pageerror',error=>errors.push({key,type:'pageerror',message:error.message}));
  page.on('response',response=>{if(response.url().startsWith(origin)&&response.status()>=400)badResponses.push({key,url:response.url(),status:response.status()})});
  await page.goto(origin+route);await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))overflows.push(key);
  await page.close();cases++;
 }
 const report={cases,errors,badResponses,overflows,firebase:'disabled in test only; no live database operations'};
 await fs.writeFile('docs/css-architecture-cleanup/browser-smoke.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 assert.deepEqual(errors,[]);assert.deepEqual(badResponses,[]);assert.deepEqual(overflows,[]);
}finally{await browser.close()}
