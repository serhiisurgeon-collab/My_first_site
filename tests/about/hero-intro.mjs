import { createServer } from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { externalAssets } from '../../tools/seo/test-assets.mjs';

const root = process.cwd(), out = '/workspace/work/about-hero-intro';
await fs.mkdir(out, { recursive: true });
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = createServer(async (request, response) => {
  let file = path.resolve(root, '.' + new URL(request.url, 'http://localhost').pathname);
  if (file !== root && !file.startsWith(root + path.sep)) return response.writeHead(403).end();
  try {
    if ((await fs.stat(file)).isDirectory()) file = path.join(file, 'index.html');
    response.setHeader('content-type', types[path.extname(file)] || 'application/octet-stream');
    response.end(await fs.readFile(file));
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
let cases = 0;
const elements = '.profile-hero .hero-reveal, .profile-hero .hero-photo-reveal';
const time = (page, ms) => page.evaluate(({ selector, ms }) => {
  window.introAnimations = [...document.querySelectorAll(selector)].flatMap(el => el.getAnimations());
  window.introAnimations.forEach(animation => { animation.pause(); animation.currentTime = ms; });
}, { selector: elements, ms });
const opacity = (page, selector) => page.locator(selector).evaluate(e => parseFloat(getComputedStyle(e).opacity));

try {
  const normal = await browser.newContext({ reducedMotion: 'no-preference' });
  await normal.route(/^https:\/\//, externalAssets);
  const home = await normal.newPage(); await home.goto(origin + '/');
  await home.waitForFunction(() => document.body.classList.contains('hero-loaded'));
  const reference = await home.evaluate(() => {
    const photo = getComputedStyle(document.querySelector('.hero-photo-reveal'));
    return {
      photoDuration: photo.transitionDuration, photoDelay: photo.transitionDelay,
      copy: Array.from({ length: 6 }, (_, index) => {
        const style = getComputedStyle(document.querySelector(`.hero-reveal--${index + 1}`));
        return { duration: style.transitionDuration, delay: style.transitionDelay, easing: style.transitionTimingFunction };
      }),
    };
  });
  await home.close();
  for (const width of [360, 390, 768, 1200, 1440]) for (const lang of ['uk', 'en']) {
    const page = await normal.newPage(); await page.setViewportSize({ width, height: 900 });
    await page.goto(origin + (lang === 'uk' ? '/about.html' : '/en/about-en.html'));
    await page.evaluate(() => document.fonts.ready);
    const timing = await page.evaluate(() => ({
      photo: { duration: getComputedStyle(document.querySelector('.hero-photo-reveal')).animationDuration, delay: getComputedStyle(document.querySelector('.hero-photo-reveal')).animationDelay },
      copy: Array.from({ length: 6 }, (_, index) => {
        const style = getComputedStyle(document.querySelector(`.hero-reveal--${index + 1}`));
        return { duration: style.animationDuration, delay: style.animationDelay.split(',')[0], easing: style.animationTimingFunction };
      }),
    }));
    assert.deepEqual(timing.copy, reference.copy, 'copy timing matches Home');
    assert.equal(timing.photo.duration, reference.photoDuration);
    assert.equal(timing.photo.delay.split(',')[0], reference.photoDelay);
    await time(page, 0);
    assert.equal(await opacity(page, '.profile-portrait'), 0);
    assert.equal(await opacity(page, '#profile-name'), 0);
    await time(page, 300);
    assert.ok(await opacity(page, '.profile-portrait') > 0, 'photo appears first');
    assert.equal(await opacity(page, '#profile-name'), 0, 'heading follows photo');
    assert.equal(await opacity(page, '.profile-actions'), 0, 'actions follow text');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    if (width === 1440 && lang === 'uk') await page.screenshot({ path: path.join(out, 'intro-300ms.png') });
    await time(page, 2000);
    for (const element of await page.locator(elements).all()) {
      assert.equal(await element.evaluate(e => getComputedStyle(e).opacity), '1');
      assert.equal(await element.evaluate(e => {
        const transform = getComputedStyle(e).transform;
        return transform === 'none' || new DOMMatrixReadOnly(transform).isIdentity;
      }), true, 'intro finishes at the original geometry');
    }
    await page.evaluate(() => window.scrollTo({ top: 250, behavior: 'instant' }));
    await page.waitForTimeout(50);
    assert.ok(await page.evaluate(() => window.introAnimations.every(a => a.currentTime === 2000)), 'scroll does not replay intro');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    if ([390, 1440].includes(width)) await page.locator('.profile-hero').screenshot({ path: path.join(out, `${lang}-${width}-finished.png`) });
    await time(page, 0);
    await page.locator('.profile-actions a').first().focus();
    assert.equal(await opacity(page, '.profile-actions'), 1, 'keyboard focus makes delayed actions visible immediately');
    await page.locator('.profile-actions a').first().blur();
    assert.ok(await page.evaluate(selector => [...document.querySelectorAll(selector)].flatMap(e => e.getAnimations()).every(a => window.introAnimations.includes(a)), elements), 'keyboard focus does not restart the intro');
    await page.close(); cases++;
  }
  await normal.close();
  for (const javaScriptEnabled of [true, false]) for (const lang of ['uk', 'en']) {
    const context = await browser.newContext({ javaScriptEnabled, reducedMotion: javaScriptEnabled ? 'reduce' : 'no-preference', viewport: { width: 390, height: 900 } });
    await context.route(/^https:\/\//, externalAssets);
    const page = await context.newPage(); await page.goto(origin + (lang === 'uk' ? '/about.html' : '/en/about-en.html'));
    await page.evaluate(() => Promise.all([...document.querySelectorAll('.profile-hero *')].flatMap(e => e.getAnimations()).map(a => a.finished)));
    for (const element of await page.locator(elements).all()) assert.equal(await element.evaluate(e => getComputedStyle(e).opacity), '1');
    if (javaScriptEnabled) assert.equal(await page.locator('#profile-name').evaluate(e => getComputedStyle(e).animationName), 'none');
    await context.close(); cases++;
  }
  console.log(`PASS ${cases} UA/EN intro cases: exact Home timing, photo/text stagger, final visibility, keyboard focus, no replay, reduced motion and no JS`);
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
