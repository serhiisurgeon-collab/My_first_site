import './navigation.js';

// Reuse the site's menu behavior and keep closed links out of keyboard navigation.
const toggle = document.querySelector('.site-nav__toggle');
const menu = document.querySelector('#mobile-navigation');
const mobile = matchMedia('(max-width: 900px)');
if (toggle && menu) {
  const sync = () => {
    const open = mobile.matches && toggle.getAttribute('aria-expanded') === 'true';
    menu.inert = !open;
    menu.setAttribute('aria-hidden', String(!open));
  };
  const close = () => {
    menu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    sync();
  };
  toggle.addEventListener('click', sync);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      close();
      toggle.focus();
    }
  });
  document.addEventListener('click', event => {
    if (!menu.contains(event.target) && !toggle.contains(event.target)) close();
  });
  mobile.addEventListener('change', close);
  sync();
}
