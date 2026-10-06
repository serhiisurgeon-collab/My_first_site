// Preserve TLS verification: curl uses the host's trusted CA store.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const run = promisify(execFile),
  cache = new Map();
export async function externalAssets(route) {
  const request = route.request(),
    url = request.url();
  if (
    !/^(?:fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net)$/.test(
      new URL(url).hostname,
    )
  ) {
    await route.abort();
    return;
  }
  try {
    if (!cache.has(url))
      cache.set(
        url,
        run("curl", ["-fLs", "--max-time", "25", url], {
          encoding: "buffer",
          maxBuffer: 24000000,
        }).then((r) => r.stdout),
      );
    const body = await cache.get(url);
    const type = request.resourceType();
    await route.fulfill({
      body,
      contentType:
        type === "stylesheet"
          ? "text/css"
          : type === "script"
            ? "application/javascript"
            : "font/woff2",
      headers: { "access-control-allow-origin": "*" },
    });
  } catch {
    await route.abort();
  }
}
