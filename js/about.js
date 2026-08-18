document.addEventListener("DOMContentLoaded", () => {
  const hero = document.querySelector(".about-hero");
  const heroBackground = document.querySelector(
    ".about-hero__background"
  );

  if (!hero || !heroBackground) {
    return;
  }

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  let hasStarted = false;

  const showHero = () => {
    if (hasStarted) {
      return;
    }

    hasStarted = true;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        hero.classList.add("is-visible");
      });
    });
  };

  /*
   * Якщо користувач вимкнув анімації
   * у системних налаштуваннях — показуємо все одразу.
   */
  if (prefersReducedMotion) {
    showHero();
    return;
  }

  /*
   * Отримуємо фактичний URL фонового зображення
   * з CSS.
   */
  const backgroundImage =
    window.getComputedStyle(heroBackground).backgroundImage;

  const imageUrlMatch = backgroundImage.match(
    /url\(["']?(.*?)["']?\)/
  );
  const someElement = document.querySelector(".щось");

if (someElement) {
  const parent = someElement.closest(".щось-ще");
}

  /*
   * Якщо URL не вдалося отримати,
   * запускаємо анімацію без очікування.
   */
  if (!imageUrlMatch || !imageUrlMatch[1]) {
    showHero();
    return;
  }

  const imageUrl = imageUrlMatch[1];
  const image = new Image();

  image.addEventListener("load", showHero, {
    once: true,
  });

  image.addEventListener("error", showHero, {
    once: true,
  });

  image.src = imageUrl;

  /*
   * Якщо фотографія вже є в кеші браузера.
   */
  if (image.complete) {
    showHero();
  }

  /*
   * Страховка: навіть якщо завантаження зависло,
   * Hero все одно проявиться.
   */
  window.setTimeout(showHero, 1800);
});

document.addEventListener("DOMContentLoaded", () => {
  const story = document.querySelector(".about-path__story");
  const aboutSection = story?.closest(".about-path");
  const copyWrapper = document.querySelector(".about-path__story-copy");
  const toggleButton = document.querySelector("[data-story-toggle]");
  const buttonText = document.querySelector(
    "[data-story-button-text]"
  );

  const shortPanel = document.querySelector(
    '[data-story-panel="short"]'
  );

  const gallery = document.querySelector(
  "[data-story-gallery]"
    );

  const fullPanel = document.querySelector(
    '[data-story-panel="full"]'
  );

  if (
  !story ||
  !aboutSection ||
  !copyWrapper ||
  !toggleButton ||
  !buttonText ||
  !shortPanel ||
  !fullPanel
) {
  return;
}

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  let isExpanded = false;
  let animationTimer;

  /*
   * JS активний, тому повний текст можна залишити
   * в DOM і керувати його видимістю через класи.
   */
  fullPanel.hidden = false;

  const setInitialHeight = () => {
    copyWrapper.style.height =
      `${shortPanel.scrollHeight}px`;
  };

  const changePanel = (nextPanel, currentPanel) => {
    const currentHeight = currentPanel.scrollHeight;
    const nextHeight = nextPanel.scrollHeight;

    /*
     * Фіксуємо поточну висоту, щоб браузер
     * мав від чого починати анімацію.
     */
    copyWrapper.style.height = `${currentHeight}px`;

    currentPanel.classList.remove("is-active");
    nextPanel.classList.add("is-active");

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        copyWrapper.style.height = `${nextHeight}px`;
      });
    });
  };

  const triggerGlow = () => {
    story.classList.remove("is-expanding");

    /*
     * Примусово перезапускаємо CSS-анімацію.
     */
    void story.offsetWidth;

    story.classList.add("is-expanding");

    window.clearTimeout(animationTimer);

    animationTimer = window.setTimeout(() => {
      story.classList.remove("is-expanding");
    }, 950);
  };

toggleButton.addEventListener("click", () => {
  /*
   * До перемикання запам’ятовуємо:
   * історія зараз відкрита чи ні.
   */
  const isCollapsing = isExpanded;

  isExpanded = !isExpanded;
 
    aboutSection?.classList.toggle(
    "is-story-open",
    isExpanded
  );

  gallery?.setAttribute(
    "aria-hidden",
    String(!isExpanded)
  );
  
  const currentPanel = isExpanded
    ? shortPanel
    : fullPanel;

  const nextPanel = isExpanded
    ? fullPanel
    : shortPanel;

  toggleButton.setAttribute(
    "aria-expanded",
    String(isExpanded)
  );

  buttonText.textContent = isExpanded
    ? "Згорнути історію"
    : "Більше про мій досвід";

  if (prefersReducedMotion) {
    currentPanel.classList.remove("is-active");
    nextPanel.classList.add("is-active");

    copyWrapper.style.height =
      `${nextPanel.scrollHeight}px`;

    if (isCollapsing) {
      aboutSection.scrollIntoView({
        behavior: "auto",
        block: "start",
      });
    }

    return;
  }

  triggerGlow();
  changePanel(nextPanel, currentPanel);

  /*
   * Скролимо тільки після натискання
   * кнопки «Згорнути історію».
   */
  if (isCollapsing) {
    requestAnimationFrame(() => {
      aboutSection.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }
});

  /*
   * Перераховуємо висоту після зміни ширини екрана,
   * адже текст може переноситися на інші рядки.
   */
  window.addEventListener("resize", () => {
    const activePanel = isExpanded
      ? fullPanel
      : shortPanel;

    copyWrapper.style.height =
      `${activePanel.scrollHeight}px`;
  });

  setInitialHeight();
});