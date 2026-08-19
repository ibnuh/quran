<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePlayerStore } from '../stores/player.js'
import THEMES from '../data/themes.js'
import JuzPicker from './JuzPicker.vue'

const emit = defineEmits([
  'open-settings',
  'toggle-verses',
  'toggle-shortcuts',
  'toggle-settings-bar',
  'toggle-bookmarks',
  'toggle-search'
])
const store = usePlayerStore()
const { t } = useI18n()
const showThemePicker = ref(false)
const showMoreMenu = ref(false)
const showModeMenu = ref(false)

const activityLabel = computed(() =>
  store.readMode ? t('header.readMode') : t('header.listenMode')
)
const layoutLabel = computed(() =>
  store.readingMode ? t('header.layoutContinuous') : t('header.layoutSingle')
)
const modeSummary = computed(() => `${activityLabel.value} · ${layoutLabel.value}`)
// Compact mobile label keeps both axes visible without overflowing the toolbar.
const modeSummaryCompact = computed(() => {
  const activity = store.readMode ? t('header.readModeShort') : t('header.listenModeShort')
  const layout = store.readingMode
    ? t('header.layoutContinuousShort')
    : t('header.layoutSingleShort')
  return `${activity} · ${layout}`
})

function handleSettingsClick() {
  emit('open-settings')
}

function closeAllMenus() {
  showThemePicker.value = false
  showMoreMenu.value = false
  showModeMenu.value = false
}

function toggleThemePicker() {
  const next = !showThemePicker.value
  closeAllMenus()
  showThemePicker.value = next
}

function toggleMoreMenu() {
  const next = !showMoreMenu.value
  closeAllMenus()
  showMoreMenu.value = next
}

function toggleModeMenu() {
  const next = !showModeMenu.value
  closeAllMenus()
  showModeMenu.value = next
}

function selectTheme(id) {
  store.setTheme(id)
  showThemePicker.value = false
}

function setActivity(readMode) {
  store.setReadMode(readMode)
}

function setLayout(readingMode) {
  store.setReadingMode(readingMode)
}

function onMoreAction(action) {
  showMoreMenu.value = false
  if (action === 'bookmarks') {
    emit('toggle-bookmarks')
  } else if (action === 'shortcuts') {
    emit('toggle-shortcuts')
  } else if (action === 'auto-hide') {
    store.setAutoHideControls(!store.autoHideControls)
  }
}

function onClickOutside(e) {
  if (showThemePicker.value && !e.target.closest('.theme-picker-wrapper')) {
    showThemePicker.value = false
  }
  if (showMoreMenu.value && !e.target.closest('.more-menu-wrapper')) {
    showMoreMenu.value = false
  }
  if (showModeMenu.value && !e.target.closest('.mode-menu-wrapper')) {
    showModeMenu.value = false
  }
}

function onThemePickerKeydown(e) {
  if (!showThemePicker.value) {
    return
  }
  const buttons = Array.from(
    document.querySelectorAll('.theme-picker-wrapper [role="menu"] button')
  )
  if (!buttons.length) {
    return
  }
  const current = buttons.indexOf(document.activeElement)
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    buttons[Math.min(current + 1, buttons.length - 1)].focus()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    buttons[Math.max(current - 1, 0)].focus()
  } else if (e.key === 'Escape') {
    showThemePicker.value = false
  }
}

function onMoreMenuKeydown(e) {
  if (!showMoreMenu.value) {
    return
  }
  const buttons = Array.from(document.querySelectorAll('.more-menu-wrapper [role="menu"] button'))
  if (!buttons.length) {
    return
  }
  const current = buttons.indexOf(document.activeElement)
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    buttons[Math.min(current + 1, buttons.length - 1)].focus()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    buttons[Math.max(current - 1, 0)].focus()
  } else if (e.key === 'Escape') {
    showMoreMenu.value = false
  }
}

function onModeMenuKeydown(e) {
  if (!showModeMenu.value) {
    return
  }
  if (e.key === 'Escape') {
    showModeMenu.value = false
    return
  }
  const buttons = Array.from(document.querySelectorAll('.mode-menu-wrapper [role="menuitemradio"]'))
  if (!buttons.length) {
    return
  }
  const current = buttons.indexOf(document.activeElement)
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    buttons[Math.min(current + 1, buttons.length - 1)].focus()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    buttons[Math.max(current - 1, 0)].focus()
  } else if (e.key === 'Home') {
    e.preventDefault()
    buttons[0].focus()
  } else if (e.key === 'End') {
    e.preventDefault()
    buttons[buttons.length - 1].focus()
  }
}

function onDocumentKeydown(e) {
  if (e.key !== 'Escape') {
    return
  }
  if (showMoreMenu.value) {
    showMoreMenu.value = false
  }
  if (showThemePicker.value) {
    showThemePicker.value = false
  }
  if (showModeMenu.value) {
    showModeMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', onClickOutside)
  document.addEventListener('keydown', onDocumentKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside)
  document.removeEventListener('keydown', onDocumentKeydown)
})
</script>

<template>
  <header class="app-header bg-primary text-white">
    <div class="flex items-center justify-between pb-1.5 landscape-compact:pb-1">
      <div class="header-actions header-actions-start flex items-center gap-0.5 sm:gap-1">
        <button
          class="flex header-btn shrink-0"
          :aria-label="$t('header.settings')"
          @click="handleSettingsClick"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
            />
          </svg>
          <span class="hidden sm:inline">{{ $t('header.settings') }}</span>
        </button>
        <button
          class="hidden lg:flex header-btn opacity-80 hover:opacity-100 landscape-compact:!hidden"
          :aria-label="$t('header.toggleQuickSettings')"
          @click="$emit('toggle-settings-bar')"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"
            />
          </svg>
          <span>{{ $t('header.quickSettings') }}</span>
        </button>
        <JuzPicker />
        <button
          class="flex header-btn shrink-0"
          :aria-label="$t('header.search')"
          @click="$emit('toggle-search')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 10-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1114 9.5 4.49 4.49 0 019.5 14z"
            />
          </svg>
          <span class="hidden md:inline">{{ $t('header.search') }}</span>
        </button>
      </div>

      <div class="hidden sm:block landscape-compact:block text-center flex-1 min-w-0 px-2">
        <h1
          class="surah-title font-arabic text-base sm:text-lg landscape-compact:text-sm truncate"
          dir="rtl"
          lang="ar"
          :title="
            store.currentSurah
              ? store.currentSurah.englishName + ' - ' + store.currentSurah.englishNameTranslation
              : ''
          "
        >
          {{ store.currentSurah ? store.currentSurah.name : $t('app.name') }}
        </h1>
        <p
          class="text-[0.65rem] sm:text-[0.7rem] truncate opacity-90 landscape-compact:hidden"
          :class="store.currentSurah ? '' : 'invisible'"
        >
          {{
            store.currentSurah
              ? store.currentSurah.englishName + ' · ' + store.currentSurah.englishNameTranslation
              : '&nbsp;'
          }}
        </p>
      </div>

      <div class="header-actions header-actions-end flex items-center gap-0.5 sm:gap-1">
        <!-- Mode menu: activity (Listen/Read) + layout (Single/Continuous) -->
        <div class="relative mode-menu-wrapper">
          <button
            type="button"
            class="mode-trigger"
            :aria-label="$t('header.modeMenu', { summary: modeSummary })"
            aria-haspopup="menu"
            :aria-expanded="showModeMenu"
            @click.stop="toggleModeMenu"
          >
            <span class="mode-trigger-icon" aria-hidden="true">
              <svg
                v-if="!store.readMode"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" />
              </svg>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"
                />
              </svg>
            </span>
            <span class="mode-trigger-label hidden sm:inline">{{ modeSummary }}</span>
            <span class="mode-trigger-label sm:hidden">{{ modeSummaryCompact }}</span>
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="currentColor"
              class="mode-trigger-caret"
              aria-hidden="true"
            >
              <path d="M7 10l5 5 5-5H7z" />
            </svg>
          </button>
          <Transition name="theme-pop">
            <div
              v-if="showModeMenu"
              role="menu"
              class="mode-menu bg-card rounded-2xl shadow-2xl border border-border z-50"
              @keydown="onModeMenuKeydown"
              @click.stop
            >
              <div class="mode-menu-head">
                <p class="mode-menu-title">{{ $t('header.modeMenuTitle') }}</p>
                <p class="mode-menu-subtitle">{{ modeSummary }}</p>
              </div>

              <div class="mode-menu-body">
                <section class="mode-section" :aria-label="$t('header.activityMode')">
                  <p class="mode-section-label">{{ $t('header.activityMode') }}</p>
                  <div class="mode-options" role="group">
                    <button
                      type="button"
                      role="menuitemradio"
                      class="mode-option"
                      :class="{ 'mode-option-active': !store.readMode }"
                      :aria-checked="!store.readMode"
                      @click="setActivity(false)"
                    >
                      <span class="mode-option-icon" aria-hidden="true">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" />
                        </svg>
                      </span>
                      <span class="mode-option-copy">
                        <span class="mode-option-name">{{ $t('header.listenMode') }}</span>
                        <span class="mode-option-desc">{{ $t('header.listenModeDesc') }}</span>
                      </span>
                      <svg
                        v-if="!store.readMode"
                        class="mode-option-check"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      role="menuitemradio"
                      class="mode-option"
                      :class="{ 'mode-option-active': store.readMode }"
                      :aria-checked="store.readMode"
                      @click="setActivity(true)"
                    >
                      <span class="mode-option-icon" aria-hidden="true">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path
                            d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"
                          />
                        </svg>
                      </span>
                      <span class="mode-option-copy">
                        <span class="mode-option-name">{{ $t('header.readMode') }}</span>
                        <span class="mode-option-desc">{{ $t('header.readModeDesc') }}</span>
                      </span>
                      <svg
                        v-if="store.readMode"
                        class="mode-option-check"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    </button>
                  </div>
                </section>

                <div class="mode-divider" aria-hidden="true"></div>

                <section class="mode-section" :aria-label="$t('header.layoutMode')">
                  <p class="mode-section-label">{{ $t('header.layoutMode') }}</p>
                  <div class="mode-options" role="group">
                    <button
                      type="button"
                      role="menuitemradio"
                      class="mode-option"
                      :class="{ 'mode-option-active': !store.readingMode }"
                      :aria-checked="!store.readingMode"
                      @click="setLayout(false)"
                    >
                      <span class="mode-option-icon" aria-hidden="true">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M4 6h16v2H4V6zm0 5h10v2H4v-2zm0 5h16v2H4v-2z" />
                        </svg>
                      </span>
                      <span class="mode-option-copy">
                        <span class="mode-option-name">{{ $t('header.layoutSingle') }}</span>
                        <span class="mode-option-desc">{{ $t('header.layoutSingleDesc') }}</span>
                      </span>
                      <svg
                        v-if="!store.readingMode"
                        class="mode-option-check"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      role="menuitemradio"
                      class="mode-option"
                      :class="{ 'mode-option-active': store.readingMode }"
                      :aria-checked="store.readingMode"
                      @click="setLayout(true)"
                    >
                      <span class="mode-option-icon" aria-hidden="true">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M4 5h16v2H4V5zm0 4h16v2H4V9zm0 4h16v2H4v-2zm0 4h16v2H4v-2z" />
                        </svg>
                      </span>
                      <span class="mode-option-copy">
                        <span class="mode-option-name">{{ $t('header.layoutContinuous') }}</span>
                        <span class="mode-option-desc">{{
                          $t('header.layoutContinuousDesc')
                        }}</span>
                      </span>
                      <svg
                        v-if="store.readingMode"
                        class="mode-option-check"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </Transition>
        </div>

        <button
          class="hidden sm:flex header-btn opacity-60 hover:opacity-100 relative"
          :aria-label="$t('header.showBookmarks')"
          @click="$emit('toggle-bookmarks')"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z" />
          </svg>
          <span
            v-if="store.bookmarks.length > 0"
            class="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-accent text-white text-[8px] font-bold rounded-full flex items-center justify-center"
            >{{ store.bookmarks.length > 9 ? '9+' : store.bookmarks.length }}</span
          >
        </button>
        <button
          class="hidden sm:flex header-btn opacity-60 hover:opacity-100"
          :aria-label="$t('header.showShortcuts')"
          @click="$emit('toggle-shortcuts')"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z"
            />
          </svg>
        </button>
        <div class="relative theme-picker-wrapper">
          <button
            class="flex header-btn"
            :aria-label="$t('header.changeTheme')"
            @click.stop="toggleThemePicker"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-1-.01-.83.67-1.49 1.5-1.49H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"
              />
            </svg>
            <span class="hidden sm:inline">{{ $t('header.theme') }}</span>
          </button>
          <Transition name="theme-pop">
            <div
              v-if="showThemePicker"
              role="menu"
              class="absolute end-0 top-full mt-2 bg-card rounded-xl shadow-2xl border border-border p-2 z-50 min-w-[160px]"
              @keydown="onThemePickerKeydown"
            >
              <button
                class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-body transition-colors cursor-pointer"
                :class="store.theme === 'auto' ? 'bg-primary/10 font-medium' : 'hover:bg-surface'"
                :aria-label="$t('header.selectTheme', { name: $t('header.auto') })"
                @click="selectTheme('auto')"
              >
                <span
                  class="w-5 h-5 rounded-full border-2 shrink-0 overflow-hidden flex"
                  :style="{ borderColor: 'var(--color-primary)' }"
                >
                  <span class="w-1/2 h-full" style="background: #f8f6f1"></span>
                  <span class="w-1/2 h-full" style="background: #121212"></span>
                </span>
                <span>{{ $t('header.auto') }}</span>
                <svg
                  v-if="store.theme === 'auto'"
                  class="ms-auto w-4 h-4 text-primary"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              </button>
              <button
                v-for="theme in THEMES"
                :key="theme.id"
                class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-body transition-colors cursor-pointer"
                :class="store.theme === theme.id ? 'bg-primary/10 font-medium' : 'hover:bg-surface'"
                :aria-label="$t('header.selectTheme', { name: theme.name })"
                @click="selectTheme(theme.id)"
              >
                <span
                  class="w-5 h-5 rounded-full border-2 shrink-0"
                  :style="{ background: theme.colors.surface, borderColor: theme.colors.primary }"
                ></span>
                <span>{{ theme.name }}</span>
                <svg
                  v-if="store.theme === theme.id"
                  class="ms-auto w-4 h-4 text-primary"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              </button>
            </div>
          </Transition>
        </div>
        <!-- Desktop auto-hide (sm+) -->
        <button
          class="hidden sm:flex header-btn"
          :class="store.autoHideControls ? '' : 'opacity-50'"
          :aria-label="$t('header.toggleAutoHide')"
          @click="store.setAutoHideControls(!store.autoHideControls)"
        >
          <svg
            v-if="store.autoHideControls"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path
              d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
            />
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"
            />
          </svg>
          <span class="hidden sm:inline">{{ $t('header.autoHide') }}</span>
        </button>
        <!-- Mobile more menu (< sm) -->
        <div class="relative more-menu-wrapper sm:hidden">
          <button
            class="flex header-btn relative"
            :aria-label="$t('header.more')"
            aria-haspopup="menu"
            :aria-expanded="showMoreMenu"
            @click.stop="toggleMoreMenu"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"
              />
            </svg>
            <span
              v-if="store.bookmarks.length > 0"
              class="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-accent text-white text-[8px] font-bold rounded-full flex items-center justify-center"
              >{{ store.bookmarks.length > 9 ? '9+' : store.bookmarks.length }}</span
            >
          </button>
          <Transition name="theme-pop">
            <div
              v-if="showMoreMenu"
              role="menu"
              class="absolute end-0 top-full mt-2 bg-card rounded-xl shadow-2xl border border-border p-1.5 z-50 min-w-[180px]"
              @keydown="onMoreMenuKeydown"
            >
              <button
                role="menuitem"
                class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-body transition-colors cursor-pointer hover:bg-surface relative"
                @click="onMoreAction('bookmarks')"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  class="text-primary shrink-0"
                >
                  <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z" />
                </svg>
                <span class="flex-1 text-left">{{ $t('header.showBookmarks') }}</span>
                <span
                  v-if="store.bookmarks.length > 0"
                  class="min-w-[1.125rem] h-[1.125rem] px-1 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center"
                  >{{ store.bookmarks.length > 9 ? '9+' : store.bookmarks.length }}</span
                >
              </button>
              <button
                role="menuitem"
                class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-body transition-colors cursor-pointer hover:bg-surface"
                @click="onMoreAction('shortcuts')"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  class="text-primary shrink-0"
                >
                  <path
                    d="M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z"
                  />
                </svg>
                <span class="flex-1 text-left">{{ $t('header.showShortcuts') }}</span>
              </button>
              <button
                role="menuitem"
                class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-body transition-colors cursor-pointer hover:bg-surface"
                :aria-pressed="store.autoHideControls"
                @click="onMoreAction('auto-hide')"
              >
                <svg
                  v-if="store.autoHideControls"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  class="text-primary shrink-0"
                >
                  <path
                    d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
                  />
                </svg>
                <svg
                  v-else
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  class="text-primary shrink-0 opacity-60"
                >
                  <path
                    d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"
                  />
                </svg>
                <span
                  class="flex-1 text-left"
                  :class="store.autoHideControls ? '' : 'opacity-70'"
                  >{{ $t('header.autoHide') }}</span
                >
              </button>
            </div>
          </Transition>
        </div>
        <button
          class="flex header-btn shrink-0"
          :aria-label="$t('header.showVerses')"
          @click="$emit('toggle-verses')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"
            />
          </svg>
          <span class="hidden sm:inline">{{ $t('header.verses') }}</span>
        </button>
      </div>
    </div>

    <!-- Mobile: compact surah names only (mode lives in the toolbar pill) -->
    <div
      v-if="store.currentSurah"
      class="mobile-surah-line sm:hidden landscape-compact:hidden flex items-center justify-between gap-3 pb-1.5"
    >
      <span class="min-w-0 flex-1 truncate text-[0.72rem] opacity-85">
        {{ store.currentSurah.englishName
        }}<span class="opacity-60"> · {{ store.currentSurah.englishNameTranslation }}</span>
      </span>
      <span
        class="surah-title-sm min-w-0 flex-1 truncate text-right font-arabic text-[0.95rem]"
        dir="rtl"
        lang="ar"
        >{{ store.currentSurah.name }}</span
      >
    </div>
  </header>
</template>

<style scoped>
.app-header {
  /* Mobile: keep edge icons off the bezel. Safe-area is added on top. */
  padding-top: max(0.5rem, env(safe-area-inset-top, 0px));
  padding-left: calc(1rem + env(safe-area-inset-left, 0px));
  padding-right: calc(1rem + env(safe-area-inset-right, 0px));
}
@media (min-width: 640px) {
  .app-header {
    padding-left: calc(0.75rem + env(safe-area-inset-left, 0px));
    padding-right: calc(0.75rem + env(safe-area-inset-right, 0px));
  }
}

.surah-title {
  line-height: 1.45;
  padding-block: 1px;
  margin-block: 0;
}

/* Small-screen surah line: taller line box so truncate does not clip harakat. */
.surah-title-sm {
  line-height: 1.55;
}

/*
  Do NOT set display here. Buttons use Tailwind display utilities
  (flex / hidden / sm:flex / lg:flex). A scoped display rule would
  override `hidden` and force desktop-only controls onto mobile.
*/
.header-btn {
  align-items: center;
  gap: 0.375rem;
  padding: 0.3rem 0.5rem;
  min-width: 40px;
  min-height: 40px;
  justify-content: center;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background 0.15s cubic-bezier(0.25, 1, 0.5, 1),
    transform 0.1s ease;
}
.header-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}
.header-btn:active {
  transform: scale(0.93);
}

.header-actions-end {
  flex-shrink: 0;
}

/* Own layout (not header-btn): keeps icon · label · caret on one baseline. */
.mode-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-wrap: nowrap;
  gap: 0.4rem;
  /* Keep a 40px touch target on all viewports (mobile a11y / e2e). */
  min-width: 40px;
  min-height: 40px;
  max-width: 13rem;
  padding: 0.28rem 0.55rem 0.28rem 0.4rem;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  font: inherit;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background 0.15s cubic-bezier(0.25, 1, 0.5, 1),
    border-color 0.15s cubic-bezier(0.25, 1, 0.5, 1),
    transform 0.1s ease;
}
.mode-trigger:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.16);
}
.mode-trigger:active {
  transform: scale(0.97);
}
.mode-trigger[aria-expanded='true'] {
  background: rgba(255, 255, 255, 0.24);
  border-color: rgba(255, 255, 255, 0.2);
}
.mode-trigger:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}
.mode-trigger-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 1.35rem;
  height: 1.35rem;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.16);
}
.mode-trigger-icon svg {
  display: block;
}
.mode-trigger-label {
  flex: 0 1 auto;
  min-width: 0;
  max-width: 9.5rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1.1;
}
.mode-trigger-caret {
  flex-shrink: 0;
  display: block;
  opacity: 0.8;
  margin-inline-start: -0.05rem;
  transition: transform 0.15s cubic-bezier(0.25, 1, 0.5, 1);
}
.mode-trigger[aria-expanded='true'] .mode-trigger-caret {
  transform: rotate(180deg);
}
@media (max-width: 639px) {
  .mode-trigger {
    gap: 0.3rem;
    max-width: 10rem;
    min-width: 40px;
    min-height: 40px;
    padding: 0.24rem 0.45rem 0.24rem 0.32rem;
  }
  .mode-trigger-icon {
    width: 1.2rem;
    height: 1.2rem;
  }
  .mode-trigger-icon svg {
    width: 12px;
    height: 12px;
  }
  .mode-trigger-label {
    max-width: 6.75rem;
    font-size: 0.66rem;
  }
}

.mode-menu {
  overflow: hidden;
  /* Desktop / tablet: anchor to the trigger's inline-end edge so the panel
     opens toward the content in both LTR and RTL layouts. */
  position: absolute;
  top: calc(100% + 0.5rem);
  inset-inline-end: 0;
  width: min(18.5rem, calc(100vw - 1.5rem));
}
/* Mobile: center in the viewport so a wide panel is not pinned to the right cluster. */
@media (max-width: 639px) {
  .mode-menu {
    position: fixed;
    top: calc(env(safe-area-inset-top, 0px) + 3.35rem);
    left: 0.75rem;
    right: 0.75rem;
    width: auto;
    max-width: 22rem;
    margin-inline: auto;
    max-height: min(70vh, 28rem);
    overflow-y: auto;
  }
}

.mode-menu-head {
  padding: 0.85rem 0.95rem 0.7rem;
  border-bottom: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-surface) 70%, var(--color-card));
}
.mode-menu-title {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-muted);
}
.mode-menu-subtitle {
  margin-top: 0.2rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-body);
}

.mode-menu-body {
  padding: 0.65rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.mode-section-label {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--color-muted);
  padding: 0 0.25rem 0.4rem;
}

.mode-options {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.mode-option {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  text-align: left;
  padding: 0.55rem 0.6rem;
  border: 1px solid transparent;
  border-radius: 0.8rem;
  background: transparent;
  color: var(--color-body);
  cursor: pointer;
  transition:
    background 0.15s cubic-bezier(0.25, 1, 0.5, 1),
    border-color 0.15s cubic-bezier(0.25, 1, 0.5, 1),
    color 0.15s cubic-bezier(0.25, 1, 0.5, 1);
}
.mode-option:hover {
  background: var(--color-surface);
}
.mode-option-active {
  background: color-mix(in srgb, var(--color-primary) 10%, var(--color-card));
  border-color: color-mix(in srgb, var(--color-primary) 28%, transparent);
}
.mode-option:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
}

.mode-option-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.65rem;
  background: var(--color-surface);
  color: var(--color-muted);
  flex-shrink: 0;
}
.mode-option-active .mode-option-icon {
  background: color-mix(in srgb, var(--color-primary) 16%, transparent);
  color: var(--color-primary);
}

.mode-option-copy {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}
.mode-option-name {
  font-size: 0.82rem;
  font-weight: 650;
  line-height: 1.2;
  color: var(--color-body);
}
.mode-option-active .mode-option-name {
  color: var(--color-primary);
}
.mode-option-desc {
  font-size: 0.68rem;
  line-height: 1.3;
  color: var(--color-muted);
}

.mode-option-check {
  color: var(--color-primary);
  flex-shrink: 0;
}

.mode-divider {
  height: 1px;
  margin: 0.1rem 0.2rem;
  background: var(--color-border);
}

.theme-pop-enter-active {
  transition:
    opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.theme-pop-leave-active {
  transition:
    opacity 0.15s cubic-bezier(0.25, 1, 0.5, 1),
    transform 0.15s cubic-bezier(0.25, 1, 0.5, 1);
}
.theme-pop-enter-from,
.theme-pop-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-4px);
}
</style>
