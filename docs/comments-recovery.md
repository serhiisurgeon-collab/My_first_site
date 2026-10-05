> Privacy-оновлення підготовлено лише в review-гілці. Актуальні вимоги та відкат: comments-privacy-update.md. Firestore restore завжди локальний demo-*; це не дозвіл змінювати хмару.

# Відновлення Firestore/Auth на Spark: процедура на погодження

Жоден реальний проєкт не підключений. Наведені кроки виконуються лише після окремого дозволу на конкретні source/target projectId, регіон, дані та операції. Не потрібно Blaze, billing, Cloud Functions, Cloud Storage, PITR або managed export/import. Використовуються звичайні читання/записи Firestore та Admin Auth API. Вони витрачають квоти Spark; перед виконанням перевірити доступні квоти у Console. Після їх вичерпання зупинитися, не переходити автоматично на платний план.

## Передумови і межі

- Відновлювати спочатку в **окремий тестовий Spark-проєкт із синтетичними даними**, не в production. Тестовий проєкт створює власник після погодження; сьогодні його не створено.
- Довірене локальне середовище із pinned Node/Admin SDK. Справжні credentials зберігаються лише у приватному сховищі оператора. Не використовувати service-account JSON у фронтенді/Git/чаті. Адміністративна автентифікація через ADC/схвалений service account на власній машині; доступи Firestore (`roles/datastore.user`) і Auth (`roles/firebaseauth.admin`) до конкретного target. Це IAM-права оператора, не роль comments/admins.
- Експортувати Auth та Firestore можна різними обліковими записами з відповідними мінімальними правами. Приватний ключ не є частиною резервної копії.
- Зафіксувати sourceProjectId/targetProjectId і їх відмінність; перевірити `auth.app.options.projectId` та `db.projectId`. Для real-run не повинно бути FIRESTORE_EMULATOR_HOST/FIREBASE_AUTH_EMULATOR_HOST. Існуючий CLI `comments:restore` залишається **emulator-only**; він не виконує цю процедуру для real project.
- Перед відновленням ввімкнути quarantine Rules у target: `rules_version = '2'; service cloud.firestore { match /databases/{database}/documents { match /{document=**} { allow read, write: if false; } } }`. Зміна цих правил у real target — окрема погоджена дія. Admin SDK обходить Rules, звичайні користувачі не можуть навіть прочитати частково відновлені published записи.
- Цільові колекції й Auth мають бути порожніми. Будь-які existing UID/provider mapping/documents — звіт про конфлікт і зупинка, без тихого overwrite. Не очищати непорожній target автоматично.

## 1. Резервування та журнал видалень

1. Зупинити коментарі/модерацію замком експорту. Окремо власник зупиняє **всі** trusted SDK/Console записування, Auth signup/update/delete та фонові import-процеси. Firestore `control/state` не блокує Firebase Auth: не заявляти, що один замок робить атомарну копію двох сервісів. Потрібне погоджене вікно обслуговування; за неможливості стабілізувати Auth позначати пакет непослідовним і не використовувати для recovery.
2. Firestore: UI адміністратора → повний JSON-експорт, перевірений count. Auth: у довіреному Admin SDK-процесі `exportGoogleAuth(auth, sourceProjectId)` із `tools/comments/auth-recovery.mjs`, приватний JSON schemaVersion 1. Він читає сторінками по 1000 та підтримує Google-only профілі. Password/anonymous/інші провайдери спричиняють відмову, не мовчазне втрачання. Не підміняти цей JSON форматом `firebase auth:export`: формати відрізняються.
3. Зберегти SHA-256, sourceProjectId, час, кількість документів/акаунтів і схему у приватному manifest. Нова Auth-копія зберігає UID, Google provider UID, email/verified, displayName/photoURL, disabled і підтримувані metadata. Не зберігає паролі, refresh/access tokens чи customClaims. Активні сесії не відновлюються, потрібен новий Google-вхід. Існуючі custom claims спочатку інвентаризувати; ця процедура їх навмисно не відновлює, залежності від claims потребують окремого плану.
4. Після кожного видалення тексту зробити новий verified Firestore export і **монотонно оновити приватний deletion register**, окремий від старих копій. До синхронізації реєстру старі копії не можна використовувати для відновлення. Це ручна процедура, не автоматичний журнал. Для видалених Auth-акаунтів вести окремий актуальний список revokedUids; навіть порожній список має бути явно перевірений оператором, а не взятий зі старого backup.

```bash
node tools/comments/recovery-files.mjs register /private/latest.json /private/deletions-new.json /private/deletions-previous.json
# Для першого погодженого baseline опустити останній аргумент.
node tools/comments/recovery-files.mjs sanitize /private/older.json /private/deletions-new.json /private/restore-sanitized.json
```

Виходи створюються лише поза checkout із mode 0600 та flag wx (без перезапису). Новий register зберігає попередні відомі видалення; verifiedThrough — лише час перевіреного експорту. Перед реальною recovery підтвердити, що після нього не було незареєстрованих видалень. Автоматично довести це зі старих копій неможливо. Якщо реєстр утрачений/застарілий, залишити target у quarantine і не відновлювати текст до уточнення. Приклад `/private` означає приватний каталог власника, не публічну папку сайту.

## 2. Перевірка і preview, без запису

1. Перевірити SHA-256 файлів, validateBackup, validateGoogleAuth, source ID і актуальність реєстрів. `sanitizeRestoreBackup` прибирає текст та ім’я всіх відомих видалених comment IDs, відновлює останній delete/status/time; перевіряє articleId/authorUid та не змінює reply links. Вихід має власний SHA-256. При відсутності реєстру або identity mismatch — відмова.
2. Увесь sanitized JSON перевірити на відсутність відомих видалених текстів, а не тільки UI. Стара копія **сама** ще містить їх: за погодженим retention її очистити/знищити або тримати приватно з обов’язковим suppression gate перед restore. Просте зняття backup з індексу не стирає його вміст.
3. Виконати `previewGoogleAuth(targetAuth, authSnapshot, revokedUids)`; звіт create/skipRevoked/existingTargetUids. Existing target — stop. Не імпортувати revoked UIDs і не використовувати старий backup для скасування нового блокування: поточний реєстр блокувань/approved admin UIDs має перевагу над старими records. Без нього актуальність доступу не підтверджена.
4. Firestore: `readCurrent(targetDb)` + `restorePlan(sanitized, current)`; звірити create/unchanged/conflicts/extra. Target має бути порожнім. Окремо скласти очікуваний manifest для operational overrides: `settings/comments.enabled=false`, `control/state={frozen:true,ownerUid:null}`, `admins` — тільки **заново погоджені UIDs**, `blockedUsers` — поточний реєстр. Це навмисні відмінності від backup; не застосовувати старі права/режим автоматично.
5. Погодити конкретний preview, SHA-256, перелік approved admin UIDs і revoked UIDs перед apply. Не передавати самі приватні файли в чат.

## 3. Застосування у довіреному процесі

1. Auth: `importGoogleAuthQuarantined(targetAuth, snapshot, revokedUids)`. Helper ще раз перевіряє порожню Auth, імпортує сторінками максимум 1000 через `auth.importUsers`, **всі imported accounts disabled:true**, зі старими UID та google.com provider UID. Частковий збій → stop, відомі failed indices; не повторювати import поверх непорожньої Auth. Зробити новий preview і погоджений план очищення/продовження окремо. Порівняти кожен UID/provider mapping і profile fields; не вважати один успішний count повним доказом.
2. Firestore: у затвердженому SDK driver створювати кожен документ через `db.doc(path).create(data)`, із Timestamp decode. Це не managed import. Використовувати sanitized snapshot та погоджені operational overrides, а не `set`/upsert. Apply emulator helper не застосовувати буквально до real target: він нормалізує settings/control як у копії, що не відповідає quarantine.
3. При частковому Firestore збою залишити deny-all Rules/disabled Auth/locked control; зробити новий preview. Повторно створювати лише відсутні документи з тим самим затвердженим hash; конфліктні не перезаписувати. Весь restore не є атомарною транзакцією.
4. Перечитати **всі** документи пагінацією й звірити з очікуваним operational manifest. Count, IDs, exact timestamps, parent/depth/article links, statuses, UID та suppression. Звірити всі Auth UID/provider mappings, missing authors із revoked list, disabled стан і profile поля. Не замінювати невідомі UID новими акаунтами за email.
5. Поки deny-all активні, дозволити лише погодженому власнику тестовий Google-вхід: увімкнути його imported Auth user, додати Google provider/config/domain в target, використати локальний bootstrap. Він повинен повернути **той самий imported Firebase UID**, не створити новий через неправильний provider mapping. При новому UID — stop, quarantine, усунення конфлікту після погодження.
6. Окремо погодити відновлення стандартних comments Rules/indexes, зняття lock через trusted Console/driver (`frozen:false,ownerUid:null`), ввімкнення потрібних accounts зі збереженням початково disabled/revoked, та settings.enabled. Спочатку test integration, public config залишається false. Публікація й production switch — наступне окреме погодження.

## План перевірки на окремому Spark-проєкті

- Створення/регіон/Google/domains/IAM — тільки після дозволу; без billing. Test dataset: 201 синтетичний коментар, кілька Google identities власника/тестувальника, pending/hidden/deleted, 3-рівневі відповіді, поточні blocks та revoked UID. Не копіювати реальні patient/службові/користувацькі тексти.
- Перевірити canonical Auth export, counts, SHA-256 і точні UID/provider mappings. Перший OAuth-вхід source/target — справжній Google, окрема перевірка від емулятора.
- Google → UID bootstrap при public enabled:false; Console створення admins з точним UID.
- Restore старої копії із newer deletion register: старий текст не існує у target навіть прямим Admin SDK читанням, відповіді існують. Revoked Auth user не імпортований; старі admin права не відновлені без нового погодження.
- 201-record export/restore: сторінки 100/100/1, звірка кожного документа. Auth: кожен UID/profile/provider mapping, imported disabled до release. Quarantine read/write denied навіть для звичайного колишнього admin; Admin SDK працює тільки з target IAM.
- Обрив після першої сторінки export → немає повного файлу, lock лишається; тільки owner unlock після припинення export; повторний export/write. Обрив apply після 100 документів → частковий target недоступний, preview показує 100 unchanged/решту create, конфлікт stop. Обрив Auth import → failed indices, без blind overwrite.
- Перевірити реальні indexes, OAuth cancel/logout, Rules bypass/rate/blocks і quota/resource-exhausted UI. Тест не має навмисно витрачати всю Spark-квоту; quota failure можна інжектувати, фактичні limit/usage перевірити Console.
- Звіт позначає emulator passed, real test pending, production not run окремо. Лише після приймання результатів погоджувати справжнє відновлення.

## Що лишається після видалення

Public comment schema3: ID, schemaVersion, articleId, parentId, depth, createdAt, updatedAt, status deleted (раніше публічний) або hidden (приватний); **text='' та authorName=''**. Публічний tombstone містить зв’язки/timestamps, але не UID; UID та підтвердження зберігаються окремо у приватному commentOwners; hidden tombstone — тільки author/admin. Replies не стираються. Private moderation зберігає comment ID, moderatorUid, action=delete та at. RateLimits може зберігати author UID, commentId і lastSubmittedAt; blocks/admin registry — незалежні документи. Firebase Auth профіль, email та Google link не стираються видаленням тексту. Deletion register й старі приватні backups також мають окремий retention.

Це видалення тексту, **не повне видалення персональних даних**. Повне знеособлення UID/профілю/копій потребує окремої погодженої процедури й пояснення, як зберегти replies. Старий текст не повинен повертатися: suppression gate, поточний register, quarantine і повна post-restore звірка обов’язкові; без актуального register гарантії немає.

## Сумісність visibility і форматів v1/v2/v3

Оновлений validator/restore приймає v1/v2/v3. Новий експорт — v3, settings залишаються schema2. Копія не вмикає публікацію автоматично. Формати v1/v2 перед фактичним restore обов’язково конвертуються у v3: UID переноситься у приватний commentOwners, старе confirmation залишається null. Перед конвертацією застосовується актуальний deletion register. Старі restore-інструменти для privacy-оновлення не використовувати. Під час real quarantine overrides зберігайте visibility/schemaVersion вихідних settings і встановлюйте enabled:false; не видаляйте поле visibility зі schema2. При legacy enabled:false UI залишається hidden. Повернення видимості — окрема погоджена settings-міграція, не частина restore. Нові копії потребують нових інструментів; старий v1 restore не підтримує v2. Повний порядок — comments-visibility-update.md. Deletion register лишається schema1.
