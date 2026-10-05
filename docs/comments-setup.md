# Коментарі: актуальний локальний review

Наявний main уже містить опублікований модуль у Firebase `serhii-comments-test`. Не створюйте новий проєкт, адміністратора чи Auth-акаунти для цього оновлення. Гілка `review/comments-privacy` змінює лише локальну реалізацію; її Rules, міграція й публікація ще не застосовані. Production config залишено як у main.

## Безпечний перегляд

Потрібні наявні Node/Java для автоматичних емуляторних тестів і Python для локального статичного сервера. Не перевстановлюйте залежності чи не запускайте другий емулятор, якщо вони вже доступні. Звичайний статичний сервер review-коду з production config не використовуйте.

При потрібному новому локальному запуску:

```powershell
cd D:\Trainer\my_first_site
npm run comments:emulators
```

В іншому PowerShell, коли Auth на 9099 і Firestore на 8080 готові:

```powershell
cd D:\Trainer\my_first_site
npm run comments:seed
python tools\comments\serve-local.py --site-dir . --port 8133
```

Seed працює лише в loopback demo-* і створює синтетичні дані. Повторний seed перезаписує лише відомі демонстраційні записи; не є очищенням усієї бази. Він не використовується для хмарного проєкту.

- UA: http://localhost:8133/article.html?article=how-kaolin-works
- EN: http://localhost:8133/en/article-en.html?article=how-kaolin-works-en

Без `--web-config` сервер підміняє лише локальну відповідь config.js на емулятори; файл main не змінює. Не передавайте реальну конфігурацію цьому privacy-review до погодження міграції: новий клієнт несумісний зі старими Rules/записами. Додатковий параметр commentsAdmin=1 лише відкриває точку входу адміністратора в hidden, не надає прав.

Автоматичні тести на вже доступних емуляторах:

```powershell
node --test --test-concurrency=1 tests/comments/*.test.mjs
node tools/comments/privacy-browser-check.cjs
```

Браузерні скрипти перевіряють emulator overlay до запуску й відмовляються працювати з production config. Для browser-check потрібні Playwright/Chromium і локальна перевірена копія Marked; налаштування шляху — COMMENTS_MARKED_PATH / CHROMIUM_PATH. Реальний Google OAuth цими синтетичними перевірками не підтверджується.

## Структура

Публічний schema3 comments не містить UID. Приватне `commentOwners/{той самий ID}` містить UID, articleId, createdAt і confirmation; доступ лише відповідному автору й адміністратору. Нове створення атомарне разом із rateLimits, 60 секунд перевіряє сервер. Confirmation нового повідомлення позитивне, з версією тексту й серверним часом; старого — null, без задньої дати. Модерація та блокування використовують приватне авторство. Pending/hidden лишаються приватними, published/deleted — публічними без UID.

Реєстр `firebase/article-map.json` зберігає a-0001..a-0004 і спільні UA/EN гілки. Settings schema2: enabled, visibility, moderationMode, schemaVersion. Visibility не є блокуванням прямого API читання вже опублікованих документів. Control — приватний власний замок. Невідомі шляхи та самопризначення адміністратора заборонені.

Порядок точного інвентаря, міграції, індексів, Rules, оновлення клієнта та відкату: `comments-privacy-update.md`. Повні правила — `firebase/firestore.rules`; лише після окремого дозволу власника застосовуються до наявного Firebase. Приватні копії й локальні конфігурації поза Git/сайтом. Service account keys або billing для локального review не потрібні.
