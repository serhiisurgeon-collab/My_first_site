# Коментарі: локальна перевірка та підготовка запуску

Статус: підготовка до перегляду. Production вимкнений у `js/comments/config.js`. Жоден реальний Firebase-проєкт не створено або змінено; правила не опубліковані. Пропозиція для запуску — попередня модерація (`pre`); остаточний режим потребує погодження власника.

## Локальний запуск

Потрібні Node 24, Java 21, Chromium для браузерних тестів. Наявний статичний сайт не потребує Node у production.

```bash
cd /workspace/My_first_site
npm ci --ignore-scripts --cache /tmp/npm-comments-cache
npm run comments:build
XDG_CONFIG_HOME=/tmp/firebase-comments-config FIREBASE_EMULATORS_PATH=/tmp/firebase-comments-emulators npm run comments:emulators
```

В іншому терміналі:

```bash
cd /workspace/My_first_site
npm run comments:seed
python3 -m http.server 8030 --bind 127.0.0.1
```

Демонстрація:

- UA: `http://127.0.0.1:8030/article.html?article=how-kaolin-works&commentsEmulator=1`
- EN: `http://127.0.0.1:8030/en/article-en.html?article=how-kaolin-works-en&commentsEmulator=1`

Google popup емулятора дозволяє вибрати Demo reader / Demo admin; для допоміжного SDK-файлу потрібен доступ до apis.google.com. Це штучні локальні облікові записи, не перевірка справжнього Google OAuth. Параметр увімкнення працює лише на localhost/127.0.0.1. Без нього модуль вимкнений і не завантажує Firebase SDK. Повторний seed перезаписує відомі демонстраційні записи, а не очищає всю базу. Не застосовувати до справжніх даних.

Тести при вже запущених емуляторах:

```bash
node --test --test-concurrency=1 tests/comments/*.test.mjs
node tools/comments/browser-check.cjs
```

Або `npm run comments:test` сам запускає й завершує емулятори; спочатку зупиніть уже запущені. Браузерна перевірка очікує статичний сервер на 8030 і емулятори. Вона очищає лише локальний demo-serhii-comments, а потім створює свіжі демонстраційні дані, тому запускати її після Node-тестів. Не зберігайте важливі локальні коментарі в цьому тестовому проєкті. Скриншоти створюються поза репозиторієм, у `/tmp/comments-review`. Playwright використовує системний Chromium (або CHROMIUM_PATH). У хмарному браузері зовнішні статичні Google/Font Awesome файли завантажуються тестовим маршрутом через curl із чинною TLS-перевіркою через системний trust store; TLS-перевірку не вимикаємо. Це тестовий адаптер середовища, не зміна production-запитів. Marked кешується у /tmp, за потреби завантажується з чинного CDN сайту; можна задати COMMENTS_MARKED_PATH. Частина сценаріїв використовує підставлені емуляторні credentials; окремо перевіряються справжній popup Auth Emulator, закриття й вихід.


## Перший справжній Google-вхід, поки публічний модуль вимкнений

Цей порядок виконувати тільки після погодження **окремого тестового Spark-проєкту**. Публічний js/comments/config.js не змінюється. Bootstrap не читає Firestore, не призначає адміністратора й не вмикає коментарі.

1. У test project увімкнути Google Sign-In, погоджений support email, зареєструвати Web App; додати **localhost** до Authentication → Settings → Authorized domains. Не припускати, що localhost уже є: нові проєкти можуть його не додавати автоматично. Використовувати саме localhost у браузері, а не непогоджений інший hostname.
2. Підготувати локальну папку поза checkout:

```bash
mkdir -p /tmp/comments-bootstrap
cp tools/comments/bootstrap.html /tmp/comments-bootstrap/index.html
cp js/comments/firebase-sdk.js /tmp/comments-bootstrap/firebase-sdk.js
cp js/comments/firebase-sdk.js.LEGAL.txt /tmp/comments-bootstrap/firebase-sdk.js.LEGAL.txt
```

3. Локально створити /tmp/comments-bootstrap/firebase-web-config.json із **публічною web config саме test project** з Console: apiKey, authDomain, projectId, appId та інші видані поля. Не додавати authEmulatorUrl для справжнього Google-входу. OAuth client secret/service-account/private key тут не потрібні й заборонені. Конфігурацію не надсилати з секретами в чат.
4. Запустити:

```bash
python3 -m http.server 8131 --bind 127.0.0.1 --directory /tmp/comments-bootstrap
```

5. На власній машині відкрити http://localhost:8131, звірити показаний projectId, натиснути «Увійти через Google», вибрати погоджений акаунт. Cloud localhost не є зовнішнім preview: якщо перевірка виконується на машині власника, сервер запускається на ній. Popup має завершитися, сторінка покаже **Firebase Authentication UID**. Вхід створює Auth user лише у вибраному test project, без Firestore записів.
6. У Console **цього ж projectId** → Authentication → Users знайти обліковий запис, звірити UID. Не використовувати email, Google sub/provider UID чи UID іншого Firebase-проєкту.
7. Через Console створити Firestore admins/{цей UID} з полем role:"admin". SDK bootstrap не може самопризначити права; private registry лишається захищеним. Після цього вийти з bootstrap.
8. Для comments test integration використовувати копію статичного сайту поза production і web config цього самого test project, approved rules/indexes та synthetic дані. Після повторного Google-входу перевірити той самий UID і isAdmin. Вмикати comments лише у цій копії; публічний module enabled:false не міняти. Політика pre/post потребує погодження.
9. Для майбутнього production-проєкту цей порядок і UID-отримання повторюються **тільки після окремого дозволу**. Test UID не переносити довільно у production admins. При recovery imported Auth UID/provider mapping спочатку відновити, потім виконати Google-вхід; не створювати новий UID перед Auth import.

Bootstrap helper працює лише на loopback і не завантажує конфігурацію/SDK на публічному hostname. Перед подальшою перевіркою Google OAuth звірити мережеві запити та дозволені домени.

## Дані й доступ

Незмінні IDs у `firebase/article-map.json`:

| ID | Стаття | UA/EN |
|---|---|---|
| a-0001 | Каолін | how-kaolin-works / how-kaolin-works-en |
| a-0002 | Групова медична сумка | group-medical-bag |
| a-0003 | Спроможності лікарень | hospital-capabilities |
| a-0004 | Застосунок без інтернету | medical-app-without-internet |

Зміна заголовка/URL не змінює ID. При перейменуванні збережіть старий slug у aliases та оновіть реєстр Firestore. Новим статтям надавайте нові IDs, старі не перевикористовуйте. Зовнішні публікації не отримують внутрішнього обговорення.

`comments`: articleId, authorUid, authorName, text, parentId, depth, status, createdAt, updatedAt. Email відсутній. Статуси published/deleted читаються публічно; pending/hidden — автором або адміністратором. Deleted — порожній текст та ім’я зі збереженими ID і зв’язками. Власні очікувані записи показуються окремо; приховані автор може прочитати прямим власним запитом, але вони не показуються у публічній стрічці. Відповіді — до трьох рівнів, тільки на published-коментар своєї статті. Після приховування батька публічні відповіді лишаються, показуючи нейтральний заповнювач.

`admins`: закритий реєстр UID, клієнт не може його змінювати. `moderation`: остання адміністративна дія над кожним коментарем (не повний журнал). `blockedUsers`: приватні блокування, користувач може перевірити лише власне. `rateLimits`: атомарна пара з новим коментарем; 60 секунд між записами одного UID. Паралельний і пакетний обхід перевірено правилами. `articles`: публічна карта slug/aliases. `settings/comments`: enabled, moderationMode pre/post, schemaVersion 1. `control/state`: приватний замок експорту, frozen і ownerUid.

Публічна пагінація: 20 записів на запит, наступна сторінка тільки за кнопкою; жодних realtime-підписок на коментарі. Адміністративні списки також сторінками. Таймаут запиту 12 секунд завершує Firestore-клієнт, щоб не залишати нескінченні повтори; після помилки потрібне перезавантаження. Транзакція має максимум три спроби. При невизначеному результаті надсилання спочатку перевірте власні записи, щоб не створити дубль.

## Резервування та відновлення

Увійдіть адміністратором → «Експортувати приватну JSON-копію». Експорт тимчасово блокує записи всіх користувачів та модерацію, читає всі визначені колекції сторінками по 100, звіряє кількість серверним count, перевіряє схему та тільки тоді завантажує файл. Незалежне trusted Admin SDK/Console може обійти rules: під час експорту не запускайте такі записи. Повної копії при помилці не пропонують. Якщо мережа обірвалася, замок може залишитися: той самий адміністратор після відновлення зв’язку натискає «Зняти блокування незавершеного експорту». Інший адміністратор не може зняти його клієнтським запитом. При втраті цього акаунта потрібне контрольоване розблокування власником через Console, коли експорт точно припинився.

Файл містить також pending/hidden, UID, блокування, права адміністратора, карту статей, зв’язки, точні seconds/nanoseconds, версію схеми. Firestore зберігає timestamps з мікросекундною точністю; формат не округлює значення, які повернула база. Операційний замок у копії нормалізується до початкового unlocked стану.

Зберігайте копію **приватно поза публічним репозиторієм**, бажано у зашифрованому сховищі із резервною приватною копією. `.gitignore` — додатковий захист, не гарантія приватності. Експорт ручний, не автоматичний. Пропонований графік: щотижня, перед зміною rules/схеми та після значної модерації; щомісяця перевіряти відновлення в ізольованому емуляторі. Строк зберігання копій слід погодити у політиці.

Перегляд відновлення (лише локальні demo-* проєкти):

```bash
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 COMMENTS_RESTORE_PROJECT=demo-serhii-comments-restored npm run comments:restore -- /private/path/backup.json --deletion-register /private/path/current-deletions.json
```

Перед restore створіть актуальний реєстр видалень за comments-recovery.md. CLI без --deletion-register дозволяє лише preview, apply відхиляється. Команда показує source/register/effective SHA-256 і create/unchanged/conflicts/extra, не змінюючи базу. Після перевірки звіту:

```bash
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 COMMENTS_RESTORE_PROJECT=demo-serhii-comments-restored npm run comments:restore -- /private/path/backup.json --deletion-register /private/path/current-deletions.json --apply --confirm-emulator-restore --sha256 EFFECTIVE_SHA256_FROM_PREVIEW
```

Конфлікти чи зайві документи зупиняють відновлення. Існуючі записи не перезаписуються: використовується create. Відновлення багатьох документів не є однією атомарною транзакцією; після збою можливий частковий стан, повторний preview виявить уже створені записи, після чого операцію можна продовжити. Неповний/пошкоджений файл відхиляється, ліміт файлу 10 MiB. Наприкінці звіряються всі документи. Production-проєкти й зовнішні хости інструмент навмисно відхиляє. Відновлення реальних даних потребує окремого погодження та довіреного середовища; не завантажуйте ключі в GitHub або чат.

**Firebase Auth резервується окремо.** Рекомендована процедура для Google-only — exportGoogleAuth/importGoogleAuthQuarantined з tools/comments/auth-recovery.mjs у довіреному Admin SDK процесі після погодження, без Firebase CLI. Canonical JSON цього helper не тотожний firebase auth:export. Firestore-копія не містить Auth-акаунтів/provider mappings. UID та google.com provider UID мають зберегтися; токени й старі сесії не відновлюються. Imported users залишаються disabled до перевірки, revokedUids не імпортуються, existing target спричиняє відмову без overwrite. Password/інші провайдери потребують окремої процедури, Google-only helper їх не відкидає мовчки. Детальний quarantine/preview/apply/verification план — у comments-recovery.md. В емуляторі перевірено Auth UID/provider recovery; реальні Auth/OAuth ще не перевірені.

## Покроково: реальний Spark тільки після погодження

1. У власному Firebase Console створіть проєкт на **Spark**, без додавання billing account. Не обирайте Blaze, Cloud Functions або managed export. Заздалегідь погодьте назву/ID і регіон.
2. Створіть Cloud Firestore Standard у production mode. Оберіть європейський регіон, придатний до вимог зберігання даних та затримки для аудиторії; перевірте доступність у Console. Регіон бази потім не перемикається простим налаштуванням. Остаточний вибір робить власник перед створенням.
3. Authentication → Sign-in method → Google → Enable. Укажіть дозволену Console назву й support email. Не додавайте інших провайдерів без потреби.
4. Authentication → Settings → Authorized domains: `serhiipelishenko.com`; `www.serhiipelishenko.com` лише якщо сайт фактично використовує цей hostname; localhost лише для погодженої локальної перевірки. Залиште необхідний стандартний auth domain проєкту. Не додавайте сторонні домени.
5. Register Web App без Firebase Hosting/analytics. Скопіюйте лише публічну web config у локально підготовлений config.js; це не OAuth client secret. Поки залишайте enabled:false. Firebase appId/authDomain/apiKey/projectId беріть із Console, не вигадуйте. Приватні ключі не надсилати в чат.
6. Через Console підготуйте `articles/{id}` із карти, `settings/comments` (enabled:true, moderationMode:pre — якщо погоджено, schemaVersion:1), `control/state` (frozen:false, ownerUid:null). Seed CLI для production не використовувати.
7. Власник входить через Google на окремо погодженій тестовій інтеграції, бере **Firebase Authentication UID**, а не email/Google sub. Через Console створює `admins/{UID}` із role:"admin". Клієнт не має права призначати адмінів. Права визначаються захищеним документом з role:"admin"; зайві admin-документи слід видаляти.
8. Перегляньте rules/indexes і чернетку privacy. Після окремого дозволу опублікуйте тільки Firestore rules/indexes для явно вказаного проєкту (`firebase deploy --only firestore:rules,firestore:indexes --project APPROVED_PROJECT`), дочекайтесь готовності індексів. Це не виконано в цій задачі.
9. На погодженому тестовому домені перевірте справжній Google popup, скасування, вихід, авторство, режим модерації, експорт і відмову при вичерпанні квот. Лише після цього погодьте enabled:true, оновлення політики, GitHub Pages публікацію. Жодних платних функцій для коментарів не потрібно.

## Залишкові ризики й квоти

Google-вхід не гарантує захист від спаму: кілька Google-акаунтів обходять per-UID ліміт; немає обмеження за IP/CAPTCHA/глобального добового бюджету. Попередня модерація захищає видимість, а не кількість записів. Публічні читання також можуть вичерпати Spark-квоти, пагінація лише обмежує звичайний клієнт. Перевіряйте актуальні квоти у Firebase Console; після їх вичерпання коментарі можуть стати недоступними. Spark без billing не створює автоматичної оплати, але не гарантує безперервності сервісу. Адміністратор може setting enabled:false зупинити нові записи; щоб заборонити ще й публічні читання, потрібна окрема погоджена зміна rules. Навіть заблокований автор може читати опубліковане.

Розміщення правил і налаштувань у файлах саме по собі не захищає невірно налаштований реальний проєкт. Перед запуском повторити тестові сценарії на окремому тестовому Firebase; емулювання не перевіряє production індекси/квоти/OAuth.

## Доповнений пакет перевірки

- comments-cli-advisories.md: конкретні GHSA, версії, node_modules paths, ризик та порядок підтримуваного виправлення.
- comments-recovery.md: Spark-сумісна real Firestore/Auth процедура, quarantine/preview/UID mapping/план окремого тестового проєкту. Реальні операції не виконано.
- comments-test-results.md: результати локального 201-record export/restore й обриву експорту. Успіх емулятора не підтверджує real OAuth/production квоти.
- restore-safety.js та recovery-files.mjs: приватний монотонний реєстр видалень і очищення старої копії перед restore. Без актуального coverage стару копію не випускати з quarantine.


## Windows: чинні локальні сторінки статей

Потрібні Node.js/npm, Python 3 і Java, сумісна з Firebase CLI. Після отримання review-гілки виконати `npm ci --ignore-scripts`. Це локальна підготовка; Firebase CLI має невиправлені advisory, описані в comments-cli-advisories.md.

У першому PowerShell, з кореня checkout:

```powershell
npm run comments:emulators
```

У другому PowerShell, з того самого checkout (seed працює лише з loopback/demo):

```powershell
npm run comments:seed
py tools/comments/serve-local.py --site-dir . --port 8133
```

UA: `http://localhost:8133/article.html?article=how-kaolin-works`
EN: `http://localhost:8133/en/article-en.html?article=how-kaolin-works-en`

Сервер лише підміняє відповідь config.js на loopback; файл production-конфігурації не змінює. Параметр commentsEmulator у мовних посиланнях не потрібний; обидві сторінки використовують a-0001. В емуляторі Google popup показує синтетичні Demo reader/admin; це не справжній OAuth.

Для окремо погодженої ручної інтеграції з реальним test project використовуйте той самий сервер з public web config, збереженою поза checkout:

```powershell
py tools/comments/serve-local.py --site-dir . --port 8133 --web-config "D:\PrivateConfig\firebase-web-config.json"
```

Цей режим обмежений serhii-comments-test і не змінює хмарні settings/Rules. При schema2 visibility:visible/enabled:false відображаються гілки, вхід і модерація, без форми надсилання. Legacy enabled:false залишається hidden до явної міграції. Для тестування надсилання потрібне окремо погоджене тимчасове enabled:true з moderationMode:pre; після тесту повернути enabled:false й прочитати його із сервера. Не використовуйте цей helper для production.

Restore CLI вимагає явний loopback FIRESTORE_EMULATOR_HOST; apply у будь-яку непорожню ціль, включно з ідентичними документами, відхиляється. Внутрішній helper може звіряти непорожню ціль; це не дозвіл CLI на повторне застосування.

## Оновлення visibility / settings schema2

Чинна схема, сумісність v1/v2 резервних копій, read-only/hidden, службовий вхід адміністратора й точний порядок test-project міграції описані повністю в [comments-visibility-update.md](comments-visibility-update.md). Раніші schema1 приклади в цьому документі є legacy; для нового розгортання використовуйте schema2 з enabled:false та visibility:visible.
