import { marked } from "marked";
import sanitize from "sanitize-html";
export function safeMarkdown(text) {
  return sanitize(marked.parse(text), {
    allowedTags: [
      ...sanitize.defaults.allowedTags,
      "img",
      "figure",
      "figcaption",
      "span",
    ],
    allowedAttributes: {
      ...sanitize.defaults.allowedAttributes,
      "*": ["id", "class"],
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height", "loading", "decoding"],
    },
    allowedSchemes: ["https", "http", "mailto"],
    allowProtocolRelative: false,
  });
}
export function validate(map, data) {
  const ids = new Set(),
    slugs = new Set();
  for (const a of map) {
    if (!/^a-\d+$/.test(a.id) || ids.has(a.id))
      throw Error("Duplicate/invalid articleId");
    ids.add(a.id);
    for (const s of [a.slug, ...a.aliases]) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) || slugs.has(s))
        throw Error("Duplicate/invalid slug");
      slugs.add(s);
    }
  }
  for (const l of ["uk", "en"]) {
    const local = new Set();
    const paired = new Set();
    for (const a of data[l]) {
      if (local.has(a.slug)) throw Error("Duplicate language slug");
      local.add(a.slug);
      const m = map.find((m) => [m.slug, ...m.aliases].includes(a.slug));
      if (!m || paired.has(m.id) || a.content !== m.slug + ".md")
        throw Error("Conflicting language pair");
      paired.add(m.id);
      for (const k of [
        "title",
        "description",
        "author",
        "date",
        "readTime",
        "category",
      ])
        if (!a[k]) throw Error("Missing " + k);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(a.date) ||
        Number.isNaN(Date.parse(a.date))
      )
        throw Error("Invalid date");
    }
    if (paired.size !== map.length) throw Error("Missing language pair");
  }
}
