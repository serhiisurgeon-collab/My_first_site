document.addEventListener('DOMContentLoaded', () => {
  requestAnimationFrame(() => {
    document.body.classList.add('hero-loaded');
  });
});

const projectsMeta = document.querySelector('.projects-meta');

if (projectsMeta) {
  let metaTicking = false;

  const updateProjectsMetaGlass = () => {
    const rect = projectsMeta.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;

    /* прогрес проходження блоку через viewport */
    const progress = (vh - rect.top) / (vh + rect.height);
    const clamped = Math.max(0, Math.min(1, progress));

    /* рух блиску зліва направо */
    const shift = -18 + clamped * 46;

    /* зміщення м’якого світла */
    const glowX = 82 - clamped * 22;
    const glowY = 16 + clamped * 18;

    projectsMeta.style.setProperty('--glass-shift', `${shift}%`);
    projectsMeta.style.setProperty('--glass-glow-x', `${glowX}%`);
    projectsMeta.style.setProperty('--glass-glow-y', `${glowY}%`);

    metaTicking = false;
  };

  const requestMetaUpdate = () => {
    if (!metaTicking) {
      window.requestAnimationFrame(updateProjectsMetaGlass);
      metaTicking = true;
    }
  };

  updateProjectsMetaGlass();

  window.addEventListener('scroll', requestMetaUpdate, { passive: true });
  window.addEventListener('resize', requestMetaUpdate);
}