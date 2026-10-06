import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const root = process.argv[2];
if (!root) throw Error("Provide the actual Jekyll output directory");
const forbidden =
  /(?:^|\/)(?:tools|tests|docs|node_modules|backups|\.private|artifacts|attachments|review|scratch)(?:\/|$)|(?:^|\/)(?:Gemfile(?:\.lock)?|package(?:-lock)?\.json|firebase\.json|README\.md|comments-backup-[^/]+|deletion-register[^/]+|[^/]*service-account[^/]*|firebase-web-config\.json)$|^firebase\/firestore\.(?:rules|indexes\.json)$/;
let files = 0;
async function walk(dir) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name),
      rel = path.relative(root, full);
    assert.ok(
      !forbidden.test(rel),
      "Private/tooling file in public build: " + rel,
    );
    if (e.isDirectory()) await walk(full);
    else {
      files++;
      if (/\.(?:json|html|js|txt|md)$/.test(rel)) {
        const s = await fs.readFile(full, "utf8");
        assert.doesNotMatch(
          s,
          /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|"private_key"\s*:|"type"\s*:\s*"service_account"/,
          "Secret material: " + rel,
        );
      }
    }
  }
}
await walk(root);
for (const slug of [
  "how-kaolin-works",
  "group-medical-bag",
  "hospital-capabilities",
  "medical-app-without-internet",
  "npa-effectiveness",
])
  for (const prefix of ["", "en/"])
    await fs.access(
      path.join(root, prefix + "articles/" + slug + "/index.html"),
    );
console.log(
  "PASS public Jekyll output: " +
    files +
    " files; ten article index.html files; no forbidden files or key material",
);
