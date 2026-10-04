// Legacy settings remain readable; disabled legacy discussions stay hidden.
export const SETTINGS_SCHEMA_VERSION = 2;
export function validateSettings(settings) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return false;
  const keys = settings.schemaVersion === 1
    ? ['enabled', 'moderationMode', 'schemaVersion']
    : settings.schemaVersion === 2
      ? ['enabled', 'visibility', 'moderationMode', 'schemaVersion']
      : [];
  return keys.length > 0 && Object.keys(settings).length === keys.length &&
    keys.every(key => Object.hasOwn(settings, key)) &&
    typeof settings.enabled === 'boolean' && ['pre', 'post'].includes(settings.moderationMode) &&
    (settings.schemaVersion === 1 ||
      (['visible', 'hidden'].includes(settings.visibility) &&
        !(settings.visibility === 'hidden' && settings.enabled)));
}
export function normalizeSettings(settings) {
  if (!validateSettings(settings)) throw Error('invalid-comments-settings');
  return {
    ...settings,
    visibility: settings.schemaVersion === 1
      ? (settings.enabled ? 'visible' : 'hidden')
      : settings.visibility
  };
}
export function updatedSettings(current, changes) {
  const previous = normalizeSettings(current);
  if (!changes || typeof changes !== 'object' || Array.isArray(changes) ||
      Object.keys(changes).some(key => !['enabled', 'visibility', 'moderationMode'].includes(key))) {
    throw Error('invalid-settings-update');
  }
  const next = { ...previous, ...changes, schemaVersion: SETTINGS_SCHEMA_VERSION };
  if (next.visibility === 'hidden') next.enabled = false;
  if (!validateSettings(next)) throw Error('invalid-comments-settings');
  return next;
}
