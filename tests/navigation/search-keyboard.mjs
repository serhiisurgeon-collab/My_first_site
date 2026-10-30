import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:8134';
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
let cases = 0;
try {
  for (const width of [390, 1280]) for (const lang of ['uk', 'en']) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.route(/^https:\/\//, route => route.abort());
    await page.goto(origin + (lang === 'uk' ? '/' : '/en/index-en.html'));
    const trigger = page.locator('.site-search-trigger');
    const input = page.getByRole('searchbox', { name: lang === 'uk' ? 'Пошук' : 'Search', exact: true });
    const dialog = page.getByRole('dialog', { name: lang === 'uk' ? 'Пошук' : 'Search', exact: true });
    const close = page.locator('.site-search__close');
    await trigger.click();
    await input.waitFor({ state: 'visible' });
    assert.equal(await input.evaluate(el => el === document.activeElement), true);
    // Empty results: both directions wrap without entering the underlying page.
    await page.keyboard.press('Shift+Tab');
    assert.equal(await close.evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('Tab');
    assert.equal(await input.evaluate(el => el === document.activeElement), true);
    await input.fill(lang === 'uk' ? 'каолін' : 'kaolin');
    const results = dialog.locator('.site-search__result');
    await results.first().waitFor();
    assert.ok(await results.count() > 0);
    assert.match(await page.getByRole('status').textContent(), /\d/);
    await page.keyboard.press('ArrowDown');
    assert.equal(await results.first().evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('ArrowUp');
    assert.equal(await results.last().evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('Tab');
    assert.equal(await input.evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('Escape');
    assert.equal(await trigger.evaluate(el => el === document.activeElement), true);
    assert.equal(await page.locator('main').evaluate(el => el.inert), false);
    await page.keyboard.press('Control+k');
    assert.equal(await input.inputValue(), '');
    assert.equal(await results.count(), 0);
    await input.fill('zzzz-unmatched-onboarding');
    await page.waitForFunction(() => document.querySelector('.site-search__no-results'));
    assert.equal(await page.locator('.site-search__no-results p').textContent(), lang === 'uk' ? 'Нічого не знайдено' : 'No results found');
    await close.click();
    assert.equal(await trigger.evaluate(el => el === document.activeElement), true);
    await trigger.click();
    await input.fill(lang === 'uk' ? 'каолін' : 'kaolin');
    await results.first().waitFor();
    const href = await results.first().getAttribute('href');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForURL(href);
    assert.equal(new URL(page.url()).pathname.includes('/articles/'), true);
    await page.close();
    cases++;
  }
  console.log(`PASS ${cases} UA/EN desktop/mobile search cases: focus trapping/restoration, shortcuts, result navigation, empty state, Enter`);
} finally { await browser.close(); }
