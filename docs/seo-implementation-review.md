# SEO-оновлення: технічний звіт для перегляду

Дата перевірки: 6 жовтня 2026 року. Гілка: `review/seo-static-articles`.
База: `02cc821745cfaf0b1cfdd1a5dca0fa68a108bf58`. Початковий каталог був чистий. Початковий main був 82055aa93881a4d1bb35bd0db34def1f752f2818; під час фінальної звірки три нові upstream-коміти NPA збережено, review-гілку без push переведено на актуальний 02cc821745cfaf0b1cfdd1a5dca0fa68a108bf58. Локальний main залишився на початковому commit.
Push, merge, deploy, DNS, Search Console та зміни Firebase не виконувалися.

## Що готово

- Десять фізичних HTML-сторінок із Markdown/JSON. H1, текст, автор, дати, джерела, ілюстрації, зміст, навігація й SEO доступні без JavaScript.
- Змінені CSS/JS підключаються з версіями за вмістом; main імпортує актуальні search/link modules, щоб старий кеш не порушував маршрути чи обговорення.
- Один canonical та узгоджені title/description, uk/en hreflang, Open Graph і Article JSON-LD. author.url веде на відповідну сторінку автора; дати не замінено SEO-датою.
- Статичні метадані дванадцяти основних UA/EN-сторінок. Українська головна канонічна на `/`; `/index.html` є її дублем із таким самим canonical.
- Реальні href у каталозі, останніх матеріалах, мовних перемикачах, пагінації та пов’язаних матеріалах. Фільтри й пошук використовують кінцеві маршрути.
- sitemap із 24 канонічними адресами, зокрема всіма десятьма мовними статтями. robots посилається на sitemap, не блокує статті чи ресурси. lastmod опущено, бо немає окремо підтверджених дат суттєвого оновлення кожної сторінки.
- S-Dose зберігає поточний noindex,nofollow і не включається до sitemap.
- Явна карта legacy/aliases, без довільних зовнішніх цілей. Збережено hash та commentsAdmin=1.
- Модуль коментарів отримує slug із статичного документа, перевіряє його за чинною article-map та використовує ті самі articleId. Змінено лише визначення маршруту; API, Rules, Auth і дані не змінювалися.

## Стара → нова карта адрес

| articleId | Старі UA / EN | Нові UA / EN |
|---|---|---|
| a-0001 | `/article.html?article=how-kaolin-works` / `/en/article-en.html?article=how-kaolin-works-en` | `/articles/how-kaolin-works/` / `/en/articles/how-kaolin-works/` |
| a-0002 | `/article.html?article=group-medical-bag` / `/en/article-en.html?article=group-medical-bag` | `/articles/group-medical-bag/` / `/en/articles/group-medical-bag/` |
| a-0003 | `/article.html?article=hospital-capabilities` / `/en/article-en.html?article=hospital-capabilities` | `/articles/hospital-capabilities/` / `/en/articles/hospital-capabilities/` |
| a-0004 | `/article.html?article=medical-app-without-internet` / `/en/article-en.html?article=medical-app-without-internet` | `/articles/medical-app-without-internet/` / `/en/articles/medical-app-without-internet/` |
| a-0005 | `/article.html?article=npa-effectiveness` / `/en/article-en.html?article=npa-effectiveness` | `/articles/npa-effectiveness/` / `/en/articles/npa-effectiveness/` |

У реєстрі також зафіксовано чинні `/2d_try.html` → `/project/2d_try.html` та `/project_blood/blood_html.html` → `/project/project_blood/blood_html.html`. Їхню реалізацію не змінено; самі aliases не включені до sitemap.

Alias `how-kaolin-works-en` збережено; обидва legacy-шаблони також приймають спільний slug `how-kaolin-works`. Повний машинний реєстр — `tools/seo/url-registry.json`, карта для браузера — `data/article-routes.json`.

**Семантика:** `includeInSitemap: false` означає лише виключення з sitemap. Чинні legacy query-сторінки не мають початкового noindex і не блокуються robots. Це не твердження про фактичну індексацію Google.

Legacy-перехід є JavaScript-перенаправленням, не HTTP 301. Без JS показується нейтральний список п’яти відповідних мовних матеріалів. Для невідомого чи порожнього article-параметра JS встановлює noindex лише у виявленому помилковому стані, без чужих дат, тексту чи Article JSON-LD. Фізичний legacy-файл залишається HTTP 200. Без JS сервер Pages не може розрізнити query-параметри — це чесно збережене обмеження.

## Генерація та Pages

Генератор — `tools/seo/build.mjs`; медичні тексти не редагувалися. Залежності зафіксовані точними версіями та package-lock.json. Генератор санітизує HTML і не використовує параметри URL для читання локальних файлів.

Згенеровані файли зберігаються у Git. `npm run seo:check` повторно обчислює результати без записів та відхиляє застарілий HTML/метадані/зображення/карти/sitemap. Збірка зупиняється при дубльованих slug/articleId, конфліктній мовній парі, відсутньому Markdown або зображенні. Повторна збірка без зміни джерел перевірена.

Публікація залишається legacy GitHub Pages із кореня main. Немає нового workflow, зміни Actions permissions або іншого хостингу. Jekyll копіює готові сторінки; Node-генерація виконується перед погодженим комітом.

Локально перевірено саме результат Jekyll 3.10.0 / github-pages 232, офіційний контейнер із фіксованим digest. У результаті є десять `articles/<slug>/index.html` / `en/articles/<slug>/index.html`; інструменти, тести, документація, приватні каталоги, Rules, службові manifests і ключі відсутні. Аудит перевірив 191 файл публічної збірки. Публічний Firebase Web SDK config є штатною конфігурацією клієнта, не service-account key.

## Перевірки

| Перевірка | Результат / межі |
|---|---|
| Автоматичні SEO-тести | PASS, 18/18; також на результаті Jekyll |
| Повний авторський текст | PASS: нормалізований текст статичного HTML звірений із санітизованим Markdown; дати редакції обробляються як у чинному шаблоні |
| Canonical, reciprocal/self hreflang, JSON-LD, дати, автор | PASS, усі десять мовних статей і основні сторінки |
| Навігація, внутрішні файли, sitemap/robots | PASS; усі внутрішні ресурси канонічних сторінок присутні після Jekyll |
| Браузерні сценарії | PASS, 67: десять сторінок без JS, desktop/390/360 із JS, aliases, помилки, параметри, фільтри, меню, пошук, недоступний Firebase |
| Клавіатура та реальне перемикання UA/EN | PASS, 4 додаткові сценарії; Enter відкриває native href, перемикач зберігає articleId, commentsAdmin та існуючий source-anchor |
| Коментарі | PASS у mock API: одне створення API та один запит гілки з чинним articleId; реальна хмара/Google-вхід NOT RUN |
| Регресійні unit-тести налаштувань і резервування | PASS, 10/10; схема/Rules/експорт не змінені |
| Зображення | PASS, 15 lossless WebP: рівність усіх RGBA-пікселів і розмірів; оригінали збережені |
| Публічний артефакт | PASS, 191 файл; без інструментів, приватних копій, реєстрів видалень та secret-key material |
| Помилкові фізичні адреси | PASS: реальний HTTP 404 для UA/EN контрольних відсутніх каталогів на живому Pages; також локальний HTTP 404 після Jekyll |
| HTTP нових канонічних сторінок на живому сайті | NOT RUN після публікації: оновлення ще не опубліковано; локально сторінки доступні |
| Статуси всіх зовнішніх медичних джерел | NOT RUN повністю; URL та текст джерел збережені, ця перевірка не доводить доступність кожного зовнішнього сервера |
| Search Console / фактична індексація | NOT RUN: немає даних акаунта; висновок про індексацію не зроблено |
| Lighthouse / польові CWV | NOT RUN; наведені нижче вимірювання — окрема локальна лабораторія, не Lighthouse і не CrUX |

У браузерних тестах використано Chromium, масштаб 100%, deviceScaleFactor=1. CSS/шрифти отримано через TLS-перевірений curl і передано браузеру; TLS-перевірку не вимикали. Коментарі ізольовані mock API; жодних публічних тестових коментарів не створено. На 360/390 горизонтального прокручування не виявлено. Скриншоти зроблені після завантаження зображень; header-crops не масштабовані.

## Ілюстрації та лабораторне порівняння

17 унікальних вихідних файлів ілюстрацій: 28 097 839 → 19 565 714 байт, приблизно −30%. П’ятнадцять варіантів менші за оригінали; два невигідні lossless-перетворення не використовуються. Роздільність не зменшувалася; усі width/height вказані, нижні ілюстрації lazy, перші ранні ілюстрації сумки/каоліну eager. Srcset не потрібен для поточного lossless варіанта тієї самої роздільності.

Деталі, стрілки й кольори збережені піксельно. На вузькому екрані дрібні написи великої анатомічної схеми потребують збільшення; у NPA залишено посилання на повнорозмірний оригінал. Зображення не перекладалися й не перемальовувалися.

Лабораторія: однаковий Chromium, свіжі контексти, 1280/390/360 × 900, той самий набір шрифтів, без CPU/network throttling. Вага — сума body відповідей після завантаження всіх ілюстрацій, не compressed transferSize. CLS — сесійне вікно initial viewport до прокручування. Джерело до: Jekyll-збірка базового commit; після: поточний Jekyll-результат. Не є польовими LCP/INP/CLS і не прогнозує ранжування.

| Матеріал / мова / ширина | Вага до → після, KiB | Initial viewport lab CLS до → після |
|---|---|---|
| npa-effectiveness / uk / 1280 | 5575 → 3987 | 0.142 → 0.011 |
| group-medical-bag / uk / 1280 | 9590 → 7119 | 0.267 → 0.003 |
| npa-effectiveness / en / 1280 | 5461 → 3934 | 0.102 → 0.002 |
| group-medical-bag / en / 1280 | 9656 → 7201 | 0.194 → 0.004 |
| npa-effectiveness / uk / 390 | 5575 → 3987 | 0.194 → 0.037 |
| group-medical-bag / uk / 390 | 9590 → 7119 | 0.168 → 0.035 |
| npa-effectiveness / en / 390 | 5461 → 3934 | 0.165 → 0.012 |
| group-medical-bag / en / 390 | 9656 → 7201 | 0.192 → 0.003 |
| npa-effectiveness / uk / 360 | 5575 → 3987 | 0.192 → 0.018 |
| group-medical-bag / uk / 360 | 9590 → 7119 | 0.153 → 0.002 |
| npa-effectiveness / en / 360 | 5461 → 3934 | 0.152 → 0.001 |
| group-medical-bag / en / 360 | 9656 → 7201 | 0.141 → 0.000 |

Повні машинні результати: `/workspace/artifacts/seo-static-review/lab-comparison.json` та `browser-results.json`.

## Невиконані мовні заміни та окремі рішення

У EN-матеріалі про сумку збережені три українські ілюстрації. Потрібні погоджені англомовні заміни:

- `content/articles/uk/image/moreIFAK.png` — початкова ілюстрація IFAK/групового оснащення, EN Markdown рядок 7.
- `content/articles/uk/image/CSL_bag_ex1.png` — приклад сумки, EN Markdown рядок 64.
- `content/articles/uk/image/tree_bags.png` — три різні сумки/завдання, EN Markdown рядок 273.

`CSL-bag-ex2.png` уже використовує EN-каталог. До погодження замін медичний зміст цих ілюстрацій збережено. Окремі пропозиції назв є в `docs/seo-title-proposals.md`, не застосовані.

## Скриншоти 100%

| Стаття / мова | Desktop 1280 | 390 | 360 |
|---|---|---|
| how-kaolin-works / uk | [Заголовок](/workspace/artifacts/seo-static-review/uk-how-kaolin-works-1280-header.png), [повна сторінка](/workspace/artifacts/seo-static-review/uk-how-kaolin-works-1280.png) | [Заголовок](/workspace/artifacts/seo-static-review/uk-how-kaolin-works-390-header.png), [повна сторінка](/workspace/artifacts/seo-static-review/uk-how-kaolin-works-390.png) | [Заголовок](/workspace/artifacts/seo-static-review/uk-how-kaolin-works-360-header.png), [повна сторінка](/workspace/artifacts/seo-static-review/uk-how-kaolin-works-360.png) |
| how-kaolin-works / en | [Заголовок](/workspace/artifacts/seo-static-review/en-how-kaolin-works-1280-header.png), [повна сторінка](/workspace/artifacts/seo-static-review/en-how-kaolin-works-1280.png) | [Заголовок](/workspace/artifacts/seo-static-review/en-how-kaolin-works-390-header.png), [повна сторінка](/workspace/artifacts/seo-static-review/en-how-kaolin-works-390.png) | [Заголовок](/workspace/artifacts/seo-static-review/en-how-kaolin-works-360-header.png), [повна сторінка](/workspace/artifacts/seo-static-review/en-how-kaolin-works-360.png) |
| group-medical-bag / uk | [Заголовок](/workspace/artifacts/seo-static-review/uk-group-medical-bag-1280-header.png), [повна сторінка](/workspace/artifacts/seo-static-review/uk-group-medical-bag-1280.png) | [Заголовок](/workspace/artifacts/seo-static-review/uk-group-medical-bag-390-header.png), [повна сторінка](/workspace/artifacts/seo-static-review/uk-group-medical-bag-390.png) | [Заголовок](/workspace/artifacts/seo-static-review/uk-group-medical-bag-360-header.png), [повна сторінка](/workspace/artifacts/seo-static-review/uk-group-medical-bag-360.png) |
| group-medical-bag / en | [Заголовок](/workspace/artifacts/seo-static-review/en-group-medical-bag-1280-header.png), [повна сторінка](/workspace/artifacts/seo-static-review/en-group-medical-bag-1280.png) | [Заголовок](/workspace/artifacts/seo-static-review/en-group-medical-bag-390-header.png), [повна сторінка](/workspace/artifacts/seo-static-review/en-group-medical-bag-390.png) | [Заголовок](/workspace/artifacts/seo-static-review/en-group-medical-bag-360-header.png), [повна сторінка](/workspace/artifacts/seo-static-review/en-group-medical-bag-360.png) |
| hospital-capabilities / uk | [Заголовок](/workspace/artifacts/seo-static-review/uk-hospital-capabilities-1280-header.png), [повна сторінка](/workspace/artifacts/seo-static-review/uk-hospital-capabilities-1280.png) | [Заголовок](/workspace/artifacts/seo-static-review/uk-hospital-capabilities-390-header.png), [повна сторінка](/workspace/artifacts/seo-static-review/uk-hospital-capabilities-390.png) | [Заголовок](/workspace/artifacts/seo-static-review/uk-hospital-capabilities-360-header.png), [повна сторінка](/workspace/artifacts/seo-static-review/uk-hospital-capabilities-360.png) |
| hospital-capabilities / en | [Заголовок](/workspace/artifacts/seo-static-review/en-hospital-capabilities-1280-header.png), [повна сторінка](/workspace/artifacts/seo-static-review/en-hospital-capabilities-1280.png) | [Заголовок](/workspace/artifacts/seo-static-review/en-hospital-capabilities-390-header.png), [повна сторінка](/workspace/artifacts/seo-static-review/en-hospital-capabilities-390.png) | [Заголовок](/workspace/artifacts/seo-static-review/en-hospital-capabilities-360-header.png), [повна сторінка](/workspace/artifacts/seo-static-review/en-hospital-capabilities-360.png) |
| medical-app-without-internet / uk | [Заголовок](/workspace/artifacts/seo-static-review/uk-medical-app-without-internet-1280-header.png), [повна сторінка](/workspace/artifacts/seo-static-review/uk-medical-app-without-internet-1280.png) | [Заголовок](/workspace/artifacts/seo-static-review/uk-medical-app-without-internet-390-header.png), [повна сторінка](/workspace/artifacts/seo-static-review/uk-medical-app-without-internet-390.png) | [Заголовок](/workspace/artifacts/seo-static-review/uk-medical-app-without-internet-360-header.png), [повна сторінка](/workspace/artifacts/seo-static-review/uk-medical-app-without-internet-360.png) |
| medical-app-without-internet / en | [Заголовок](/workspace/artifacts/seo-static-review/en-medical-app-without-internet-1280-header.png), [повна сторінка](/workspace/artifacts/seo-static-review/en-medical-app-without-internet-1280.png) | [Заголовок](/workspace/artifacts/seo-static-review/en-medical-app-without-internet-390-header.png), [повна сторінка](/workspace/artifacts/seo-static-review/en-medical-app-without-internet-390.png) | [Заголовок](/workspace/artifacts/seo-static-review/en-medical-app-without-internet-360-header.png), [повна сторінка](/workspace/artifacts/seo-static-review/en-medical-app-without-internet-360.png) |
| npa-effectiveness / uk | [Заголовок](/workspace/artifacts/seo-static-review/uk-npa-effectiveness-1280-header.png), [повна сторінка](/workspace/artifacts/seo-static-review/uk-npa-effectiveness-1280.png) | [Заголовок](/workspace/artifacts/seo-static-review/uk-npa-effectiveness-390-header.png), [повна сторінка](/workspace/artifacts/seo-static-review/uk-npa-effectiveness-390.png) | [Заголовок](/workspace/artifacts/seo-static-review/uk-npa-effectiveness-360-header.png), [повна сторінка](/workspace/artifacts/seo-static-review/uk-npa-effectiveness-360.png) |
| npa-effectiveness / en | [Заголовок](/workspace/artifacts/seo-static-review/en-npa-effectiveness-1280-header.png), [повна сторінка](/workspace/artifacts/seo-static-review/en-npa-effectiveness-1280.png) | [Заголовок](/workspace/artifacts/seo-static-review/en-npa-effectiveness-390-header.png), [повна сторінка](/workspace/artifacts/seo-static-review/en-npa-effectiveness-390.png) | [Заголовок](/workspace/artifacts/seo-static-review/en-npa-effectiveness-360-header.png), [повна сторінка](/workspace/artifacts/seo-static-review/en-npa-effectiveness-360.png) |

## Змінені файли й порядок застосування

Повний точний список — `docs/seo-changed-files.txt`. Основні групи: десять статичних статей, дванадцять основних сторінок, два legacy-шаблони; генератор/шаблони/перевірки; оптимізовані ілюстрації; sitemap/robots/route-map; CSS із збереженням вигляду після семантичної заміни H4 → H3; мінімальні зміни search/catalog/link handling та визначення slug для коментарів. HTML зберігає чинну шапку, підвал, палітру й типографіку.

1. Власник переглядає результати й надає окреме погодження публікації.
2. Повторити команди build/check/test/Jekyll/public-check, перевірити diff та включити згенеровані файли разом із джерелами. Не включати `.private` чи screenshots/reports у публічний результат.
3. Лише після погодження — commit/merge/push за чинним процесом main/Pages. Без DNS, Search Console або Firebase змін.
4. Після Pages — перевірити HTTP/метадані всіх 24 sitemap-адрес, legacy-переходи й фактичний 404 контрольних відсутніх адрес. Перевірити живе читання наявних обговорень без тестових записів.
5. За потреби відкат лише змін сайту. Якщо нові URL уже опубліковані, зберегти їхні готові HTML або мовні fallback-переходи без циклів. Firestore не відновлювати і не перезаписувати.

Точні команди, додавання наступної статті й відкат — `docs/seo-static-generation.md`. Чернетку install_script/start_skill середовища збережено окремо; її застосування потребує перегляду/збереження та публікації саме середовища в його налаштуваннях, не сайту. Це не виконано автоматично й не змінює GitHub Pages.
