import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import * as csstree from 'css-tree';
import { load } from 'cheerio';
import { chromium } from 'playwright';

const ignored = new Set(['node_modules', '.git', '.private', 'docs', 'tests', 'artifacts', '_site']);
export async function sources(dir = '.') {
  const all = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) all.push(...await sources(file));
    else all.push(file);
  }
  return all;
}
export function context(node) {
  const result = [];
  for (let p = node.parent; p && p.type !== 'root'; p = p.parent)
    result.unshift(p.type === 'atrule' ? '@' + p.name + ' ' + p.params : p.selector);
  return result.join(' > ');
}
export function selectorKey(selector) {
  try { return csstree.generate(csstree.parse(selector, { context: 'selectorList' })); }
  catch { return selector.trim().replace(/\s+/g, ' '); }
}
export function fallback(prop, values) {
  // A custom property or a font fallback list alone is not progressive enhancement.
  // Retain a sequence only when the final declaration needs newer browser support.
  const last = values.at(-1);
  if (/^overflow(?:-[xy])?$/.test(prop) && last === 'clip' && values.includes('hidden')) return true;
  return /\d(?:dvh|svh|lvh|dvw|svw)\b|(?:image-set|color-mix)\(/i.test(last) ||
    (prop === 'display' && values.some(v => /^-(webkit|moz)-/.test(v)) && /^(flex|grid)$/.test(last));
}
export async function census(files) {
  const words = new Set(), classes = new Set(), ids = new Set(), dynamic = [];
  for (const file of files) {
    if (file.replaceAll('\\', '/').includes('tools/css/') || !/\.(html|js|mjs|md|json|svg)$/.test(file)) continue;
    const text = await fs.readFile(file, 'utf8');
    let code = text;
    if (/\.(html|svg)$/.test(file)) {
      const $ = load(text, { scriptingEnabled: false });
      $('[class]').each((_, e) => ($(e).attr('class') || '').split(/\s+/).forEach(x => classes.add(x)));
      $('[id]').each((_, e) => ids.add($(e).attr('id')));
      code = $('script:not([src])').text();
    }
    for (const word of code.matchAll(/[A-Za-z_][\w-]*/g)) words.add(word[0]);
    for (const match of code.matchAll(/([a-z][\w-]+)\$\{/g)) dynamic.push(match[1]);
  }
  return { words, classes, ids, dynamic };
}
export function deadSelector(selector, used) {
  let ast;
  try { ast = csstree.parse(selector, { context: 'selector' }); } catch { return false; }
  let nested = 0, dead = false;
  csstree.walk(ast, {
    enter(node) {
      if (node.type === 'PseudoClassSelector' && node.children) nested++;
      if (!nested && (node.type === 'ClassSelector' || node.type === 'IdSelector')) {
        const name = node.name;
        if (!(node.type === 'ClassSelector' ? used.classes : used.ids).has(name) &&
            !used.words.has(name) && !used.dynamic.some(prefix => name.startsWith(prefix))) dead = true;
      }
    },
    leave(node) { if (node.type === 'PseudoClassSelector' && node.children) nested--; },
  });
  return dead;
}
const descriptors = new Set(['src', 'font-display', 'unicode-range', 'size-adjust', 'ascent-override', 'descent-override', 'line-gap-override']);
export function scanCss(css, file = '<input>', used) {
  const issues = [], exceptions = [], dead = [], declarations = [];
  let root;
  try {
    root = postcss.parse(css, { from: file });
    // PostCSS deliberately accepts some malformed values; CSS-tree supplies syntax checks.
    csstree.parse(css, { onParseError(error) { throw error; } });
  } catch (error) {
    return { issues: [{ type: 'invalid-css', file, line: error.line, message: error.reason || error.message }], exceptions, dead, declarations };
  }
  const seen = new Map(), exact = new Map();
  root.walkRules(rule => {
    if (rule.parent.type === 'atrule' && /keyframes$/.test(rule.parent.name)) return;
    const key = context(rule) + '|' + selectorKey(rule.selector), line = rule.source.start.line;
    const signature = rule.nodes.filter(x => x.type === 'decl').map(d => d.prop + ':' + d.value + (d.important ? '!important' : '')).join(';');
    if (seen.has(key)) issues.push({ type: 'duplicate-selector', file, line, selector: rule.selector, context: context(rule), previous: seen.get(key) });
    seen.set(key, line);
    const full = key + '|' + signature;
    if (exact.has(full)) issues.push({ type: 'exact-duplicate-rule', file, line, selector: rule.selector, previous: exact.get(full) });
    exact.set(full, line);
    if (used) for (const selector of rule.selectors)
      if (deadSelector(selector, used)) dead.push({ file, line, selector, context: context(rule) });
  });
  root.walk(node => {
    if (!node.nodes) return;
    if (!node.nodes.some(n => n.type !== 'comment')) issues.push({ type: 'empty-block', file, line: node.source?.start.line, selector: node.selector || '@' + node.name + ' ' + node.params });
    const props = new Map();
    for (const decl of node.nodes.filter(n => n.type === 'decl')) {
      const prop = decl.prop.toLowerCase(), line = decl.source.start.line;
      if (!props.has(prop)) props.set(prop, []);
      props.get(prop).push(decl);
      if (prop.startsWith('--')) continue;
      if (prop.startsWith('-')) { exceptions.push({ type: 'vendor-property', file, line, property: prop }); continue; }
      const descriptor = node.type === 'atrule' && node.name === 'font-face' && descriptors.has(prop);
      if (!csstree.lexer.getProperty(prop) && !descriptor) issues.push({ type: 'unknown-property', file, line, property: prop });
      else if (!descriptor) declarations.push({ file, line, property: prop, value: decl.value });
    }
    for (const [prop, list] of props) {
      if (list.length < 2) continue;
      const values = list.map(d => d.value + (d.important ? '!important' : ''));
      if (new Set(values).size !== values.length) issues.push({ type: 'duplicate-property', file, line: node.source.start.line, selector: node.selector, property: prop, values });
      else if (fallback(prop, values)) exceptions.push({ type: 'progressive-fallback', file, line: node.source.start.line, property: prop, values });
      else issues.push({ type: 'shadowed-property', file, line: node.source.start.line, selector: node.selector, property: prop, values });
    }
  });
  return { issues, exceptions, dead, declarations };
}
export async function invalidValues(declarations, page) {
  // Browser validation understands modern math, gradients and masks that the static lexer
  // cannot reliably match. It also rejects e.g. `width: banana` and `color: #notacolor`.
  const valid = await page.evaluate(list => list.map(d => CSS.supports(d.property, d.value)), declarations);
  return declarations.flatMap((decl, index) => valid[index] ? [] : [{ type: 'invalid-value', ...decl }]);
}
export async function audit({ validateValues = true } = {}) {
  const files = await sources(), used = await census(files), issues = [], exceptions = [], dead = [], declarations = [];
  let units = 0, inlineAttributes = 0;
  const scan = (css, file) => { const result = scanCss(css, file, used); units++; issues.push(...result.issues); exceptions.push(...result.exceptions); dead.push(...result.dead); declarations.push(...result.declarations); };
  for (const file of files) {
    if (file.endsWith('.css')) scan(await fs.readFile(file, 'utf8'), file);
    else if (file.endsWith('.html')) {
      const $ = load(await fs.readFile(file, 'utf8'), { scriptingEnabled: false });
      $('style').each((i, e) => scan($(e).text(), file + '#style-' + i));
      $('[style]').each((i, e) => { inlineAttributes++; scan(':where(*){' + $(e).attr('style') + '}', file + '#inline-' + i); });
    }
  }
  if (validateValues) {
    const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
    try { const page = await browser.newPage(); issues.push(...await invalidValues(declarations, page)); }
    finally { await browser.close(); }
  }
  return { files: units, inlineAttributes, issues, dead, exceptions };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await audit({ validateValues: !process.argv.includes('--syntax-only') });
  const index = process.argv.indexOf('--report');
  if (index >= 0) await fs.writeFile(process.argv[index + 1], JSON.stringify(result, null, 2) + '\n');
  const counts = {};
  for (const issue of result.issues) counts[issue.type] = (counts[issue.type] || 0) + 1;
  console.log(JSON.stringify({ cssUnits: result.files, inlineAttributes: result.inlineAttributes, issues: counts, deadCandidates: result.dead.length, intentionalFallbacks: result.exceptions.length }));
  if (!process.argv.includes('--inventory') && result.issues.length) {
    console.error(JSON.stringify(result.issues.slice(0, 30), null, 2)); process.exitCode = 1;
  }
}
