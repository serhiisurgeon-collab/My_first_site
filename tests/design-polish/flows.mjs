import { chromium, devices } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { externalAssets } from '../../tools/seo/test-assets.mjs';
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:8134';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
let cases = 0;
try {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  await context.route(/^https:\/\//, externalAssets);
  for (const width of [360, 900, 1200]) for (const route of ['/s-dose.html', '/en/s-dose-en.html', '/spanish-bot.html', '/en/spanish-bot-en.html', '/articles/npa-effectiveness/', '/en/articles/npa-effectiveness/', '/policy.html', '/en/policy-en.html']) {
    const page = await context.newPage(); await page.setViewportSize({ width, height: 900 });
    await page.goto(origin + route); await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, route + ' overflow');
    const items = await page.locator('.site-nav__inner').evaluate(e => [...e.children].filter(c => getComputedStyle(c).display !== 'none').map(c => { const r = c.getBoundingClientRect(); return { left: r.left, right: r.right, width: c.clientWidth, content: c.scrollWidth }; }));
    for (let i = 1; i < items.length; i++) assert.ok(items[i - 1].right <= items[i].left + 1, route + ' controls overlap');
    assert.ok(items.every(i => i.content <= i.width + 1), route + ' control text overflows');
    assert.equal(await page.locator('.site-search-trigger__label').isVisible(), false);
    await page.keyboard.press('Control+k'); await page.locator('.site-search.is-open').waitFor(); await page.keyboard.press('Escape');
    await page.close(); cases++;
  }

  for (const [lang, home, about, contact] of [['uk', '/', '/about.html', '/contact.html'], ['en', '/en/index-en.html', '/en/about-en.html', '/en/contact-en.html']]) {
    const page = await context.newPage(); await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(origin + home); await page.locator('.start-hero__actions a[href*="about"]').click(); await page.waitForURL(origin + about);
    assert.equal(context.pages().length, 1, 'Home to About stays in tab');
    await page.locator('.profile-hero .profile-button-ghost').click(); await page.waitForURL(origin + contact);
    assert.equal(context.pages().length, 1, 'About to Contact stays in tab');
    await page.locator('.site-footer__logo').click(); await page.waitForURL(url => url.pathname === home || url.pathname === '/index.html');
    await page.goto(origin + about);
    const other = page.locator(`.site-nav__language-option[lang="${lang === 'uk' ? 'en' : 'uk'}"]`);
    await other.click(); await page.waitForURL(origin + (lang === 'uk' ? '/en/about-en.html' : '/about.html'));
    assert.equal(context.pages().length, 1, 'language switch stays in tab');
    await page.goto(origin + home);
    await page.evaluate(() => window.scrollTo({ top: 200, behavior: 'instant' }));
    const scrollBefore = await page.evaluate(() => window.scrollY);
    await page.locator('.site-nav__toggle').click();
    const top = await page.locator('body').evaluate(e => e.style.top);
    await page.mouse.wheel(0, 500); await page.waitForTimeout(100);
    assert.equal(await page.locator('body').evaluate(e => e.style.top), top, 'menu blocks body scroll');
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => window.scrollY), scrollBefore, 'closing menu restores scroll position');
    await page.locator('.site-nav__toggle').click();
    await page.setViewportSize({ width: 1280, height: 900 }); await page.waitForTimeout(100);
    assert.equal(await page.locator('.site-nav__toggle').getAttribute('aria-expanded'), 'false');
    assert.notEqual(await page.locator('body').evaluate(e => getComputedStyle(e).position), 'fixed');
    // Dynamic links must follow the same policy as source HTML.
    await page.evaluate(() => { const a = document.createElement('a'); a.href = '/about.html'; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.id = 'polish-internal'; document.body.append(a); });
    await page.waitForFunction(() => !document.querySelector('#polish-internal').target);
    await context.route('https://example.com/polish-test', route => route.fulfill({ body: 'External-link test', contentType: 'text/plain' }));
    await page.evaluate(() => { const a = document.createElement('a'); a.href = 'https://example.com/polish-test'; a.textContent = 'External-link test'; a.id = 'polish-external'; document.body.append(a); });
    await page.waitForFunction(() => document.querySelector('#polish-external').target === '_blank');
    const popupEvent = page.waitForEvent('popup'); await page.locator('#polish-external').click(); const popup = await popupEvent; await popup.waitForLoadState();
    assert.equal(await page.locator('#polish-external').getAttribute('rel'), 'noopener noreferrer');
    assert.equal(await popup.evaluate(() => window.opener), null); await popup.close(); await page.close(); cases++;
  }
  // Actual Chrome with mobile emulation; this is not a real Safari/device claim.
  for (const device of ['Pixel 7', 'iPhone 13']) {
    const mobile = await browser.newContext({ ...devices[device], reducedMotion: 'reduce' }); await mobile.route(/^https:\/\//, externalAssets);
    const page = await mobile.newPage(); await page.goto(origin + '/'); await page.locator('.site-nav__toggle').tap();
    assert.equal(await page.locator('.site-nav__toggle').getAttribute('aria-expanded'), 'true');
    await page.keyboard.press('Escape'); await page.locator('.site-search-trigger').tap(); await page.locator('.site-search.is-open').waitFor(); await page.keyboard.press('Escape');
    assert.equal(await page.locator('.start-hero__scroll-icon').evaluate(e => getComputedStyle(e).animationName), 'none');
    await mobile.close(); cases++;
  }
  for (const width of [390, 1440]) for (const route of ['/about.html', '/en/about-en.html']) {
    const page = await context.newPage(); await page.setViewportSize({ width, height: 900 });
    let release;
    const pending = new Promise(resolve => { release = resolve; });
    await page.route('**/assets/images/profile/portrait.webp', async request => { await pending; await request.continue(); });
    await page.goto(origin + route, { waitUntil: 'domcontentloaded' }); await page.evaluate(() => document.fonts.ready);
    const photo = page.locator('.profile-portrait img');
    const before = await photo.boundingBox(); release(); await photo.evaluate(e => e.decode());
    const after = await photo.boundingBox();
    for (const key of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(before[key] - after[key]) < .5, `portrait image load shifts ${key}`);
    await page.close(); cases++;
  }
  const normal = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  await normal.route(/^https:\/\//, externalAssets);
  const home = await normal.newPage(); await home.goto(origin + '/'); await home.evaluate(() => document.fonts.ready);
  const sizes = await home.evaluate(() => ['.start-hero__title', '.about-preview__title', '.home-articles__title', '.featured-projects__title', '.collaboration-cta__title'].map(selector => parseFloat(getComputedStyle(document.querySelector(selector)).fontSize)));
  assert.ok(sizes.slice(1).every(size => size < sizes[0]), 'Hero remains strongest heading');
  assert.equal(await home.locator('.home-articles img').count(), 0);
  const article = home.locator('.home-article__link').first(); await article.hover();
  assert.equal(await article.evaluate(e => getComputedStyle(e).transform), 'none');
  assert.equal(await article.evaluate(e => getComputedStyle(e).boxShadow), 'none');
  assert.equal(await home.locator('.collaboration-cta a').count(), 1);
  await home.close(); cases++;
  const about = await normal.newPage(); await about.goto(origin + '/about.html'); await about.locator('.profile-portrait').hover();
  assert.equal(await about.locator('.profile-portrait img').evaluate(e => getComputedStyle(e).transform), 'none');
  assert.equal(await about.locator('.profile-portrait').evaluate(e => getComputedStyle(e, '::before').content), 'none');
  await about.close(); await normal.close(); await context.close(); cases++;
  await fs.writeFile('docs/design-polish/flow-results.json', JSON.stringify({ browser: await browser.version(), cases, result: 'pass', mobile: 'Chrome emulation; no real iOS/Safari/Android device' }, null, 2));
  console.log(`PASS ${cases} supplementary project/article layouts, same-tab navigation, external popup safety, scroll restoration, resize and mobile emulation cases`);
} finally { await browser.close(); }
