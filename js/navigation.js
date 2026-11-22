import { lockScroll, unlockScroll } from './scroll-lock.js';

const siteNav = document.querySelector(".site-nav");

if (siteNav) {
  const updateNavState = () => {
    siteNav.classList.toggle("is-scrolled", window.scrollY > 24);
  };

  updateNavState();
  window.addEventListener("scroll", updateNavState, { passive: true });
}

const navToggle = document.querySelector(".site-nav__toggle");
const mobileNav = document.querySelector("#mobile-navigation");

if (navToggle && mobileNav) {
  const mobile = matchMedia('(max-width: 1023px)');
  const labels = { uk: ['Відкрити меню', 'Закрити меню'], en: ['Open menu', 'Close menu'], es: ['Abrir menú', 'Cerrar menú'], de: ['Menü öffnen', 'Menü schließen'] }[document.documentElement.lang] || ['Відкрити меню', 'Закрити меню'];
  let background = [];

  function pageRegions(root) {
    return [...root.children].flatMap(el => {
      if (el.matches('.site-nav, #mobile-navigation, .site-search, script, style')) return [];
      if (el.contains(siteNav) || el.contains(mobileNav)) return pageRegions(el);
      return [el];
    });
  }

  function setOpen(open, restoreFocus = false) {
    open = open && mobile.matches;
    const wasOpen = navToggle.getAttribute('aria-expanded') === 'true';
    mobileNav.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', labels[open ? 1 : 0]);
    mobileNav.setAttribute('aria-hidden', String(!open));
    mobileNav.inert = !open;
    document.body.classList.toggle('mobile-menu-open', open);
    if (open && !wasOpen) {
      background = pageRegions(document.body).map(el => ({ el, inert: el.inert }));
      background.forEach(({ el }) => { el.inert = true; });
      lockScroll('navigation');
    } else if (!open) {
      background.forEach(({ el, inert }) => { el.inert = inert; });
      background = [];
      unlockScroll('navigation');
      if (restoreFocus && wasOpen) navToggle.focus({ preventScroll: true });
    }
  }

  const normalPath = value => value.replace(/\/index\.html$/, '/');
  document.querySelectorAll('.site-nav__links a[href], #mobile-navigation a[href]').forEach(link => {
    if (normalPath(new URL(link.href).pathname) === normalPath(location.pathname)) link.setAttribute('aria-current', 'page');
  });
  navToggle.addEventListener('click', () => setOpen(navToggle.getAttribute('aria-expanded') !== 'true'));
  mobileNav.addEventListener('click', event => {
    if (event.target.closest('a[href]')) setOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
      event.preventDefault();
      setOpen(false, true);
    }
  });
  document.addEventListener('click', event => {
    if (!mobileNav.contains(event.target) && !siteNav?.contains(event.target)) setOpen(false);
  });
  document.addEventListener('site-search:opening', () => setOpen(false));
  mobile.addEventListener('change', () => setOpen(false));
  setOpen(false);
}
