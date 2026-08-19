import { ref, onBeforeUnmount } from 'vue'

// Countdown that invokes onExpire (typically pause playback) after N minutes.
export function useSleepTimer(onExpire) {
  const activeMinutes = ref(0) // 0 means the timer is off
  const remainingMs = ref(0)
  let timeout = null
  let interval = null
  let endAt = 0

  function clear() {
    clearTimeout(timeout)
    clearInterval(interval)
    timeout = null
    interval = null
    activeMinutes.value = 0
    remainingMs.value = 0
  }

  function expire() {
    onExpire()
    clear()
  }

  function start(minutes) {
    clear()
    if (!minutes) {
      return
    }
    activeMinutes.value = minutes
    endAt = Date.now() + minutes * 60000
    remainingMs.value = minutes * 60000
    timeout = setTimeout(expire, minutes * 60000)
    interval = setInterval(() => {
      const remaining = Math.max(0, endAt - Date.now())
      remainingMs.value = remaining
      // Safety net: background tabs throttle long timeouts, so the deadline can
      // pass long before the timeout fires. Expire on wall-clock time instead of
      // letting playback overshoot; clear() below also cancels the stale timeout.
      if (remaining <= 0) {
        expire()
      }
    }, 1000)
  }

  onBeforeUnmount(clear)

  return { activeMinutes, remainingMs, start, cancel: clear }
}
