import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { externalAssets } from '../../tools/seo/test-assets.mjs';

const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:8134';
const out = path.resolve('docs/design-polish/screenshots');
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
const widths = [1440, 1280, 1200, 1024, 900, 768, 430, 390, 360];
const cases = [];
const failures = [];
const routes = {
  uk: ['/', '/projects.html', '/about.html', '/articles.html', '/contact.html', '/404.html'],
  en: ['/en/index-en.html', '/en/projects-en.html', '/en/about-en.html', '/en/articles-en.html', '/en/contact-en.html', '/en/404.html'],
};
const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

async function inspectHeader(page, width) {
  const bounds = await page.locator('.site-nav__inner').evaluate(e => [...e.children].filter(el => getComputedStyle(el).display !== 'none').map(el => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; }));
  for (let i = 1; i < bounds.length; i++) assert.ok(bounds[i - 1].right <= bounds[i].left + 1, 'header controls overlap');
  assert.ok(bounds.every(b => b.left >= 0 && b.right <= width + 1), 'header exceeds viewport');
  const links = page.locator('.site-nav__links');
  assert.equal(await links.isVisible(), width >= 1024);
  assert.equal(await page.locator('.site-nav__toggle').isVisible(), width < 1024);
  assert.equal(await page.locator('.site-search-trigger__label').isVisible(), width >= 1280);
  assert.equal(await page.locator('.site-search-trigger__hint').isVisible(), width >= 1280);
  assert.ok(await page.locator('.site-search-trigger').getAttribute('aria-label'));
  assert.ok(await page.locator('.site-search-trigger').getAttribute('title'));
  if (width >= 1024) {
    const items = await links.locator('a').evaluateAll(es => es.map(e => e.getBoundingClientRect().top));
    assert.ok(items.every(top => Math.abs(top - items[0]) < 2), 'desktop menu wraps');
  }
  await page.locator('.site-search-trigger').focus();
  assert.equal(await page.locator('.site-search-trigger').evaluate(e => e.matches(':focus-visible')), true);
  assert.notEqual(await page.locator('.site-search-trigger').evaluate(e => getComputedStyle(e).outlineStyle), 'none');
}

async function inspectMenuAndSearch(page, width, lang) {
  const search = page.locator('.site-search__dialog');
  await page.locator('.site-search-trigger').click();
  await search.waitFor({ state: 'visible' });
  assert.equal(await page.locator('.site-search__input').evaluate(e => e === document.activeElement), true);
  assert.equal(await page.locator('body').evaluate(e => getComputedStyle(e).position), 'fixed');
  await page.keyboard.press('Escape');
  await search.waitFor({ state: 'hidden' });
  await page.keyboard.press('Control+k');
  await search.waitFor({ state: 'visible' });
  await page.locator('.site-search__input').fill(lang === 'uk' ? 'каолін' : 'kaolin');
  await page.locator('.site-search__result').first().waitFor();
  const type = await page.locator('.site-search__result-type').first().textContent();
  assert.doesNotMatch(type, /tactical-medicine|understanding-medicine/);
  const first = page.locator('.site-search__result').first();
  assert.equal(await first.getAttribute('target'), null);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.site-search-trigger').evaluate(e => e === document.activeElement), true);
  if (width < 1024) {
    const toggle = page.locator('.site-nav__toggle');
    await toggle.click();
    assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
    assert.equal(await page.locator('#mobile-navigation').evaluate(e => e.inert), false);
    assert.equal(await page.locator('body').evaluate(e => getComputedStyle(e).position), 'fixed');
    await page.keyboard.press('Escape');
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(await toggle.evaluate(e => e === document.activeElement), true);
    await toggle.click();
    const link = page.locator('#mobile-navigation a').first();
    await link.evaluate(e => e.addEventListener('click', event => event.preventDefault(), { once: true }));
    await link.click();
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false', 'link selection closes menu');
    await toggle.click();
    await page.locator('.site-search-trigger').click();
    await search.waitFor({ state: 'visible' });
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false', 'search closes menu first');
    await page.keyboard.press('Escape');
    assert.notEqual(await page.locator('body').evaluate(e => getComputedStyle(e).position), 'fixed');
  }
}

async function inspectLinks(page, lang) {
  const invalid = await page.locator('a[href]').evaluateAll(es => es.flatMap(e => {
    const url = new URL(e.href), internal = url.origin === location.origin || ['serhiipelishenko.com', 'www.serhiipelishenko.com'].includes(url.hostname);
    const external = !internal && ['http:', 'https:'].includes(url.protocol) && !e.hasAttribute('download');
    return external ? (e.target === '_blank' && e.relList.contains('noopener') && e.relList.contains('noreferrer') ? [] : [e.href]) : (e.target || e.relList.contains('noopener') || e.relList.contains('noreferrer') ? [e.href] : []);
  }));
  assert.deepEqual(invalid, []);
  const other = page.locator(`.site-nav__language-option[lang="${lang === 'uk' ? 'en' : 'uk'}"]`);
  const destination = new URL(await other.getAttribute('href'), page.url());
  const response = await page.request.get(destination.href);
  assert.equal(response.status(), 200);
  assert.ok((await response.text()).includes(`lang="${lang === 'uk' ? 'en' : 'uk'}"`));
}

async function saveScreenshots(page, route, width, lang) {
  await page.mouse.move(0, 899);
  await page.evaluate(() => document.activeElement?.blur());
  let name;
  if (lang === 'uk' && route === '/') name = ({ 1440: 'home-desktop', 900: 'home-tablet', 390: 'home-mobile' })[width];
  if (route.endsWith('projects.html') || route.endsWith('projects-en.html')) {
    if (width === 1440) name = `projects-${lang}`;
    if (width === 390) name = `projects-${lang}-mobile`;
  }
  if (name) {
    // Reveal existing on-scroll sections before a full-page capture.
    for (let y = 0; y < await page.evaluate(() => document.documentElement.scrollHeight); y += 650) {
      await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), y); await page.waitForTimeout(25);
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: true, animations: 'disabled' });
  }
  if (route.includes('about') && lang === 'uk' && [1440, 390].includes(width)) {
    const portrait = page.locator('.profile-portrait img'); await portrait.evaluate(e => e.decode());
    const geometry = await portrait.evaluate(e => ({ ratio: e.getBoundingClientRect().width / e.getBoundingClientRect().height, source: e.getAttribute('src') }));
    assert.ok(Math.abs(geometry.ratio - .8) < .002);
    assert.equal(geometry.source, '/assets/images/profile/portrait.webp');
    assert.equal(await page.locator('.profile-portrait').evaluate(e => getComputedStyle(e, '::before').content), 'none');
    await page.locator('.profile-hero').screenshot({ path: path.join(out, width === 1440 ? 'about-portrait-desktop.png' : 'about-portrait-mobile.png'), animations: 'disabled' });
  }
}

try {
  for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', ...(width <= 430 ? { isMobile: true, hasTouch: true } : {}) });
    await context.route(/^https:\/\//, externalAssets);
    for (const [lang, pages] of Object.entries(routes)) for (const route of pages) {
      const page = await context.newPage(); page.setDefaultTimeout(12000);
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      try {
        await page.goto(origin + route); await page.evaluate(() => document.fonts.ready); await settle(page);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'horizontal scroll');
        await inspectHeader(page, width);
        await inspectMenuAndSearch(page, width, lang);
        await inspectLinks(page, lang);
        await saveScreenshots(page, route, width, lang);
        assert.deepEqual(errors, []);
        cases.push({ width, lang, route, result: 'pass' });
      } catch (error) {
        failures.push({ width, lang, route, error: error.message });
        console.log(`FAIL ${width} ${route}: ${error.message.split('\n')[0]}`);
      } finally { await page.close(); }
    }
    await context.close();
    console.log(`Checked ${width}px; ${cases.length} passed, ${failures.length} failed`);
  }
  await fs.writeFile(path.resolve('docs/design-polish/browser-results.json'), JSON.stringify({ browser: await browser.version(), cases, failures }, null, 2));
  assert.deepEqual(failures, []);
  console.log(`PASS ${cases.length} UA/EN Chrome layout, search, keyboard, menu and link cases`);
} finally { await browser.close(); }
