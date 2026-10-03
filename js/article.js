document.addEventListener("DOMContentLoaded", async () => {

  const articleContent = document.getElementById("articleContent");

  if (!articleContent) {
    console.error("Не знайдено #articleContent");
    return;
  }

  /* =====================================================
     LANGUAGE CONFIG
  ====================================================== */

  const language =
    document.documentElement.lang === "en"
      ? "en"
      : "uk";


  const isEnglish =
    language === "en";


  const root =
    isEnglish
      ? ".."
      : ".";


  const config = {

    uk: {

      data:
        `${root}/data/articles.json`,

      content:
        `${root}/content/articles/uk/`,

      articlesPage:
        "./articles.html",

      articlePage:
      "./article.html",

      tocTitle:
        "У цій статті",

      readTime:
        minutes =>
          `${minutes} хв читання`,

      errorTitle:
        "Щось пішло не так",

      articleNotSpecified:
        "Статтю не вказано.",

      articleNotFound:
        "Статтю не знайдено.",

      loadError:
        "Не вдалося завантажити статтю.",

      back:
        "← Повернутися до статей",

      categories: {

        "tactical-medicine":
          "Тактична медицина",

        "medicine":
          "Медицина",

        "technology":
          "Технології"

      }

    },


    en: {

      data:
        `${root}/data/articles-en.json`,

      content:
        `${root}/content/articles/en/`,

      articlesPage:
        "./articles-en.html",

      articlePage:
      "./article-en.html",

      tocTitle:
        "In this article",

      readTime:
        minutes =>
          `${minutes} min read`,

      errorTitle:
        "Something went wrong",

      articleNotSpecified:
        "No article was specified.",

      articleNotFound:
        "Article not found.",

      loadError:
        "Unable to load the article.",

      back:
        "← Back to articles",

      categories: {

        "tactical-medicine":
          "Tactical Medicine",

        "medicine":
          "Medicine",

        "technology":
          "Technology"

      }

    }

  };


  const current =
    config[language];

  /* =====================================================
     GET ARTICLE SLUG FROM URL
  ====================================================== */

  const params = new URLSearchParams(window.location.search);

  const slug = params.get("article");


  if (!slug) {
    showError(
  current.articleNotSpecified
);
    return;
  }


  try {

    /* =====================================================
       LOAD ARTICLES DATABASE
    ====================================================== */

    const articlesResponse =
    await fetch(current.data);

    if (!articlesResponse.ok) {
      throw new Error(
        `Не вдалося завантажити articles.json: ${articlesResponse.status}`
      );
    }


    const materials = await articlesResponse.json();


    /* =====================================================
       FIND ARTICLE
    ====================================================== */

    const article = materials.find(
      item =>
        item.type === "article" &&
        (item.slug === slug || item.content === `${slug}.md` ||
          (slug === "how-kaolin-works-en" &&
            item.content === "how-kaolin-works.md"))
    );


    if (!article) {
      showError(
        current.articleNotFound
      );
      return;
    }


    /* =====================================================
       UPDATE ARTICLE META
    ====================================================== */

    updateArticleHeader(article);

    setupArticlePagination(materials, article);


    /* =====================================================
       LOAD MARKDOWN
    ====================================================== */

    const markdownPath =
      `${current.content}${article.content}`;


    const markdownResponse = await fetch(markdownPath);


    if (!markdownResponse.ok) {
      throw new Error(
        `Не вдалося завантажити Markdown: ${markdownResponse.status}`
      );
    }


    const markdown = await markdownResponse.text();


async function getArticleReadTime(article) {

  try {

    const response = await fetch(
      `ТУТ_ТВІЙ_ШЛЯХ/${article.slug}.md`
    );

    if (!response.ok) {
      throw new Error("Markdown not found");
    }

    const markdown =
      await response.text();

    return calculateReadTime(markdown);

  } catch (error) {

    console.error(
      "Не вдалося порахувати час читання:",
      article.slug,
      error
    );

    return null;
  }
}

    /* =====================================================
       MARKDOWN → HTML
    ====================================================== */

    articleContent.innerHTML = marked.parse(markdown);



    /* =====================================================
       PREPARE ARTICLE CONTENT
    ====================================================== */

    prepareArticleSections();

    buildTableOfContents();

    setupActiveSection();


  } catch (error) {

    console.error("Помилка завантаження статті:", error);

    showError(
      current.loadError
    );

  }

function setupArticlePagination(materials, currentArticle) {

  const articles = materials
    .filter(item => item.type === "article")
    .sort(
      (a, b) =>
        new Date(b.date) - new Date(a.date)
    );


  const currentIndex =
    articles.findIndex(
      item => item.slug === currentArticle.slug
    );


  if (currentIndex === -1) return;


  /*
    Список відсортований:
    newest → oldest

    Тому:
    index - 1 = новіша стаття
    index + 1 = старіша стаття
  */

  const newerArticle =
    articles[currentIndex - 1];

  const olderArticle =
    articles[currentIndex + 1];


  const previousLink =
    document.getElementById("previousArticle");

  const previousTitle =
    document.getElementById("previousArticleTitle");

  const nextLink =
    document.getElementById("nextArticle");

  const nextTitle =
    document.getElementById("nextArticleTitle");


  /* PREVIOUS = older */

  if (olderArticle && previousLink) {

    previousLink.href =
      `${current.articlePage}?article=${olderArticle.slug}`;

    if (previousTitle) {
      previousTitle.textContent =
        olderArticle.title;
    }

  } else if (previousLink) {

    previousLink.hidden = true;

  }


  /* NEXT = newer */

  if (newerArticle && nextLink) {

    nextLink.href =
      `${current.articlePage}?article=${newerArticle.slug}`;

    if (nextTitle) {
      nextTitle.textContent =
        newerArticle.title;
    }

  } else if (nextLink) {

    nextLink.hidden = true;

  }

  

}



  /* =====================================================
     UPDATE HEADER
  ====================================================== */

  function updateArticleHeader(article) {

    const title =
      document.querySelector(".article-header__title");

    const lead =
      document.querySelector(".article-header__lead");

    const category =
      document.querySelector(".article-header__category");

    const author =
      document.querySelector(".article-header__author");

    const metaTime =
      document.querySelector(
        ".article-header__meta time"
      );

    const readTime =
      document.querySelector(
        ".article-header__meta span:last-child"
      );


    if (title) {
      title.textContent = article.title;
    }


    if (lead) {
      lead.textContent =
        article.description ?? "";
    }


    if (category) {
      category.textContent =
        getCategoryName(article.category);
    }


    if (author) {
      author.textContent =
        article.author ?? "";
    }


    if (metaTime) {

      metaTime.dateTime =
        article.date;

      metaTime.textContent =
        formatDate(article.date);

    }


    if (readTime) {

      readTime.textContent =
        article.readTime
          ? current.readTime(article.readTime)
          : "";

    }


    /* PAGE TITLE */

    document.title =
      `${article.title} — Serhii Pelishenko`;

  }



  /* =====================================================
     PREPARE SECTIONS
  ====================================================== */

  function prepareArticleSections() {

    const headings =
      articleContent.querySelectorAll("h2, h4");


    headings.forEach(heading => {

      const id =
        createSlug(heading.textContent);


      heading.id = id;

      heading.classList.add(
        "article-section-heading"
      );

    });

  }



  /* =====================================================
     BUILD TABLE OF CONTENTS
  ====================================================== */

function buildTableOfContents() {

  const toc =
    document.querySelector(".article-toc__nav");

  if (!toc) return;


  const headings =
    articleContent.querySelectorAll("h2, h4");


  toc.innerHTML = `
    <span class="article-toc__label">
      ${current.tocTitle}
    </span>
  `;


  headings.forEach((heading, index) => {

    const link =
      document.createElement("a");

    link.href =
      `#${heading.id}`;

    link.className =
      "article-toc__link";


    if (heading.tagName === "H4") {
      link.classList.add(
        "article-toc__link--sub"
      );
    }


    if (index === 0) {
      link.classList.add("is-active");
    }


    link.textContent =
      heading.textContent;


    toc.appendChild(link);

  });

}



  /* =====================================================
     ACTIVE TOC SECTION
  ====================================================== */

  function setupActiveSection() {

    const headings =
      articleContent.querySelectorAll("h2[id]");


    const links =
      document.querySelectorAll(
        ".article-toc__link"
      );


    if (!headings.length) return;


    const observer =
      new IntersectionObserver(

        entries => {

          entries.forEach(entry => {

            if (!entry.isIntersecting) {
              return;
            }


            const currentId =
              entry.target.id;


            links.forEach(link => {

              const isActive =
                link.getAttribute("href") ===
                `#${currentId}`;


              link.classList.toggle(
                "is-active",
                isActive
              );

            });

          });

        },

        {
          rootMargin:
            "-20% 0px -65% 0px"
        }

      );


    headings.forEach(heading => {
      observer.observe(heading);
    });

  }



  /* =====================================================
     CATEGORY
  ====================================================== */

function getCategoryName(category) {

  return (
    current.categories[category] ??
    category
  );

}



  /* =====================================================
     DATE
  ====================================================== */

    function formatDate(dateString) {

      return new Intl.DateTimeFormat(
        isEnglish
          ? "en-GB"
          : "uk-UA",
        {
          day: "numeric",
          month: "long",
          year: "numeric"
        }
      ).format(
        new Date(dateString)
      );

    }



  /* =====================================================
     CREATE URL-SAFE ID
  ====================================================== */

  function createSlug(text) {

    return text
      .toLowerCase()

      .trim()

      .replace(
        /[^a-zа-яіїєґ0-9\s-]/gi,
        ""
      )

      .replace(
        /\s+/g,
        "-"
      )

      .replace(
        /-+/g,
        "-"
      );

  }



  /* =====================================================
     ERROR
  ====================================================== */

    function showError(message) {

      articleContent.innerHTML = `
        <div class="article-error">

          <h2>
            ${current.errorTitle}
          </h2>

          <p>
            ${message}
          </p>

          <a href="${current.articlesPage}">
            ${current.back}
          </a>

        </div>
      `;

    }

});
