# План адрес — на погодження

Початковий commit: `82055aa93881a4d1bb35bd0db34def1f752f2818`.
Гілка: `review/seo-static-articles`. Вихідний робочий каталог чистий.
GitHub Pages: `build_type: legacy`, джерело `main`, корінь `/`, Jekyll з
виключеннями `_config.yml`. Зараз окремої збірки статей немає.

## Запропоновані канонічні сторінки

| articleId | UA | EN |
|---|---|---|
| a-0001 | /articles/how-kaolin-works/ | /en/articles/how-kaolin-works/ |
| a-0002 | /articles/group-medical-bag/ | /en/articles/group-medical-bag/ |
| a-0003 | /articles/hospital-capabilities/ | /en/articles/hospital-capabilities/ |
| a-0004 | /articles/medical-app-without-internet/ | /en/articles/medical-app-without-internet/ |
| a-0005 | /articles/npa-effectiveness/ | /en/articles/npa-effectiveness/ |

Ці каталоги не конфліктують із `articles.html` та `en/articles-en.html`.
Кожний маршрут матиме фізичний `index.html`, згенерований із чинного
Markdown та JSON. Сталі articleId і хмарні дані не змінюються.

## Сумісність

Старі `article.html?article=…` та `en/article-en.html?article=…`, зокрема
alias `how-kaolin-works-en`, залишаються доступними. Явна локальна карта
виконує JavaScript-перенаправлення на відповідну мовну версію: це не HTTP 301.
Без JavaScript старий шаблон показуватиме зрозумілий список посилань на статті.
Якір і відомий параметр `commentsAdmin=1` зберігаються; довільна зовнішня
ціль не приймається. Невідомі параметри не визначають ціль переходу.

Невідомий або порожній article-параметр матиме нейтральний стан помилки,
без чужого заголовка, дат і Article JSON-LD. HTTP 200 старого фізичного
шаблону залишається обмеженням Pages; noindex застосовується лише до
виявленого помилкового стану. Нові відсутні фізичні адреси повинні давати 404.

Нові внутрішні посилання, canonical, hreflang, Open Graph і sitemap
використовуватимуть наведені кінцеві адреси. S-Dose залишається noindex.
Українська головна канонізується на `/`.

Машинний реєстр пропозиції: `tools/seo/url-registry.proposed.json`.
Це план, а не свідчення виконаного переходу або індексації Google.
Push, merge, deploy та зміни Firebase не виконуються.

Після погодження маршрутів review-гілка оновлена до актуального origin/main
`02cc821745cfaf0b1cfdd1a5dca0fa68a108bf58`; уточнення Markdown NPA з main збережені.
