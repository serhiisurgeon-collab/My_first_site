document.addEventListener("DOMContentLoaded", () => {
  const trigger = document.querySelector(".site-search-trigger");

  if (!trigger) return;

  const lang = document.documentElement.lang || "uk";

  const text = {
    uk: {
      placeholder: "Пошук по сайту...",
      label: "Пошук",
      hint: "Почніть вводити назву статті, проєкту або тему",
      close: "Закрити пошук"
    },

    en: {
      placeholder: "Search the site...",
      label: "Search",
      hint: "Start typing an article, project or topic",
      close: "Close search"
    }
  };

  const t = text[lang] || text.uk;

  const overlay = document.createElement("div");

  overlay.className = "site-search";
  overlay.setAttribute("aria-hidden", "true");

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

        <div class="site-search__results"></div>

      </div>

      <div class="site-search__footer">
        <span>
          <kbd>↑</kbd>
          <kbd>↓</kbd>
          navigation
        </span>

        <span>
          <kbd>ESC</kbd>
          close
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

  function openSearch() {
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");

    document.body.classList.add("search-open");

    setTimeout(() => {
      input.focus();
    }, 100);
  }

  async function loadSearchIndex() {
  try {
    const [uaResponse, enResponse] = await Promise.all([
      fetch("../data/articles.json"),
      fetch("../data/articles-en.json")
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
        category: article.category || "Article",
        lang,
        type: "article",
        slug: article.slug || "",

        url:
          lang === "en"
            ? `/en/article-en.html?article=${article.slug}`
            : `/article.html?article=${article.slug}`
      }));
    };

    searchIndex = [
      ...normalizeArticles(uaArticles, "uk"),
      ...normalizeArticles(enArticles, "en")
    ];

    console.log("Search index loaded:", searchIndex);

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

  if (!query.trim()) {
    emptyState.style.display = "flex";
    return;
  }

  emptyState.style.display = "none";

  if (results.length === 0) {
    resultsContainer.innerHTML = `
      <div class="site-search__no-results">
        <i class="fa-regular fa-face-meh"></i>
        <p>Нічого не знайдено</p>
      </div>
    `;

    return;
  }

  results.forEach(item => {
    const result = document.createElement("a");

    result.className = "site-search__result";
    result.href = item.url;

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
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");

    document.body.classList.remove("search-open");

    input.value = "";
  }

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
      closeSearch();
    }
  });
});