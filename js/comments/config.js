// PUBLIC web config only. Production is deliberately disabled until approval.
export const commentsConfig = {
  enabled: false,
  firebase: null,
  pageSize: 20,
  emulators: null
};
// Explicit local demo opt-in; a public URL cannot switch production to a demo.
if (['localhost', '127.0.0.1'].includes(location.hostname) &&
    new URL(location.href).searchParams.get('commentsEmulator') === '1') {
  Object.assign(commentsConfig, {
    enabled: true,
    firebase: { apiKey: 'demo-key', projectId: 'demo-serhii-comments', authDomain: 'demo-serhii-comments.firebaseapp.com' },
    emulators: { auth: 'http://127.0.0.1:9099', firestoreHost: '127.0.0.1', firestorePort: 8080 }
  });
}
