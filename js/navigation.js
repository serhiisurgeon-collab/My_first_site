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
  navToggle.addEventListener("click", () => {
    const isOpen = mobileNav.classList.toggle("is-open");

    navToggle.setAttribute("aria-expanded", String(isOpen));
    mobileNav.setAttribute("aria-hidden", String(!isOpen));
  });
}