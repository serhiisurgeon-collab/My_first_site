import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { load } from 'cheerio';
import { linkPolicy } from '../../js/link-policy.js';

async function htmlFiles(dir = '.') {
  const result = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (['.git', '.private', 'node_modules'].includes(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...await htmlFiles(file));
    else if (file.endsWith('.html') && !file.startsWith('tools/comments/')) result.push(file);
  }
  return result;
}

test('link policy covers canonical URLs, local previews, anchors, protocols and downloads', () => {
  for (const base of ['https://serhiipelishenko.com/en/about-en.html', 'http://127.0.0.1:8134/en/about-en.html']) {
    for (const href of ['/contact.html', '../about.html', '#bio', 'https://serhiipelishenko.com/', 'mailto:hello@serhiipelishenko.com', 'tel:+380000000000']) assert.equal(linkPolicy(href, base).external, false, href);
    assert.deepEqual(linkPolicy('/assets/downloads/portrait.jpg', base), { external: false, download: true });
    assert.equal(linkPolicy('https://github.com/serhiisurgeon-collab', base).external, true);
  }
});

test('all site HTML and generator templates implement the same link policy without JavaScript', async () => {
  const files = await htmlFiles();
  assert.ok(files.length >= 60);
  for (const file of files) {
    const $ = load(await fs.readFile(file, 'utf8'));
    const publicPath = file.replace(/^tools\/seo\/templates\/pages\//, '').replace(/^tools\/seo\/templates\/article-en.html$/, 'en/article-en.html').replace(/^tools\/seo\/templates\/article-uk.html$/, 'article.html');
    $('a[href]').each((_, element) => {
      const a = $(element), href = a.attr('href');
      const policy = linkPolicy(href, 'https://serhiipelishenko.com/' + publicPath, a.attr('download') !== undefined);
      const rel = (a.attr('rel') || '').split(/\s+/);
      if (policy.external) {
        assert.equal(a.attr('target'), '_blank', file + ': ' + href);
        assert.ok(rel.includes('noopener') && rel.includes('noreferrer'), file + ': ' + href);
      } else {
        assert.equal(a.attr('target'), undefined, file + ': ' + href);
        assert.ok(!rel.includes('noopener') && !rel.includes('noreferrer'), file + ': ' + href);
      }
      if (policy.download) assert.notEqual(a.attr('download'), undefined, file + ': ' + href);
    });
  }
});

test('project interface labels and accessible descriptions use the page language', async () => {
  for (const [lang, file] of [['uk', 'projects.html'], ['en', 'en/projects-en.html']]) {
    const $ = load(await fs.readFile(file, 'utf8'));
    const labels = $('.project-tags,.project-status,.project-featured__eyebrow').text();
    if (lang === 'uk') {
      assert.doesNotMatch(labels, /\b(?:Featured project|Active|Completed|Archived|Software|Personal)\b/);
      for (const label of ['Флагманський проєкт', 'Активний', 'Завершений', 'Архівний', 'Розробка', 'Особистий проєкт']) assert.ok(labels.includes(label), label);
    } else {
      assert.doesNotMatch(labels, /[А-Яа-яІіЇїЄєҐґ]/);
      $('[aria-label],[alt],[title]').each((_, e) => {
        for (const attr of ['aria-label', 'alt', 'title']) assert.doesNotMatch($(e).attr(attr) || '', /[А-Яа-яІіЇїЄєҐґ]/);
      });
    }
    for (const brand of ['S-Dose', 'Spanish by Serhii', 'serhiipelishenko.com', 'The World of Dune']) assert.ok($('body').text().includes(brand));
  }
});
