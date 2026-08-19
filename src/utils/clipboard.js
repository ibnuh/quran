// Copy text to the clipboard without ever throwing. The async Clipboard API is
// unavailable in insecure contexts and some embedded webviews, where a bare
// navigator.clipboard.writeText call raises a synchronous TypeError.
export async function copyText(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Permission denied or transient failure; try the legacy path.
    }
  }
  return legacyCopy(text)
}

function legacyCopy(text) {
  if (typeof document === 'undefined' || typeof document.execCommand !== 'function') {
    return false
  }
  const el = document.createElement('textarea')
  el.value = text
  el.setAttribute('readonly', '')
  el.style.position = 'fixed'
  el.style.opacity = '0'
  document.body.appendChild(el)
  const selection = document.getSelection()
  const priorRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null
  let ok = false
  try {
    el.select()
    ok = document.execCommand('copy')
  } catch {
    ok = false
  } finally {
    el.remove()
    if (priorRange && selection) {
      selection.removeAllRanges()
      selection.addRange(priorRange)
    }
  }
  return ok
}
