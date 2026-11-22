# CSS architecture cleanup — 22 листопада 2026

Гілка: `css-architecture-cleanup`. Контрольний main: [`4e0521e`](https://github.com/serhiisurgeon-collab/My_first_site/commit/4e0521e759e18c2288afcfc86be9c90965456cf3), локальний тег `css-cleanup-baseline-2026-11-22`. Живий сайт і main не оновлювалися.

## Результат

Спільні navbar, mobile navigation, search, footer і collaboration CTA тепер незалежні від Home/About CSS. Знято зайві імпорти цих сторінок з Contact, Projects, Articles, статей, S-Dose і чотирьох Spanish landing pages. About додає shared-клас CTA до наявної секції; її власна геометрія збережена scoped-модифікатором.

Зовнішній CSS: 278,836 → 263,269 байтів (−5.6%). Оголошення: 7021 → 6608. Перевірено 2,809,812 значень у 68,532 записах елементів/псевдоелементів і станів.

`css:check`: 0 помилок, 0 dead candidates. Вихідний аудит знаходив 56 повторів селекторів, 1 exact duplicate rule, 3 shadowed properties, 3 некоректні CSS-фрагменти і 49 dead-selector branches. Після видалення некоректних фрагментів додатково очищено локальні повтори Dune. [До](audit-before.json), [після](css-check.json), [повний журнал змін](changes.json).

## Карта архітектури

| Файл | Власник стилів |
|---|---|
| `css/tokens.css` | Design tokens; лише custom properties, включно зі збереженим fallback шрифтів standard shell |
| `css/base.css` | Reset, документ, базова типографія, selection/accessibility |
| `css/layout.css` | Container, живі section/stack helpers |
| `css/components.css` | Navbar, mobile/shared focus states, search modal/trigger, language switcher, footer, shared CTA |
| `css/responsive.css` | Адаптивність shared-компонентів та явно scoped старі shell-варіанти |
| `css/pages/*.css` | Лише відповідна сторінка/дискусія/S-Dose-компонент і власні media queries |
| `spanish-bot.css` | Spanish content; navbar overrides винесені до shared CSS |
| `project/project_blood/**/*.css`, Dune `<style>` | Ізольовані дизайн-системи без перенесення до основного сайту |

`site-shell--standard`, `site-shell--home`, `site-shell--policy` позначають наявні варіанти успадкування, а не новий дизайн. `:where()` не підвищує специфічність. Standard зберігає footer breakpoints 900/768 px, Home/Policy — 980/620 px; різні CTA breakpoints і padding залишилися. Page breakpoints не уніфіковані.

## Змінені CSS-файли

- `css/base.css`
- `css/components.css`
- `css/layout.css`
- `css/pages/404.css`
- `css/pages/about.css`
- `css/pages/article.css`
- `css/pages/articles.css`
- `css/pages/comments.css`
- `css/pages/contact.css`
- `css/pages/home.css`
- `css/pages/policy.css`
- `css/pages/projects.css`
- `css/pages/s-dose-partnership.css`
- `css/pages/s-dose.css`
- `css/responsive.css`
- `css/tokens.css`
- `project/project_blood/blood_style.css`
- `project/project_blood/page_aboutus/aboutus_style.css`
- `project/project_blood/page_contact/contact_style.css`
- `project/project_blood/page_donor/donor_style.css`
- `project/project_blood/page_news/news_style.css`
- `spanish-bot.css`

Також очищено inline CSS у `project/2d_try.html`; два 404 `<noscript><style>` залишені як автономний fallback. HTML змінено лише для stylesheet dependencies/cache hashes, shell-класів та shared-класу About CTA. `tools/seo/build.mjs` тепер версіонує всі shared/page assets; у build-safety fixture додано його нову обов’язкову CSS-залежність `spanish-bot.css`.

## Видалені повторні селектори

| Файл | Селектор | Контекст |
|---|---|---|
| `css/components.css` | `.site-nav__toggle` | `base` |
| `css/pages/article.css` | `.article-back:hover` | `base` |
| `css/pages/article.css` | `.article-header__title` | `base` |
| `css/pages/article.css` | `.article-body` | `base` |
| `css/pages/article.css` | `.article-body p` | `base` |
| `css/pages/article.css` | `.article-body ul, .article-body ol` | `base` |
| `css/pages/article.css` | `.article-body a` | `base` |
| `css/pages/articles.css` | `.articles-hero__eyebrow` | `base` |
| `css/pages/articles.css` | `.articles-hero__title` | `base` |
| `css/pages/articles.css` | `.articles-hero__description` | `base` |
| `css/pages/articles.css` | `.article-row__arrow` | `base` |
| `css/pages/articles.css` | `.article-row:hover .article-row__arrow` | `base` |
| `css/pages/comments.css` | `.comments-widget button` | `base` |
| `css/pages/comments.css` | `.comments-widget button:disabled` | `base` |
| `css/pages/comments.css` | `.comments-auth, .comment-actions` | `base` |
| `css/pages/comments.css` | `.comments-form` | `base` |
| `css/pages/comments.css` | `.comment` | `base` |
| `css/pages/comments.css` | `.comment-replies` | `base` |
| `css/pages/comments.css` | `.comments-admin` | `base` |
| `css/pages/comments.css` | `.comment` | `@media (max-width:480px)` |
| `css/pages/comments.css` | `.comment-replies` | `@media (max-width:480px)` |
| `css/pages/comments.css` | `.comments-widget button` | `@media (max-width:480px)` |
| `css/pages/contact.css` | `.contact-page` | `base` |
| `css/pages/home.css` | `.start-hero__eyebrow` | `base` |
| `css/pages/home.css` | `.start-hero__title` | `base` |
| `css/pages/home.css` | `.start-hero__title` | `base` |
| `css/pages/home.css` | `.start-hero__roles` | `base` |
| `css/pages/home.css` | `.start-hero__roles` | `base` |
| `css/pages/home.css` | `.start-hero__description` | `base` |
| `css/pages/home.css` | `.start-hero__description` | `base` |
| `css/pages/home.css` | `.start-hero__actions` | `base` |
| `css/pages/home.css` | `.start-hero__stat strong` | `base` |
| `css/pages/home.css` | `.start-hero__stat span` | `base` |
| `css/pages/home.css` | `body:where(.site-shell--home).hero-loaded .hero-photo-reveal` | `base` |
| `css/pages/policy.css` | `.privacy-item__summary` | `base` |
| `css/pages/projects.css` | `.project-row` | `@media (max-width: 760px)` |
| `css/pages/projects.css` | `.project-row__visual` | `@media (max-width: 760px)` |
| `css/pages/projects.css` | `.project-row__content` | `@media (max-width: 760px)` |
| `css/pages/projects.css` | `.project-row__content p` | `@media (max-width: 760px)` |
| `css/pages/projects.css` | `.project-row__arrow` | `@media (max-width: 760px)` |
| `css/pages/projects.css` | `.projects-meta__item--wide` | `@media (max-width: 620px)` |
| `css/pages/s-dose.css` | `.s-dose-hero` | `@media (max-width: 820px)` |
| `css/pages/s-dose.css` | `.s-dose-hero__grid` | `@media (max-width: 820px)` |
| `css/pages/s-dose.css` | `.s-dose-hero__content` | `@media (max-width: 820px)` |
| `css/responsive.css` | `.bot-landing .site-nav__inner` | `@media (max-width:540px)` |
| `css/responsive.css` | `.bot-landing .site-nav__language-switcher` | `@media (max-width:540px)` |
| `css/responsive.css` | `.bot-landing .site-nav__brand` | `@media (max-width:540px)` |
| `css/responsive.css` | `.bot-landing .site-nav__toggle` | `@media (max-width:540px)` |
| `project/project_blood/blood_style.css` | `.main-title` | `base` |
| `project/project_blood/page_aboutus/aboutus_style.css` | `.review` | `base` |
| `spanish-bot.css` | `.bot-landing` | `base` |
| `spanish-bot.css` | `.bot-page h1` | `base` |
| `spanish-bot.css` | `.bot-preview__body` | `base` |
| `spanish-bot.css` | `.bot-spanish` | `base` |
| `spanish-bot.css` | `.bot-feature` | `base` |
| `spanish-bot.css` | `.bot-page h1` | `@media (max-width:540px)` |
| `spanish-bot.css` | `.bot-page h1` | `@media (max-width:540px)` |
| `spanish-bot.css` | `.bot-preview__body` | `@media (max-width:540px)` |
| `project/2d_try.html` | `.page` | `base` |
| `project/2d_try.html` | `.page` | `@media (max-width: 600px)` |

Копії спільних navbar/footer/CTA перелічені окремими записами `shared-copy` / `shared-responsive-copy` у [changes.json](changes.json); там само є список усіх прибраних перекритих декларацій.

## Видалені dead selectors

Враховано HTML, SEO-шаблони, JS classList/querySelector, template literals, генерацію коментарів/пошуку, MutationObserver і мовні варіанти. Видалено 49 початкових selector branches плюс 2 старі alias для search trigger. Динамічні `.is-open`, `.is-visible`, `.hero-loaded`, comments/admin/search класи збережено.

| Файл | Селектор | Контекст |
|---|---|---|
| `css/base.css` | `body.no-scroll` | `base` |
| `css/base.css` | `.display-title` | `base` |
| `css/base.css` | `.page-title` | `base` |
| `css/base.css` | `.display-title` | `base` |
| `css/base.css` | `.page-title` | `base` |
| `css/base.css` | `.body-large` | `base` |
| `css/base.css` | `.body-text` | `base` |
| `css/base.css` | `.body-small` | `base` |
| `css/base.css` | `.eyebrow` | `base` |
| `css/base.css` | `.text-primary` | `base` |
| `css/base.css` | `.text-secondary` | `base` |
| `css/base.css` | `.text-light` | `base` |
| `css/base.css` | `.text-light-muted` | `base` |
| `css/base.css` | `.theme-dark` | `base` |
| `css/base.css` | `.theme-light` | `base` |
| `css/components.css` | `.site-nav__language` | `base` |
| `css/components.css` | `.site-nav__language:hover` | `base` |
| `css/layout.css` | `.section--large` | `base` |
| `css/layout.css` | `.grid` | `base` |
| `css/layout.css` | `.grid--2` | `base` |
| `css/layout.css` | `.grid--3` | `base` |
| `css/layout.css` | `.stack--sm` | `base` |
| `css/layout.css` | `.stack--md` | `base` |
| `css/layout.css` | `.stack--lg` | `base` |
| `css/layout.css` | `.visually-hidden` | `base` |
| `css/pages/home.css` | `.start-hero__scroll-shape` | `base` |
| `css/pages/home.css` | `.start-hero__scroll-shape path` | `base` |
| `css/pages/home.css` | `.start-hero__scroll:hover .start-hero__scroll-shape path` | `base` |
| `css/pages/home.css` | `.privacy-update-notice` | `base` |
| `css/pages/home.css` | `.privacy-update-notice p` | `base` |
| `css/pages/home.css` | `.privacy-update-notice a` | `base` |
| `css/pages/projects.css` | `.projects-filters` | `base` |
| `css/pages/projects.css` | `.projects-filter` | `base` |
| `css/pages/projects.css` | `.projects-filter:hover` | `base` |
| `css/pages/projects.css` | `.projects-filter.is-active` | `base` |
| `css/pages/projects.css` | `.projects-filters` | `@media (max-width: 620px)` |
| `css/pages/projects.css` | `.projects-filter` | `@media (max-width: 620px)` |
| `css/pages/s-dose.css` | `.s-dose-hero__visual` | `base` |
| `css/pages/s-dose.css` | `.s-dose-step h3` | `base` |
| `css/pages/s-dose.css` | `.s-dose-step p` | `base` |
| `css/pages/s-dose.css` | `.s-dose-steps` | `base` |
| `css/pages/s-dose.css` | `.s-dose-step` | `base` |
| `css/pages/s-dose.css` | `.s-dose-step__number` | `base` |
| `css/pages/s-dose.css` | `.s-dose-step h3` | `base` |
| `css/pages/s-dose.css` | `.s-dose-steps` | `@media (max-width: 820px)` |
| `css/pages/s-dose.css` | `.s-dose-step` | `@media (max-width: 820px)` |
| `css/pages/s-dose.css` | `.s-dose-step` | `@media (max-width: 600px)` |
| `css/pages/s-dose.css` | `.s-dose-step h3` | `@media (max-width: 600px)` |
| `spanish-bot.css` | `.bot-dot` | `base` |
| `css/base.css → css/components.css` | `.navbar .site-search-trigger` | `base` |
| `css/base.css → css/components.css` | `.header .site-search-trigger` | `base` |

[Інвентаризація JS-виробників класів/стилів](dynamic-styles.txt). Production JS не змінювався.

## Перенесені правила

| Звідки | Куди | Правило |
|---|---|---|
| `css/base.css` | `css/layout.css` | `.container` |
| `css/base.css` | `css/responsive.css` | `@media (max-width: 600px)` |
| `css/base.css` | `css/responsive.css` | `@media (max-width: 640px)` |
| `css/pages/about.css` | `css/components.css` | `.site-footer` |
| `css/pages/about.css` | `css/components.css` | `.site-footer__inner` |
| `css/pages/about.css` | `css/components.css` | `.site-footer__grid` |
| `css/pages/about.css` | `css/components.css` | `.site-footer__logo` |
| `css/pages/about.css` | `css/components.css` | `.site-footer__logo span` |
| `css/pages/about.css` | `css/components.css` | `.site-footer__tagline` |
| `css/pages/about.css` | `css/components.css` | `.site-footer__heading` |
| `css/pages/about.css` | `css/components.css` | `.site-footer__nav, .site-footer__socials, .site-footer__contacts` |
| `css/pages/about.css` | `css/components.css` | `.site-footer__nav a, .site-footer__socials a, .site-footer__contacts a, .site-footer__contacts p` |
| `css/pages/about.css` | `css/components.css` | `.site-footer__nav a:hover, .site-footer__socials a:hover, .site-footer__contacts a:hover` |
| `css/pages/about.css` | `css/components.css` | `.site-footer__contacts` |
| `css/pages/about.css` | `css/components.css` | `.site-footer__contact-item` |
| `css/pages/about.css` | `css/components.css` | `.site-footer__contact-item i` |
| `css/pages/about.css` | `css/components.css` | `.site-footer__contact-item:hover` |
| `css/pages/about.css` | `css/components.css` | `.site-footer__socials a i` |
| `css/pages/about.css` | `css/components.css` | `.site-footer__bottom` |
| `css/pages/about.css` | `css/components.css` | `.site-footer__bottom p, .site-footer__bottom a` |
| `css/pages/about.css` | `css/components.css` | `.site-footer__bottom a` |
| `css/pages/about.css` | `css/components.css` | `.site-footer__bottom a:hover` |
| `css/pages/about.css` | `css/components.css` | `.collaboration-cta` |
| `css/pages/about.css` | `css/components.css` | `.collaboration-cta::before` |
| `css/pages/about.css` | `css/components.css` | `.collaboration-cta::after` |
| `css/pages/about.css` | `css/components.css` | `.collaboration-cta__grid` |
| `css/pages/about.css` | `css/components.css` | `.collaboration-cta__content` |
| `css/pages/about.css` | `css/components.css` | `.collaboration-cta__action` |
| `css/pages/about.css` | `css/components.css` | `.collaboration-cta__eyebrow` |
| `css/pages/about.css` | `css/components.css` | `.collaboration-cta__eyebrow::before` |
| `css/pages/about.css` | `css/components.css` | `.collaboration-cta__title` |
| `css/pages/about.css` | `css/components.css` | `.collaboration-cta__description` |
| `css/pages/about.css` | `css/components.css` | `.collaboration-cta__button` |
| `css/pages/about.css` | `css/components.css` | `.collaboration-cta__button span` |
| `css/pages/about.css` | `css/components.css` | `.collaboration-cta__button:hover` |
| `css/pages/about.css` | `css/components.css` | `.collaboration-cta__button:hover span` |
| `css/pages/about.css` | `css/tokens.css` | `.site-shell--standard font variables` |
| `css/pages/about.css` | `css/components.css` | `.site-nav__brand` |
| `css/pages/about.css` | `css/components.css` | `.site-nav__link` |
| `css/pages/about.css` | `css/components.css` | `.site-nav__link:hover, .site-nav__link[aria-current="page"]` |
| `css/pages/about.css` | `css/responsive.css` | `.collaboration-cta__grid` |
| `css/pages/about.css` | `css/responsive.css` | `.collaboration-cta__action` |
| `css/pages/about.css` | `css/responsive.css` | `.site-footer__grid` |
| `css/pages/about.css` | `css/responsive.css` | `.container` |
| `css/pages/about.css` | `css/responsive.css` | `.collaboration-cta` |
| `css/pages/about.css` | `css/responsive.css` | `.collaboration-cta__grid` |
| `css/pages/about.css` | `css/responsive.css` | `.collaboration-cta__title` |
| `css/pages/about.css` | `css/responsive.css` | `.collaboration-cta__button` |
| `css/pages/about.css` | `css/responsive.css` | `.site-footer__inner` |
| `css/pages/about.css` | `css/responsive.css` | `.site-footer__grid` |
| `css/pages/about.css` | `css/responsive.css` | `.site-footer__bottom` |
| `css/pages/home.css` | `css/responsive.css` | `.site-footer__grid` |
| `css/pages/home.css` | `css/responsive.css` | `.site-footer__inner` |
| `css/pages/home.css` | `css/responsive.css` | `.site-footer__grid` |
| `css/pages/home.css` | `css/responsive.css` | `.site-footer__bottom` |
| `css/pages/home.css` | `css/responsive.css` | `.collaboration-cta` |
| `css/pages/home.css` | `css/responsive.css` | `.collaboration-cta__grid` |
| `css/pages/home.css` | `css/responsive.css` | `.collaboration-cta__title` |
| `css/pages/home.css` | `css/responsive.css` | `.collaboration-cta__button` |
| `css/pages/s-dose.css` | `css/responsive.css` | `.s-dose-site .site-nav__inner` |
| `css/pages/s-dose.css` | `css/responsive.css` | `.s-dose-site .site-nav__brand` |
| `css/pages/s-dose.css` | `css/responsive.css` | `.s-dose-site .site-search-trigger` |
| `css/pages/s-dose.css` | `css/responsive.css` | `.s-dose-site .site-nav__language-switcher` |
| `css/pages/s-dose.css` | `css/responsive.css` | `.s-dose-site .site-nav__language-option, .s-dose-site .site-nav__language-divider` |
| `css/pages/s-dose.css` | `css/responsive.css` | `.s-dose-site .site-nav__toggle` |
| `css/pages/s-dose.css` | `css/responsive.css` | `.s-dose-site .mobile-nav` |
| `spanish-bot.css` | `css/responsive.css` | `.bot-landing .site-nav` |
| `spanish-bot.css` | `css/responsive.css` | `.bot-landing .site-nav__inner` |
| `spanish-bot.css` | `css/responsive.css` | `.bot-landing .site-nav__language-switcher` |
| `spanish-bot.css` | `css/responsive.css` | `.bot-landing .site-nav__brand` |
| `spanish-bot.css` | `css/responsive.css` | `.bot-landing .site-nav__toggle` |
| `spanish-bot.css` | `css/components.css` | `.bot-landing .site-nav__language-switcher` |
| `spanish-bot.css` | `css/components.css` | `.bot-landing .site-nav__links` |
| `spanish-bot.css` | `css/responsive.css` | `html[lang=de] .site-nav__links,html[lang=es] .site-nav__links` |
| `spanish-bot.css` | `css/responsive.css` | `html[lang=de] .site-nav__toggle,html[lang=es] .site-nav__toggle` |
| `spanish-bot.css` | `css/responsive.css` | `.bot-landing .site-nav__inner` |
| `spanish-bot.css` | `css/responsive.css` | `.bot-landing .site-nav__language-option,.bot-landing .site-nav__language-divider` |
| `spanish-bot.css` | `css/responsive.css` | `.bot-landing .site-nav__language-switcher` |
| `spanish-bot.css` | `css/responsive.css` | `.bot-landing .site-nav__brand` |
| `spanish-bot.css` | `css/responsive.css` | `.bot-landing .site-nav__toggle` |
| `spanish-bot.css` | `css/responsive.css` | `.bot-landing .site-search-trigger` |
| `spanish-bot.css` | `css/responsive.css` | `html:is([lang=de],[lang=es]) .mobile-nav` |
| `spanish-bot.css` | `css/responsive.css` | `html:is([lang=de],[lang=es]) .mobile-nav.is-open` |
| `spanish-bot.css` | `css/responsive.css` | `html:is([lang=de],[lang=es]) .mobile-nav__inner` |
| `spanish-bot.css` | `css/responsive.css` | `html:is([lang=de],[lang=es]) .mobile-nav__inner a` |
| `css/pages/404.css` | `css/components.css` | `.not-found-page .site-nav` |
| `css/pages/404.css` | `css/components.css` | `.not-found-page .site-nav__language-option.is-active` |
| `css/pages/404.css` | `css/components.css` | `.not-found-page .mobile-nav` |
| `css/pages/404.css` | `css/components.css` | `.not-found-footer .site-nav__brand` |
| `css/pages/404.css` | `css/components.css` | `.not-found-page .site-nav :focus-visible` |
| `css/pages/404.css` | `css/responsive.css` | `.not-found-page .site-nav` |
| `css/pages/404.css` | `css/responsive.css` | `.not-found-page .site-nav__inner` |
| `css/pages/policy.css :root` | `css/pages/policy.css .privacy-policy` | `Page-local privacy variables` |
| `css/pages/contact.css :root` | `css/pages/contact.css .contact-page` | `Page-local contact variables` |
| `css/pages/s-dose.css :root` | `css/pages/s-dose.css .s-dose-site` | `Page-local S-Dose variables` |

URL фонових ресурсів перебазовано відносно нового CSS-файлу. [Source contract](source-contract.json) підтверджує незмінність контенту/SEO/посилань у 62 HTML, 36 JS-файлах, 104 медіафайлах і 23 джерелах контенту.

## Регресія та межі перевірки

[Computed-style report](regression.json): 140 route/width cases, **0 відмінностей** у 41 властивості; default/hover/focus-visible/search/menu/reduced-motion, елементи та ::before/::after. Основна матриця UA/EN: Home, About, Projects, Articles, Contact, 404, S-Dose, Spanish, NPA article; додатково Policy, локальна comments fixture та 7 legacy routes. Ширини: 1440, 1280, 1024, 768, 390, 360 px; legacy — 1440/390. Нових horizontal overflow і page errors немає. [Окремий smoke-test](browser-smoke.json): 44 UA/EN/DE/ES viewport cases без console/page errors, HTTP 4xx/5xx або horizontal overflow.

43 пари screenshots: 39 пар піксельно збігаються з порогом 2/255; 4 мають локальні розбіжності rasterization (87, 132, 2891, 108 пікселів). Геометрія і computed styles збігаються. Додатковий Chrome probe порівняв **усі** computed properties і bounding rects абзацу Articles та його предків — 0 відмінностей. Вимкнення LCD text/hinting прибрало розбіжність абзацу, залишивши лише 121 піксель іконки пошуку. Тому byte-for-byte ідентичність усіх PNG не заявляється; зміни дизайну/геометрії не виявлені.

Browser: Chrome 158.0.8127.36; чинні тести також використовують system Chromium. Firefox, Safari/WebKit і реальні мобільні пристрої в середовищі недоступні. Mobile emulation не прирівнюється до тесту реального Safari/Android.

Для стабільного порівняння CSS анімації завершені, infinite animations припинені в нульовій фазі, scroll/resize callbacks виконані. Різні localhost origins нормалізовані тільки у resolved asset URLs. Живий Firebase вимкнений лише в regression harness; comments fixture покриває auth/form/replies/admin/error/disabled CSS без читання чи запису живих коментарів. Production config не змінювався.

## Тести

| Перевірка | Результат |
|---|---|
| `npm run css:check` | PASS: 27 CSS/inline units, 0 errors/dead candidates |
| `npm run css:test` | PASS: 4 tests, включно з негативними fixtures |
| Design-polish static + link-policy + About static | PASS |
| Design-polish browser | PASS: 108 UA/EN cases, 9 widths |
| Design-polish flows | PASS: navigation, external/internal tabs, four-language headers, reduced motion, image layout shift |
| About profile browser | PASS: 14 scenarios |
| About hero intro | PASS: 14 scenarios, точні Home timings |
| 404 | PASS: 20 UA/EN viewport/JS cases |
| Search keyboard | PASS: 4 UA/EN desktop/mobile cases |
| Mobile pages | PASS: 24 scenarios |
| Blood cards / donor / news | PASS: 24 / 5 / 5 cases |
| S-Dose mobile hero | PASS: 12 cases |
| SEO build/check/test | PASS: 52 outputs, 16 articles; all 3 test files pass |
| Console/resources smoke | PASS: 44 cases, 0 console/page errors, missing resources, overflows |
| Source contract | PASS: no content/SEO/JS/media changes |
| `git diff --check` | PASS |
| Spanish four-locale `seo-landings.mjs` | **Pre-existing failure**: DE/ES menu at 1024–1200 px; same on baseline and cleanup |

Давній збій Spanish: CSS показує кнопку меню до 1200 px для DE/ES, а незмінений `js/navigation.js` дозволяє відкрити меню лише до 1023 px. [Вісім baseline/cleanup перевірок](pre-existing-spanish-menu.json) підтверджують однакову поведінку. Тест не послаблювався, JS не виправлявся: це окреме поведінкове завдання. Жодного нового test failure не виявлено. Firebase emulator/backend tests не входили в цей CSS pass і не запускалися.

## Навмисно збережені повтори

- 29 vendor properties: `-webkit-backdrop-filter`, mask/composite, font smoothing тощо.
- 5 progressive fallback blocks: 404 `overflow:hidden → clip`; S-Dose `vh → svh → dvh` і max-height viewport fallbacks.
- Однаковий селектор у різних media queries, scoped page modifiers і custom-property overrides.
- Home, About і Projects entry animations мають різні механізми/таймінги: scoped локально, без штучного об’єднання.
- HTML scroll-padding/reduced-motion у page CSS контролює документ конкретної сторінки й залишається локально завдяки stylesheet dependency.
- Два невеликі 404 noscript style blocks навмисно автономні; Blood/Dune залишаються ізольованими.

Повний машинний список vendor/fallbacks: [css-check.json](css-check.json).

## Відтворення

```bash
npm ci
# CHROME_PATH може вказувати на локальний Chrome; типовий executable — /usr/bin/chromium
npm run css:check
npm run css:test
node tools/css/version-assets.mjs
npm run seo:build
npm run seo:check
npm run seo:test
```

Для visual regression запустити reference checkout і cleanup checkout HTTP-серверами. Один і той самий `tools/css/visual-regression.mjs` запускається з `TEST_ORIGIN=<reference>` та аргументом `before`, потім з `TEST_ORIGIN=<cleanup>` та `after`. `CSS_AUDIT_WORK` задає спільну директорію snapshot JSON (типово `.private/css-architecture`); `CHROME_PATH` — браузер. Comments fixture слід скопіювати у reference checkout **з його первісним імпортом `/css/pages/about.css`**, оскільки до cleanup він постачав shared container/font styles. `--resume` і `CSS_ROUTES` дозволяють повторити вибрані маршрути.

## Screenshots до/після

| Стан | До | Після |
|---|---|---|
| policy-html-1440 | [before](screenshots/before/policy-html-1440.png) | [after](screenshots/after/policy-html-1440.png) |
| policy-html-390 | [before](screenshots/before/policy-html-390.png) | [after](screenshots/after/policy-html-390.png) |
| en-policy-en-html-1440 | [before](screenshots/before/en-policy-en-html-1440.png) | [after](screenshots/after/en-policy-en-html-1440.png) |
| en-policy-en-html-390 | [before](screenshots/before/en-policy-en-html-390.png) | [after](screenshots/after/en-policy-en-html-390.png) |
| tools-css-fixtures-comments-html-1440 | [before](screenshots/before/tools-css-fixtures-comments-html-1440.png) | [after](screenshots/after/tools-css-fixtures-comments-html-1440.png) |
| tools-css-fixtures-comments-html-390 | [before](screenshots/before/tools-css-fixtures-comments-html-390.png) | [after](screenshots/after/tools-css-fixtures-comments-html-390.png) |
| home-uk-1440 | [before](screenshots/before/home-uk-1440.png) | [after](screenshots/after/home-uk-1440.png) |
| home-uk-768 | [before](screenshots/before/home-uk-768.png) | [after](screenshots/after/home-uk-768.png) |
| home-uk-390 | [before](screenshots/before/home-uk-390.png) | [after](screenshots/after/home-uk-390.png) |
| en-index-en-html-1440 | [before](screenshots/before/en-index-en-html-1440.png) | [after](screenshots/after/en-index-en-html-1440.png) |
| en-index-en-html-390 | [before](screenshots/before/en-index-en-html-390.png) | [after](screenshots/after/en-index-en-html-390.png) |
| about-html-1440 | [before](screenshots/before/about-html-1440.png) | [after](screenshots/after/about-html-1440.png) |
| about-html-390 | [before](screenshots/before/about-html-390.png) | [after](screenshots/after/about-html-390.png) |
| en-about-en-html-1440 | [before](screenshots/before/en-about-en-html-1440.png) | [after](screenshots/after/en-about-en-html-1440.png) |
| en-about-en-html-390 | [before](screenshots/before/en-about-en-html-390.png) | [after](screenshots/after/en-about-en-html-390.png) |
| projects-html-1440 | [before](screenshots/before/projects-html-1440.png) | [after](screenshots/after/projects-html-1440.png) |
| projects-html-390 | [before](screenshots/before/projects-html-390.png) | [after](screenshots/after/projects-html-390.png) |
| en-projects-en-html-1440 | [before](screenshots/before/en-projects-en-html-1440.png) | [after](screenshots/after/en-projects-en-html-1440.png) |
| en-projects-en-html-390 | [before](screenshots/before/en-projects-en-html-390.png) | [after](screenshots/after/en-projects-en-html-390.png) |
| articles-html-1440 | [before](screenshots/before/articles-html-1440.png) | [after](screenshots/after/articles-html-1440.png) |
| articles-html-390 | [before](screenshots/before/articles-html-390.png) | [after](screenshots/after/articles-html-390.png) |
| en-articles-en-html-1440 | [before](screenshots/before/en-articles-en-html-1440.png) | [after](screenshots/after/en-articles-en-html-1440.png) |
| en-articles-en-html-390 | [before](screenshots/before/en-articles-en-html-390.png) | [after](screenshots/after/en-articles-en-html-390.png) |
| contact-html-1440 | [before](screenshots/before/contact-html-1440.png) | [after](screenshots/after/contact-html-1440.png) |
| contact-html-390 | [before](screenshots/before/contact-html-390.png) | [after](screenshots/after/contact-html-390.png) |
| en-contact-en-html-1440 | [before](screenshots/before/en-contact-en-html-1440.png) | [after](screenshots/after/en-contact-en-html-1440.png) |
| en-contact-en-html-390 | [before](screenshots/before/en-contact-en-html-390.png) | [after](screenshots/after/en-contact-en-html-390.png) |
| 404-html-1440 | [before](screenshots/before/404-html-1440.png) | [after](screenshots/after/404-html-1440.png) |
| 404-html-390 | [before](screenshots/before/404-html-390.png) | [after](screenshots/after/404-html-390.png) |
| en-404-html-1440 | [before](screenshots/before/en-404-html-1440.png) | [after](screenshots/after/en-404-html-1440.png) |
| en-404-html-390 | [before](screenshots/before/en-404-html-390.png) | [after](screenshots/after/en-404-html-390.png) |
| s-dose-html-1440 | [before](screenshots/before/s-dose-html-1440.png) | [after](screenshots/after/s-dose-html-1440.png) |
| s-dose-html-390 | [before](screenshots/before/s-dose-html-390.png) | [after](screenshots/after/s-dose-html-390.png) |
| en-s-dose-en-html-1440 | [before](screenshots/before/en-s-dose-en-html-1440.png) | [after](screenshots/after/en-s-dose-en-html-1440.png) |
| en-s-dose-en-html-390 | [before](screenshots/before/en-s-dose-en-html-390.png) | [after](screenshots/after/en-s-dose-en-html-390.png) |
| spanish-bot-html-1440 | [before](screenshots/before/spanish-bot-html-1440.png) | [after](screenshots/after/spanish-bot-html-1440.png) |
| spanish-bot-html-390 | [before](screenshots/before/spanish-bot-html-390.png) | [after](screenshots/after/spanish-bot-html-390.png) |
| en-spanish-bot-en-html-1440 | [before](screenshots/before/en-spanish-bot-en-html-1440.png) | [after](screenshots/after/en-spanish-bot-en-html-1440.png) |
| en-spanish-bot-en-html-390 | [before](screenshots/before/en-spanish-bot-en-html-390.png) | [after](screenshots/after/en-spanish-bot-en-html-390.png) |
| articles-npa-effectiveness-1440 | [before](screenshots/before/articles-npa-effectiveness-1440.png) | [after](screenshots/after/articles-npa-effectiveness-1440.png) |
| articles-npa-effectiveness-390 | [before](screenshots/before/articles-npa-effectiveness-390.png) | [after](screenshots/after/articles-npa-effectiveness-390.png) |
| en-articles-npa-effectiveness-1440 | [before](screenshots/before/en-articles-npa-effectiveness-1440.png) | [after](screenshots/after/en-articles-npa-effectiveness-1440.png) |
| en-articles-npa-effectiveness-390 | [before](screenshots/before/en-articles-npa-effectiveness-390.png) | [after](screenshots/after/en-articles-npa-effectiveness-390.png) |
