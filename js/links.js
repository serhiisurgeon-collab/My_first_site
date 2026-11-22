import { linkPolicy } from './link-policy.js';

function prepareLink(link) {
  const href = link.getAttribute("href");
  if (!href) return;

  const policy = linkPolicy(href, document.baseURI, link.hasAttribute('download'));
  if (policy.download && !link.hasAttribute('download')) link.setAttribute('download', '');
  if (!policy.external) {
    link.removeAttribute("target");
    link.relList.remove('noopener', 'noreferrer');
    if (!link.relList.length) link.removeAttribute('rel');
    return;
  }

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
