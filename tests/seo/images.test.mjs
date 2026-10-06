import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import sharp from "sharp";
test("lossless variants preserve every decoded RGBA pixel and dimensions", async () => {
  const manifest = JSON.parse(
    await fs.readFile("tools/seo/image-manifest.json", "utf8"),
  );
  let count = 0;
  for (const [original, info] of Object.entries(manifest)) {
    if (info.src === "/" + original) continue;
    const a = await sharp(original)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true }),
      b = await sharp(info.src.slice(1))
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
    assert.deepEqual(a.info, b.info, original);
    assert.ok(a.data.equals(b.data), "Pixel mismatch: " + original);
    count++;
  }
  assert.equal(
    count,
    Object.values(manifest).filter((x) => x.src.includes("/optimized/")).length,
  );
  assert.ok(count > 0);
});
