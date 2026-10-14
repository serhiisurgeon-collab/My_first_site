document.addEventListener('DOMContentLoaded', () => {
  const button = document.querySelector('.burger');
  const menu = document.querySelector('.nav-menu');
  if (!button || !menu) return;
  const update = () => {
    const open = menu.classList.contains('open');
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Закрити меню' : 'Відкрити меню');
  };
  new MutationObserver(update).observe(menu, {attributes: true, attributeFilter: ['class']});
  menu.addEventListener('click', event => { if (event.target.closest('a') && menu.classList.contains('open')) button.click(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.classList.contains('open')) { button.click(); button.focus(); }
  });
  update();
});
