# Контрольоване застосування privacy-міграції

`tools/comments/cloud-privacy-migration.mjs` підготовлено й перевірено в емуляторі. Хмарний dry-run/apply **NOT RUN**. Наявний проєкт `serhii-comments-test` — єдина дозволена cloud-ціль CLI. Немає створення проєкту, ключів, Auth-акаунтів, IAM/billing/Rules/індексів чи фізичного видалення. Технічна міграція й політика публікуються одним погодженим пакетом з датою фактичної публікації, не заднім числом.

## Доступ оператора

Cloud runner використовує **локальний user ADC** Google Cloud CLI — акаунт власника з уже наявними достатніми правами Firestore у цьому проєкті. Firebase `admins/{UID}` не надає IAM-прав Admin SDK: якщо доступу немає, STOP, не створювати ключ і не змінювати IAM для обходу.

Перевірити на комп’ютері оператора, чи вже є `gcloud` і user ADC. Якщо user ADC ще немає, після погодження cloud-етапу встановити офіційний Google Cloud CLI за https://cloud.google.com/sdk/docs/install і виконати особисто:

```powershell
gcloud auth application-default login --project=serhii-comments-test
```

Вхід відбувається в браузері; значення локального credentials-файла не виводити, не передавати в чат/Git/Drive. Це отримання локального доступу оператора, не створення service account key і не зміна Firebase Auth. Не використовувати GOOGLE_APPLICATION_CREDENTIALS/service account keys або impersonation. Runner перевіряє стандартний ADC-файл Windows `%APPDATA%\gcloud\application_default_credentials.json` (Linux: `~/.config/gcloud/application_default_credentials.json`) і дозволяє лише type:authorized_user. Якщо використовується інша директорія ADC, не копіювати файл навмання; окремо перевірити конфігурацію.

На час cloud-команди не повинно бути FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST / GOOGLE_APPLICATION_CREDENTIALS — runner відмовляється, якщо вони встановлені. Для перевірки на іншій машині не передавати refresh token або ключ: оператор запускає інструмент сам із власним ADC. apiKey/appId Web SDK не є доступом цього runner.

## Перед read-only dry-run

Окремо погоджені попередні cloud-кроки: enabled:false, пауза всіх модераційних/Console змін, свіжа повна legacy v1/v2 копія, manifest зі звіреним SHA-256 і актуальний deletion register, власний export lock знятий. Не брати стару тестову копію й не припускати, що живі коментарі тестові.

Runner перевіряє source enabled:false/unlocked, схему, register та незмінність даних. Якщо suppression з register вимагав би змінити текст/ім’я/статус/дати поточної копії, STOP: міграція не виконує очищення під іншою назвою. До cloud apply має бути окремо погоджено нові індекси й privacy Rules, які закривають legacy UID для публічного читання; сам runner їх не застосовує.

У PowerShell від кореня review-гілки (шляхи приватні, поза репозиторієм):

```powershell
node tools/comments/cloud-privacy-migration.mjs --backup 'D:\Private\CommentsBackups\fresh.json' --deletion-register 'D:\Private\CommentsBackups\register-current.json'
```

Без `--apply` — **лише читання**, жодного замка/запису. Порівнюються всі документи передбачених колекцій, їхні ID/поля/типи/timestamps, у тому числі admins, settings, control, articles, rateLimits, blocks, moderation; зайвий/змінений документ — STOP. Вивід містить точні comments/ID → commentOwners/ID, статуси, кількості, source/target/register hashes та planSha256. Звіт приватний. Показати конкретний список власнику для окремого погодження; сам dry-run не надає дозволу apply.

## Apply тільки після окремого погодження цього точного списку

Підставити **planSha256 з успішного cloud dry-run**, а не hash попереднього offline-інструмента: його формат інший. UID чинного адміністратора можна ввести без запису в командну історію:

```powershell
$verifiedAdminUid = Read-Host 'Firebase UID чинного перевіреного адміністратора'
$approvedPlanHash = Read-Host 'Погоджений planSha256 із cloud dry-run'
node tools/comments/cloud-privacy-migration.mjs --backup 'D:\Private\CommentsBackups\fresh.json' --deletion-register 'D:\Private\CommentsBackups\register-current.json' --apply --confirm-project serhii-comments-test --plan-sha256 $approvedPlanHash --admin-uid $verifiedAdminUid
```

Runner знову звіряє весь інвентар, перевіряє незмінний hash і наявний admins/{UID}:role:admin. Не додає адміністратора. Однією транзакцією захоплює лише незаблокований control/state; потім **однією атомарною транзакцією** порівнює весь frozen-інвентар і створює всі приватні пари та замінює публічні документи. Старий UID прибирається, schemaVersion стає 3; старе confirmation:null. ID/тексти/імена/статуси/час/стаття/відповіді незмінні. За часткового конфлікту транзакція не застосовується.

Після commit — full target comparison, зняття тільки власного незмінного замка та повторна повна звірка. enabled лишається false. Міграція не вмикає сайт і не публікує pending/hidden. Міграційна safety-межа — 200 коментарів (до 400 paired writes); більша база зупиняється до записів. Не переносити залишок вручну або самовільно обходити ліміт: для більшого інвентаря потрібен окремо перевірений план. Кожна колекція додатково обмежена 1000 документами при звірці.

## Переривання й відкат

- Якщо перед lock/commit є розбіжність — без міграції; не повторювати зі старим hash, отримати актуальний інвентар.
- Звичайна помилка після власного lock виконує finally-unlock лише того самого власника. Kill/втрата мережі можуть залишити власний замок: після припинення runner перевірити control у Console/знайомій панелі й зняти лише свій замок. Чужий не чіпати.
- Якщо process перервано після atomic commit, усі пари вже schema3, а не наполовину. Повторний apply старої копії зупиниться як mismatch, не перезапише. Перевірити новий інвентар, створити v3-копію й full restore comparison; enabled:false зберегти до завершення.
- Помилка post-commit verification — STOP, не автоматичний rollback. Замок перевірити, статті можуть працювати без обговорення. Не відновлювати старі публічні UID або старі Rules; використовувати privacy-схему/перетворену копію з register та окремо погоджений recovery.

Після успіху — нова приватна v3-копія, manifest/register, restore саме цього файла в порожній demo emulator, погоджена спільна публікація клієнта/політики/повідомлення. Дата політики — фактичний день цієї публікації. Раніше політику, яка описує нову поведінку, не публікувати.
