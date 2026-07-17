document.addEventListener('DOMContentLoaded', () => {
  requestAnimationFrame(() => {
  document.body.classList.add('hero-loaded');
  const heroScrollButton = document.querySelector('.start-hero__scroll');

const heroPhotoWrap = document.querySelector('.start-hero__photo-wrap');

if (heroPhotoWrap) {
  heroPhotoWrap.addEventListener('pointermove', (event) => {
    const rect = heroPhotoWrap.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;

    heroPhotoWrap.style.setProperty('--light-x', `${xPercent}%`);
    heroPhotoWrap.style.setProperty('--light-y', `${yPercent}%`);

    heroPhotoWrap.style.setProperty(
      '--light-x-num',
      String(x / rect.width)
    );

    heroPhotoWrap.style.setProperty(
      '--light-y-num',
      String(y / rect.height)
    );
  });

  heroPhotoWrap.addEventListener('pointerleave', () => {
    heroPhotoWrap.style.setProperty('--light-x', '50%');
    heroPhotoWrap.style.setProperty('--light-y', '50%');
    heroPhotoWrap.style.setProperty('--light-x-num', '0.5');
    heroPhotoWrap.style.setProperty('--light-y-num', '0.5');
  });
}

if (heroScrollButton) {
  heroScrollButton.addEventListener('click', (event) => {
    event.preventDefault();

    const targetSelector = heroScrollButton.getAttribute('href');
    const target = document.querySelector(targetSelector);

    if (!target) return;

    const startPosition = window.scrollY;
    const targetPosition =
      target.getBoundingClientRect().top + window.scrollY;

    const distance = targetPosition - startPosition;
    const duration = 1300;
    const startTime = performance.now();

    function easeInOutCubic(progress) {
      return progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    }

    function animateScroll(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeInOutCubic(progress);

      window.scrollTo(
        0,
        startPosition + distance * easedProgress
      );

      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      }
    }

    requestAnimationFrame(animateScroll);
  });
}
});
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

let lastScrollY = window.scrollY;
let ticking = false;

function handleScroll() {
  const currentScrollY = window.scrollY;

  const viewportBottom =
    currentScrollY + window.innerHeight;

  const documentHeight = Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight,
    document.body.offsetHeight,
    document.documentElement.offsetHeight
  );

  /*
    Допуск у 4 px потрібен через дробові значення висоти,
    масштаб браузера та особливості мобільних браузерів.
  */
  const reachedPageBottom =
    viewportBottom >= documentHeight - 4;

  const scrollingUp =
    currentScrollY < lastScrollY;

  if (navbar) {
    /*
      Навбар з’являється лише в самому низу сторінки.
      Щойно користувач починає рухатися вгору —
      навбар одразу ховається.
    */
    if (reachedPageBottom && !scrollingUp) {
      navbar.classList.add('visible');
      navbar.classList.remove('hidden');
    } else {
      navbar.classList.remove('visible');
      navbar.classList.add('hidden');
    }
  }

  if (toTop) {
    toTop.classList.toggle('show', currentScrollY > 400);
  }

  lastScrollY = currentScrollY;
}

function requestScrollUpdate() {
  if (ticking) return;

  ticking = true;

  requestAnimationFrame(() => {
    handleScroll();
    ticking = false;
  });
}

window.addEventListener('scroll', requestScrollUpdate, {
  passive: true
});

window.addEventListener('resize', requestScrollUpdate);

/*
  Повторна перевірка після завантаження фото, шрифтів
  та інших елементів, які можуть змінити висоту сторінки.
*/
window.addEventListener('load', requestScrollUpdate);

handleScroll();


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