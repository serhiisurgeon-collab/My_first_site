# Результати локальної перевірки коментарів

## Видимість і надсилання — 04.10.2026

| Перевірка актуальної реалізації | Результат |
|---|---|
| `node --test --test-concurrency=1 tests/comments/*.test.mjs` | **PASS: 31/31**, 0 failed, 0 skipped |
| `node tools/comments/visibility-browser-check.cjs` | **PASS: 212 перевірок**, UA/EN, 1280/390/360 px |
| `node tools/comments/browser-check.cjs` | **PASS: 82/82**, регресійна перевірка UA/EN |
| Читання формату переданої реальної копії v1 новим валідатором | **PASS**, без записів; legacy enabled:false залишається прихованим |
| Нові Rules та режими у реальному Firebase-проєкті | **NOT RUN**: хмарні Rules і налаштування не змінювалися |

Перевірено: лише читання без форми/відповідей із точним повідомленням обома мовами; повне приховування публічного блоку; модерація адміністратором в обох режимах; звичайний користувач не отримує прав через commentsAdmin=1; приховування вимикає надсилання, відкриття не вмикає його; pending/hidden не публікуються від зміни режиму. Сервер відхиляє створення коментарів і відповідей у read-only/hidden, включно з прямими SDK-запитами; published залишається доступним через API.

Перевірено схеми settings 1/2, явну атомарну міграцію, заборону некоректних комбінацій та downgrade, резервні копії v1/v2, точне відновлення всіх записів режимів read-only/hidden, пагінацію 201 (100/100/1), пошкоджену копію, непорожню ціль і захист видаленого тексту. Експорт включає карту саме зареєстрованих статей. Браузерні перевірки використовують синтетичні дані й Auth Emulator, тому не підтверджують реальний Google OAuth або відновлення всієї хмари.

Порядок подальшого оновлення: `comments-visibility-update.md`. Залежності й lockfile в цій зміні не змінювалися; попередні результати audit нижче залишені з їхнім початковим контекстом.

Доповнено 04.10.2026 (Europe/Kyiv) у цьому хмарному середовищі. Результати не означають, що код або Firebase rules опубліковані. Production вимкнений. Production OAuth не перевірено. Перший Google-вхід у тестовому проєкті підтверджений власником окремо; це не автоматична браузерна перевірка цього середовища.

| Перевірка | Результат |
|---|---|
| `npm ci --ignore-scripts --cache /tmp/npm-comments-cache` | Успішне повторне встановлення з lockfile |
| `npm run comments:build` | Успішна локальна збірка modular SDK, без SDK CDN |
| `npm run comments:test` із чистим запуском Auth/Firestore Emulator | 14 / 14, 0 skipped, exit 0; емулятори коректно завершені |
| `node tools/comments/browser-check.cjs` | 82 / 82, exit 0; UA/EN, desktop 1280 і mobile 390/360 px |
| `node --check` нових модулів, `git diff --check` | Успішно |
| `npm audit --omit=dev --audit-level=high` | 0 вразливостей у production dependencies після сумісного override @grpc/grpc-js 1.14.5 |
| Повний `npm audit --audit-level=high` | Не пройшов: останній повторний audit 7 high / 9 moderate у транзитивних dev-залежностях Firebase CLI; вони не входять у браузерний SDK. Не заявляємо нуль вразливостей усіх інструментів. |

## Доповнення 04.10.2026

Команда `node --test --test-concurrency=1 tests/comments/*.test.mjs`: **18 / 18, 0 failed, 0 skipped, exit 0**, фінальний запуск 04.10.2026. Попередній чистий `comments:test` і 82 браузерні перевірки — результати 03.10, не видаються за повторний запуск нової процедури real recovery.

- 201 comments: фактичні сторінки **100 / 100 / 1**, порівняння всіх документів усіх визначених колекцій через deep equality після restore. Вхідний текст/UID/статус/timestamps/parent links збережені; конфлікт не перезаписаний.
- Обрив другого getDocs: timeout 12 s → DB client terminate; Promise експорту відхиляється, повної копії немає; control.frozen=true; старий client відхиляє подальші звернення. Новий client із тим самим owner UID → unfreeze → повний повторний export із 201 записом і нове pending надсилання працюють.
- Стару копію до видалення очищено новішим register, реально відновлено в emulator; всі документи збігаються, parent text/name порожні, replies/UID/timestamps/status лишаються. Apply CLI без deletion register відхиляється; із register та effective SHA-256 проходить без overwrite.
- 3 тести suppression: оригінал не мутується, missing/stale/identity mismatch fail closed, known deletion не зникає зі злитого реєстру.
- Auth emulator: Google-only JSON → той самий UID/google.com provider UID; profile поля перевірені; revoked account пропущений; imported account disabled; nonempty Auth target відхиляється. Це окремий синтетичний Auth dataset, не перевірений real OAuth або атомарний snapshot двох сервісів.
- `node tools/comments/bootstrap-check.cjs`: **PASS**, локальний bootstrap показує projectId й Firebase UID, login/logout через actual Auth Emulator popup, **0 Firestore requests**. Production config enabled:false збережено. Справжній Google OAuth ще pending.
- UA/EN home block: computed background **#143528**, 2 картки, без section overflow на 1280/390/360. Змінено тільки background і CSS cache-version у двох головних HTML; зображення-текстура не додавалася.

Детальні current advisory IDs/versions/paths — comments-cli-advisories.md. Реальна Spark recovery/quarantine/test-project процедура — comments-recovery.md. Публічну privacy policy, production, оплату й deployment не змінено.

## Що перевіряють Node-тести

4 тести формату резервної копії: точні seconds/nanoseconds без округлення, повнота/count, зв’язки батьків/статей, preview без мутацій, конфлікти/зайві документи, некоректні timestamps, зайві приватні поля та невідома колекція.

13 тестів Firestore Rules із реальними прямими emulator SDK-запитами:

- Анонімне читання published/deleted та обов’язковий limit; pending і приватні колекції недоступні стороннім.
- Підміна author UID/Google name, self-admin, фальшивий custom claim admin/role та неправильна роль у реєстрі — відхилені.
- Не-Google провайдер, зайвий email, неправильні типи/час/status, довгий/порожній текст, невідомий articleId — відхилені.
- Заблокований автор та enabled:false не можуть писати напряму.
- Відповідь до прихованого батька або іншої статті відхиляється; коректна дозволена.
- З двох одночасних надсилань прийняте одне; швидке наступне й batch із двома коментарями відхилені. Окремий запис без rate-пари відхиляється.
- Pre/post режим визначає початковий status на сервері.
- Модерація потребує парного audit; видалення тексту зберігає батьківський ID та відповіді; hard delete заборонений.
- Замок експорту забороняє записи автора й адміністратора; чужий адмін не може розблокувати або виконати необмежене читання.

1 інтеграційний тест: actual Firebase client API експортує 201 коментар із реєстром/блокуванням/налаштуваннями, звіряє серверні count, знімає замок, відновлює всі документи у другий чистий demo-проєкт і звіряє їх. Змінений існуючий запис залишається недоторканим і спричиняє відмову restore. Додатково перевірено soft delete через API. Node-тест використовує Node-реалізацію того самого Firebase SDK для транспорту; браузерний тест окремо завантажує готовий browser bundle.

Firestore при записі округлює timestamps до мікросекунд. Перевірка експорту порівнює точне збережене у базі значення, а тест серіалізації окремо перевіряє nanoseconds 123456789.

## Браузер

Chromium: UA/EN, 1280 × 900, 390 × 844, 360 × 844. Перевіряються спільний articleId, HTML як текст, відсутність виконуваного img, 20 записів першої сторінки, наступна сторінка з вкладеними відповідями до 3-го рівня, keyboard Enter/focus, скасування входу, форма/own pending, вихід, порожнє обговорення, rate limit, модераційні approve/hide/block/unblock, мобільна admin-панель, відсутність горизонтального скролу. Окремо — блокування всіх Firestore-запитів і штучний resource-exhausted: повідомлення лишається у comments, Markdown статті та мовна навігація працюють. Вимкнена конфігурація не завантажує Firebase SDK/не звертається до Firebase.

Основні responsive сценарії використовують підставлений транспорт входу із fake Google provider credentials Auth Emulator. Окремий сценарій перевіряє **справжній локальний popup Auth Emulator**, закриття popup, вибір Demo reader і вихід — без підміни signInWithPopup. Це не справжній Google OAuth.

У хмарному Chromium немає системного корпоративного TLS trust store; тестовий asset route завантажує Google helper/шрифти/Font Awesome через curl зі стандартною перевіркою TLS, потім віддає їх Chromium. Перевірка сертифікатів не вимикається. Статичні ресурси лишаються справжніми, код сайту не змінено. Google helper https://apis.google.com/js/api.js спочатку повертав 403, після оновлення мережевого дозволу перевірений HTTP 200. JAR https://storage.googleapis.com/firebase-preview-drop/emulator/cloud-firestore-emulator-v1.22.0.jar також успішно завантажений офіційним CLI. У конфігураційну чернетку додані storage.googleapis.com, firebase-public.firebaseio.com, apis.google.com, www.gstatic.com зі збереженням інших доменів; інструкції встановлення й запуску збережені окремо. Відновлення всього середовища у новій задачі не перевірялося.

## Залежності інструментів і межі

Повний audit повідомляє про basic-ftp/braces (high), uuid/@opentelemetry/core (moderate) та залежні Firebase CLI пакети. Автоматичний fix пропонує зміну major версій/несумісні заміни; він не застосований. Braces advisory охоплює доступні версії, тому не підставлено вигадану «виправлену» версію. Ці пакети використовуються локальним CLI, не потрапляють у browser SDK. Перед production-публікацією повторити аудит CLI й обрати актуальні виправлені версії/підтримуваний інструмент, не послаблюючи перевірки. Для поточних локальних сценаріїв використовуються довірені файли проєкту й loopback емулятори.

Залишаються окремими майбутніми перевірками: справжній Google OAuth, Spark-квоти та production composite indexes, фактичний погоджений регіон/retention, перенос реальних Auth UID/providerData. Емулятор не доводить ці властивості. Firestore restore CLI навмисно не підтримує production. Google-вхід і per-UID throttle не усувають спам із кількох акаунтів або вичерпання публічних read-квот.

## Змінені файли

- `article.html`, `en/article-en.html`: тільки підключення незалежного comments модуля/стилів до наявного блоку Discussion.
- `css/pages/comments.css`.
- `js/comments/{index.js,api.js,config.js,backup-format.js,restore-safety.js,sdk-entry.js,firebase-sdk.js,firebase-sdk.js.LEGAL.txt,package.json}`.
- `firebase/{article-map.json,firestore.rules,firestore.indexes.json}`, `firebase.json`.
- `package.json`, `package-lock.json`, `.gitignore`.
- `tests/comments/{rules.test.mjs,backup-format.test.mjs,integration.test.mjs,restore-safety.test.mjs,auth-recovery.test.mjs}`.
- `tools/comments/{local.mjs,seed.mjs,restore.mjs,browser-check.cjs,recovery-files.mjs,auth-recovery.mjs,bootstrap.html,bootstrap-check.cjs}`.
- `docs/comments-setup.md`, `docs/comments-privacy-draft.md`, `docs/comments-test-results.md`, `docs/comments-cli-advisories.md`, `docs/comments-recovery.md`.

Окремо змінено css/pages/home.css, index.html та en/index-en.html на прохання власника щодо кольору фону. Статті, каталоги, навігація та публічна privacy policy змістово не змінені. Приватні копії й service-account файли не створені у репозиторії. Реалізація підготовлена лише для review/comments-firestore; merge у main, Firebase deploy і GitHub Pages публікація модуля не виконуються.

## Перевірка перед review-комітом 04.10.2026

- Чотири додаткові direct SDK Rules-тести: точний permission-denied для другого paired запису до 60 секунд без API limiter; дозволений запис після відсунутого лише в emulator timestamp; missing rate pair і batch bypass; відповіді 1/2/3, depth4/missing parent/wrong depth/cross article; create/update/delete реєстру admins звичайним користувачем. Усі 13 Rules-тестів PASS.
- Повторно: 82 браузерні перевірки на чинних article.html та en/article-en.html PASS. Додатково 19 перевірок serve-local.py: UA/EN a-0001, перемикання мови без opt-in параметра, читабельність/overflow на 1280/390/360 PASS. Це емуляторні перевірки.
- Передана власником Firestore-only копія test project: формат v1, 5 comments/11 документів. SHA-256 проти manifest PASS; штатний comments:restore у новий порожній demo-проєкт PASS; deep equality всіх документів/полів/типів/timestamps PASS, 0 розбіжностей. Перший deletion register підтверджений власником; один hidden запис із очищеними text/name не відновив текст. enabled:false, control.frozen:false/ownerUid:null. Повторний apply у непорожню ціль і пошкоджений count відхилені. Копія/manifest/register/персональні UID/імена/контрольні суми приватних файлів не включені в Git.
- Ця перевірка не є відновленням реального Firebase Auth або всієї хмари. Реальна UI-перевірка статей із test project, реальні quota/index/OAuth recovery та production — NOT RUN.
- cli restore тепер вимагає явний loopback endpoint та нову порожню ціль; конфлікти, зайві й уже наявні ідентичні дані не перезаписуються.

Фінальний повторний запуск перед review-комітом: `node --test --test-concurrency=1 tests/comments/*.test.mjs` — **22 / 22, 0 failed, 0 skipped, exit 0**. Збірка comments:build PASS. Поточний повний audit — 7 high / 9 moderate через ті самі 4 кореневі advisory; production-only — 0. Раніші audit counts є історичними результатами.
