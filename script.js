document.addEventListener('DOMContentLoaded', () => {
  // Поточний рік у footer
  const yearEl = document.getElementById('year');

  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // Основні елементи
  const pageWrapper = document.querySelector('.page-wrapper');
  const navbar = document.querySelector('.navbar');
  const toTop = document.getElementById('toTop');

  // Елементи секції проєктів
  const projectsSection = document.querySelector('.projects-section');
  const projectsOverlay = document.querySelector('.projects-overlay');
  const detailButtons = document.querySelectorAll('.project-details-btn');
  const closeButtons = document.querySelectorAll('.project-close-btn');

    if (toTop) {
      toTop.addEventListener('click', () => {
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      });
    }

  let lastScroll = window.scrollY;

  function handleScroll() {
    const scroll = window.scrollY;


    if (pageWrapper) {
      const rect = pageWrapper.getBoundingClientRect();

      if (rect.top <= 5) {
        pageWrapper.classList.add('solid');
      } else {
        pageWrapper.classList.remove('solid');
      }
    }


    if (navbar) {
      const nearBottom =
        window.innerHeight + scroll >= document.documentElement.scrollHeight - 20;

      const pageStarted =
        pageWrapper && pageWrapper.getBoundingClientRect().top <= 120;

      if (!pageStarted) {
        navbar.classList.remove('visible');
        navbar.classList.add('hidden');
      } else if (nearBottom) {
        navbar.classList.add('visible');
        navbar.classList.remove('hidden');
      } else if (scroll > lastScroll && scroll > 80) {
        navbar.classList.remove('visible');
        navbar.classList.add('hidden');
      } else {
        navbar.classList.add('visible');
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


  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        handleScroll();
        ticking = false;
      });

      ticking = true;
    }
  }, { passive: true });


function closeActiveProject() {
  const activeCard = document.querySelector('.project-focus-card.is-active');

  if (!activeCard || !projectsSection) return;

  activeCard.classList.remove('is-flipped');

  setTimeout(() => {
    activeCard.classList.remove('is-active');
    projectsSection.classList.remove('focus-mode');
    document.body.classList.remove('focus-mode', 'no-scroll');
  }, 450);
}

detailButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const card = button.closest('.project-focus-card');

    if (!card || !projectsSection) return;

    document.body.classList.add('focus-mode', 'no-scroll');
    projectsSection.classList.add('focus-mode');
    card.classList.add('is-active');

    setTimeout(() => {
      card.classList.add('is-flipped');
    }, 280);
  });
});

closeButtons.forEach((button) => {
  button.addEventListener('click', closeActiveProject);
});

if (projectsOverlay) {
  projectsOverlay.addEventListener('click', closeActiveProject);
}

  /*
    ScrollReveal — анімації появи блоків.
    Глобально reset: false, щоб не перевантажувати всю сторінку.
    Повторну анімацію вмикаємо тільки для потрібних блоків.
  */
  if (typeof ScrollReveal !== 'undefined') {
    const sr = ScrollReveal({
      reset: false,
      cleanup: false
    });

    sr.reveal('.hero-text', {
      origin: 'bottom',
      distance: '24px',
      duration: 700,
      easing: 'ease-out',
      opacity: 0
    });

    sr.reveal('.hero-visual', {
      origin: 'bottom',
      distance: '24px',
      duration: 700,
      easing: 'ease-out',
      opacity: 0
    });

    sr.reveal('h2', {
      origin: 'bottom',
      distance: '20px',
      duration: 600,
      easing: 'ease-out',
      opacity: 0,
      interval: 80
    });

    sr.reveal('.about-box', {
      origin: 'bottom',
      distance: '24px',
      duration: 650,
      easing: 'ease-out',
      opacity: 0,
      interval: 120,
      reset: true
    });

    /*
      Для проєктних карток краще не вішати reveal на .project-card,
      бо .project-card / .project-focus-card бере участь у flip/focus-анімації.
      Якщо хочеш повторну reveal-анімацію проєкту — додай клас reveal-card
      до article або до безпечного wrapper-елемента.
    */
    sr.reveal('.reveal-card', {
      origin: 'bottom',
      distance: '24px',
      duration: 700,
      easing: 'ease-out',
      opacity: 0,
      interval: 120,
      reset: true
    });
  }
});