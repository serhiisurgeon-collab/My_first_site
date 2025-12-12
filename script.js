document.addEventListener('DOMContentLoaded', () => {

  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }


  const intro = document.querySelector('.intro-hero');
  const card = document.querySelector('.page-wrapper');

  const navbar = document.querySelector('.navbar');
  const toTop = document.getElementById('toTop');

  let lastScroll = 0;

  function handleScroll() {
    const vh = window.innerHeight;
    const scroll = window.scrollY;

    
    if (intro && card) {
      let progress = scroll / vh;

      if (progress < 0) progress = 0;
      if (progress > 1) progress = 1;

      const eased = Math.pow(progress, 0.7);

          const introScale = 1.05 - 0.07 * eased;
      const introTranslate = -50 * eased;
      const introOpacity = 1 - 0.8 * eased;

      intro.style.transform = `translateY(${introTranslate}px) scale(${introScale})`;
      intro.style.opacity = String(introOpacity);

        const cardScale = 0.7 + 0.3 * eased;
      const cardTranslate = 700 * (1 - eased);
      const cardOpacity = eased;

      card.style.transform = `translateY(${cardTranslate}px) scale(${cardScale})`;
      card.style.opacity = String(cardOpacity);
    }

    if (navbar) {
      if (scroll > lastScroll && scroll > 80) {
        navbar.classList.add('hidden');
      } else {
        navbar.classList.remove('hidden');
      }
    }

       if (toTop) {
      if (scroll > 400) {
        toTop.classList.add('show');
      } else {
        toTop.classList.remove('show');
      }
    }

    lastScroll = scroll;
  }

  handleScroll();
  window.addEventListener('scroll', handleScroll);


  if (toTop) {
    toTop.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }


  if (typeof ScrollReveal !== 'undefined') {
    const sr = ScrollReveal({
      reset: true
    });

    sr.reveal('.hero-text', {
      origin: 'left',
      distance: '60px',
      duration: 900,
      easing: 'ease-out',
      opacity: 0
    });

    sr.reveal('.hero-visual', {
      origin: 'right',
      distance: '60px',
      duration: 900,
      easing: 'ease-out',
      opacity: 0
    });

    sr.reveal('h2', {
      origin: 'bottom',
      distance: '40px',
      duration: 700,
      easing: 'ease-out',
      opacity: 0,
      interval: 120
    });

    sr.reveal('.about-box', {
      origin: 'bottom',
      distance: '50px',
      duration: 800,
      easing: 'ease-out',
      opacity: 0,
      interval: 200
    });

    sr.reveal('.project-card', {
      origin: 'bottom',
      distance: '50px',
      duration: 900,
      easing: 'ease-out',
      opacity: 0,
      interval: 180
    });
  }


});
