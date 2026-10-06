import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { safeMarkdown, validate } from "./lib.mjs";
import { load } from "cheerio";
import sharp from "sharp";
export const ROOT = process.env.SEO_SOURCE_ROOT
  ? path.resolve(process.env.SEO_SOURCE_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const origin = "https://serhiipelishenko.com";
const check = process.argv.includes("--check");
const outputs = new Map();
const assetVersions = new Map();
for (const p of [
  "js/main.js",
  "js/articles.js",
  "js/comments/index.js",
  "js/article-legacy.js",
  "js/article-static.js",
  "css/pages/article.css",
  "css/pages/articles.css",
])
  assetVersions.set(
    "/" + p,
    createHash("sha256")
      .update(await fs.readFile(path.join(ROOT, p)))
      .digest("hex")
      .slice(0, 16),
  );
function versionAssets($, base) {
  $('script[src],link[rel="stylesheet"][href]').each((_, el) => {
    const key = el.tagName === "script" ? "src" : "href";
    const url = new URL($(el).attr(key), origin + base);
    const version = assetVersions.get(url.pathname);
    if (url.origin === origin && version) {
      url.searchParams.set("v", version);
      $(el).attr(key, url.pathname + url.search + url.hash);
    }
  });
}

const read = (p) => fs.readFile(path.join(ROOT, p), "utf8");
const json = async (p) => JSON.parse(await read(p));
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const slugify = (s) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-zа-яіїєґ0-9\s-]/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
const date = (s, l) =>
  new Intl.DateTimeFormat(l === "en" ? "en-GB" : "uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(s));
const categories = {
  uk: {
    "tactical-medicine": "Тактична медицина",
    medicine: "Медицина",
    technology: "Технології",
  },
  en: {
    "tactical-medicine": "Tactical Medicine",
    medicine: "Medicine",
    technology: "Technology",
  },
};

function meta($, { title, description, url, pair, lang, article }) {
  $(
    'head title,head meta[name="description"],head link[rel="canonical"],head link[rel="alternate"][hreflang],head meta[property^="og:"],head script[data-article-schema]',
  ).remove();
  const head = $("head");
  head.append(
    `<title>${esc(title)}</title>\n<meta name="description" content="${esc(description)}">\n<link rel="canonical" href="${origin + url}">\n`,
  );
  for (const l of ["uk", "en"])
    head.append(
      `<link rel="alternate" hreflang="${l}" href="${origin + pair[l]}">\n`,
    );
  for (const [p, v] of Object.entries({
    "og:title": title,
    "og:description": description,
    "og:url": origin + url,
    "og:type": article ? "article" : "website",
    "og:locale": lang === "uk" ? "uk_UA" : "en_GB",
  }))
    head.append(`<meta property="${p}" content="${esc(v)}">\n`);
  if (article) {
    const schema = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.title,
      description: article.description,
      inLanguage: lang,
      author: {
        "@type": "Person",
        name: article.author,
        url: origin + (lang === "uk" ? "/about.html" : "/en/about-en.html"),
      },
      mainEntityOfPage: origin + url,
      datePublished: article.date,
    };
    if (article.updated) schema.dateModified = article.updated;
    if (article.image) {
      schema.image = origin + article.image;
      head.append(
        `<meta property="og:image" content="${origin + article.image}">`,
      );
    }
    head.append(
      `<script type="application/ld+json" data-article-schema>${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>`,
    );
  }
}
function absoluteAssets($, base) {
  $("[href],[src]").each((_, el) => {
    for (const attr of ["href", "src"]) {
      const v = $(el).attr(attr);
      if (v && !/^(?:#|[a-z]+:|\/)/i.test(v)) {
        $(el).attr(
          attr,
          new URL(v, origin + base).pathname + new URL(v, origin + base).search,
        );
      }
    }
  });
}
const route = (l, m) => `${l === "en" ? "/en" : ""}/articles/${m.slug}/`;
const articleMap = (await json("firebase/article-map.json")).articles;
const all = {
  uk: await json("data/articles.json"),
  en: await json("data/articles-en.json"),
};
const data = {
  uk: all.uk.filter((a) => a.type === "article"),
  en: all.en.filter((a) => a.type === "article"),
};
validate(articleMap, data);
const mapping = {};
const registry = [];
for (const m of articleMap) {
  mapping[m.slug] = { id: m.id, uk: route("uk", m), en: route("en", m) };
  for (const alias of m.aliases) mapping[alias] = mapping[m.slug];
}
outputs.set(
  "data/article-routes.json",
  JSON.stringify(mapping, null, 2) + "\n",
);
const images = new Map();
async function image($, el, index) {
  const img = $(el);
  const original = img.attr("src");
  const match = original?.match(
    /(?:\.\.\/|\.\/|\/)?(content\/articles\/(?:uk|en)\/image\/[^?#]+)$/,
  );
  if (!match) throw Error("Unrecognized image path: " + original);
  const p = match[1];
  const bytes = await fs.readFile(path.join(ROOT, p));
  let info = images.get(p);
  if (!info) {
    const s = sharp(bytes);
    const dimensions = await s.metadata();
    const webp = await s.webp({ lossless: true, effort: 6 }).toBuffer();
    const out = p
      .replace(/\/image\//, "/image/optimized/")
      .replace(/\.[^.]+$/, ".webp");
    info = {
      width: dimensions.width,
      height: dimensions.height,
      src: webp.length < bytes.length ? "/" + out : "/" + p,
      originalBytes: bytes.length,
      optimizedBytes: Math.min(bytes.length, webp.length),
    };
    if (webp.length < bytes.length) outputs.set(out, webp);
    images.set(p, info);
  }
  img.attr({
    src: info.src,
    width: info.width,
    height: info.height,
    decoding: "async",
  });
  if (index === 0) img.removeAttr("loading");
  else img.attr("loading", "lazy");
  if (img.parent().is("a")) img.parent().attr("href", "/" + p);
}
for (const lang of ["uk", "en"]) {
  const template = await read(`tools/seo/templates/article-${lang}.html`);
  const base = lang === "en" ? "/en/article-en.html" : "/article.html";
  for (const a of data[lang]) {
    const m = articleMap.find((m) => [m.slug, ...m.aliases].includes(a.slug));
    const url = route(lang, m);
    try {
      const existing = load(await read(url.slice(1) + "index.html"));
      if (
        existing("html").attr("data-static-article") !== "true" ||
        existing("html").attr("data-article-id") !== m.id ||
        existing("html").attr("lang") !== lang
      )
        throw Error("Route collision: " + url);
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
    const $ = load(template);
    absoluteAssets($, base);
    $("html").attr({
      "data-static-article": "true",
      "data-article-slug": m.slug,
      "data-article-id": m.id,
    });
    $(
      'script[src*="marked"],script[src*="article-language"],script[src*="/article.js"],script[src*="/articles.js"]',
    ).remove();
    $("body").append(
      '<script type="module" src="/js/article-static.js"></script>',
    );
    $(".article-header__title").text(
      a.title
        .replace(/Назофарингіальний/g, "Назо\u00adфарин\u00adгіальний")
        .replace(/повітропровід/g, "повітро\u00adпровід"),
    );
    $(".article-header__lead").text(a.description);
    $(".article-header__author").html(
      `<a href="${lang === "en" ? "/en/about-en.html" : "/about.html"}">${esc(a.author)}</a>`,
    );
    $(".article-header__meta").html(
      `<span class="article-header__category">${esc(categories[lang][a.category])}</span><time datetime="${a.date}">${esc(date(a.date, lang))}</time><span>${a.readTime} ${lang === "en" ? "min read" : "хв читання"}</span>`,
    );
    if (a.updated && a.updated !== a.date)
      $(".article-header__updated")
        .removeAttr("hidden")
        .html(
          `${lang === "en" ? "Updated" : "Оновлено"}: <time datetime="${a.updated}">${esc(date(a.updated, lang))}</time>`,
        );
    else $(".article-header__updated").attr("hidden", "").empty();
    const md = (await read(`content/articles/${lang}/${a.content}`))
      .replace(/\n##\s+(?:Історія редакції|Revision history)[\s\S]*$/i, "")
      .replace(/\n(?:Дата редакції|Revision date):[^\n]*\s*$/i, "");
    const body = load(safeMarkdown(md), null, false);
    const seen = new Map();
    body("h1").each((_, e) => {
      throw Error("Body duplicates H1: " + a.slug);
    });
    body("h2,h3,h4").each((_, e) => {
      const original = e.tagName;
      if (original === "h4") {
        e.tagName = "h3";
        body(e).addClass("seo-heading-sub");
      }
      let id = slugify(body(e).text());
      const count = (seen.get(id) || 0) + 1;
      seen.set(id, count);
      if (count > 1) id += "-" + count;
      body(e).attr("id", id).addClass("article-section-heading");
    });
    let i = 0;
    for (const el of body("img").toArray()) await image(body, el, i++);
    if (a.content === "npa-effectiveness.md")
      body("img").attr("loading", "lazy");
    const toc = body("h2,h3")
      .toArray()
      .map(
        (e) =>
          `<a class="article-toc__link${e.tagName === "h3" ? " article-toc__link--sub" : ""}" href="#${esc(body(e).attr("id"))}">${esc(body(e).text())}</a>`,
      )
      .join("");
    $(".article-toc__nav").html(
      `<span class="article-toc__label">${lang === "en" ? "In this article" : "У цій статті"}</span>${toc}`,
    );
    $("#articleContent").html(body.html());
    if (a.updated) {
      const [y, mo, d] = a.updated.split("-");
      $("#articleContent").append(
        `<p class="article-revision-date">${lang === "en" ? "Revision date" : "Дата редакції"}: <time datetime="${a.updated}">${d}.${mo}.${y}</time></p>`,
      );
    }
    $(".site-nav__language-option").each((_, e) =>
      $(e).attr("href", route($(e).attr("lang"), m)),
    );
    const sorted = [...data[lang]].sort((a, b) => b.date.localeCompare(a.date));
    const idx = sorted.indexOf(a);
    for (const [selector, n] of [
      ["#previousArticle", idx - 1],
      ["#nextArticle", idx + 1],
    ]) {
      const other = sorted[n];
      if (other) {
        const target = articleMap.find((m) =>
          [m.slug, ...m.aliases].includes(other.slug),
        );
        $(selector).attr("href", route(lang, target));
        $(selector + "Title").text(other.title);
      } else $(selector).remove();
    }
    const relatedSlugs = {
      "hospital-capabilities": ["group-medical-bag"],
      "medical-app-without-internet": ["hospital-capabilities"],
      "how-kaolin-works": ["group-medical-bag"],
      "group-medical-bag": ["how-kaolin-works", "npa-effectiveness"],
      "npa-effectiveness": ["group-medical-bag"],
    };
    const related = data[lang]
      .filter((x) =>
        relatedSlugs[m.slug]?.includes(x.content.replace(/\.md$/, "")),
      )
      .slice(0, 2);
    if (related.length) {
      $(".article-pagination").before(
        `<aside class="article-related"><h2>${lang === "en" ? "Related articles" : "Пов’язані матеріали"}</h2><ul>${related
          .map(
            (x) =>
              `<li><a href="${route(
                lang,
                articleMap.find((m) => [m.slug, ...m.aliases].includes(x.slug)),
              )}">${esc(x.title)}</a></li>`,
          )
          .join("")}</ul></aside>`,
      );
    }
    meta($, {
      title: a.title + " — Serhii Pelishenko",
      description: a.description,
      url,
      pair: { uk: route("uk", m), en: route("en", m) },
      lang,
      article: a,
    });
    versionAssets($, base);
    outputs.set(url.slice(1) + "index.html", $.html() + "\n");
    registry.push({
      language: lang,
      articleId: m.id,
      currentUrl: url,
      previousUrl: base + "?article=" + a.slug,
      canonicalUrl: url,
      includeInSitemap: true,
      initialRobots: "index,follow (default)",
      kind: "canonical-article",
    });
  }
}
const basics = {
  index: {
    uk: [
      "Сергій Пелішенко — медицина, навчання та технології",
      "Статті про тактичну медицину, медичне планування та технології. Проєкти й професійний досвід Сергія Пелішенка.",
    ],
    en: [
      "Serhii Pelishenko — Medicine, Education and Technology",
      "Articles on tactical medicine, medical planning and technology, alongside projects and professional experience by Serhii Pelishenko.",
    ],
  },
  articles: {
    uk: [
      "Статті про тактичну медицину та медичні технології",
      "Матеріали про гемостаз, дихальні шляхи, медичне оснащення, спроможності лікарень та медичні застосунки.",
    ],
    en: [
      "Articles on Tactical Medicine and Medical Technology",
      "Articles about haemostasis, airway management, medical equipment, hospital capabilities and medical apps.",
    ],
  },
  about: {
    uk: [
      "Про автора — Сергій Пелішенко",
      "Професійний досвід Сергія Пелішенка: медицина, навчання та розроблення практичних інструментів.",
    ],
    en: [
      "About the Author — Serhii Pelishenko",
      "Professional experience of Serhii Pelishenko in medicine, education and development of practical tools.",
    ],
  },
  projects: {
    uk: [
      "Медичні та навчальні проєкти — Сергій Пелішенко",
      "Проєкти Сергія Пелішенка: медичні інструменти, навчальні матеріали й Spanish by Serhii.",
    ],
    en: [
      "Medical and Educational Projects — Serhii Pelishenko",
      "Projects by Serhii Pelishenko: medical tools, learning resources and Spanish by Serhii.",
    ],
  },
  contact: {
    uk: [
      "Контакти — Сергій Пелішенко",
      "Зв’язок із Сергієм Пелішенком щодо професійної співпраці, навчання та проєктів.",
    ],
    en: [
      "Contact — Serhii Pelishenko",
      "Contact Serhii Pelishenko about professional collaboration, education and projects.",
    ],
  },
  policy: {
    uk: [
      "Політика конфіденційності — Serhii Pelishenko",
      "Як сайт serhiipelishenko.com обробляє дані відвідувачів, Google-вхід та коментарі.",
    ],
    en: [
      "Privacy Policy — Serhii Pelishenko",
      "How serhiipelishenko.com processes visitor information, Google sign-in and comments.",
    ],
  },
};
const pageUrl = (name, l) =>
  name === "index" && l === "uk"
    ? "/"
    : `${l === "en" ? "/en" : ""}/${name}${l === "en" ? "-en" : ""}.html`;
for (const [name, localized] of Object.entries(basics))
  for (const l of ["uk", "en"]) {
    const file = name + (l === "en" ? "-en" : "") + ".html";
    const p = (l === "en" ? "en/" : "") + file;
    const $ = load(await read("tools/seo/templates/pages/" + p));
    meta($, {
      title: localized[l][0],
      description: localized[l][1],
      url: pageUrl(name, l),
      pair: { uk: pageUrl(name, "uk"), en: pageUrl(name, "en") },
      lang: l,
    });
    if (name === "index") {
      $(".home-articles__grid").html(
        [...data[l]]
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 2)
          .map((a) => {
            const m = articleMap.find((m) =>
              [m.slug, ...m.aliases].includes(a.slug),
            );
            return `<article class="home-article"><a class="home-article__link" href="${route(l, m)}" rel="noopener noreferrer"><div class="home-article__meta"><span>${esc(categories[l][a.category])}</span><time datetime="${a.date}">${esc(date(a.date, l))}</time></div><h3 class="home-article__title">${esc(a.title)}</h3><p class="home-article__description">${esc(a.description)}</p><span class="home-article__read">${l === "en" ? "Read article" : "Читати статтю"} <span aria-hidden="true">→</span></span></a></article>`;
          })
          .join("\n"),
      );
    }
    if (name === "articles") {
      $("#articlesList")
        .attr("data-static-catalog", "true")
        .html(
          [...data[l]]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((a) => {
              const m = articleMap.find((m) =>
                [m.slug, ...m.aliases].includes(a.slug),
              );
              return `<a class="article-row" href="${route(l, m)}" data-type="article" data-category="${a.category}"><div class="article-row__meta"><span class="article-row__category">${esc(categories[l][a.category])}</span><time class="article-row__date" datetime="${a.date}">${esc(date(a.date, l))}</time></div><div class="article-row__content"><h3 class="article-row__title">${esc(a.title)}</h3><p class="article-row__excerpt">${esc(a.description)}</p></div><div class="article-row__action"><span class="article-row__read-time">${a.readTime} ${l === "en" ? "min read" : "хв читання"}</span><span class="article-row__arrow" aria-hidden="true">→</span></div></a>`;
            })
            .join("\n"),
        );
    }
    versionAssets($, "/" + p);
    outputs.set(p, $.html() + "\n");
    registry.push({
      language: l,
      articleId: null,
      currentUrl: pageUrl(name, l),
      canonicalUrl: pageUrl(name, l),
      includeInSitemap: true,
      initialRobots: "index,follow (default)",
      kind: "page",
    });
  }
for (const l of ["uk", "en"]) {
  const p = l === "uk" ? "article.html" : "en/article-en.html";
  const $ = load(await read(`tools/seo/templates/article-${l}.html`));
  absoluteAssets($, "/" + p);
  $(
    'script[src*="marked"],script[src*="article-language"],script[src*="/article.js"],script[src*="/articles.js"],script[src*="/comments/index.js"]',
  ).remove();
  $(".article-header__title").text(
    l === "uk" ? "Оберіть статтю" : "Choose an article",
  );
  $(
    ".article-header__meta,.article-header__lead,.article-header__author,.article-header__updated,.article-toc__nav,.article-pagination,.article-discussion",
  ).remove();
  $("#articleContent").html(
    `<p>${l === "uk" ? "Старе посилання? Оберіть відповідний матеріал зі списку." : "Following an older link? Choose the corresponding article below."}</p><ul>${data[
      l
    ]
      .map((a) => {
        const m = articleMap.find((m) =>
          [m.slug, ...m.aliases].includes(a.slug),
        );
        return `<li><a href="${route(l, m)}">${esc(a.title)}</a></li>`;
      })
      .join("")}</ul>`,
  );
  $("head").append(
    `<title>${l === "uk" ? "Вибір статті" : "Choose an article"} — Serhii Pelishenko</title>`,
  );
  $("body").append(
    '<script type="module" src="/js/article-legacy.js"></script>',
  );
  versionAssets($, "/" + p);
  outputs.set(p, $.html() + "\n");
}
registry.push({
  language: "uk",
  articleId: null,
  currentUrl: "/index.html",
  canonicalUrl: "/",
  includeInSitemap: false,
  initialRobots: "index,follow (default)",
  kind: "html-alias",
});
for (const [alias, target] of Object.entries(mapping))
  for (const l of ["uk", "en"])
    registry.push({
      language: l,
      articleId: target.id,
      currentUrl: `${l === "en" ? "/en/article-en.html" : "/article.html"}?article=${alias}`,
      canonicalUrl: target[l],
      includeInSitemap: false,
      initialRobots: "index,follow (default); no blanket noindex",
      errorStateRobots: "noindex only for unknown or missing article",
      kind: "legacy-query",
    });
for (const l of ["uk", "en"]) {
  registry.push({
    language: l,
    articleId: null,
    currentUrl: pageUrl("s-dose", l),
    canonicalUrl: pageUrl("s-dose", l),
    includeInSitemap: false,
    initialRobots: "noindex,nofollow",
    kind: "restricted-page",
  });
  registry.push({
    language: l,
    articleId: null,
    currentUrl: pageUrl("spanish-bot", l),
    canonicalUrl: pageUrl("spanish-bot", l),
    includeInSitemap: true,
    initialRobots: "index,follow (default)",
    kind: "page",
  });
}
for (const url of [
  "/article.html?article=unknown",
  "/article.html?article=",
  "/article.html",
  "/en/article-en.html?article=unknown",
  "/articles/not-a-real-article/",
  "/en/articles/not-a-real-article/",
])
  registry.push({
    language: url.startsWith("/en/") ? "en" : "uk",
    articleId: null,
    currentUrl: url,
    canonicalUrl: null,
    includeInSitemap: false,
    initialRobots: url.includes(".html")
      ? "default; JS error state sets noindex"
      : "HTTP 404",
    kind: "error-control",
  });
registry.push(...(await json("tools/seo/additional-routes.json")));
for (const r of registry) {
  r.indexingIntent = r.includeInSitemap
    ? "canonical"
    : ["legacy-query", "html-alias", "legacy-project-alias"].includes(r.kind)
      ? "compatibility"
      : r.kind === "restricted-page"
        ? "excluded"
        : "error";
  r.robots = {
    initialNoindex: r.kind === "restricted-page",
    disallowCrawl: false,
    runtimeNoindexOnError:
      r.kind === "legacy-query" ||
      (r.kind === "error-control" && r.currentUrl.includes(".html")),
  };
  r.expectedHttpStatus =
    r.kind === "error-control" && !r.currentUrl.includes(".html") ? 404 : 200;
}
outputs.set(
  "tools/seo/url-registry.json",
  JSON.stringify(
    {
      baseCommit: "02cc821745cfaf0b1cfdd1a5dca0fa68a108bf58",
      origin,
      semantics: {
        includeInSitemap:
          "Sitemap eligibility only, not robots or proof of Google indexing",
        initialRobots:
          "Response HTML directives; legacy routes have no initial noindex",
        indexing: "Actual Google indexing is unknown without Search Console",
      },
      routes: registry,
    },
    null,
    2,
  ) + "\n",
);
outputs.set(
  "tools/seo/image-manifest.json",
  JSON.stringify(Object.fromEntries(images), null, 2) + "\n",
);
const urls = [
  ...new Set(
    registry.filter((r) => r.includeInSitemap).map((r) => r.canonicalUrl),
  ),
].sort();
outputs.set(
  "sitemap.xml",
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((p) => `  <url><loc>${origin + p}</loc></url>`).join("\n") +
    "\n</urlset>\n",
);
outputs.set(
  "robots.txt",
  "User-agent: *\nAllow: /\n\nSitemap: " + origin + "/sitemap.xml\n",
);
let stale = [];
for (const [p, v] of outputs) {
  const buf = Buffer.isBuffer(v) ? v : Buffer.from(v.replace(/[ \t]+$/gm, ""));
  if (check) {
    try {
      if (!(await fs.readFile(path.join(ROOT, p))).equals(buf)) stale.push(p);
    } catch {
      stale.push(p);
    }
  } else {
    await fs.mkdir(path.dirname(path.join(ROOT, p)), { recursive: true });
    await fs.writeFile(path.join(ROOT, p), buf);
  }
}
if (stale.length)
  throw Error("Generated files are stale:\n" + stale.join("\n"));
console.log(
  `${check ? "Checked" : "Generated"} ${outputs.size} outputs; ${data.uk.length + data.en.length} article pages.`,
);
