document.addEventListener("DOMContentLoaded", () => {
  const trigger = document.querySelector(".site-search-trigger");

  if (!trigger) return;

  const lang = document.documentElement.lang || "uk";
  const siteRoot = new URL("../", import.meta.url);

  const text = {
    uk: {
      placeholder: "Пошук по сайту...",
      label: "Пошук",
      hint: "Почніть вводити назву статті, проєкту або тему",
      close: "Закрити пошук",
      navigation: "навігація",
      dismiss: "закрити",
      noResults: "Нічого не знайдено",
      resultCount: count => `Знайдено результатів: ${count}`
    },

    en: {
      placeholder: "Search the site...",
      label: "Search",
      hint: "Start typing an article, project or topic",
      close: "Close search",
      navigation: "navigation",
      dismiss: "close",
      noResults: "No results found",
      resultCount: count => `Results found: ${count}`
    }
  };

  const t = text[lang] || text.uk;

  const overlay = document.createElement("div");

  overlay.className = "site-search";
  overlay.setAttribute("aria-hidden", "true");
  overlay.inert = true;

  overlay.innerHTML = `
    <div class="site-search__backdrop"></div>

    <div
      class="site-search__dialog"
      role="dialog"
      aria-modal="true"
      aria-label="${t.label}"
    >
      <div class="site-search__header">

        <div class="site-search__input-wrap">
          <i class="fa-solid fa-magnifying-glass"></i>

          <input
            class="site-search__input"
            type="search"
            placeholder="${t.placeholder}"
            aria-label="${t.label}"
            aria-controls="site-search-results"
            autocomplete="off"
            spellcheck="false"
          >
        </div>

        <button
          class="site-search__close"
          type="button"
          aria-label="${t.close}"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>

      </div>

      <div class="site-search__body">

        <div class="site-search__empty">
          <i class="fa-solid fa-magnifying-glass"></i>
          <p>${t.hint}</p>
        </div>

        <p class="site-search__status" role="status" aria-live="polite" aria-atomic="true"></p>
        <div class="site-search__results" id="site-search-results"></div>

      </div>

      <div class="site-search__footer">
        <span>
          <kbd>↑</kbd>
          <kbd>↓</kbd>
          ${t.navigation}
        </span>

        <span>
          <kbd>ESC</kbd>
          ${t.dismiss}
        </span>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const input = overlay.querySelector(".site-search__input");
  const closeButton = overlay.querySelector(".site-search__close");
  const backdrop = overlay.querySelector(".site-search__backdrop");
    const resultsContainer = overlay.querySelector(".site-search__results");
    const emptyState = overlay.querySelector(".site-search__empty");

    let searchIndex = [];
  let previousFocus = null;
  let background = [];
  const status = overlay.querySelector('.site-search__status');

  function openSearch() {
    if (overlay.classList.contains('is-open')) return;
    previousFocus = document.activeElement;
    background = [...document.body.children].filter(el => el !== overlay)
      .map(el => ({el, inert: el.inert}));
    background.forEach(({el}) => { el.inert = true; });
    overlay.inert = false;
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('search-open');
    renderResults(searchSite(input.value), input.value);
    input.focus();
  }

  async function loadSearchIndex() {
  try {
    const [uaResponse, enResponse] = await Promise.all([
      fetch(new URL("data/articles.json", siteRoot), { cache: "no-cache" }),
      fetch(new URL("data/articles-en.json", siteRoot), { cache: "no-cache" })
    ]);

    if (!uaResponse.ok || !enResponse.ok) {
      throw new Error("Не вдалося завантажити індекс пошуку");
    }

    const uaArticles = await uaResponse.json();
    const enArticles = await enResponse.json();

    const normalizeArticles = (articles, lang) => {
      return articles.map(article => ({
        title: article.title || "",
        description:
          article.description ||
          article.excerpt ||
          article.subtitle ||
          "",
        category: article.category === "understanding-medicine"
          ? (lang === "en" ? "Understanding Medicine" : "Зрозуміло про медицину")
          : article.category || "Article",
        lang,
        type: article.type || "article",
        slug: article.slug || "",

        url:
          article.type === "publication"
            ? article.url
            : new URL(
                `${lang === "en" ? "en/" : ""}articles/${encodeURIComponent(article.content.replace(/\.md$/, ""))}/`,
                siteRoot
              ).href
      }));
    };

    searchIndex = [
      ...normalizeArticles(uaArticles, "uk"),
      ...normalizeArticles(enArticles, "en"),
      {title:"Spanish by Serhii",description:"Чотири мови в Telegram: українська, англійська, іспанська, німецька; 12 напрямків, /myweek і Premium-квізи",category:"Освіта",lang:"uk",type:"project",url:new URL("spanish-bot.html",siteRoot).href},
      {title:"Spanish by Serhii",description:"Four languages on Telegram: Ukrainian, English, Spanish and German; 12 learning directions, /myweek and Premium quizzes",category:"Education",lang:"en",type:"project",url:new URL("en/spanish-bot-en.html",siteRoot).href}
    ];

    if (overlay.classList.contains("is-open")) renderResults(searchSite(input.value), input.value);

  } catch (error) {
    console.error("Search error:", error);
  }
}

loadSearchIndex();

function normalizeText(text) {
  return String(text)
    .toLowerCase()
    .trim();
}

function searchSite(query) {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return [];
  }

  const currentLang = document.documentElement.lang || "uk";

  return searchIndex
    .filter(item => {
      return item.lang === currentLang;
    })
    .map(item => {
      const title = normalizeText(item.title);
      const description = normalizeText(item.description);
      const category = normalizeText(item.category);

      let score = 0;

      if (title === normalizedQuery) {
        score += 100;
      }

      if (title.startsWith(normalizedQuery)) {
        score += 50;
      }

      if (title.includes(normalizedQuery)) {
        score += 30;
      }

      if (description.includes(normalizedQuery)) {
        score += 10;
      }

      if (category.includes(normalizedQuery)) {
        score += 5;
      }

      return {
        ...item,
        score
      };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

function renderResults(results, query) {
  resultsContainer.innerHTML = "";
  status.textContent = query.trim() ? t.resultCount(results.length) : "";

  if (!query.trim()) {
    emptyState.style.display = "flex";
    return;
  }

  emptyState.style.display = "none";

  if (results.length === 0) {
    resultsContainer.innerHTML = `
      <div class="site-search__no-results">
        <i class="fa-regular fa-face-meh"></i>
        <p>${t.noResults}</p>
      </div>
    `;

    return;
  }

  results.forEach(item => {
    const result = document.createElement("a");

    result.className = "site-search__result";
    result.href = item.url;
    if (item.type === "publication") {
      result.target = "_blank";
      result.rel = "noopener noreferrer";
    }

    result.innerHTML = `
      <div class="site-search__result-icon">
        <i class="fa-regular fa-file-lines"></i>
      </div>

      <div class="site-search__result-content">
        <span class="site-search__result-type">
          ${item.category}
        </span>

        <strong class="site-search__result-title">
          ${item.title}
        </strong>

        ${
          item.description
            ? `
              <p class="site-search__result-description">
                ${item.description}
              </p>
            `
            : ""
        }
      </div>

      <div class="site-search__result-arrow">
        <i class="fa-solid fa-arrow-right"></i>
      </div>
    `;

    resultsContainer.appendChild(result);
  });
}

input.addEventListener("input", () => {
  const query = input.value;

  const results = searchSite(query);

  renderResults(results, query);
});


  function closeSearch() {
    if (!overlay.classList.contains('is-open')) return;
    background.forEach(({el, inert}) => { el.inert = inert; });
    background = [];
    // Move focus before hiding the dialog from assistive technologies.
    const restore = previousFocus?.isConnected && !previousFocus.closest('[inert]')
      ? previousFocus : trigger;
    restore.focus();
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.inert = true;
    document.body.classList.remove('search-open');
    input.value = '';
    renderResults([], '');
  }

  overlay.addEventListener('keydown', event => {
    const results = [...resultsContainer.querySelectorAll('a')];
    const current = document.activeElement;
    if (event.key === 'Tab') {
      const focusable = [input, closeButton, ...results];
      const index = focusable.indexOf(current);
      if (event.shiftKey && index <= 0) {
        event.preventDefault();
        focusable.at(-1).focus();
      } else if (!event.shiftKey && (index === focusable.length - 1 || index < 0)) {
        event.preventDefault();
        input.focus();
      }
    } else if (results.length && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      const index = results.indexOf(current);
      const next = index < 0 ? (event.key === 'ArrowDown' ? 0 : results.length - 1)
        : (index + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
      results[next].focus();
    } else if (event.key === 'Enter' && current === input && results.length && !event.isComposing) {
      event.preventDefault();
      results[0].click();
    }
  });

  trigger.addEventListener("click", openSearch);

  closeButton.addEventListener("click", closeSearch);

  backdrop.addEventListener("click", closeSearch);

  document.addEventListener("keydown", event => {

    // Ctrl + K / Cmd + K
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();

      if (overlay.classList.contains("is-open")) {
        closeSearch();
      } else {
        openSearch();
      }
    }

    // Escape
    if (
      event.key === "Escape" &&
      overlay.classList.contains("is-open")
    ) {
      event.preventDefault();
      closeSearch();
    }
  });
});
