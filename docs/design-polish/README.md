# Design polish pass

Гілка: [`design-polish-pass`](https://github.com/serhiisurgeon-collab/My_first_site/tree/design-polish-pass).
Зміни підготовлено для review. `main` та живий сайт не оновлювалися.

## Що змінено

- **Мова UI:** локалізовано статуси, теги, лабораторні позначки й описи зображень Projects UA; виправлено `alt` на Home EN, назву навігації Policy EN, копірайт S-Dose UA та позначку помилки 404 UA. Категорії результатів пошуку тепер мають локалізовані назви. Назви продуктів і авторські назви збережено.
- **Navbar:** від 1280 px — повний пошук із текстом і Ctrl K; 1024–1279 px — іконка з aria-label/title; до 1024 px — чинне мобільне меню, компактний пошук і видимий перемикач мов. Додано закриття меню через Escape, вибір посилання, відкриття пошуку та перехід до desktop. Фокус і позиція прокручування відновлюються; приховані посилання не потрапляють у Tab-порядок. 404 використовує ті самі модулі меню/пошуку.
- **Посилання:** внутрішні переходи залишаються в поточній вкладці; зовнішні HTTP(S) мають `_blank` + `noopener noreferrer`. Правило діє і в HTML без JS, і після генерації статей, і для динамічних посилань. Завантаження професійного портрета збережено.
- **Home:** About preview збережено редакційною секцією. Articles — тепла світла текстова секція з тонкими розділювачами без підняття карток чи зображень. Projects зберігає featured card, дві менші картки, mockups і tree-rings; zoom обмежено до 1.035, lift — до 3 px, зайвий glow прибрано. Фінальний CTA скорочено через окремий `.home-page`, без зміни CTA на S-Dose. Hero, порядок секцій, палітру, шрифти та footer збережено.
- **About:** портрет має один border 1 px, radius 24 px і м’яку тінь. Прибрано glass stack, другий контур, scroll reflection і відповідний JS. Галерея використовує той самий radius та споріднений тонкий border/характер тіні. Файли зображень, колір, пропорції, `object-fit` і `object-position` не змінено.
- **Projects на 768 px:** виправлено мінімальну ширину вступної сітки; вона більше не створює horizontal scroll.
- **Reduced motion:** вимкнено декоративний рух Home та переходи меню/пошуку за відповідним системним налаштуванням.

Окремий попередній commit `dfb8c6c` зберігає вже погоджене локальне уточнення короткої біографії та два абзаци при копіюванні. Воно не було втрачено або переписано під час polish pass.

## Замінені терміни

| Було | Стало |
|---|---|
| Featured project | Флагманський проєкт |
| Active | Активний |
| Completed | Завершений |
| Archived | Архівний |
| Software | Розробка |
| Personal | Особистий проєкт |
| In progress | У роботі |
| Experiment | Експеримент |
| Експерименти / Lab | Експерименти / Лабораторія |
| TCCC / MARCH educational platform | Освітня платформа TCCC / MARCH |
| S-Dose application | Застосунок S-Dose |
| Spanish by Serhii Telegram bot | Telegram-бот Spanish by Serhii |
| All rights reserved. на S-Dose UA | Усі права захищені. |
| Основна навігація на Policy EN | Primary navigation |
| Український alt портрета на Home EN | Serhii Pelishenko — military physician and TCCC/CLS instructor |
| ПОМИЛКА / ERROR 404 на UA | ПОМИЛКА 404 |

У пошуку технічні category IDs замінено на «Тактична медицина / Tactical Medicine», «Медицина / Medicine», «Технології / Technology», «Зрозуміло про медицину / Understanding Medicine».

Білінгвальне написання імені власника в Policy EN збережено як власне ім’я, а не UI-label. Авторський текст статей та їхні ілюстрації не перекладалися заново.

## Основні файли

- `css/components.css`, `css/responsive.css`, `css/pages/home.css`, `css/pages/about.css`, `css/pages/projects.css`, `css/pages/404.css`.
- `js/navigation.js`, `js/search.js`, `js/links.js`, `js/link-policy.js`, `js/scroll-lock.js`, `js/404.js`, `js/main.js`, `js/about-profile.js`.
- `js/comments/index.js`: лише вилучення `_blank` з внутрішнього посилання на політику; backend не змінено.
- `tools/seo/build.mjs`, `tools/seo/link-policy.mjs`, HTML-шаблони та відповідні згенеровані HTML.
- Інші HTML: нормалізація `target`/`rel`, локалізація зазначених UI-полів, актуальні версії CSS/JS.
- Регресійні перевірки: `tests/design-polish/*`, адаптація перевірки рамки в `tests/about/profile-browser.mjs`.

[Повний перелік файлів](changed-files.txt). Більшість HTML-змін — однакова політика посилань і cache version спільних ресурсів.

## Посилання

[Усі адреси, з яких видалено `_blank`](internal-links.md), включно з Home/About/Projects/Contact, S-Dose, Spanish, footer logo, політикою та вкладеними проєктами. [Повний машинний перелік](link-changes.json).

## Перевірено

- **Google Chrome 158.0.8127.36:** [108 UA/EN сценаріїв](browser-results.json) на 1440, 1280, 1200, 1024, 900, 768, 430, 390, 360 px. Navbar не переноситься й не перекриває елементи; немає horizontal scroll. Працюють компактний пошук, Ctrl K, Escape, мови, focus-visible і закриття меню.
- [34 додаткові сценарії](flow-results.json): S-Dose, Spanish, статті й Policy; реальні same-tab переходи Home → About → Contact та footer/language links; безпечне відкриття зовнішнього тестового URL без `window.opener`; динамічні посилання; блокування й відновлення скролу; resize відкритого меню; Chrome-емуляція Pixel 7 та iPhone 13; reduced motion; звичайний hover і візуальна ієрархія Home.
- При затриманому завантаженні портрета його x/y/width/height до і після decode однакові в межах 0.5 px на UA/EN, 390/1440 px. Фото має первісне співвідношення 4:5.
- Чинні регресійні сценарії: пошук — 4, 404 — 20 (з JS і без), About — 14 (включно з clipboard fallback, ручним виділенням і download).
- `seo:build`, `seo:check`, `seo:test`, статичні link/localisation checks, 5 About-тестів і `git diff --check` — успішні.
- [36 порівнянь контенту/футера інших сторінок](style-regression.json): **0 відмінностей** у перевірених computed styles і ширинах після остаточного обмеження Home CTA. Navbar/search/menu навмисно змінені та перевірялися окремо.
- Контент статей, файли фотографій і mockups, sitemap, robots, URL registry, дані та Firebase rules не змінено.

### Межі перевірки

Firefox і WebKit не встановлені; штатне завантаження Playwright заблоковано політикою доменів середовища. **Safari, Firefox, реальні mobile Safari та Android Chrome не перевірено.** Pixel/iPhone вище — емуляція у Chrome, а не реальні пристрої або Safari. Перед merge потрібен ручний прохід у цих браузерах.

Окремий backup/restore integration test коментарів потребує Auth/Firestore emulators: прямий запуск без них не завершився через недоступний локальний endpoint. Його не зараховано як успішну перевірку. У цьому pass не змінювалися логіка backup/restore, доступи чи дані коментарів.

## Скриншоти

| Екран | Файл |
|---|---|
| Home desktop, 1440 px | [PNG](screenshots/home-desktop.png) |
| Home tablet, 900 px | [PNG](screenshots/home-tablet.png) |
| Home mobile, 390 px | [PNG](screenshots/home-mobile.png) |
| Projects UA, 1440 px | [PNG](screenshots/projects-uk.png) |
| Projects EN, 1440 px | [PNG](screenshots/projects-en.png) |
| About portrait desktop, 1440 px | [PNG](screenshots/about-portrait-desktop.png) |
| About portrait mobile, 390 px | [PNG](screenshots/about-portrait-mobile.png) |
| Projects UA mobile, 390 px | [PNG](screenshots/projects-uk-mobile.png) |
| Projects EN mobile, 390 px | [PNG](screenshots/projects-en-mobile.png) |

Скриншоти — локальна гілка, не живий deployment. `docs/` уже виключено з публікації Jekyll.
