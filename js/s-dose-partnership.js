// Shared UA/EN component. Only public, owner-approved contact configuration.
export const partnershipConfig = {
  action: 'mailto:hello@serhiipelishenko.com?subject=S-Dose%20publishing%20partnership',
  sessionKey: 's-dose-partnership-shown',
  banners: {
    uk: '/assets/images/s_dose/s-dose-partnership-uk.webp',
    en: '/assets/images/s_dose/en/s-dose-partnership-en.webp',
  },
};

const trigger = document.querySelector('[data-partnership-open]');
if (trigger && /^\/(?:s-dose\.html|en\/s-dose-en\.html)$/.test(location.pathname)) {
  const en = document.documentElement.lang === 'en';
  const labels = en ? {
    title: 'S-Dose publishing partnership', close: 'Close', action: 'Discuss a partnership',
    alt: 'S-Dose — seeking a publishing partner',
    unavailable: 'The partnership banner is temporarily unavailable. You can contact me by email.',
  } : {
    title: 'Партнерство для S-Dose', close: 'Закрити', action: 'Запропонувати співпрацю',
    alt: 'S-Dose — пошук партнера для публікації застосунку',
    unavailable: 'Банер партнерства тимчасово недоступний. Ви можете написати мені електронною поштою.',
  };
  const dialog = document.createElement('dialog');
  dialog.className = 's-dose-partnership';
  dialog.setAttribute('aria-label', labels.title);
  const close = document.createElement('button');
  close.type = 'button'; close.className = 's-dose-partnership__close';
  close.setAttribute('aria-label', labels.close); close.textContent = '×';
  const header = document.createElement('div'); header.className = 's-dose-partnership__header'; header.append(close);
  const image = new Image(); image.className = 's-dose-partnership__banner'; image.alt = labels.alt;
  image.width = 1734; image.height = 907; image.decoding = 'async';
  const action = document.createElement('a'); action.className = 's-dose-partnership__action';
  action.href = partnershipConfig.action; action.textContent = labels.action;
  const footer = document.createElement('div'); footer.className = 's-dose-partnership__footer'; footer.append(action);
  dialog.append(header, image, footer); document.body.append(dialog);
  const status = document.querySelector('[data-partnership-status]');
  let loaded = null, opening = false, returnFocus = trigger, saved = [];
  let storage = null;
  try { const test = partnershipConfig.sessionKey + '-check'; sessionStorage.setItem(test, '1'); sessionStorage.removeItem(test); storage = sessionStorage; } catch { /* Manual opening remains usable. */ }
  function banner() {
    if (loaded) return loaded;
    loaded = new Promise(resolve => {
      image.onload = () => { image.width = image.naturalWidth; image.height = image.naturalHeight; resolve(true); };
      image.onerror = () => { loaded = null; resolve(false); };
      image.src = partnershipConfig.banners[en ? 'en' : 'uk'];
    });
    return loaded;
  }
  async function open(automatic = false) {
    if (opening || dialog.open) return;
    opening = true;
    const available = typeof dialog.showModal === 'function' && await banner();
    opening = false;
    if (!available) {
      if (!automatic && status) { status.hidden = false; status.textContent = labels.unavailable + ' '; const link = action.cloneNode(true); status.append(link); }
      return;
    }
    if (status) status.hidden = true;
    returnFocus = automatic ? trigger : document.activeElement;
    saved = [[document.documentElement, 'overflow'], [document.body, 'overflow'], [document.body, 'padding-right']]
      .map(([element, property]) => ({element, property, value: element.style.getPropertyValue(property), priority: element.style.getPropertyPriority(property)}));
    const gap = innerWidth - document.documentElement.clientWidth;
    if (gap > 0) document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + gap}px`;
    document.documentElement.style.overflow = 'hidden'; document.body.style.overflow = 'hidden';
    dialog.showModal(); close.focus({preventScroll: true});
    try { storage?.setItem(partnershipConfig.sessionKey, '1'); } catch { /* No storage requirement for manual opening. */ }
  }
  dialog.addEventListener('close', () => {
    for (const {element, property, value, priority} of saved) {
      if (value) element.style.setProperty(property, value, priority); else element.style.removeProperty(property);
    }
    saved = [];
    if (returnFocus?.isConnected) returnFocus.focus({preventScroll: true});
  });
  close.addEventListener('click', () => dialog.close());
  // Native dialog handles Escape and makes the rest of the document inert.
  let backdropDown = false;
  const outside = event => { const r = dialog.getBoundingClientRect(); return event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom; };
  dialog.addEventListener('pointerdown', event => { backdropDown = event.target === dialog && outside(event); });
  dialog.addEventListener('click', event => { if (backdropDown && event.target === dialog && outside(event)) dialog.close(); backdropDown = false; });
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    if (event.shiftKey && document.activeElement === close) { event.preventDefault(); action.focus(); }
    else if (!event.shiftKey && document.activeElement === action) { event.preventDefault(); close.focus(); }
  });
  trigger.hidden = false; trigger.addEventListener('click', () => open());
  let automatic = false;
  try { automatic = storage && !storage.getItem(partnershipConfig.sessionKey); } catch { /* Skip automatic display. */ }
  if (automatic) {
    if (document.readyState === 'complete') open(true);
    else window.addEventListener('load', () => open(true), {once: true});
  }
}
