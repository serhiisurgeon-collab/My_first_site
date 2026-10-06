import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { load } from "cheerio";
import { safeMarkdown } from "../../tools/seo/lib.mjs";
const root = process.env.SEO_SITE_DIR || process.cwd();
const read = (p) => fs.readFile(path.join(root, p), "utf8");
const source = process.cwd();
const map = JSON.parse(
  await fs.readFile(path.join(source, "firebase/article-map.json"), "utf8"),
).articles;
const registry = JSON.parse(
  await fs.readFile(path.join(source, "tools/seo/url-registry.json"), "utf8"),
);
for (const lang of ["uk", "en"]) {
  const articles = JSON.parse(
    await fs.readFile(
      path.join(
        source,
        lang === "uk" ? "data/articles.json" : "data/articles-en.json",
      ),
      "utf8",
    ),
  ).filter((a) => a.type === "article");
  for (const a of articles) {
    const m = map.find((m) => [m.slug, ...m.aliases].includes(a.slug));
    const route = `${lang === "en" ? "en/" : ""}articles/${m.slug}/`;
    test(`${lang} ${m.slug}: initial HTML, metadata, identity and images`, async () => {
      const $ = load(await read(route + "index.html"));
      assert.equal($("h1").length, 1);
      assert.equal(
        $("h1")
          .text()
          .replace(/\u00ad/g, ""),
        a.title,
      );
      assert.equal($("html").attr("lang"), lang);
      assert.equal($("html").attr("data-article-id"), m.id);
      assert.equal($("html").attr("data-article-slug"), m.slug);
      assert.equal($(".article-header__author").text(), a.author);
      assert.equal($(".article-header__meta time").attr("datetime"), a.date);
      assert.equal($("title").text(), a.title + " — Serhii Pelishenko");
      assert.equal($("meta[name=description]").length, 1);
      assert.equal($("meta[name=description]").attr("content"), a.description);
      assert.equal($("link[rel=canonical]").length, 1);
      assert.equal(
        $("link[rel=canonical]").attr("href"),
        "https://serhiipelishenko.com/" + route,
      );
      assert.equal($("meta[name=robots][content*=noindex]").length, 0);
      assert.equal($("script[data-article-schema]").length, 1);
      const schema = JSON.parse($("script[data-article-schema]").text());
      assert.equal(schema.headline, a.title);
      assert.equal(schema.author.name, a.author);
      assert.equal(schema.datePublished, a.date);
      assert.equal(schema.dateModified, a.updated);
      assert.equal(
        schema.author.url,
        "https://serhiipelishenko.com" +
          (lang === "en" ? "/en/about-en.html" : "/about.html"),
      );
      for (const l of ["uk", "en"]) {
        const alternate = $(`link[hreflang=${l}]`);
        assert.equal(alternate.length, 1);
        assert.equal(
          alternate.attr("href"),
          `https://serhiipelishenko.com/${l === "en" ? "en/" : ""}articles/${m.slug}/`,
        );
      }
      const markdown = (
        await fs.readFile(
          path.join(source, `content/articles/${lang}/${a.content}`),
          "utf8",
        )
      )
        .replace(/\n##\s+(?:Історія редакції|Revision history)[\s\S]*$/i, "")
        .replace(/\n(?:Дата редакції|Revision date):[^\n]*\s*$/i, "");
      const expected = load(safeMarkdown(markdown), null, false)
        .text()
        .replace(/\s+/g, " ")
        .trim();
      const actual = $("#articleContent").clone();
      actual.find(".article-revision-date").remove();
      assert.equal(actual.text().replace(/\s+/g, " ").trim(), expected);
      const expectedLinks = load(safeMarkdown(markdown), null, false);
      assert.deepEqual(
        $("#articleContent a[href]")
          .toArray()
          .filter((e) => !$(e).find("img").length)
          .map((e) => $(e).attr("href")),
        expectedLinks("a[href]")
          .toArray()
          .filter((e) => !expectedLinks(e).find("img").length)
          .map((e) => expectedLinks(e).attr("href")),
      );
      assert.ok($("#articleContent").text().length > 1000);
      assert.equal($("#articleContent h4").length, 0);
      assert.ok($("#articleContent h2").length > 0);
      assert.equal(
        $('script[src*=marked],script[src*="/article.js"]').length,
        0,
      );
      assert.equal($('script[src*="/comments/index.js"]').length, 1);
      for (const e of $("img").toArray()) {
        const img = $(e);
        if (img.closest("#articleContent").length) {
          assert.ok(Number(img.attr("width")) > 0);
          assert.ok(Number(img.attr("height")) > 0);
          assert.ok(img.attr("alt"));
          await fs.access(path.join(root, img.attr("src").split("?")[0]));
        }
      }
      for (const e of $('a[href^="#"]').toArray()) {
        const id = $(e).attr("href").slice(1);
        assert.equal(
          $("[id]")
            .toArray()
            .filter((e) => $(e).attr("id") === id).length,
          1,
        );
      }
    });
  }
}
test("sitemap includes ten canonical articles, excludes legacy and S-Dose, no fabricated lastmod", async () => {
  const $ = load(await read("sitemap.xml"), { xmlMode: true });
  const urls = $("loc")
    .map((_, e) => $(e).text())
    .get();
  assert.equal(new Set(urls).size, urls.length);
  assert.equal(urls.filter((u) => /\/articles\/.+\/$/.test(u)).length, 10);
  assert.equal($("lastmod").length, 0);
  assert.ok(urls.includes("https://serhiipelishenko.com/"));
  assert.ok(!urls.some((u) => u.includes("?") || u.includes("s-dose")));
  for (const u of urls) {
    const p = new URL(u).pathname;
    await fs.access(path.join(root, p.endsWith("/") ? p + "index.html" : p));
  }
  assert.match(
    await read("robots.txt"),
    /Sitemap: https:\/\/serhiipelishenko.com\/sitemap.xml/,
  );
  assert.doesNotMatch(await read("robots.txt"), /Disallow:/);
});
test("legacy response has no initial noindex, no false article schema or dates; all aliases known", async () => {
  assert.equal(new Set(registry.routes.map(r=>r.language+' '+r.currentUrl)).size,registry.routes.length,'Registry must not give contradictory policies for the same route');
  for (const p of ["article.html", "en/article-en.html"]) {
    const $ = load(await read(p));
    assert.equal($("meta[name=robots]").length, 0);
    assert.equal($('script[type="application/ld+json"]').length, 0);
    assert.equal($(".article-header__meta").length, 0);
    assert.equal($("#articleContent a").length, 5);
  }
  for (const r of registry.routes.filter((r) => r.kind === "legacy-query")) {
    assert.equal(r.includeInSitemap, false);
    assert.match(r.initialRobots, /no blanket noindex/);
  }
});
test("core pages have unique static metadata and catalog real links", async () => {
  const titles = new Set(),
    descriptions = new Set();
  for (const l of ["uk", "en"])
    for (const name of [
      "index",
      "articles",
      "about",
      "projects",
      "contact",
      "policy",
    ]) {
      const file =
        (l === "en" ? "en/" : "") + name + (l === "en" ? "-en" : "") + ".html";
      const $ = load(await read(file));
      const title = $("title").text(),
        description = $("meta[name=description]").attr("content");
      assert.ok(title && description);
      assert.ok(!titles.has(title));
      titles.add(title);
      assert.ok(!descriptions.has(description));
      descriptions.add(description);
      assert.equal($("link[rel=canonical]").length, 1);
      assert.equal($("link[hreflang=uk]").length, 1);
      assert.equal($("link[hreflang=en]").length, 1);
      assert.equal($("link[hreflang=ua]").length, 0);
      if (name === "articles")
        assert.equal($("#articlesList a.article-row[href]").length, 5);
      if (name === "index")
        assert.equal($(".home-article__link[href]").length, 2);
    }
});
test("public internal links and resources resolve to physical output", async () => {
  for (const r of registry.routes.filter((r) => r.includeInSitemap)) {
    const p = r.canonicalUrl;
    const $ = load(await read(p.endsWith("/") ? p + "index.html" : p));
    for (const e of $("[href],[src]").toArray())
      for (const attr of ["href", "src"]) {
        const value = $(e).attr(attr);
        if (!value || /^(?:#|mailto:|tel:|data:)/.test(value)) continue;
        const url = new URL(value, "https://serhiipelishenko.com" + p);
        if (url.origin !== "https://serhiipelishenko.com") continue;
        const file = decodeURIComponent(url.pathname);
        await fs.access(
          path.join(root, file.endsWith("/") ? file + "index.html" : file),
        );
      }
    assert.equal($("a a").length, 0);
  }
});
