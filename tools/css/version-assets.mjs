// Cache-bust local CSS in handwritten HTML and templates as well as generated pages.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { sources } from './audit.mjs';
const origin = 'https://serhiipelishenko.com', cache = new Map();
for (const file of (await sources()).filter(file => file.endsWith('.html'))) {
  const publicPath = file.replace(/^tools\/seo\/templates\/pages\//, '').replace(/^tools\/seo\/templates\//, '');
  let html = await fs.readFile(file, 'utf8');
  const matches = [...html.matchAll(/<link\b[^>]*\bhref=(["'])([^"']+\.css(?:\?[^"']*)?)\1[^>]*>/gi)];
  for (const match of matches) {
    const url = new URL(match[2], origin + '/' + publicPath);
    if (url.origin !== origin) continue;
    const local = path.resolve('.' + decodeURIComponent(url.pathname));
    if (!cache.has(local)) {
      try { cache.set(local, createHash('sha256').update(await fs.readFile(local)).digest('hex').slice(0, 16)); }
      catch { throw Error(file + ': missing CSS ' + url.pathname); }
    }
    url.searchParams.set('v', cache.get(local));
    const old = match[2], value = old.split('?')[0] + '?' + url.searchParams.toString();
    html = html.replace(match[0], match[0].replace(old, value));
  }
  await fs.writeFile(file, html);
}
console.log('Versioned ' + cache.size + ' local stylesheets');
