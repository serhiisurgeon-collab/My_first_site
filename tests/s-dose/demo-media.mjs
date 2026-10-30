import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:8134';
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
let cases = 0;
try {
  for (const lang of ['uk', 'en']) for (const reducedMotion of ['reduce', 'no-preference']) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion });
    await page.route(/^https:\/\//, route => route.abort());
    await page.addInitScript(() => sessionStorage.setItem('s-dose-partnership-shown', '1'));
    const requests = [];
    page.on('request', request => { if (request.url().endsWith('.mp4')) requests.push(request.url()); });
    await page.goto(origin + (lang === 'uk' ? '/s-dose.html' : '/en/s-dose-en.html'));
    const video = page.locator('.s-dose-demo-band__video');
    await video.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    assert.deepEqual(requests, [], 'Scrolling must not start a video download');
    assert.equal(await video.evaluate(el => el.paused && el.controls && !el.autoplay), true);
    const poster = new URL(await video.getAttribute('poster'), page.url()).href;
    assert.equal((await page.request.get(poster)).status(), 200);
    // Explicit playback verifies the transcoded media actually decodes in Chromium.
    await video.evaluate(el => el.play());
    await page.waitForFunction(() => document.querySelector('video.s-dose-demo-band__video').currentTime > 0.1);
    assert.ok(requests.length > 0);
    assert.equal(await video.evaluate(el => el.videoWidth), 1280);
    assert.equal(await video.evaluate(el => el.error), null);
    await video.evaluate(el => el.pause());
    await page.close();
    cases++;
  }
  const page = await browser.newPage({ javaScriptEnabled: false });
  await page.route(/^https:\/\//, route => route.abort());
  await page.goto(origin + '/s-dose.html');
  assert.equal(await page.locator('video[controls][preload="none"]').count(), 1);
  await page.close();
  console.log(`PASS ${cases} UA/EN reduced-motion/playback cases plus no-JS controls: no automatic MP4 download, poster available, explicit playback decodes`);
} finally { await browser.close(); }
