// Announce a message to the polite live region rendered in App.vue.
// Throttled so rapid verse changes during playback do not flood screen readers.
export function useScreenReader(minIntervalMs = 600) {
  let lastAnnounce = 0
  let pending = null
  let timer = null

  function flush(message) {
    const el = document.getElementById('sr-announcements')
    if (el) {
      el.textContent = message
    }
    lastAnnounce = Date.now()
  }

  function announce(message) {
    const now = Date.now()
    const elapsed = now - lastAnnounce
    if (elapsed >= minIntervalMs) {
      flush(message)
      return
    }
    // Coalesce: keep only the latest message and emit it when the window opens.
    pending = message
    if (!timer) {
      timer = setTimeout(() => {
        timer = null
        if (pending !== null) {
          flush(pending)
          pending = null
        }
      }, minIntervalMs - elapsed)
    }
  }

  return { announce }
}
