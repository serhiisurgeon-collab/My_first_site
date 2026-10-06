// Enhance the existing static document; never re-render content or metadata.
const links = [...document.querySelectorAll(".article-toc__link")];
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      const active = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (active)
        links.forEach((a) =>
          a.classList.toggle("is-active", a.getAttribute("href") === "#" + active.target.id),
        );
    },
    { rootMargin: "-20% 0px -65% 0px" },
  );
  document
    .querySelectorAll("#articleContent .article-section-heading")
    .forEach((h) => observer.observe(h));
}
// Preserve moderation access and fragment when switching the static language pair.
document.querySelectorAll(".site-nav__language-option").forEach((a) => {
  const url = new URL(a.href);
  url.hash = location.hash;
  if (new URL(location.href).searchParams.get("commentsAdmin") === "1")
    url.searchParams.set("commentsAdmin", "1");
  a.href = url.href;
});
