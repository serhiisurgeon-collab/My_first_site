# Внутрішні посилання

Нижче — усі унікальні адреси, з яких видалено статичний `target="_blank"`. Кількість включає готові HTML і відповідні шаблони генератора; це не кількість унікальних сторінок.

| Адреса | Входжень |
|---|---:|
| `/` | 4 |
| `/about.html` | 2 |
| `/contact.html` | 7 |
| `/content/articles/en/image/npa-effectiveness-1.png` | 1 |
| `/content/articles/en/image/npa-effectiveness-2.png` | 1 |
| `/content/articles/uk/image/npa-effectiveness-1.png` | 1 |
| `/content/articles/uk/image/npa-effectiveness-2.png` | 1 |
| `/en/about-en.html` | 2 |
| `/en/contact-en.html` | 7 |
| `/en/index-en.html` | 26 |
| `/en/policy-en.html` | 26 |
| `/en/projects-en.html` | 2 |
| `/en/s-dose-en.html` | 4 |
| `/en/spanish-bot-en.html` | 4 |
| `/index.html` | 24 |
| `/policy.html` | 24 |
| `/project/2d_try.html` | 4 |
| `/project/project_blood/blood_html.html` | 6 |
| `/projects.html` | 2 |
| `/s-dose.html` | 4 |
| `/spanish-bot.html` | 4 |

Разом: 156 внутрішніх входжень. Окремо прибрано `_blank` та зайві security-rel із 24 посилань `mailto:`.

У runtime те саме правило застосовується до всіх внутрішніх адрес, fragment links, мовного перемикача, нових результатів пошуку та політики публікації коментарів. Зовнішні HTTP(S)-посилання отримують `_blank` і `noopener noreferrer`. Існуючі `download` збережено; файли `/assets/downloads/` мають `download`.

Повний перелік входжень: [link-changes.json](link-changes.json).
