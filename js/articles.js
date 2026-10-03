document.addEventListener("DOMContentLoaded", async () => {

  const articlesList =
    document.getElementById("articlesList");

  const publicationsList =
    document.getElementById("publicationsList");

  const filterButtons =
    document.querySelectorAll(".articles-filter");


  if (!articlesList || !publicationsList) {
    return;
  }


  /* =====================================================
     LANGUAGE
  ====================================================== */

const language =
  document.documentElement.lang === "en"
    ? "en"
    : "uk";

const isEnglish = language === "en";

const config = {
  uk: {
    data: "./data/articles.json",
    articlePage: "./article.html",

    readTime: minutes =>
      `${minutes} хв читання`,

    categories: {
      "tactical-medicine": "Тактична медицина",
      "medicine": "Медицина",
      "technology": "Технології"
    },

    formats: {
      "article": "Публікація",
      "video": "Відео",
      "podcast": "Подкаст",
      "quote": "Згадка"
    }
  },

  en: {
    data: "../data/articles-en.json",
    articlePage: "./article-en.html",

    readTime: minutes =>
      `${minutes} min read`,

    categories: {
      "tactical-medicine": "Tactical Medicine",
      "medicine": "Medicine",
      "technology": "Technology"
    },

    formats: {
      "article": "Publication",
      "video": "Video",
      "podcast": "Podcast",
      "quote": "Mention"
    }
  }
};

const current = config[language];


  /* =====================================================
     LOAD DATA
  ====================================================== */

  try {

    const response =
      await fetch(current.data, { cache: "no-cache" });


    if (!response.ok) {

      throw new Error(
        `HTTP error: ${response.status}`
      );

    }


    const materials =
      await response.json();


    /* newest first */

    materials.sort(
      (a, b) =>
        new Date(b.date) -
        new Date(a.date)
    );


    renderMaterials(materials);

    setupFilters();

    setupArticleLinks();


  } catch (error) {

    console.error(
      "Articles loading error:",
      error
    );


    articlesList.innerHTML = `
      <p class="articles-error">
        ${
          isEnglish
            ? "Unable to load articles."
            : "Не вдалося завантажити статті."
        }
      </p>
    `;

  }



  /* =====================================================
     RENDER
  ====================================================== */

  function renderMaterials(materials) {

    const articles =
      materials.filter(
        item =>
          item.type === "article"
      );


    const publications =
      materials.filter(
        item =>
          item.type === "publication"
      );


    articlesList.innerHTML =
      articles
        .map(createArticleHTML)
        .join("");


    publicationsList.innerHTML =
      publications
        .map(createPublicationHTML)
        .join("");

  }



  /* =====================================================
     ARTICLE
  ====================================================== */

  function createArticleHTML(article) {

    return `
      <article
        class="article-row"
        data-type="${article.type}"
        data-category="${article.category}"
        data-href="${current.articlePage}?article=${article.slug}"
        tabindex="0"
        role="link"
      >

        <div class="article-row__meta">

          <span class="article-row__category">
            ${getCategoryName(article.category)}
          </span>

          <time
            class="article-row__date"
            datetime="${article.date}"
          >
            ${formatDate(article.date)}
          </time>

        </div>


        <div class="article-row__content">

          <h3 class="article-row__title">
            ${article.title}
          </h3>

          <p class="article-row__excerpt">
            ${article.description ?? ""}
          </p>

        </div>


      <div class="article-row__action">

        <span class="article-row__read-time">
          ${
            article.readTime
              ? current.readTime(article.readTime)
              : ""
          }
        </span>

        <span
          class="article-row__arrow"
          aria-hidden="true"
        >
          →
        </span>

      </div>

      </article>
    `;

  }

function calculateReadTime(markdown) {

  const cleanText = markdown
    // картинки
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")

    // посилання → залишаємо тільки текст посилання
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")

    // markdown-символи
    .replace(/[#>*_~`-]/g, " ")

    // HTML, якщо раптом є
    .replace(/<[^>]*>/g, " ")

    // зайві пробіли
    .replace(/\s+/g, " ")
    .trim();


  const wordCount =
    cleanText
      ? cleanText.split(" ").length
      : 0;


  const wordsPerMinute = 200;


  return Math.max(
    1,
    Math.ceil(wordCount / wordsPerMinute)
  );
}

  /* =====================================================
     PUBLICATION
  ====================================================== */

  function createPublicationHTML(publication) {

    return `
      <a
        class="publication-card"
        href="${publication.url}"
        target="_blank"
        rel="noopener noreferrer"

        data-type="${publication.type}"
        data-category="${publication.category}"
      >

        <div class="publication-card__top">

          <span class="publication-card__type">
            ${
              publication.role ??
              getFormatName(publication.format)
            }
          </span>

          <span
            class="publication-card__external"
            aria-hidden="true"
          >
            ↗
          </span>

        </div>


        <h3 class="publication-card__title">
          ${publication.title}
        </h3>


        <div class="publication-card__footer">

          <span class="publication-card__source">
            ${publication.source ?? ""}
          </span>

          <time datetime="${publication.date}">
            ${formatMonthYear(publication.date)}
          </time>

        </div>

      </a>
    `;

  }



  /* =====================================================
     ARTICLE ROW LINKS
  ====================================================== */

  function setupArticleLinks() {

    const rows =
      document.querySelectorAll(
        ".article-row[data-href]"
      );


    rows.forEach(row => {

      row.addEventListener(
        "click",
        () => {

          window.location.href =
            row.dataset.href;

        }
      );


      row.addEventListener(
        "keydown",
        event => {

          if (
            event.key === "Enter" ||
            event.key === " "
          ) {

            event.preventDefault();

            window.location.href =
              row.dataset.href;

          }

        }
      );

    });

  }



  /* =====================================================
     FILTERS
  ====================================================== */

  function setupFilters() {

    filterButtons.forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const filter =
            button.dataset.filter;


          filterButtons.forEach(btn => {
            btn.classList.remove(
              "is-active"
            );
          });


          button.classList.add(
            "is-active"
          );


          applyFilter(filter);

        }
      );

    });

  }



  function applyFilter(filter) {

    const items =
      document.querySelectorAll(
        ".article-row, .publication-card"
      );


    items.forEach(item => {

      const type =
        item.dataset.type;

      const category =
        item.dataset.category;


      const shouldShow =
        filter === "all" ||
        filter === type ||
        filter === category;


      item.hidden =
        !shouldShow;

    });


    updateSectionVisibility();

  }



  /* =====================================================
     SECTION VISIBILITY
  ====================================================== */

  function updateSectionVisibility() {

    const articleSection =
      articlesList.closest(
        ".writing-section"
      );


    const publicationSection =
      publicationsList.closest(
        ".publications-section"
      );


    const visibleArticles =
      articlesList.querySelectorAll(
        ".article-row:not([hidden])"
      ).length;


    const visiblePublications =
      publicationsList.querySelectorAll(
        ".publication-card:not([hidden])"
      ).length;


    if (articleSection) {

      articleSection.hidden =
        visibleArticles === 0;

    }


    if (publicationSection) {

      publicationSection.hidden =
        visiblePublications === 0;

    }

  }



  /* =====================================================
     HELPERS
  ====================================================== */

  function getCategoryName(category) {

    return (
      current.categories[category] ??
      category
    );

  }


  function getFormatName(format) {

    return (
      current.formats[format] ??
      (
        isEnglish
          ? "Publication"
          : "Публікація"
      )
    );

  }



  function formatDate(dateString) {

    return new Intl.DateTimeFormat(
      isEnglish
        ? "en-GB"
        : "uk-UA",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC"
      }
    ).format(
      new Date(dateString)
    );

  }



  function formatMonthYear(dateString) {

    return new Intl.DateTimeFormat(
      isEnglish
        ? "en-GB"
        : "uk-UA",
      {
        month: "long",
        year: "numeric",
        timeZone: "UTC"
      }
    ).format(
      new Date(dateString)
    );

  }

});
