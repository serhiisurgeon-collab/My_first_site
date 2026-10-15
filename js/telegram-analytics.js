/* Consent-gated integration point. Does not load GA4, set cookies or send events
   by itself. Activate only with the site's approved consent and GA4 adapters. */
const installed = new WeakMap();
const locations = new Set(['hero', 'getting-started', 'free', 'premium', 'language-uk', 'language-en', 'language-de', 'language-es']);
export function installTelegramAnalytics({ root = document, hasAnalyticsConsent, sendEvent }) {
  if (installed.has(root)) return installed.get(root);
  if (typeof hasAnalyticsConsent !== 'function' || typeof sendEvent !== 'function') {
    throw new TypeError('Explicit consent and event adapters are required');
  }
  const listener = event => {
    const link = event.target.closest?.('a[data-telegram-location]');
    if (!link || !root.contains(link)) return;
    const url = new URL(link.href);
    if (url.origin !== 'https://t.me' || url.pathname !== '/serhii_spanish_bot' || url.search) return;
    const pageLanguage = root.documentElement?.lang || root.ownerDocument?.documentElement.lang;
    const location = link.dataset.telegramLocation;
    if (!['uk', 'en', 'de', 'es'].includes(pageLanguage) || !locations.has(location)) return;
    // Read consent at click time, so revocation takes effect immediately.
    try {
      if (hasAnalyticsConsent() !== true) return;
      sendEvent('telegram_bot_click', { page_language: pageLanguage, button_location: location });
    } catch {
      // Analytics must never block the Telegram navigation.
    }
  };
  root.addEventListener('click', listener);
  const dispose = () => { root.removeEventListener('click', listener); installed.delete(root); };
  installed.set(root, dispose);
  return dispose;
}
