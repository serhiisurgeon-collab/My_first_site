document.addEventListener("DOMContentLoaded", () => {

  // Smooth scroll only for anchors on this page
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener("click", function (e) {
      const href = this.getAttribute("href");
      if (!href || href === "#") return; // нічого не робимо

      const target = document.querySelector(href);
      if (!target) return; // якщо нема такого id — не ламаємо JS

      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth" });
    });
  });

  const navbar = document.querySelector(".navbar-main");
  function onScroll() {
    if (!navbar) return;
    if (window.scrollY > 10) navbar.classList.add("scrolled");
    else navbar.classList.remove("scrolled");
  }
  window.addEventListener("scroll", onScroll);
  onScroll(); // одразу застосувати при старті

  // Burger menu
  const burger = document.querySelector(".burger");
  const menu = document.querySelector(".nav-menu");

  if (burger && menu) {
    burger.addEventListener("click", () => {
      menu.classList.toggle("open");
      burger.classList.toggle("open");
    });

    document.addEventListener("click", (event) => {
      const clickInsideMenu = menu.contains(event.target);
      const clickInsideBurger = burger.contains(event.target);

      if (!clickInsideMenu && !clickInsideBurger) {
        menu.classList.remove("open");
        burger.classList.remove("open");
      }
    });
  }

  // ScrollReveal (optional)
  if (typeof ScrollReveal !== "undefined") {
    const sr = ScrollReveal({ reset: true });

    // приклад:
    // sr.reveal(".stat", { distance: "20px", duration: 700, interval: 120 });
  }

  // Slider (5 photos, autoplay 3s)
  (function () {
    const slides = Array.from(document.querySelectorAll(".slide"));
    const dotsWrap = document.getElementById("dots");
    if (!slides.length || !dotsWrap) return;

    let idx = 0;
    let timer = null;

    slides.forEach((_, i) => {
      const b = document.createElement("button");
      b.className = "dot" + (i === 0 ? " is-active" : "");
      b.type = "button";
      b.setAttribute("aria-label", `Слайд ${i + 1}`);
      b.addEventListener("click", () => goTo(i, true));
      dotsWrap.appendChild(b);
    });

    const dots = Array.from(dotsWrap.querySelectorAll(".dot"));

    function render() {
      slides.forEach((s, i) => s.classList.toggle("is-active", i === idx));
      dots.forEach((d, i) => d.classList.toggle("is-active", i === idx));
    }

    function next() {
      idx = (idx + 1) % slides.length;
      render();
    }

    function start() {
      stop();
      timer = setInterval(next, 3000);
    }

    function stop() {
      if (timer) clearInterval(timer);
      timer = null;
    }

    function goTo(i, restart) {
      idx = i;
      render();
      if (restart) start();
    }

    const slider = document.getElementById("slider");
    if (slider) {
      slider.addEventListener("mouseenter", stop);
      slider.addEventListener("mouseleave", start);
    }

    start();
  })();

    // Counters
    (function () {
    const els = document.querySelectorAll(".stat-number[data-target]");
    if (!els.length) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function format(n) {
      return n.toLocaleString("uk-UA");
    }

    function animate(el) {
      const target = Number(el.dataset.target || "0");
      const duration = 1200;
      const start = performance.now();

      // якщо reduce-motion — просто показуємо target без анімації
      if (prefersReduced) {
        el.textContent = format(target);
        return;
      }

      // на старті завжди 0
      el.textContent = format(0);

      function tick(now) {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        const val = Math.round(target * eased);
        el.textContent = format(val);

        if (t < 1) {
          el._raf = requestAnimationFrame(tick);
        } else {
          el._raf = null;
        }
      }

      // якщо раптом був попередній RAF — зупинимо
      if (el._raf) cancelAnimationFrame(el._raf);
      el._raf = requestAnimationFrame(tick);
    }

    function reset(el) {
      // зупиняємо можливу анімацію
      if (el._raf) {
        cancelAnimationFrame(el._raf);
        el._raf = null;
      }
      el.textContent = format(0);
    }

    // стан: чи елемент вже "активний" (в полі зору)
    els.forEach(el => {
      el._seen = false;
      el.textContent = Number(el.textContent) ? el.textContent : format(0);
    });

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const el = e.target;

        if (e.isIntersecting) {
          // запускаємо тільки якщо до цього був "поза зоною"
          if (!el._seen) {
            el._seen = true;
            animate(el);
          }
        } else {
          // коли вийшов з поля зору — скидаємо, щоб при поверненні анімувалось знову
          el._seen = false;
          reset(el);
        }
      });
    }, { threshold: 0.35 });

    els.forEach(el => io.observe(el));
  })();

});

