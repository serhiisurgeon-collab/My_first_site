# NPA integration review — 6 October 2026

Branch: review/npa-effectiveness. Review only until the new Firestore registry entry is approved and created. No cloud Rules, indexes, settings, comments or Auth accounts changed.

## Content

Shared slug: npa-effectiveness. Shared discussion ID: a-0005.
UA: /article.html?article=npa-effectiveness
EN: /en/article-en.html?article=npa-effectiveness
Category: tactical-medicine (existing Ukrainian/English labels).
Author: Сергій Пелішенко / Serhii Pelishenko.
Date: 2026-10-06 approved for publication today; if release occurs later, use the actual release date in both catalogs and homepage cards.
Read time: 7 minutes UA, 8 minutes EN, existing 200-words/minute calculation.

The two author Markdown texts are identical to the provided versions after substituting only the two illustration markers with figures. Captions and alt texts come from the editorial notes. Four original 1536×1024 PNG files are byte-identical, with distinct filenames that do not overwrite existing images. Each figure opens its original image in a new tab for smaller anatomical labels. The first illustration supplies the Open Graph image; catalogs use the existing text-card layout, not a new cover layout. Editorial notes are not copied to the public site.

Both catalogs feed the existing category filters and search. The existing two-card homepage block now contains NPA first and the offline-app article second; all earlier materials remain in the catalogs. Existing language-switching and article pagination are reused. No sitemap exists in this repository.

The shared template sets canonical/hreflang, Open Graph and Article JSON-LD from each article's catalog metadata. The large heading supports discretionary hyphenation for Ukrainian medical compounds, without reducing the font.

## Exact cloud change requiring approval

In the EXISTING serhii-comments-test project, Firestore (default), create only:

Document: articles/a-0005

```json
{
  "slug": "npa-effectiveness",
  "aliases": []
}
```

slug: string. aliases: empty array, no empty-string element. Do not add schemaVersion, language or UID fields. This matches the current registry schema and firebase/article-map.json. The shared slug is used by both UA and EN; separate registry documents are not needed.

First verify that a-0005 is absent. If it already exists with different values, stop rather than overwrite it. Use the Firebase Console: existing Web SDK Rules intentionally deny writes to articles. No Rules, indexes, settings, admins, billing or Auth changes are required. Creating this record allows existing comment requests for a-0005 according to the unchanged settings and Rules; it does not create or publish any comment.

After owner confirmation that this one record exists, publish the code, then check the live UA/EN routes, localized images and shared discussion ID. No cloud change has been performed by this integration.

## Validation and limits

PASS: 8 previous article/language combinations at 360 px (content, layout, canonical/schema and original discussion IDs).

PASS: exact author-text comparison after figure-marker substitution; SHA-256 equality for all four PNGs; JavaScript syntax and git diff whitespace checks; 13 existing backup/restore/privacy-tool tests.
PASS: 129 browser assertions for the new article, UA/EN 1280/390/360 px, no runtime errors or local 404 responses. Official font/icon assets were fetched by curl with normal TLS verification and served to Chromium, whose default trust store lacks the proxy certificate. The actual article renderer, navigation, catalogs, filters and search are tested. Discussion binding is exercised with a clearly synthetic read-only API response; no cloud data is read or written. Live Firebase registry/login/posting for this new ID is NOT RUN pending the single registry record.

Source HTTP checks: PMC and PubMed return 200. NAEMT, JSOM, AHA and Resuscitation Council UK are blocked by this environment's network proxy with tunnel 403, including the escalated retry. Their supplied source URLs are retained unchanged; these failures do not establish a source-site 404. Determining whether a later TCCC edition supersedes the cited 1 May 2026 document is NOT RUN. The approved text specifically identifies the cited edition rather than asserting it is the latest.

Screenshots are outside the repository in /workspace/artifacts/npa-review, at 100% scale, UA/EN 1280/390/360 px. No screenshots, backup files, private data or local configuration are included in the public site.
