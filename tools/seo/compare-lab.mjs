import { chromium } from "playwright";
import { externalAssets } from "./test-assets.mjs";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const output = [];
try {
  // Warm the same TLS-verified asset cache before both states; browser contexts remain fresh.
  const warm=await browser.newPage();await warm.route(/^https:\/\//,externalAssets);await warm.route('**/js/comments/api.js*',r=>r.abort());await warm.goto('http://127.0.0.1:8142/article.html?article=group-medical-bag');await warm.waitForSelector('#articleContent img');await warm.evaluate(()=>document.fonts.ready);await warm.close();
  for (const width of [1280, 390, 360])
    for (const lang of ["uk", "en"])
      for (const slug of ["npa-effectiveness", "group-medical-bag"])
        for (const state of ["before", "after"]) {
          const context = await browser.newContext({
            viewport: { width, height: 900 },
            deviceScaleFactor: 1,
          });
          await context.route(/^https:\/\//, externalAssets);
          await context.route("**/js/comments/api.js*", (r) =>
            r.fulfill({
              contentType: "text/javascript",
              body: 'export async function createCommentsApi(){throw Error("isolated lab")}',
            }),
          );
          const page = await context.newPage();
          await page.addInitScript(() => {
            window.__shifts = [];
            new PerformanceObserver((l) => {
              for (const e of l.getEntries())
                if (!e.hadRecentInput)
                  window.__shifts.push({ value: e.value, time: e.startTime });
            }).observe({ type: "layout-shift", buffered: true });
          });
          let bytes = 0,
            count = 0;
          const pending = [];
          page.on("response", (r) =>
            pending.push(
              r
                .body()
                .then((b) => {
                  bytes += b.length;
                  count++;
                })
                .catch(() => {}),
            ),
          );
          const prefix = lang === "en" ? "/en" : "";
          const url =
            state === "before"
              ? `http://127.0.0.1:8142${prefix}/article${lang === "en" ? "-en" : ""}.html?article=${slug}`
              : `http://127.0.0.1:8143${prefix}/articles/${slug}/`;
          await page.goto(url);
          await page.waitForSelector("#articleContent h2");
          await page.evaluate(() => document.fonts.ready);
          await page.waitForTimeout(1000);
          assert.ok(
            (await page.locator("#articleContent").innerText()).length > 1000,
            "Real article failed to render",
          );
          assert.equal(
            await page.locator("#articleContent img").count(),
            slug === "npa-effectiveness" ? 2 : 4,
          );
          const imageStates = await page
            .locator("#articleContent img")
            .evaluateAll((imgs) =>
              imgs.map((i) => ({
                src: i.getAttribute("src"),
                width: i.clientWidth,
                naturalWidth: i.naturalWidth,
                top: i.getBoundingClientRect().top,
              })),
            );
          const shifts = await page.evaluate(() => window.__shifts);
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
          await page.waitForTimeout(200);
          await Promise.all(pending);
          let best = 0,
            sum = 0,
            start = 0,
            last = 0;
          for (const e of shifts) {
            if (e.time - last > 1000 || e.time - start > 5000) {
              sum = 0;
              start = e.time;
            }
            sum += e.value;
            best = Math.max(best, sum);
            last = e.time;
          }
          output.push({
            state,
            lang,
            slug,
            width,
            responseBodyBytes: bytes,
            requestCount: count,
            initialViewportLabCLS: best,
            images: imageStates,
          });
          await context.close();
        }
  await fs.writeFile(
    "/workspace/artifacts/seo-static-review/lab-comparison.json",
    JSON.stringify(output, null, 2) + "\n",
  );
  console.log(
    "PASS 24 identical-condition lab captures; response body bytes, not compressed transfer or field CWV",
  );
} finally {
  await browser.close();
}
