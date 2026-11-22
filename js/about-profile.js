/** Copy only the visible, localised speaker biography. */
export async function copyBiography(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* Fall back when clipboard permission or secure context is unavailable. */ }

  const previous = document.activeElement;
  const selection = window.getSelection();
  const ranges = selection ? Array.from({ length: selection.rangeCount }, (_, i) => selection.getRangeAt(i).cloneRange()) : [];
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.setAttribute('aria-label', document.documentElement.lang === 'en' ? 'Biography to copy' : 'Біографія для копіювання');
  field.className = 'profile-clipboard-field';
  document.body.append(field);
  let copied = false;
  try {
    field.select();
    copied = document.execCommand('copy');
  } catch { copied = false; }
  finally {
    field.remove();
    selection?.removeAllRanges();
    for (const range of ranges) selection?.addRange(range);
    if (previous instanceof HTMLElement) previous.focus({ preventScroll: true });
  }
  return copied;
}

function initialiseBiographyCopy() {
  const root = document.querySelector('.about-profile');
  const button = root?.querySelector('[data-copy-bio]');
  const bio = root?.querySelector('#profile-bio');
  const status = root?.querySelector('[data-copy-status]');
  if (!button || !bio || !status) return;
  button.hidden = false;
  button.addEventListener('click', async () => {
    const hadFocus = document.activeElement === button;
    button.disabled = true;
    status.textContent = '';
    try {
      const text = Array.from(bio.querySelectorAll('p'), paragraph => paragraph.textContent.trim()).join('\n\n');
      const copied = await copyBiography(text);
      status.textContent = copied ? button.dataset.copySuccess : button.dataset.copyError;
      if (!copied) {
        bio.focus({ preventScroll: true });
        const range = document.createRange();
        range.selectNodeContents(bio);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    } finally {
      button.disabled = false;
      if (hadFocus && document.activeElement !== bio) button.focus({ preventScroll: true });
    }
  });
}
initialiseBiographyCopy();

/** A scroll-linked reflection on the frame; the portrait itself stays still. */
function initialisePortraitReflection() {
  const portrait = document.querySelector('.about-profile .profile-portrait');
  if (!portrait) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible = true;
  let frame = 0;

  function update() {
    frame = 0;
    if (reducedMotion.matches) {
      portrait.style.removeProperty('--portrait-glint-angle');
      return;
    }
    if (!visible) return;
    const rect = portrait.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (window.innerHeight - rect.top) / (window.innerHeight + rect.height)));
    portrait.style.setProperty('--portrait-glint-angle', `${(80 + progress * 360).toFixed(2)}deg`);
  }

  function schedule() {
    if (!frame && visible && !reducedMotion.matches) frame = requestAnimationFrame(update);
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) schedule();
    });
    observer.observe(portrait);
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  reducedMotion.addEventListener('change', update);
  schedule();
}
initialisePortraitReflection();
