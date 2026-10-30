import assert from 'node:assert/strict';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

// Emulate Pages' root 404 fallback; this does not claim a production deployment.
const root = path.resolve(process.env.NOT_FOUND_SITE_DIR || '.');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  let file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403).end(); return; }
  let code = 200;
  try { if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html'); await stat(file); }
  catch { file = path.join(root, '404.html'); code = 404; }
  try { const data = await readFile(file); res.writeHead(code, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }); res.end(data); }
  catch { res.writeHead(500).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
let count = 0;
try {
  browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  for (const width of [320, 390, 768, 1280, 1672]) for (const lang of ['uk', 'en']) for (const javaScriptEnabled of [false, true]) {
    const page = await browser.newPage({ viewport: { width, height: 941 }, javaScriptEnabled });
    await page.route(/^https:\/\//, route => route.abort());
    const failures = [];
    page.on('pageerror', error => failures.push(error.message));
    const missing = '/audit/missing/nested-page';
    const initial = lang === 'uk' ? missing : javaScriptEnabled ? '/en/audit/missing/nested-page' : '/en/404.html';
    const response = await page.goto(origin + initial);
    if (lang === 'en' && javaScriptEnabled) await page.waitForURL(origin + '/en/404.html');
    else assert.equal(response.status(), lang === 'uk' ? 404 : 200);
    assert.equal(await page.locator('html').getAttribute('lang'), lang);
    assert.equal(await page.locator('h1').count(), 1);
    assert.equal(await page.locator('h1').textContent(), lang === 'uk' ? 'Цієї сторінки немає' : 'Page not found');
    assert.equal(await page.locator('meta[name=robots]').getAttribute('content'), 'noindex, follow');
    assert.equal(await page.locator('link[rel=canonical]').count(), 0);
    assert.equal(await page.locator('.site-nav__language-switcher').count(), 1);
    assert.equal(await page.locator('footer .site-nav__language-switcher').count(), 0);
    assert.equal(await page.locator('.site-nav__language-option.is-active').getAttribute('lang'), lang);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.equal(await page.locator('.not-found-code').getAttribute('aria-hidden'), 'true');
    const links = await page.locator('a[href],link[rel=stylesheet],script[src],img[src]').evaluateAll(es => es.map(e => e.getAttribute('href') || e.getAttribute('src')));
    for (const href of new Set(links)) {
      if (href.startsWith('https:')) continue;
      if (href.startsWith('#')) { assert.equal(await page.locator(href).count(), 1); continue; }
      assert.ok(href.startsWith('/'), href);
      assert.equal((await page.request.get(origin + href)).status(), 200, href);
    }
    if (width < 901 && javaScriptEnabled) {
      const toggle = page.locator('.site-nav__toggle');
      await toggle.click();
      assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
      assert.equal(await page.locator('#mobile-navigation').evaluate(el => el.inert), false);
      await page.locator('#mobile-navigation a').first().focus();
      await page.keyboard.press('Escape');
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
      assert.equal(await toggle.evaluate(el => el === document.activeElement), true);
      assert.equal(await page.locator('#mobile-navigation').evaluate(el => el.inert), true);
    } else if (width < 901) {
      assert.equal(await page.locator('#mobile-navigation a').first().isVisible(), true);
    }
    if (process.env.NOT_FOUND_ARTIFACTS && javaScriptEnabled && [390, 1672].includes(width)) {
      await mkdir(process.env.NOT_FOUND_ARTIFACTS, { recursive: true });
      await page.screenshot({ path: path.join(process.env.NOT_FOUND_ARTIFACTS, `404-concept-${lang}-${width}.png`), fullPage: true });
    }
    assert.deepEqual(failures, []);
    await page.close();
    count++;
  }
  const page = await browser.newPage();
  await page.route(/^https:\/\//, route => route.abort());
  await page.goto(origin + '/404.html');
  await page.locator('.site-nav__language-option[lang=en]').click();
  await page.waitForURL(origin + '/en/404.html');
  assert.equal(await page.locator('h1').textContent(), 'Page not found');
  await page.locator('.site-nav__language-option[lang=uk]').click();
  await page.waitForURL(origin + '/404.html');
  // Error pages must never be included in the generated content sitemap.
  assert.doesNotMatch(await readFile(path.join(root, 'sitemap.xml'), 'utf8'), /\/404\.html/);
  await page.close();
  console.log(`PASS ${count} UA/EN 404 viewport/JS cases: nested URL fallback, language redirect, switcher, links/assets, mobile menu and SEO exclusions`);
} finally {
  if (browser) await browser.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
