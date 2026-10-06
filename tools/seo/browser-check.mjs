import { chromium } from "playwright";
import { externalAssets } from "./test-assets.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const origin = process.env.SEO_TEST_ORIGIN || "http://127.0.0.1:8138";
const out =
  process.env.SEO_ARTIFACTS || "/workspace/artifacts/seo-static-review";
await fs.mkdir(out, { recursive: true });
const map = JSON.parse(
  await fs.readFile("firebase/article-map.json", "utf8"),
).articles;
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const results = [];
const api = `export async function createCommentsApi(){window.__commentsStarts=(window.__commentsStarts||0)+1;return {settings:async()=>({enabled:false,visibility:'visible',moderationMode:'pre'}),page:async(id)=>{(window.__discussionIds||=[]).push(id);return {items:[],hasMore:false,cursor:null}},onAuth:fn=>fn(null)}}`;
try {
  for (const js of [false, true])
    for (const width of js ? [1280, 390, 360] : [390])
      for (const lang of ["uk", "en"])
        for (const m of map) {
          const context = await browser.newContext({
            javaScriptEnabled: js,
            viewport: { width, height: 900 },
            deviceScaleFactor: 1,
          });
          await context.route(/^https:\/\//, externalAssets);
          await context.route("**/js/comments/api.js*", (r) =>
            r.fulfill({ contentType: "text/javascript", body: api }),
          );
          const page = await context.newPage();
          const errors = [];
          page.on("pageerror", (e) => errors.push(e.message));
          const url = `/${lang === "en" ? "en/" : ""}articles/${m.slug}/`;
          await page.goto(origin + url);
          if (js)
            await page.waitForFunction(
              () =>
                document.querySelector("#comments")?.dataset.state === "ready",
            );
          const initial = await page.locator("#articleContent").innerText();
          await page.reload();
          if (js)
            await page.waitForFunction(
              () =>
                document.querySelector("#comments")?.dataset.state === "ready",
            );
          assert.equal(
            await page.locator("#articleContent").innerText(),
            initial,
          );
          assert.ok(initial.length > 1000);
          assert.equal(await page.locator("h1").count(), 1);
          assert.equal(await page.locator("link[rel=canonical]").count(), 1);
          assert.equal(
            await page.locator("script[data-article-schema]").count(),
            1,
          );
          assert.equal(
            await page.locator("html").getAttribute("data-article-id"),
            m.id,
          );
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          );
          assert.equal(overflow, false, url + ": overflow");
          if (js) {
            assert.equal(await page.evaluate(() => window.__commentsStarts), 1);
            assert.deepEqual(
              await page.evaluate(() => window.__discussionIds),
              [m.id],
            );
            assert.deepEqual(errors, []);
            const heading=page.locator('#articleContent .article-section-heading').first();const headingId=await heading.getAttribute('id');await heading.evaluate(h=>window.scrollTo({top:h.getBoundingClientRect().top+scrollY-innerHeight*.25,behavior:'instant'}));await page.waitForFunction(id=>[...document.querySelectorAll('.article-toc__link')].some(a=>a.getAttribute('href')==='#'+id&&a.classList.contains('is-active')),headingId);
            for (const img of await page.locator("#articleContent img").all()) {
              await img.scrollIntoViewIfNeeded();
              await img.evaluate((i) =>
                i.complete
                  ? Promise.resolve()
                  : new Promise((resolve, reject) => {
                      i.addEventListener("load", resolve, { once: true });
                      i.addEventListener("error", reject, { once: true });
                    }),
              );
            }
            await page.evaluate(() =>
              window.scrollTo({ top: 0, behavior: "instant" }),
            );
            if (m.slug === "npa-effectiveness")
              await page
                .locator("#articleContent img")
                .first()
                .screenshot({
                  path: path.join(out, `${lang}-npa-figure-${width}.png`),
                });
            await page.evaluate(() =>
              window.scrollTo({ top: 0, behavior: "instant" }),
            );
            await page.screenshot({
              path: path.join(out, `${lang}-${m.slug}-${width}.png`),
              fullPage: true,
            });
          }
          results.push({
            url,
            width,
            javaScript: js,
            status: "PASS",
            comments: js ? "mock API; initialized once" : "not run",
            horizontalOverflow: overflow,
          });
          await context.close();
        }
  for (const lang of ["uk", "en"])
    for (const m of map)
      for (const slug of [m.slug, ...m.aliases]) {
        const context = await browser.newContext();
        await context.route(/^https:\/\//, externalAssets);
        await context.route("**/js/comments/api.js*", (r) =>
          r.fulfill({ contentType: "text/javascript", body: api }),
        );
        const page = await context.newPage();
        const legacy = lang === "en" ? "/en/article-en.html" : "/article.html";
        await page.goto(
          origin + legacy + "?article=" + slug + "&commentsAdmin=1#sources",
        );
        await page.waitForURL("**/articles/**");
        const actual = new URL(page.url());
        assert.equal(
          actual.pathname,
          `/${lang === "en" ? "en/" : ""}articles/${m.slug}/`,
        );
        assert.equal(actual.search, "?commentsAdmin=1");
        assert.equal(actual.hash, "#sources");
        assert.equal(
          await page.locator("html").getAttribute("data-article-id"),
          m.id,
        );
        results.push({
          url: legacy + "?article=" + slug,
          status: "PASS",
          scenario: "legacy alias, moderation parameter, fragment",
        });
        await context.close();
      }
  for (const language of ["uk", "en"])
    for (const query of [
      "",
      "?article=",
      "?article=unknown",
      "?article=https://evil.example/",
      "?article=__proto__",
    ]) {
      const page = await browser.newPage();
      const legacy =
        language === "en" ? "/en/article-en.html" : "/article.html";
      await page.route(/^https:\/\//, externalAssets);
      await page.goto(origin + legacy + query);
      await page.waitForFunction(
        () =>
          document.querySelector("meta[name=robots]")?.content === "noindex",
      );
      assert.equal(
        await page.locator("script[data-article-schema]").count(),
        0,
      );
      assert.equal(await page.locator(".article-header__meta").count(), 0);
      assert.equal(new URL(page.url()).pathname, legacy);
      results.push({
        url: legacy + query,
        status: "PASS",
        httpStatus: 200,
        scenario: "error state only noindex; no open redirect",
      });
      await page.close();
    }
  for (const lang of ["uk", "en"]) {
    const page = await browser.newPage({
      viewport: { width: 390, height: 900 },
    });
    await page.route(/^https:\/\//, externalAssets);
    await page.goto(
      origin + (lang === "en" ? "/en/articles-en.html" : "/articles.html"),
    );
    await page.waitForFunction(
      () => document.querySelectorAll(".article-row").length === 5,
    );
    assert.equal(await page.locator("a.article-row[href]").count(), 5);
    await page.locator("[data-filter=technology]").click();
    assert.equal(await page.locator(".article-row:not([hidden])").count(), 1);
    await page.locator("[data-filter=all]").click();
    await page.locator(".site-nav__toggle").click();
    assert.equal(
      await page.locator(".site-nav__toggle").getAttribute("aria-expanded"),
      "true",
    );
    await page.locator(".site-search-trigger").click();
    await page
      .locator(".site-search__input")
      .fill(lang === "en" ? "Nasopharyngeal" : "NPA");
    await page
      .locator('.site-search__result[href*="/articles/npa-effectiveness/"]')
      .first()
      .waitFor({ state: "visible" });
    assert.equal(
      await page.locator('.site-search__result[href*="?article="]').count(),
      0,
    );
    results.push({
      language: lang,
      status: "PASS",
      scenario: "catalog hrefs, filters, mobile menu and search",
    });
    await page.close();
  }
  for (const language of ["uk", "en"]) {
    const c = await browser.newContext({ javaScriptEnabled: false });
    await c.route(/^https:\/\//, externalAssets);
    const p = await c.newPage();
    await p.goto(
      origin +
        (language === "en" ? "/en/article-en.html" : "/article.html") +
        "?article=npa-effectiveness",
    );
    assert.equal(await p.locator("#articleContent a").count(), 5);
    await p.locator("#articleContent a").first().click();
    assert.equal(
      await p.locator("html").getAttribute("data-article-id"),
      "a-0005",
    );
    results.push({
      language,
      status: "PASS",
      scenario: "legacy fallback links without JavaScript",
    });
    await c.close();
  }
  const page = await browser.newPage();
  await page.route(/^https:\/\//, externalAssets);
  await page.route("**/js/comments/api.js*", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body: 'export async function createCommentsApi(){throw Error("Firebase unavailable") }',
    }),
  );
  await page.goto(origin + "/articles/npa-effectiveness/");
  await page.waitForFunction(
    () => document.querySelector("#comments").dataset.state === "error",
  );
  assert.ok((await page.locator("#articleContent").innerText()).length > 1000);
  results.push({
    status: "PASS",
    scenario: "Firebase unavailable; article remains readable",
  });
  await page.close();
  await fs.writeFile(
    path.join(out, "browser-results.json"),
    JSON.stringify(results, null, 2) + "\n",
  );
  console.log(
    "PASS " +
      results.length +
      " browser scenarios; mock API, no Firebase access",
  );
} finally {
  await browser.close();
}
