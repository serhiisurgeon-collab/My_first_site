(() => {
  const cards = [...document.querySelectorAll('.blood-news__card')];
  const button = document.querySelector('[data-news-more]');
  const status = document.querySelector('[data-news-status]');
  if (!button || !cards.length) return;
  let shown = Math.min(9, cards.length);
  cards.forEach((card, index) => { card.hidden = index >= shown; });
  button.hidden = shown >= cards.length;
  button.addEventListener('click', () => {
    const previous = shown;
    shown = Math.min(shown + 9, cards.length);
    cards.slice(previous, shown).forEach(card => { card.hidden = false; });
    if (status) status.textContent = `Показано ${shown} із ${cards.length} новин`;
    if (shown === cards.length) {
      const heading = cards[previous].querySelector('h2');
      if (heading) { heading.tabIndex = -1; heading.focus({preventScroll: true}); }
      button.hidden = true;
    }
  });
})();
