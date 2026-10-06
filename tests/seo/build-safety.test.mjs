import test from "node:test";
import assert from "node:assert/strict";
import { safeMarkdown, validate } from "../../tools/seo/lib.mjs";
const map = [{ id: "a-0001", slug: "one", aliases: ["one-en"] }];
const a = {
  slug: "one",
  content: "one.md",
  title: "Title",
  description: "Description",
  author: "Author",
  date: "2026-10-06",
  readTime: 1,
  category: "medicine",
};
const data = { uk: [a], en: [{ ...a, slug: "one-en" }] };
test("build rejects duplicate ids/slugs, absent and conflicting language pairs", () => {
  validate(map, data);
  assert.throws(() => validate([...map, map[0]], data), /articleId/);
  assert.throws(
    () => validate([...map, { id: "a-0002", slug: "one", aliases: [] }], data),
    /slug/,
  );
  assert.throws(() => validate(map, { uk: [a], en: [] }), /language pair/);
  assert.throws(
    () => validate(map, { uk: [a], en: [{ ...a, content: "wrong.md" }] }),
    /language pair/,
  );
  assert.throws(() => validate(map, { uk: [a, a], en: [a] }), /slug/);
  assert.throws(
    () => validate([{ id: "a-0001", slug: "../escape", aliases: [] }], data),
    /slug/,
  );
});
test("Markdown strips scripts, event handlers and executable URL protocols while retaining figures and source anchors", () => {
  const html = safeMarkdown(
    '<script>alert(1)</script><img src="/safe.png" onerror="alert(1)"><a href="javascript:alert(1)">unsafe</a><figure><figcaption>Caption</figcaption></figure><span id="source-1"></span>',
  );
  assert.doesNotMatch(html, /<script|onerror|javascript:/);
  assert.match(html, /<figure>/);
  assert.match(html, /id="source-1"/);
});

test("actual generator fails on a missing mandatory Markdown file before writing output", async () => {
  const fs = await import("node:fs/promises"),
    os = await import("node:os"),
    path = await import("node:path");
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const run = promisify(execFile);
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "seo-missing-"));
  try {
    for (const p of [
      "data",
      "js",
      "css",
      "firebase/article-map.json",
      "tools/seo/templates",
    ])
      await fs.cp(p, path.join(dir, p), { recursive: true });
    await assert.rejects(
      run(process.execPath, ["tools/seo/build.mjs"], {
        env: { ...process.env, SEO_SOURCE_ROOT: dir },
      }),
      (e) =>
        e.stderr.includes("ENOENT") &&
        e.stderr.includes("npa-effectiveness.md"),
    );
    await assert.rejects(fs.access(path.join(dir, "articles")));
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
