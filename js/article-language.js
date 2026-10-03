(() => {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("article");

  if (!slug) return;

  // Keep older English kaolin URLs working with the shared article ID.
  const articleId = slug === "how-kaolin-works-en"
    ? "how-kaolin-works"
    : slug;
  const isEnglish = document.documentElement.lang === "en";
  const pages = {
    uk: isEnglish ? "../article.html" : "./article.html",
    en: isEnglish ? "./article-en.html" : "./en/article-en.html"
  };

  document.querySelectorAll(".site-nav__language-option").forEach(link => {
    const path = pages[link.lang];
    if (!path) return;

    const url = new URL(path, window.location.href);
    url.search = window.location.search;
    url.searchParams.set("article", articleId);
    url.hash = window.location.hash;
    link.href = url.href;
  });
})();
