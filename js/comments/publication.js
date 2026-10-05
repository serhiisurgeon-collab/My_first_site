// A version identifies the exact bilingual publication notice, not Google sign-in.
export const PUBLICATION_NOTICE_VERSION = 'comments-publication-2026-10-v1';
export const publicationNotice = {
  uk: {
    text: 'Після модерації ваше ім’я, текст і дата коментаря будуть публічно доступні, зокрема через API. Не публікуйте персональних даних пацієнтів або чутливих службових відомостей.',
    confirmation: 'Погоджуюся на публікацію імені та цього повідомлення після модерації.',
    policy: 'Політика приватності'
  },
  en: {
    text: 'After moderation, your name, text and comment date will be publicly accessible, including through the API. Do not post patients’ personal data or sensitive operational information.',
    confirmation: 'I agree to publication of my name and this contribution after moderation.',
    policy: 'Privacy policy'
  }
};
// Existing post-moderation mode needs a different, equally explicit notice.
export const PUBLICATION_POST_NOTICE_VERSION = 'comments-publication-post-2026-10-v1';
export const postPublicationNotice = {
  uk: {text:'Після надсилання ваше ім’я, текст і дата коментаря стануть публічно доступними одразу, зокрема через API; модератор може приховати повідомлення. Не публікуйте персональних даних пацієнтів або чутливих службових відомостей.',confirmation:'Погоджуюся на негайну публікацію імені та цього повідомлення.',policy:'Політика приватності'},
  en: {text:'Your name, text and comment date will become public immediately after submission, including through the API; a moderator may hide the contribution. Do not post patients’ personal data or sensitive operational information.',confirmation:'I agree to immediate publication of my name and this contribution.',policy:'Privacy policy'}
};
