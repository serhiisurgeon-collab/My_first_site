# Стаття про оснащення CCP: підготовка до публікації

Дата підготовки: 17 жовтня 2026. Гілка: `review/ccp-equipment-capability`.
База: `da87a739f65b426890fcf38af099fa26423e0ae2`.
**Push, merge, deploy та будь-які хмарні зміни не виконувалися.**

## Стаття та адреси

- UA: «Апаратура є. Чи є спроможність? Тривала допомога пораненим на CCP».
- EN: «Equipment Is Available. Is the Capability in Place? Prolonged Casualty Care at a CCP».
- Спільний сталий articleId: `a-0006`, slug: `ccp-equipment-capability`.
- Українська адреса після погодженої публікації: `https://serhiipelishenko.com/articles/ccp-equipment-capability/`.
- Англійська: `https://serhiipelishenko.com/en/articles/ccp-equipment-capability/`.
- Категорія: «Тактична медицина» / “Tactical medicine”. Автор — чинний автор сайту, без нових тверджень про кваліфікації.
- 15 / 17 хвилин читання: оцінка за кількістю слів, а не авторська тривалість.

У файлах немає окремої дати публікації. **17.10.2026 у локальному прев’ю є плановою датою**, а не заявою, що статтю вже опубліковано. Перед погодженою публікацією потрібно встановити фактичний день публікації у двох каталогах і повторити генерацію та перевірку актуальності. Дата звірення джерел 16.10.2026 — частина авторського тексту; вона не підміняє дату публікації й не змінювалася.

## Збереження авторського змісту

Архів містить рівно два Markdown і два PNG, без окремого редакторського файлу. Тексти не перекладалися повторно. Єдині перетворення джерел:

1. Початковий H1 перенесено без зміни тексту до JSON-метаданих — так працює чинний шаблон; у тексті тіла немає другого H1.
2. Два заповнювачі замінено реальними кореневими URL зображень.
3. В EN локалізовано лише українські tooltip-title зображень; англійські alt і підписи вже були у джерелі.

Проведено точне порівняння з файлами архіву після цих трьох дозволених перетворень. Абзаци, виділення, списки, порядок розділів, підписи та всі href збережені. Редакторських заглушок немає.

## Зображення — одна пара для двох мов

Оригінали збережено побайтово, розміри обох — **1536 × 1024**:

- `/content/articles/uk/image/ccp-equipment-professional.png` — «Професійний набір медичного обладнання».
- `/content/articles/uk/image/ccp-equipment-bunker.png` — «Імпровізований медпункт у бункері».

Чинний генератор створив менші lossless WebP; саме вони завантажуються в тілі **обох** мов:

- `/content/articles/uk/image/optimized/ccp-equipment-professional.webp`
- `/content/articles/uk/image/optimized/ccp-equipment-bunker.webp`

Копій у `content/articles/en/image/` немає. Зображення залишаються у позначених місцях тексту, зі своїми мовними alt, title та авторськими підписами. Intrinsic width/height задані; пропорція 3:2 збережена, важливі частини не обрізаються. Друга ілюстрація має lazy loading. Вбудований тест підтвердив побайтову рівність декодованих RGBA-пікселів lossless-варіантів оригіналам.

## Правильний матеріал із першого завантаження

Перевірено поточний механізм: Markdown перетворюється на етапі збірки, а нові адреси ведуть на окремі фізичні `index.html`. Текст, H1, автор, дата, canonical, hreflang та Article JSON-LD вже є в початковій HTTP-відповіді. Нова стаття не використовує старий query-шаблон для підміни іншої публікації.

`js/article-static.js` лише покращує готовий документ і не завантажує Markdown чи чужі початкові дані. CDN-залежності для перетворення Markdown немає; service worker/CacheStorage-кешування статей у прикладному JS не знайдено. Історичну причину давнього збою не встановлено й не приписано без доказів.

У browser-тесті записувалися всі спостережені H1 під час парсингу/виконання скриптів. Вони відповідали лише новій статті. Текст DOM після JS та reload порівнювався з готовим початковим HTML. Перевірено одноразову ініціалізацію коментарів і той самий `a-0006` в UA/EN, без запису тестових коментарів у хмару.

## Збереження інших статей

Усі десять раніше опублікованих HTML-сторінок статей залишилися **побайтово незмінними**, як і їхні Markdown/зображення. Щоб автоматична пагінація не переписала стару найновішу статтю, для нового запису задано `includeInExistingPagination: false`; генератор враховує цей необов’язковий прапорець. Нова стаття має посилання на попередню, а потрапити до неї можна з каталогу, головної, пошуку або через каталог з іншої статті. Жодного медичного тексту попередніх матеріалів не змінено.

Оновлено лише відповідні каталоги, блок останніх матеріалів на головній, legacy-список для навігації без JS, карту адрес та sitemap. Пошук читає чинні JSON-каталоги й знаходить нову статтю обома мовами. У sitemap тепер 32 канонічні адреси, включно з 12 мовними сторінками статей.

## Перевірки

- `npm run seo:build`: 48 результатів, 12 статичних сторінок статей.
- `npm run seo:check`: результати актуальні.
- `npm run seo:test`: 21/21 успішні. Перевірено HTML, текст, метадані, canonical/hreflang, Article JSON-LD, картинки, посилання, sitemap, безпечну обробку Markdown та lossless-пікселі.
- Тести/аудит, де кількість статей була жорстко задана як 5/10, переведено на фактичну карту статей. Негативний тест відсутнього Markdown так само перевіряє відмову до запису HTML.
- `npm run seo:jekyll`: локальна офіційна збірка успішна.
- `npm run seo:public-check`: 212 публічних файлів, усі 12 статичних article index.html; приватних файлів, службових документів, резервних копій чи ключів у публічній збірці немає.
- `ARTICLE_TEST_ORIGIN=http://127.0.0.1:8169 node tests/articles/ccp-equipment-browser.mjs`: готова Jekyll-збірка; 12 комбінацій UA/EN × 320/390/1280 px × звичайне/уповільнене завантаження. В уповільненому режимі локальні ресурси затримувалися на 350 ms, cache був вимкнений маршрутизацією Playwright.
- Перевірено новий контекст/вкладку, reload, мовний перемикач, назад/вперед, перехід зі списку та через мобільне меню з іншої публікації. Додатково — читання без JS на 320 px.
- Обидві спільні ілюстрації завантажилися, мають правильні розміри й пропорції. Горизонтального переповнення тіла статті не виявлено; заголовок не перекрито шапкою.
- Відсутні дублікати H1, Article JSON-LD, canonical та запуску коментарів. JS page errors не зафіксовано.
- Браузер: Chromium, не реальний iPhone/Safari. Хмарні API коментарів у перевірках замінено тестовим адаптером; це не перевірка Google-входу або Firestore у production.
- Скриншоти: `/workspace/artifacts/ccp-equipment-review/{uk,en}-{390,1280}-{top,image}.png`.

## Зовнішні джерела

У статті 15 унікальних зовнішніх URL. 6 відповіли HTTP 200. Для 9 проксі середовища повернув `CONNECT tunnel failed, response 403`; повторний запит UK Kidney Association поза sandbox був заблокований так само. Це обмеження перевірки, а не доказ HTTP 404 на сайті джерела. Авторські посилання не змінювалися.

- `https://assets.publishing.service.gov.uk/media/6a5e04dba3c718d2556d08b3/AJP_4_2_EdA_V1_NATO.pdf` — мережеву перевірку заблоковано проксі; статус самого джерела не визначено.
- `https://guidelines.ukkidney.org/hyperkalaemia/` — мережеву перевірку заблоковано проксі; статус самого джерела не визначено.
- `https://pubmed.ncbi.nlm.nih.gov/36037100/` — HTTP 200.
- `https://jts.health.mil/assets/docs/cpgs/Mechnical_Ventilation_Basics_09_Apr_2025_ID92_v1.1.pdf` — HTTP 200.
- `https://www.hamilton-medical.com/dam/jcr:0613fce1-2154-4f1e-a903-0c6eb7fce2e6/HAMILTON-T1_ops-manual_v3.1.x_en_usa_10103179.05.2026-05-05-08-50-12.pdf` — мережеву перевірку заблоковано проксі; статус самого джерела не визначено.
- `https://jts.health.mil/assets/docs/cpgs/Prolonged_Casualty_Care_Guidelines_21_Dec_2021_ID91v1.1.pdf` — HTTP 200.
- `https://www.aarc.org/wp-content/uploads/2014/08/12.05.0782.pdf` — мережеву перевірку заблоковано проксі; статус самого джерела не визначено.
- `https://www.aarc.org/wp-content/uploads/2024/10/patient-ventilator-assessment-aarc-cpg.pdf` — мережеву перевірку заблоковано проксі; статус самого джерела не визначено.
- `https://jts.health.mil/assets/docs/cpgs/i-STAT_Portable_CCATT_Final_26_FEB_2025.pdf` — HTTP 200.
- `https://www.naemt.org/education/trauma-education/naemt-tccc` — мережеву перевірку заблоковано проксі; статус самого джерела не визначено.
- `https://www.who.int/publications/i/item/9789240093621` — мережеву перевірку заблоковано проксі; статус самого джерела не визначено.
- `https://zakon.rada.gov.ua/laws/term/1314-18` — мережеву перевірку заблоковано проксі; статус самого джерела не визначено.
- `https://www.aarc.org/resource/clinical-practice-guidelines/` — мережеву перевірку заблоковано проксі; статус самого джерела не визначено.
- `https://jts.health.mil/index.cfm/CPGs/cpgs` — HTTP 200.
- `https://jts.health.mil/assets/docs/cpgs/Telemedicine_Deployed_Setting_19_Sep_2023_ID94_v1.2.pdf` — HTTP 200.

## Коментарі та окремий хмарний крок

Локальна карта містить `a-0006`; UA/EN пов’язані з одним обговоренням. Rules, Auth, індекси, наявні налаштування й документи коментарів не змінено.

Для роботи публікації коментарів може знадобитися запис у чинному проєкті `serhii-comments-test`:

```text
Колекція: articles
Document ID: a-0006
slug (string): ccp-equipment-capability
aliases (array): []
```

Це **не виконано**. Перед створенням потрібно перевірити хмарний `articles/a-0006`: якщо він уже зайнятий іншим матеріалом, зупинитися, а не перезаписувати його. Не створювати новий Firebase-проєкт і не змінювати Rules чи акаунти. Саму статтю можна читати незалежно від доступності Firebase. Хмарний запис і публікація потребують погодження власника.

## Файли

Джерела та зображення:
- `content/articles/uk/ccp-equipment-capability.md`
- `content/articles/en/ccp-equipment-capability.md`
- два нові PNG й два оптимізовані WebP у `content/articles/uk/image/` та її чинному підкаталозі `optimized/`.

Метадані й збірка:
- `data/articles.json`, `data/articles-en.json`, `firebase/article-map.json`
- `tools/seo/build.mjs`
- `tools/seo/image-manifest.json`, `tools/seo/url-registry.json`, `data/article-routes.json`
- `articles/ccp-equipment-capability/index.html`, `en/articles/ccp-equipment-capability/index.html`
- `articles.html`, `en/articles-en.html`, `index.html`, `en/index-en.html`
- `article.html`, `en/article-en.html`, `sitemap.xml`

Перевірки й звіт:
- `tests/articles/ccp-equipment-browser.mjs`
- `tests/seo/build-safety.test.mjs`, `tests/seo/static.test.mjs`
- `tools/seo/public-audit.mjs`
- `docs/ccp-equipment-review.md`

## Для локального перегляду

У цьому workspace запущено приватні HTTP-сервери: вихідний сайт — порт 8168; готовий Jekyll-сайт — 8169. Вони не є адресами production і не публікують нову статтю на serhiipelishenko.com. Доступність цих портів залежить від середовища; скриншоти доступні окремими файлами.

Після отримання checkout можна запустити на власному комп’ютері:

```sh
npm ci
npm run seo:build
npm run seo:jekyll
python -m http.server 8169 --directory .private/seo-jekyll
```

Відкрити на цьому локальному сервері `/articles/ccp-equipment-capability/` та `/en/articles/ccp-equipment-capability/`.

Перед публікацією: отримати підтвердження власника, звірити фактичний день публікації, за окремим погодженням перевірити/створити лише один запис реєстру статей. Після цього — чинний процес GitHub Pages, звірення живих UA/EN і sitemap. Не виконувати хмарних міграцій або відновлення копій.
