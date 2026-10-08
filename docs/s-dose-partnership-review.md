# S-Dose: запрошення до партнерства

Підготовлено 8 жовтня 2026 року в `review/s-dose-partnership` від `df9a06e`. Push, merge і публікація не виконувалися.

## Реалізація

- Дві сторінки підключають один незалежний JS-модуль і локальний CSS. Сторінки, мовні перемикачі, чинні метадані та медичний зміст не змінено.
- Нативний dialog із доступною локалізованою назвою; автофокус на ×, утримання Tab/Shift+Tab, Escape, закриття кнопкою та тлом. Фон inert, прокручування заблоковано; стилі й фокус відновлюються після close.
- Спільний sessionStorage key `s-dose-partnership-shown`, записується лише після успішного показу. Reload і зміна мови не повторюють автоматичний показ. Ручна кнопка працює незалежно від ключа.
- Без sessionStorage автоматичний показ пропускається. За помилки банера діалог не відкривається; ручна спроба показує пояснення та робоче email-посилання. Без JavaScript основна сторінка працює, неактивна кнопка повторного відкриття прихована.
- Максимальна ширина 900 px; повне зображення без crop, sticky ×, внутрішній scroll для коротких екранів, кнопки мінімум 44/48 px. Reduced motion вимикає transition.

## Погоджена дія

`mailto:hello@serhiipelishenko.com?subject=S-Dose%20publishing%20partnership`

Адреса змінюється в `partnershipConfig.action` у `js/s-dose-partnership.js`. Перевірено точний href, отримувача й тему. Запуск поштової програми залежить від налаштувань пристрою; відправлення листа не виконувалося. Форм, сервера, аналітики чи нового сервісу немає.

## Банери

З архіву власника: `Seeking a publishing parthner ukr page.png` — UA, `Seeking a publishing parthner.png` — EN. Обидва 1734 × 907 px. Створені lossless WebP, розміри й усі RGBA-пікселі збігаються з PNG. Текст і демонстраційні дані не змінювались.

- UA: 1 592 927 → 1 094 776 bytes.
- EN: 1 596 187 → 1 088 192 bytes.

Компонент завантажує лише файл поточної мови. Оригінали збережені в переданому архіві, не публікуються додатково.

## Перевірки

- PASS: 13 браузерних сценаріїв з реальними банерами — UA/EN, desktop 1280 px, 390/360 px; всі способи закриття; кліки всередині; фокус, Tab/Shift+Tab; reload і натискання мовного перемикача; ручне відкриття; заблоковане sessionStorage; помилка завантаження; без JavaScript; висота 240 px і доступна × при scroll; reduced motion. При перевірці помилок застосовано навмисну мережеву відмову.
- PASS: 18 SEO-тестів; Jekyll-збірка; аудит 195 публічних файлів без приватних чи службових даних.
- PASS: синтаксис JS, git diff --check, точний збіг пікселів банерів.
- Скриншоти 100%, deviceScaleFactor 1: `/workspace/artifacts/s-dose-partnership/{uk,en}-{1280,390,360}.png`.

Повторення перевірки:

```sh
python3 -m http.server 8150 --bind 127.0.0.1
# В іншому терміналі з кореня репозиторію:
SDOSE_REAL_BANNERS=1 node tests/s-dose/partnership-browser.mjs
```

Браузерні тести використовують встановлений Chromium та Playwright; для зовнішніх шрифтів — наявний helper із перевіркою TLS. Тести не виконують Firebase чи поштових записів.

## Змінені файли

- `s-dose.html`
- `en/s-dose-en.html`
- `css/pages/s-dose-partnership.css`
- `js/s-dose-partnership.js`
- `assets/images/s_dose/s-dose-partnership-uk.webp`
- `assets/images/s_dose/en/s-dose-partnership-en.webp`
- `tests/s-dose/partnership-browser.mjs`
- `docs/s-dose-partnership-review.md`

Публікація — після окремого погодження власника. Відкат: прибрати два підключення й кнопку/status із кожної S-Dose сторінки та окремі CSS/JS/банери. Firebase й обговорення не зачіпаються.
