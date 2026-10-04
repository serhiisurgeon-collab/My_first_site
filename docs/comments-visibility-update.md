# Видимість і надсилання коментарів: schema v2

Зміни призначені для review/comments-firestore. Хмарні Rules/settings та production не змінюються цим оновленням коду.

## Три режими

| visibility | enabled | Поведінка |
|---|---|---|
| visible | true | Опубліковані гілки, форма коментаря/відповіді після входу; server Rules дозволяють валідні paired writes. |
| visible | false | Опубліковані гілки без форми та кнопок відповіді. UA: «Нові коментарі тимчасово вимкнено.» EN: «New comments are temporarily disabled.» Вхід і адміністративна модерація доступні. |
| hidden | false | Увесь публічний блок, включно з заголовком обговорення, прибрано. Нові comments/replies заборонені Rules. Дані не видаляються. |

hidden + enabled:true є некоректним станом: schema validation/Rules його відхиляють. Адміністративний API при виборі hidden атомарно встановлює enabled:false. Повернення visibility:visible залишає enabled:false; надсилання вмикається лише окремим явним вибором.

Приховування інтерфейсу саме по собі **не забороняє пряме читання через Firestore API**. Published/deleted і надалі читаються публічно за чинними обмеженнями запиту; pending/hidden — автором або адміністратором. Visibility не є механізмом конфіденційності. Rules додають заборону нових записів у прихованому режимі, не змінюючи read permissions.

Зміна visibility/enabled/moderationMode записує тільки settings/comments. Вона не схвалює pending, не повертає hidden у published, не змінює текст, зв’язки або audit. Публікація наявного коментаря — окрема дія модерації.

## Налаштування

```json
{
  "enabled": false,
  "visibility": "visible",
  "moderationMode": "pre",
  "schemaVersion": 2
}
```

enabled залишається серверним дозволом створення коментарів і відповідей. Замок control/state.frozen і далі блокує записи/модерацію під час експорту. Модерація дозволена адміністратору в read-only та hidden, якщо немає замка.

У прихованому режимі вже авторизований адміністратор бачить приватну панель без публічної гілки. Для першого входу в прихованому режимі додати `commentsAdmin=1` до адреси статті. Це лише показує службовий вхід, не надає прав: панель і всі її дії вимагають захищеної ролі admins/{UID}; звичайний акаунт не бачить панель чи гілку. Публічна конфігурація enabled:false/firebase:null цим параметром не обходиться.

Адміністраторська панель має окремі visibility, enabled і moderationMode. Зберігання — одна транзакція; невідомі поля, типи/версії та downgrade schema2→schema1 відхиляються. Інші відкриті клієнти потрібно оновити після зміни режиму: realtime subscriptions не додані. Rules одразу забороняють створення незалежно від застарілого інтерфейсу.

## Сумісність і копії

- Legacy settings schema1 із трьома полями без visibility: enabled:true трактуються як visible; enabled:false — як hidden, зберігаючи попередню поведінку. Режим лише читання вмикається тільки явною міграцією.
- Оновлені Rules тимчасово приймають валідні legacy settings. Адміністративне зберігання новим клієнтом атомарно мігрує їх до schema2. Після цього downgrade заборонений.
- Новий exporter будує карту за фактично експортованим реєстром articles (тестова база з однією статтею не потребує додавання інших). Невідомі або неузгоджені записи й коментарі без реєстру відхиляються validator. Новий exporter створює backup schemaVersion:2. Він зберігає фактичний settings документ без прихованої міграції: legacy schema1 або новий schema2. Новий validator/restore підтримує backup v1 і v2; v1 очікує legacy settings, v2 допускає обидва валідні settings формати.
- Restore не додає visibility і не вмикає надсилання автоматично. Legacy enabled:false після відновлення залишається hidden до явного вибору адміністратора.
- Старі validator/restore v1 не підтримують нові v2-копії. Оновити локальні інструменти перед новим експортом/відновленням. Старий standalone тестер із settings schema1 не використовувати для перезапису schema2.
- Deletion register залишається schema1 і застосовується як раніше; його формат не змінився. Timestamp precision/UID/parent links/status suppression і strict loopback/empty-target CLI guards збережені.

## Точний порядок майбутнього оновлення test project

Це інструкція; хмарні кроки зараз не виконуються.

1. Оновити review-гілку та локальні інструменти. Не merge у main, не запускати site deploy. Перевірити commentsConfig.enabled:false і firebase:null у файлі.
2. Поки enabled:false, зберегти перевірену приватну копію, manifest і актуальний deletion register. Призупинити інші модераційні/Console зміни на час міграції. Не змінювати чи видаляти коментарі для міграції.
3. Після окремого погодження застосувати **оновлений firebase/firestore.rules тільки до тестового проєкту**. Наявні індекси не змінюються. Legacy документ settings залишається допустимим, нові записи при enabled:false заборонені.
4. Запустити tools/comments/serve-local.py із public web config test project поза Git. Відкрити UA `http://localhost:8133/article.html?article=how-kaolin-works&commentsAdmin=1` або EN `http://localhost:8133/en/article-en.html?article=how-kaolin-works-en&commentsAdmin=1`. Увійти перевіреним адміністратором.
5. У панелі вибрати visibility:visible, залишити «Дозволити нові коментарі та відповіді» вимкненим, moderationMode:pre. Зберегти. Нова транзакція атомарно записує всі чотири поля schema2. Старі хмарні Rules цей запис не дозволять — тому крок 3 має бути раніше.
6. Прочитати settings/comments із сервера й підтвердити enabled:false, visibility:visible, moderationMode:pre, schemaVersion:2. Перезавантажити UA/EN без службового параметра: гілки видимі, точне read-only повідомлення є, форми/Reply немає. Адміністратор може модерувати; звичайний користувач не може створювати.
7. Перевірити hidden через панель: enabled:false збережений, публічна секція прихована, всі документи/статуси незмінні. Повернути visible; enabled:false має залишитися. Пряме публічне API читання не вважати багом visibility.
8. Експортувати нову v2-копію, перевірити unlocked control, актуальний register і full emulator restore comparison. Перед production потрібні окремі погодження Rules/settings/privacy та публікації. Жодних billing/IAM/Auth account змін для цього не потрібно.

## Локальні перевірки

Node: `node --test --test-concurrency=1 tests/comments/*.test.mjs` після запуску емуляторів.
Браузер: `node tools/comments/browser-check.cjs` зі статичним сервером 8030; `node tools/comments/visibility-browser-check.cjs` із serve-local.py на 8133. Обидва браузерні runner очищають/засівають лише синтетичний loopback demo-проєкт, не реальний Firebase.
