import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import sharp from 'sharp';
import {externalAssets} from '../seo/test-assets.mjs';
const phase=process.argv[2];if(!['before','after'].includes(phase))throw Error('Use before or after');
const origin=process.env.TEST_ORIGIN||'http://127.0.0.1:8134',root=path.resolve('docs/css-architecture-cleanup'),work=process.env.CSS_AUDIT_WORK||path.resolve('.private/css-architecture');
await fs.mkdir(root+'/screenshots/'+phase,{recursive:true});await fs.mkdir(work,{recursive:true});
const properties=['display','position','width','height','margin','padding','color','background','backgroundColor','fontFamily','fontSize','fontWeight','lineHeight','border','borderRadius','boxShadow','gridTemplateColumns','gap','transform','opacity','minWidth','maxWidth','minHeight','maxHeight','overflow','alignItems','justifyContent','flexDirection','flexBasis','flexGrow','flexShrink','letterSpacing','textAlign','textDecoration','objectFit','objectPosition','filter','backdropFilter','maskImage','transition','animation'];
const routes=['/policy.html','/en/policy-en.html','/tools/css/fixtures/comments.html','/','/en/index-en.html','/about.html','/en/about-en.html','/projects.html','/en/projects-en.html','/articles.html','/en/articles-en.html','/contact.html','/en/contact-en.html','/404.html','/en/404.html','/s-dose.html','/en/s-dose-en.html','/spanish-bot.html','/en/spanish-bot-en.html','/articles/npa-effectiveness/','/en/articles/npa-effectiveness/'];
const legacy=['/project/2d_try.html','/2d_try.html','/project/project_blood/blood_html.html','/project/project_blood/page_aboutus/aboutus_html.html','/project/project_blood/page_donor/donor_html.html','/project/project_blood/page_news/news_html.html','/project/project_blood/page_contact/contact_html.html'];
const all=routes.flatMap(route=>[1440,1280,1024,768,390,360].map(width=>({route,width}))).concat(legacy.flatMap(route=>[1440,390].map(width=>({route,width}))));
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'no-preference'});await context.route(/^https:\/\//,externalAssets);
// Isolate CSS from live Firebase timing; the local fixture covers rendered discussion states.
await context.route('**/js/comments/config.js',route=>route.fulfill({contentType:'application/javascript',body:'export const commentsConfig={enabled:false};'}));
await context.addInitScript(()=>{window.setInterval=()=>0;try{sessionStorage.setItem('s-dose-partnership-shown','1')}catch{}});
const resume=process.argv.includes('--resume'),only=process.env.CSS_ROUTES?.split(',');
const results=resume?JSON.parse(gunzipSync(await fs.readFile(work+'/'+phase+'.json.gz'))):{},screens=resume?JSON.parse(await fs.readFile(work+'/'+phase+'-screens.json')):[],errors=[],coverage=[];
const freeze=async page=>{
 // Let DOMContentLoaded/scroll/resize callbacks run before finishing transitions.
 for(let cycle=0;cycle<3;cycle++){
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await page.evaluate(()=>{for(const animation of document.getAnimations()){try{if(animation.effect?.getComputedTiming().iterations===Infinity){animation.pause();animation.currentTime=0}else animation.finish()}catch{}}});
 }
};
const snapshot=(page,selector='body *')=>page.evaluate(({properties,selector})=>[...document.querySelectorAll(selector)].filter(e=>!['SCRIPT','STYLE','LINK','META','NOSCRIPT'].includes(e.tagName)).flatMap((e,index)=>['','::before','::after'].flatMap(pseudo=>{const s=getComputedStyle(e,pseudo||null);if(pseudo&&s.content==='none')return[];return[{index,tag:e.tagName,id:e.id,pseudo,styles:Object.fromEntries(properties.map(p=>[p,typeof s[p]==='string'?s[p].replaceAll(location.origin,'<site>'):s[p]]))}]})),{properties,selector});
try{
 for(const {route,width} of all){if(only&&!only.includes(route))continue;const key=route+'@'+width;if(results[key]&&!only)continue;const page=await context.newPage();page.setDefaultTimeout(15000);await page.setViewportSize({width,height:900});const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
 try{await page.goto(origin+route);await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>Promise.all([...document.images].filter(i=>i.getBoundingClientRect().top<innerHeight).map(i=>i.decode().catch(()=>{}))));await page.evaluate(()=>window.dispatchEvent(new Event('resize')));await freeze(page);
 const isFull=(route==='/'&&[1440,768,390].includes(width))||(route==='/about.html'&&[1440,390].includes(width))||(['/projects.html','/en/projects-en.html'].includes(route)&&width===1440);
 const take=isFull||([1440,390].includes(width)&&!legacy.includes(route));
 if(take&&isFull){for(let y=0;y<await page.evaluate(()=>document.documentElement.scrollHeight);y+=700){await page.evaluate(y=>window.scrollTo({top:y,behavior:'instant'}),y);await page.waitForTimeout(20);await freeze(page);}await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await freeze(page)}
 results[key]={nodes:await snapshot(page),overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),errors:pageErrors};
 if(take){await page.mouse.move(0,899);await page.evaluate(()=>document.activeElement?.blur());await freeze(page);const name=(route==='/'?'home-uk':route.replace(/^\//,'').replace(/\/$/,'').replace(/[^a-z0-9]/gi,'-'))+'-'+width+'.png';await page.screenshot({path:root+'/screenshots/'+phase+'/'+name,fullPage:isFull,animations:'disabled'});if(!screens.includes(name))screens.push(name);}
 if([1440,390].includes(width)&&!legacy.includes(route)){
  const trigger=page.locator('.site-search-trigger');if(await trigger.count()){await trigger.focus();await freeze(page);results[key].focus=await snapshot(page,'.site-nav, .site-nav *');await trigger.click();await page.locator('.site-search.is-open').waitFor();await freeze(page);results[key].search=await snapshot(page,'.site-search, .site-search *');await page.keyboard.press('Escape');}
  const menu=page.locator('.site-nav__toggle');if(width<1024&&await menu.isVisible()){await menu.click();await freeze(page);results[key].menu=await snapshot(page,'.mobile-nav, .mobile-nav *, .site-nav, .site-nav *');await page.keyboard.press('Escape');}
  const hover=page.locator('.home-article__link,.project-showcase,.project-featured,.profile-portrait,.article-row,.contact-card,.not-found-primary,.sd-hero__primary,.bot-button,.site-footer__nav a,.comments-widget button').first();if(await hover.count()){await hover.hover();await freeze(page);results[key].hover=await snapshot(page);}
  await page.emulateMedia({reducedMotion:'reduce'});await freeze(page);results[key].reduced=await snapshot(page);await page.emulateMedia({reducedMotion:'no-preference'});
 }
 if(pageErrors.length)errors.push({key,errors:pageErrors});
 }catch(error){throw Error(key+': '+error.message)}finally{await page.close()}
 if(Object.keys(results).length%12===0)console.log(phase+': '+Object.keys(results).length+'/'+all.length);
 }
 const compressed=gzipSync(JSON.stringify(results));await fs.writeFile(work+'/'+phase+'.json.gz',compressed);await fs.writeFile(work+'/'+phase+'-screens.json',JSON.stringify(screens));
 if(phase==='after'){
  const before=JSON.parse(gunzipSync(await fs.readFile(work+'/before.json.gz')));const differences=[];
  const compare=(a,b,key)=>{if(typeof a==='string')a=a.replace(/http:\/\/127\.0\.0\.1:\d+/g,'<site>');if(typeof b==='string')b=b.replace(/http:\/\/127\.0\.0\.1:\d+/g,'<site>');if(typeof a!==typeof b||Array.isArray(a)!==Array.isArray(b)){differences.push({key,before:a,after:b});return}if(a&&typeof a==='object'){const keys=new Set([...Object.keys(a),...Object.keys(b||{})]);for(const k of keys)compare(a[k],b?.[k],key+'.'+k)}else if(a!==b)differences.push({key,before:a,after:b})};
  for(const key of Object.keys(before))compare(before[key],results[key],key);
  const pixelDifferences=[];for(const name of screens){const a=await sharp(root+'/screenshots/before/'+name).ensureAlpha().raw().toBuffer({resolveWithObject:true}),b=await sharp(root+'/screenshots/after/'+name).ensureAlpha().raw().toBuffer({resolveWithObject:true});if(JSON.stringify(a.info)!==JSON.stringify(b.info)){pixelDifferences.push({file:name,reason:'dimensions',before:a.info,after:b.info});continue}let pixels=0;for(let i=0;i<a.data.length;i+=4)if(Math.max(...[0,1,2,3].map(c=>Math.abs(a.data[i+c]-b.data[i+c])))>2)pixels++;if(pixels)pixelDifferences.push({file:name,pixels,total:a.info.width*a.info.height});}
  const report={baseline:'4e0521e759e18c2288afcfc86be9c90965456cf3',browser:await browser.version(),normalization:['local preview origin in resolved asset URLs','CSS animations finished/infinite animations paused at 0; scroll callbacks settled','Firebase disabled for deterministic article rendering; static fixture covers discussion states'],cases:all.length,properties,screenshots:screens.length,differences,pixelDifferences,consoleErrors:errors};await fs.writeFile(root+'/regression.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({cases:all.length,computedDifferences:differences.length,pixelDifferences,errors}));
 }else console.log('Baseline captured: '+all.length+' cases, '+screens.length+' screenshots; errors='+errors.length);
}finally{await context.close();await browser.close()}
