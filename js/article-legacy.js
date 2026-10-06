// GitHub Pages query compatibility: client-side redirect, not an HTTP 301.
const en = document.documentElement.lang === "en";
const slug = new URL(location.href).searchParams.get("article");
try {
  const response = await fetch("/data/article-routes.json");
  if (!response.ok) throw Error("route-map unavailable");
  const routes = await response.json();
  const route = Object.hasOwn(routes, slug) ? routes[slug] : null;
  if (!route) {
    document.querySelector(".article-header__title").textContent = en
      ? "Article not found"
      : "Статтю не знайдено";
    document.title =
      (en ? "Article not found" : "Статтю не знайдено") +
      " — Serhii Pelishenko";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex";
    document.head.append(meta);
  } else {
    const target = route[en ? "en" : "uk"];
    if (!/^\/(?:en\/)?articles\/[a-z0-9-]+\/$/.test(target))
      throw Error("invalid internal route");
    const url = new URL(target, location.origin);
    if (new URL(location.href).searchParams.get("commentsAdmin") === "1")
      url.searchParams.set("commentsAdmin", "1");
    url.hash = location.hash;
    location.replace(url.href);
  }
} catch {
  // Keep the static article links usable when the route map cannot be fetched.
}
