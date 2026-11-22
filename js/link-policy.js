// One policy for rendered Markdown, generated pages and browser-added links.
export function linkPolicy(href, base, hasDownload = false) {
  let url;
  try { url = new URL(href, base); } catch { return { external: false, download: hasDownload }; }
  const internal = url.origin === new URL(base).origin || ['serhiipelishenko.com', 'www.serhiipelishenko.com'].includes(url.hostname);
  const download = hasDownload || (internal && url.pathname.startsWith('/assets/downloads/'));
  return { external: !internal && !download && ['http:', 'https:'].includes(url.protocol), download };
}
