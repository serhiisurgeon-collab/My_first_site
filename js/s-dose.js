  const sectionLinks = [...document.querySelectorAll('.s-dose-section-nav__link')];
  const observedSections = sectionLinks
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  if ('IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visibleEntry) return;

        sectionLinks.forEach((link) => {
          const isActive = link.getAttribute('href') === `#${visibleEntry.target.id}`;
          link.classList.toggle('is-active', isActive);
          link.toggleAttribute('aria-current', isActive);
        });
      },
      {
        rootMargin: '-30% 0px -58% 0px',
        threshold: [0, 0.15, 0.35],
      },
    );

    observedSections.forEach((section) => sectionObserver.observe(section));
  }