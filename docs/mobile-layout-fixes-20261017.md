# Narrow-screen layout fixes, 2026-10-17

Baseline: `8cf04b6517e8fdc2926b82e6d5f9bc566edf21f3`.

- `css/responsive.css`: shared header layout at <=380px reserves space for search, language selection and Menu. The brand may wrap; controls no longer protrude beyond the viewport. No document-wide overflow masking.
- `project/2d_try.html`: `.card` uses border-box and max-width:100%. Its desktop outer width remains 296px (previously 250px content + 40px padding + 6px border).
- `project/project_blood/blood_style.css`: `.page-after` clips horizontal animation overflow locally; ScrollReveal settings and content remain intact. Stylesheet URL in `blood_html.html` is versioned.
- `tools/seo/build.mjs`: content-hash versioning now includes responsive.css. Regenerated core/article HTML and versioned the six independent S-Dose/Spanish landing pages so existing CSS caches do not hide this update.
- `tests/layout/narrow-layout.mjs`: regression checks all sitemap pages and two legacy article routes at 320/360/390/1280px, actual control bounds and opening/closing Menu; Dune including hover and donation ScrollReveal/reset at 320/390/1280px. External donation photo is proxy-blocked in the test environment: the test substitutes a loaded 1200x800 JPEG, retaining the real ScrollReveal library.

Validation commands:

```sh
npm run seo:build
npm run seo:check
npm run seo:test
npm run seo:jekyll
npm run seo:public-check
node tests/layout/narrow-layout.mjs
TEST_ORIGIN=http://127.0.0.1:8169 node tests/s-dose/mobile-hero.mjs
```

Browser tests use the Jekyll output served locally on port 8169. Screenshots are saved outside the public repository under `/workspace/artifacts/layout-fixes-20261017/`. No article texts, metadata, Firebase configuration/data or publication workflow changes.
