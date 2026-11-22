// Verify that an architectural CSS cleanup did not edit content, SEO, links, JS or photos.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { load } from 'cheerio';
import { sources } from './audit.mjs';
const baseline = process.env.BASELINE_ROOT;
if (!baseline) throw Error('Set BASELINE_ROOT to a checkout of the reference commit');
const root = process.cwd(), files = await sources(), differences = [], counts = { html: 0, javascript: 0, media: 0, content: 0 };
const family = /\bsite-shell--(?:standard|home|policy)\b/g;
function content(html) {
  const $ = load(html, { scriptingEnabled: false });
  $('link[rel="stylesheet"],style').remove();
  $('body').each((_, e) => { const el = $(e), value = (el.attr('class') || '').replace(family, '').trim(); if (value) el.attr('class', value); else el.removeAttr('class'); });
  $('.profile-collaboration').removeClass('collaboration-cta');
  $('script[src]').each((_, e) => { const el = $(e), url = new URL(el.attr('src'), 'https://serhiipelishenko.com'); url.searchParams.delete('v'); el.attr('src', url.origin === 'https://serhiipelishenko.com' ? url.pathname + url.search : url.href); });
  function node(e) {
    if (e.type === 'text') { const value = e.data.replace(/\s+/g, ' ').trim(); return value || null; }
    if (e.type === 'comment') return null;
    return { tag: e.name || e.type, attrs: Object.fromEntries(Object.entries(e.attribs || {}).sort()), children: (e.children || []).map(node).filter(x => x !== null) };
  }
  return JSON.stringify(node($.root()[0]));
}
for (const file of files) {
  const old = path.join(baseline, file);
  try { await fs.access(old); } catch { continue; }
  if (file.endsWith('.html')) {
    counts.html++;
    if (content(await fs.readFile(file, 'utf8')) !== content(await fs.readFile(old, 'utf8'))) differences.push({ file, type: 'HTML-content/structure' });
  } else if (/\.(?:js|webp|avif|png|jpe?g|gif|svg|woff2?|mp4|md)$/.test(file) || /(?:sitemap.*\.xml|robots\.txt|data\/.*\.json)$/.test(file)) {
    counts[file.endsWith('.js') ? 'javascript' : /\.(md|json|xml|txt)$/.test(file) ? 'content' : 'media']++;
    if (!(await fs.readFile(file)).equals(await fs.readFile(old))) differences.push({ file, type: 'changed-source' });
  }
}
const result = { baseline: '4e0521e759e18c2288afcfc86be9c90965456cf3', counts, differences, allowedChanges: ['stylesheet dependencies/cache hashes', 'three existing shell variant markers', 'About collaboration shared class', 'CSS inside style blocks'] };
await fs.writeFile('docs/css-architecture-cleanup/source-contract.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
assert.equal(differences.length, 0, 'Content/SEO/JS/media must remain unchanged');
