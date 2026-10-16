import {chromium} from 'playwright';import assert from 'node:assert/strict';import {mkdir} from 'node:fs/promises';import{externalAssets}from'../../tools/seo/test-assets.mjs';
const base=process.env.TEST_ORIGIN||'http://127.0.0.1:8156',dir='/workspace/artifacts/s-dose-mobile-hero';await mkdir(dir,{recursive:true});
const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let count=0;
try{for(const lang of ['uk','en'])for(const width of [320,360,390,768,820,1280]){
 const p=await b.newPage({viewport:{width,height:844}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.route(/^https:\/\//,externalAssets);await p.addInitScript(()=>sessionStorage.setItem('s-dose-partnership-shown','1'));
 await p.goto(base+(lang==='uk'?'/s-dose.html':'/en/s-dose-en.html'));await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(2000);
 const geometry=await p.evaluate(()=>{const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};};return{width:innerWidth,scroll:document.documentElement.scrollWidth,nav:rect('.site-nav'),content:rect('.s-dose-hero__content'),category:rect('.s-dose-hero__category'),actions:rect('.s-dose-hero__actions'),copyright:rect('.s-dose-hero__copyright')};});
 assert.ok(geometry.scroll<=width,`${lang} ${width} document overflow`);
 if(width<=820){assert.ok(geometry.content.left>=19&&geometry.content.right<=width-19,JSON.stringify(geometry));assert.ok(geometry.category.top>=geometry.nav.bottom+20,JSON.stringify(geometry));assert.ok(geometry.copyright.top>=geometry.actions.bottom+15,JSON.stringify(geometry));}
 for(const button of await p.locator('.s-dose-hero__actions .s-dose-button').all()){const r=await button.boundingBox();assert.ok(r.height>=48);assert.ok(r.x>=0&&r.x+r.width<=width+1);}
 if(await p.locator('.site-nav__toggle').isVisible()){await p.locator('.site-nav__toggle').click();assert.equal(await p.locator('.site-nav__toggle').getAttribute('aria-expanded'),'true');await p.locator('.site-nav__toggle').click();}
 await p.locator('[data-partnership-open]').click();await p.locator('dialog').waitFor({state:'visible'});await p.keyboard.press('Escape');await p.locator('dialog').waitFor({state:'hidden'});
 await p.evaluate(()=>scrollTo(0,0));if([390,1280].includes(width))await p.screenshot({path:`${dir}/${lang}-${width}.png`});
 assert.deepEqual(errors,[]);await p.close();count++;
}console.log(`PASS ${count} UA/EN viewport cases: gutters, fixed header clearance, copyright, touch buttons, menu and partnership dialog`);}finally{await b.close();}
