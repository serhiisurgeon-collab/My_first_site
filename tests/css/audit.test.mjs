import test from 'node:test';
import assert from 'node:assert/strict';
import { scanCss, deadSelector, fallback, invalidValues } from '../../tools/css/audit.mjs';
import { chromium } from 'playwright';

const types = css => scanCss(css).issues.map(i => i.type);
test('CSS checker rejects duplicate selectors/properties/rules, empty blocks, unknown properties and syntax errors', () => {
  assert.ok(types('.a{color:red}.a{color:red}').includes('duplicate-selector'));
  assert.ok(types('.a{color:red}.a{color:red}').includes('exact-duplicate-rule'));
  assert.ok(types('.a{color:red;color:red}').includes('duplicate-property'));
  assert.ok(types('.a{color:red;color:blue}').includes('shadowed-property'));
  assert.ok(types('.a{}').includes('empty-block'));
  assert.ok(types('.a{colro:red}').includes('unknown-property'));
  assert.ok(types('.a{color:red').includes('invalid-css'));
});
test('media variants, vendor prefixes, page modifiers and progressive viewport fallbacks are intentional', () => {
  const css = '.a{min-height:100vh;min-height:100dvh;backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px)}@media(max-width:768px){.a{display:block}}.page .a{color:red}';
  assert.deepEqual(types(css), []);
  assert.equal(fallback('border', ['1px solid var(--accent)', '0']), false);
  assert.equal(fallback('font-family', ['system-ui,-apple-system,sans-serif', 'system-ui,sans-serif']), false);
});
test('dead-selector analysis preserves JS-generated classes, template prefixes and functional pseudos', () => {
  const used = { classes: new Set(['card']), ids: new Set(), words: new Set(['is-open']), dynamic: ['result-'] };
  for (const selector of ['.card.is-open', '.result-12', '.card:not(.absent)', '.card:is(.first,.second)']) assert.equal(deadSelector(selector, used), false);
  assert.equal(deadSelector('.obsolete .card', used), true);
});
test('browser value validation accepts modern CSS and rejects invalid values', async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    const declarations = [
      {property:'width',value:'min(100% - 32px, 1440px)'},
      {property:'font-size',value:'clamp(24px,5vw,64px)'},
      {property:'width',value:'banana'},
      {property:'color',value:'#notacolor'},
    ];
    const issues = await invalidValues(declarations, page);
    assert.deepEqual(issues.map(i => i.value), ['banana','#notacolor']);
  } finally { await browser.close(); }
});
