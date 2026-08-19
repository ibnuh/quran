// Web Storage access can throw in ways optional chaining cannot guard: Chrome
// with site data blocked throws a SecurityError from the window.localStorage
// getter itself, and Safari private mode throws on setItem. These helpers never
// throw, so optional features (debug flags, dismissed tips, install prompts)
// degrade gracefully instead of crashing the app.

export function safeLocalStorageGet(key) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeLocalStorageSet(key, value) {
  try {
    window.localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function safeLocalStorageRemove(key) {
  try {
    window.localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}
