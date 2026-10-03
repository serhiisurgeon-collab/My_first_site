function prepareLink(link) {
  const href = link.getAttribute("href");
  if (!href || href.startsWith("#")) return;

  const url = new URL(href, document.baseURI);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  if (link.closest("nav, .mobile-nav") ||
      (url.origin === location.origin &&
       /\/(?:article|articles)(?:-en)?\.html$/.test(url.pathname))) {
    link.removeAttribute("target");
    return;
  }
  if (url.hash && url.origin === location.origin &&
      url.pathname === location.pathname && url.search === location.search) return;

  link.target = "_blank";
  link.relList.add("noopener", "noreferrer");
}

function prepareLinks(root) {
  if (root.matches?.("a[href]")) prepareLink(root);
  root.querySelectorAll?.("a[href]").forEach(prepareLink);
}

prepareLinks(document);

// Article Markdown and search results add links after the initial page load.
new MutationObserver(records => {
  for (const record of records) {
    if (record.type === "attributes") prepareLink(record.target);
    else record.addedNodes.forEach(prepareLinks);
  }
}).observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["href"]
});
