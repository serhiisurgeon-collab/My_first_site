const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

const WORDS_PER_MINUTE = 200;


// --------------------------------------------------
// Знаходимо файл у проєкті за його назвою
// --------------------------------------------------




// --------------------------------------------------
// Очищаємо Markdown перед підрахунком
// --------------------------------------------------

function cleanMarkdown(markdown) {

  return markdown

    // YAML front matter
    .replace(/^---[\s\S]*?---/m, "")

    // code blocks
    .replace(/```[\s\S]*?```/g, "")

    // inline code
    .replace(/`[^`]*`/g, "")

    // images
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")

    // links — залишаємо текст
    .replace(
      /\[([^\]]+)\]\([^)]*\)/g,
      "$1"
    )

    // HTML
    .replace(/<[^>]*>/g, " ")

    // Markdown symbols
    .replace(/[#>*_~|]/g, " ")

    // URL
    .replace(
      /https?:\/\/\S+/g,
      ""
    )

    // зайві пробіли
    .replace(/\s+/g, " ")
    .trim();
}


// --------------------------------------------------
// Рахуємо час читання
// --------------------------------------------------

function calculateReadTime(markdown) {

  const cleanText =
    cleanMarkdown(markdown);


  const words =
    cleanText.match(
      /\p{L}[\p{L}\p{M}\p{N}'’.-]*/gu
    ) || [];


  const minutes =
    Math.ceil(
      words.length / WORDS_PER_MINUTE
    );


  return {
    words: words.length,
    minutes: Math.max(1, minutes)
  };
}


// --------------------------------------------------
// Оновлюємо один JSON
// --------------------------------------------------

function updateLanguage({
  jsonPath,
  markdownFolder
}) {

  const fullJsonPath =
    path.join(ROOT, jsonPath);

  const mdFolderPath =
    path.join(ROOT, markdownFolder);


  if (!fs.existsSync(fullJsonPath)) {
    console.error(
      `❌ Не знайдено ${fullJsonPath}`
    );

    return;
  }


  if (!fs.existsSync(mdFolderPath)) {
    console.error(
      `❌ Не знайдено ${mdFolderPath}`
    );

    return;
  }


  const json =
    JSON.parse(
      fs.readFileSync(
        fullJsonPath,
        "utf8"
      )
    );


  const articles =
    Array.isArray(json)
      ? json
      : json.articles;


  if (!Array.isArray(articles)) {
    console.error(
      `❌ Не знайдено масив статей у ${jsonPath}`
    );

    return;
  }


  console.log(
    `\n📚 ${jsonPath}`
  );


  articles.forEach(article => {

    if (!article.slug) {
      console.warn(
        `⚠️ Немає slug: ${article.title}`
      );

      return;
    }


    const markdownPath =
      path.join(
        mdFolderPath,
        `${article.slug}.md`
      );


    if (!fs.existsSync(markdownPath)) {
      console.warn(
        `⚠️ Не знайдено: ${article.slug}.md`
      );

      return;
    }


    const markdown =
      fs.readFileSync(
        markdownPath,
        "utf8"
      );


    const result =
      calculateReadTime(markdown);


    article.readTime =
      result.minutes;


    console.log(
      `✅ ${article.slug}: ` +
      `${result.words} слів → ` +
      `${result.minutes} хв`
    );
  });


  fs.writeFileSync(
    fullJsonPath,
    JSON.stringify(
      json,
      null,
      2
    ) + "\n",
    "utf8"
  );


  console.log(
    `💾 Оновлено ${jsonPath}`
  );
}


// --------------------------------------------------
// Українські статті
// --------------------------------------------------

updateLanguage({
  jsonPath: "data/articles.json",
  markdownFolder: "content/articles/uk"
});

updateLanguage({
  jsonPath: "data/articles-en.json",
  markdownFolder: "content/articles/en"
});

console.log(
  "\n✨ Час читання оновлено."
);