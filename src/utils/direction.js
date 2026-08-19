// Layout direction helper. setUiLocale writes dir="rtl" on <html> for Arabic and
// Urdu; horizontal keys and gestures must follow the visual direction the same way
// the seek bar does (see ProgressBar), so read the attribute live rather than
// caching it: switching the UI language mid-session flips it without a reload.
export function isRtlDocument() {
  if (typeof document === 'undefined') {
    return false
  }
  return (document.documentElement.getAttribute('dir') || '').toLowerCase() === 'rtl'
}
