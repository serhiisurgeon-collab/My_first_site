import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {load} from 'cheerio';
import sharp from 'sharp';
const origin = 'https://serhiipelishenko.com';
const documents = {};
const baseline = JSON.parse(await fs.readFile('tests/about/baseline.json','utf8'));
for (const [lang,file] of [['uk','about.html'],['en','en/about-en.html']]) {
  documents[lang] = load(await fs.readFile(file,'utf8'));
  test(`${lang}: professional identity, confirmed education and usable organiser materials`, async()=>{
    const $=documents[lang];
    assert.equal($('h1').length,1);
    assert.equal($('h1').text(),lang==='uk'?'Сергій Пелішенко':'Serhii Pelishenko');
    assert.equal($('.profile-work-item').length,3);
    assert.equal($('.profile-gallery-item').length,3);
    const stagedLabel=lang==='uk'?'Постановочний кадр':'Staged photograph';
    assert.equal($('.profile-gallery-item img').toArray().filter(e=>$(e).attr('alt').startsWith(stagedLabel)).length,2);
    assert.match($('.profile-gallery-item img').first().attr('src'),/planning-staged\.webp$/);
    assert.match($('.profile-gallery-item img').last().attr('src'),/materials-staged\.webp$/);
    assert.equal($('.profile-timeline li').length,4);
    assert.match($('.profile-timeline').text(),/2013–2019/);
    assert.match($('.profile-timeline').text(),/2024–2025/);
    assert.doesNotMatch($('main').text(),/академія післядипломної|Academy of Postgraduate|Python|Flutter|SQLite|Trello|Notion/);
    const bio=$('#profile-bio').text();
    assert.ok(bio.trim().split(/\s+/).length>=70&&bio.trim().split(/\s+/).length<=100);
    assert.equal($('[data-copy-status]').attr('aria-live'),'polite');
    assert.ok($('[data-copy-bio]').is('[hidden]'));
    const download=$('a[download]').attr('href');
    const portrait=await sharp('.'+download).metadata();
    assert.equal(portrait.format,'jpeg');assert.equal(portrait.exif,undefined);
    for(const img of $('.profile-gallery-item img,.profile-portrait img,.profile-download-preview').toArray()) {
      const meta=await sharp('.'+$(img).attr('src')).metadata();
      assert.equal(Number($(img).attr('width')),meta.width);
      assert.equal(Number($(img).attr('height')),meta.height);
      assert.equal(meta.exif,undefined);
      if(!$(img).closest('.profile-portrait').length)assert.equal($(img).attr('loading'),'lazy');assert.ok($(img).attr('alt'));
    }
    for(const selector of ['.site-nav','.mobile-nav','.site-footer']) {
      const summary=doc=>doc(selector).find('a').toArray().map(e=>({text:doc(e).text().replace(/\s+/g,' ').trim(),href:doc(e).attr('href')}));
      assert.deepEqual(summary($),baseline[lang][selector],selector+' links unchanged');
    }
    const words=doc=>{const body=doc('body').clone();body.find('script,style').remove();return body.text().trim().split(/\s+/).length};
    assert.ok(words($)<=baseline[lang].words,'profile must not increase the original text volume');
  });
  test(`${lang}: correct sharing metadata, structured data and local links`,async()=>{
    const $=documents[lang];
    assert.equal($('link[rel=canonical]').attr('href'),origin+'/'+file);
    assert.equal($('link[hreflang=uk]').attr('href'),origin+'/about.html');
    assert.equal($('link[hreflang=en]').attr('href'),origin+'/en/about-en.html');
    assert.equal($('meta[name="twitter:card"]').attr('content'),'summary_large_image');
    const og=$('meta[property="og:image"]').attr('content');
    const image=await sharp('.'+new URL(og).pathname).metadata();
    assert.equal(image.width,1200);assert.equal(image.height,630);assert.equal(image.exif,undefined);
    assert.equal($('meta[name="twitter:image"]').attr('content'),og);
    const schema=JSON.parse($('script[data-profile-schema]').text());
    assert.equal(schema['@type'],'ProfilePage');assert.equal(schema.mainEntity['@type'],'Person');assert.equal(schema.mainEntity.name,$('h1').text());
    assert.deepEqual(schema.mainEntity.knowsLanguage,['Ukrainian','English']);
    for(const e of $('a[href],img[src],link[rel=stylesheet],script[src]').toArray()) {
      const href=$(e).attr('href')||$(e).attr('src');if(!href)continue;
      const url=new URL(href,origin+'/'+file);if(url.origin!==origin)continue;
      if(url.hash){assert.ok($('[id]').toArray().some(e=>$(e).attr('id')===url.hash.slice(1)));continue;}
      let p='.'+url.pathname;if(p.endsWith('/'))p+='index.html';await fs.access(p);
    }
  });
}
test('UA/EN share the same semantic structure and profile assets',()=>{
  const signature=$=>$('main').find('*').toArray().map(e=>[e.tagName,$(e).attr('class')||'']);
  assert.deepEqual(signature(documents.uk),signature(documents.en));
  assert.equal(documents.uk('script[src*="about-profile.js"]').attr('src'),documents.en('script[src*="about-profile.js"]').attr('src'));
});
