# Чернетка доповнення політики приватності — на погодження

Цей документ не внесений до публічних policy.html/policy-en.html. Погодити режим модерації, контакт для запитів, строки зберігання й регіон перед підключенням справжнього Firebase.

## Український текст

Коментарі під статтями працюють через Google Sign-In, Firebase Authentication та Cloud Firestore. Читати опубліковані коментарі можна без входу. Для написання та відповіді потрібен Google-акаунт.

Після входу Firebase обробляє ідентифікатор користувача (UID), ім’я, email та відомості про Google-провайдера. Власник сайту має адміністративний доступ до цих даних у Firebase Authentication. Фото профілю не виводиться і не копіюється до коментарів. Коментар містить UID, ім’я, текст, дату створення й зміни, статтю, зв’язок відповіді та статус. Email і токени не записуються в публічні документи коментарів.

Опубліковані коментарі доступні всім, у тому числі через API; це включає ім’я, UID, часові мітки й текст. Не публікуйте даних пацієнтів та чутливих службових відомостей. Нові коментарі [за погодженого режиму: очікують схвалення / публікуються відразу]. Очікувані й приховані записи доступні лише їхньому автору й адміністратору. Дані модерації та блокувань закриті; користувач може перевірити власний статус блокування.

Для керування доступом зберігаються admin UID, відомості про блокування, остання модераційна дія та час останнього надсилання. Видалення тексту коментаря залишає порожній запис із UID, часовими мітками і зв’язками, щоб зберегти відповіді та авторство. Видалення тексту не видаляє Auth-акаунт, блокування, rate-limit запис чи приватні копії. Для запобігання поверненню тексту зі старої копії власник веде окремий приватний реєстр видалених comment IDs, UID автора й модератора, статусу та часу видалення і застосовує його перед відновленням. Його зберігання та очищення старих копій потребують погодженого retention. Запит на видалення/знеособлення інших даних можна надіслати через чинні контакти сайту; конкретну процедуру та строки відповіді узгоджує власник.

Google/Firebase отримує технічні дані запитів, зокрема IP-адресу та інформацію про браузер/пристрій, відповідно до власних політик. Сесія входу й токени зберігаються Firebase SDK у сховищі браузера, щоб зберігати вхід; вихід завершує локальну сесію. Хостинг сайту та інші наявні функції мають свої вже описані залежності. Модуль коментарів не додає реклами або аналітичних трекерів.

Власник може робити ручні приватні резервні копії Firestore та окремо Firebase Auth. Вони можуть містити неопубліковані записи, UID, email у Auth-копії та службові дані модерації. Копії зберігаються поза публічним репозиторієм. [Погодити строки зберігання активних даних і копій, місце зберігання та остаточний контакт для запитів.] Регіон бази: [узгодити перед створенням].

## English text

Article comments use Google Sign-In, Firebase Authentication and Cloud Firestore. Published comments can be read without signing in. A Google account is required to post or reply.

After sign-in, Firebase processes your user identifier (UID), name, email and Google provider information. The site owner can access this information administratively in Firebase Authentication. Profile pictures are neither displayed nor copied into comments. A comment records the UID, display name, text, creation and update timestamps, article, reply relationship and status. Email and tokens are not stored in public comment documents.

Published comments are available to everyone, including through the API; this includes display names, UIDs, timestamps and text. Do not post patient data or sensitive operational information. New comments [subject to the agreed mode: await approval / are published immediately]. Pending and hidden comments are accessible only to their author and administrators. Moderation and blocking records are private; users can check their own blocking status.

Access controls store administrator UIDs, blocking information, the latest moderation action and the last submission timestamp. Deleting a comment’s text retains an empty record with UID, timestamps and reply links to preserve replies and authorship. Deleting comment text does not delete the Auth account, blocking/rate-limit records or private backups. The owner keeps a separate private register of deleted comment IDs, author and moderator UIDs, status and deletion time and applies it before restoring an older copy to prevent deleted text from returning. Register retention and cleanup of older copies require an agreed policy. Requests to erase or anonymize other data can be sent through the site’s existing contacts; the owner must agree on the procedure and response times.

Google/Firebase receives technical request information such as IP address and browser/device information under its own policies. The Firebase SDK stores sign-in sessions and tokens in browser storage to retain sign-in; signing out ends the local session. The site’s hosting and other existing features have their previously described dependencies. The comments module adds no advertising or analytics trackers.

The owner may create manual private Firestore backups and separate Firebase Auth backups. These can contain unpublished comments, UIDs, email in Auth backups and moderation information. Backups are stored outside the public repository. [Agree retention periods, private storage and final contact for requests.] Database region: [agree before creation].

## Фактичні залежності та запити модуля

- Firebase Web SDK 12.19.0: modular app/auth/firestore; bundled файл подається з власного сайту, без SDK CDN. Інструмент збірки esbuild; локальні Firebase CLI/Admin SDK/rules-unit-testing — не фронтенд, не сервіси production.
- При вимкненій конфігурації: жодних Firebase-запитів чи SDK завантаження. При ввімкненні: власний `firebase/article-map.json`, локальний SDK/API, settings та обмежені сторінки comments у Firestore; після входу — власні pending, admin-role/block перевірки. Приватні administrative читання/записи лише адміністратору.
- Firestore: `firestore.googleapis.com`. Auth: `identitytoolkit.googleapis.com`, `securetoken.googleapis.com`. Google-вхід: `accounts.google.com`, допоміжні Google Auth домени (наприклад `apis.google.com`/`www.gstatic.com`) та authDomain Firebase-проєкту (`PROJECT.firebaseapp.com` або погоджений власний auth domain). Остаточний список мережевих запитів перевірити у браузері після реального налаштування; OAuth-редиректи можуть залежати від конфігурації Google. Це інвентар очікуваних production залежностей, не твердження про перевірений реальний OAuth.
- Емуляторна перевірка: лише loopback 127.0.0.1:8080/9099; штучний Google popup. Існуючий Marked CDN і решта ресурсів сайту не додані коментарями.
- Auth-слухач відстежує локальний стан входу. Firestore realtime-підписок немає. IP та User-Agent не копіюються кодом у власні Firestore документи; провайдер може обробляти їх на своєму боці.
