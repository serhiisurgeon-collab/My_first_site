document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', function(e) {
    e.preventDefault();
    
    const target = document.querySelector(this.getAttribute('href'));
    target.scrollIntoView({
      behavior: 'smooth'
    });
  });
});

const navbar = document.querySelector('.navbar-main');

function onScroll() {
  if (window.scrollY > 10) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
}

window.addEventListener('scroll', onScroll);


const burger = document.querySelector('.burger');
const menu = document.querySelector('.nav-menu');

burger.addEventListener('click', () => {
  menu.classList.toggle('open');
  burger.classList.toggle('open');
});

document.addEventListener('click', (event) => {
  const clickInsideMenu = menu.contains(event.target);
  const clickInsideBurger = burger.contains(event.target);

  if (!clickInsideMenu && !clickInsideBurger) {
    menu.classList.remove('open');
    burger.classList.remove('open');
  }
});

if (typeof ScrollReveal !== 'undefined') {
  const sr = ScrollReveal({
    reset: true
  });

  sr.reveal('.photo_room', {
    origin: 'right',
    distance: '80px',
    duration: 900,
    easing: 'ease-out',
  });
}

