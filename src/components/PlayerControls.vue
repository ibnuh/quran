<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import { SPEEDS, SLEEP_TIMER_OPTIONS } from '../config.js'
import ProgressBar from './ProgressBar.vue'

const store = usePlayerStore()
const showSpeedMenu = ref(false)
const showJumpInput = ref(false)
const showToolsMenu = ref(false)
const jumpVerseNum = ref('')
const jumpInputRef = ref(null)

function jumpToVerse() {
  const num = parseInt(jumpVerseNum.value)
  if (num >= 1 && num <= store.totalVerses) {
    emit('jump-to-verse', num - 1)
  }
  showJumpInput.value = false
  jumpVerseNum.value = ''
}

function onJumpKeydown(e) {
  if (e.key === 'Escape') {
    showJumpInput.value = false
    jumpVerseNum.value = ''
  }
}

function closePopovers(except = null) {
  if (except !== 'speed') {
    showSpeedMenu.value = false
  }
  if (except !== 'tools') {
    showToolsMenu.value = false
  }
  if (except !== 'jump') {
    showJumpInput.value = false
    jumpVerseNum.value = ''
  }
}

function toggleSpeedMenu() {
  const next = !showSpeedMenu.value
  closePopovers('speed')
  showSpeedMenu.value = next
}

function toggleToolsMenu() {
  const next = !showToolsMenu.value
  closePopovers('tools')
  showToolsMenu.value = next
}

async function toggleJumpInput() {
  const next = !showJumpInput.value
  closePopovers('jump')
  showJumpInput.value = next
  if (next) {
    await nextTick()
    jumpInputRef.value?.focus?.()
    jumpInputRef.value?.select?.()
  }
}

function onClickOutside(e) {
  if (showSpeedMenu.value && !e.target.closest('.speed-wrapper')) {
    showSpeedMenu.value = false
  }
  if (showJumpInput.value && !e.target.closest('.jump-verse-input-wrapper')) {
    showJumpInput.value = false
    jumpVerseNum.value = ''
  }
  if (showToolsMenu.value && !e.target.closest('.tools-wrapper')) {
    showToolsMenu.value = false
  }
}

function onSpeedMenuKeydown(e) {
  if (!showSpeedMenu.value) {
    return
  }
  const buttons = Array.from(document.querySelectorAll('.speed-wrapper [role="menu"] button'))
  if (!buttons.length) {
    return
  }
  const current = buttons.indexOf(document.activeElement)
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    buttons[Math.max(current - 1, 0)].focus()
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    buttons[Math.min(current + 1, buttons.length - 1)].focus()
  } else if (e.key === 'Escape') {
    showSpeedMenu.value = false
  }
}

onMounted(() => document.addEventListener('click', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))

const props = defineProps({
  isPlaying: Boolean,
  progress: { type: Number, default: 0 },
  buffered: { type: Number, default: 0 },
  currentTimeMs: { type: Number, default: 0 },
  durationMs: { type: Number, default: 0 },
  sleepMinutes: { type: Number, default: 0 },
  sleepRemainingMs: { type: Number, default: 0 },
  // Read mode: hide progress/seek/speed/tools, keep nav + play.
  compact: { type: Boolean, default: false }
})

const canPlay = computed(
  () =>
    !store.audioUnavailable &&
    !!store.playbackMode &&
    (store.playbackMode === 'full' ? !!store.audioUrl : store.audioUrls.length > 0)
)

// Only show the unavailable banner after a surah has finished loading without
// audio. On refresh/first paint, canPlay is false while data is still empty, which
// used to flash this message for a frame.
const showAudioUnavailable = computed(
  () =>
    !canPlay.value &&
    !props.isPlaying &&
    !store.isLoading &&
    store.totalVerses > 0 &&
    !store.error
)

const emit = defineEmits([
  'toggle-play',
  'prev-verse',
  'next-verse',
  'prev-surah',
  'next-surah',
  'seek',
  'set-speed',
  'jump-to-verse',
  'set-sleep'
])

function cycleRepeat() {
  const modes = ['none', 'verse', 'surah']
  const next = modes[(modes.indexOf(store.repeatMode) + 1) % modes.length]
  store.setRepeatMode(next)
}

function selectSpeed(speed) {
  emit('set-speed', speed)
  showSpeedMenu.value = false
}

// -- Tools: volume, sleep timer, A-B repeat --
const volumePercent = computed(() => Math.round(store.volume * 100))

function onVolumeInput(e) {
  store.setVolume(Number(e.target.value) / 100)
}

function selectSleep(minutes) {
  emit('set-sleep', props.sleepMinutes === minutes ? 0 : minutes)
}

const sleepLabel = computed(() => {
  if (!props.sleepMinutes) {
    return ''
  }
  const totalSec = Math.ceil(props.sleepRemainingMs / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
})

const toolsActive = computed(() => store.volume < 1 || !!store.abRepeat || props.sleepMinutes > 0)

function setRepeatA() {
  const end = store.abRepeat ? store.abRepeat.end : store.currentVerseIndex
  store.setAbRepeat(store.currentVerseIndex, Math.max(store.currentVerseIndex, end))
}

function setRepeatB() {
  const start = store.abRepeat ? store.abRepeat.start : store.currentVerseIndex
  store.setAbRepeat(Math.min(start, store.currentVerseIndex), store.currentVerseIndex)
}

function clearRepeat() {
  store.clearAbRepeat()
}
</script>

<template>
  <div
    class="px-4 sm:px-12 pb-1 pt-3 landscape-compact:pb-2 landscape-compact:pt-1 landscape-compact:px-4 max-w-5xl mx-auto w-full pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]"
    :class="{ 'pt-2 pb-2': compact }"
  >
    <p
      v-if="showAudioUnavailable"
      class="audio-unavailable text-center text-[0.7rem] sm:text-xs mb-2 landscape-compact:mb-1 leading-snug px-3 py-1.5 rounded-lg"
      role="status"
    >
      {{ $t('controls.audioUnavailable') }}
    </p>

    <ProgressBar
      v-if="!compact"
      :progress="progress"
      :buffered="buffered"
      :current-time-ms="currentTimeMs"
      :duration-ms="durationMs"
      @seek="emit('seek', $event)"
    />

    <div
      class="grid grid-cols-[1fr_auto_1fr] items-center landscape-compact:mt-1"
      :class="compact ? 'mt-0' : 'mt-1'"
    >
      <!-- Left group: repeat utility on the edge, navigation hugging Play -->
      <div class="flex items-center justify-between gap-1 sm:gap-2 min-w-0">
        <button
          v-if="!compact"
          class="flex ctrl-btn"
          :class="store.repeatMode !== 'none' ? 'text-primary! bg-primary/10' : ''"
          :aria-label="$t('controls.cycleRepeat')"
          :aria-pressed="store.repeatMode !== 'none'"
          @click="cycleRepeat"
        >
          <span v-if="store.repeatMode === 'verse'" class="relative inline-flex">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
            </svg>
            <span
              class="absolute inset-0 flex items-center justify-center text-[7px] font-bold leading-none"
              >1</span
            >
          </span>
          <span v-else-if="store.repeatMode === 'surah'" class="relative inline-flex">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
            </svg>
            <span
              class="absolute -bottom-0.5 -right-0.5 text-[8px] font-bold leading-none text-primary"
              aria-hidden="true"
              >∞</span
            >
          </span>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
          </svg>
          <span class="hidden sm:inline text-[0.7rem]">{{
            store.repeatMode === 'none'
              ? $t('controls.repeat')
              : store.repeatMode === 'verse'
                ? $t('controls.repeatVerse')
                : $t('controls.repeatSurah')
          }}</span>
        </button>
        <span v-else class="w-8 shrink-0" aria-hidden="true"></span>

        <div class="flex items-center gap-1 sm:gap-2">
          <button
            class="ctrl-btn flex"
            :disabled="!store.canPrevSurah"
            :aria-label="$t('controls.previousSurah')"
            @click="emit('prev-surah')"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
            <span class="hidden sm:inline">{{ $t('controls.prevSurah') }}</span>
          </button>

          <button
            class="flex ctrl-btn"
            :disabled="!store.canPrevVerse"
            :aria-label="$t('controls.previousVerse')"
            @click="emit('prev-verse')"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
            <span class="hidden sm:inline">{{ $t('controls.prev') }}</span>
          </button>
        </div>
      </div>

      <!-- Center: Play button -->
      <button
        class="play-btn w-14 h-14 landscape-compact:w-10 landscape-compact:h-10 rounded-full bg-primary text-white flex items-center justify-center mx-3 shrink-0"
        :class="[
          canPlay ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed',
          isPlaying ? 'play-btn-playing' : ''
        ]"
        :disabled="!canPlay && !isPlaying"
        :aria-label="isPlaying ? $t('controls.pause') : $t('controls.play')"
        :title="!canPlay && !isPlaying ? $t('controls.audioUnavailable') : undefined"
        @click="emit('toggle-play')"
      >
        <Transition name="play-icon" mode="out-in">
          <svg
            v-if="!isPlaying"
            key="play"
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
          <svg
            v-else
            key="pause"
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        </Transition>
      </button>

      <!-- Right group: navigation hugging Play, speed/tools utilities on the edge -->
      <div class="flex items-center justify-between gap-1 sm:gap-2 min-w-0">
        <div class="flex items-center gap-1 sm:gap-2">
          <button
            class="flex ctrl-btn"
            :disabled="!store.canNextVerse"
            :aria-label="$t('controls.nextVerse')"
            @click="emit('next-verse')"
          >
            <span class="hidden sm:inline">{{ $t('controls.next') }}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
            </svg>
          </button>

          <button
            class="ctrl-btn flex"
            :disabled="!store.canNextSurah"
            :aria-label="$t('controls.nextSurah')"
            @click="emit('next-surah')"
          >
            <span class="hidden sm:inline">{{ $t('controls.nextSurah') }}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>
        </div>

        <div class="flex items-center gap-1 sm:gap-2">
          <!-- Speed -->
          <div v-if="!compact" class="relative speed-wrapper">
            <button
              class="flex ctrl-btn"
              :class="
                store.playbackSpeed !== 1
                  ? 'text-primary! bg-primary/10 ring-1 ring-primary/25'
                  : ''
              "
              :aria-label="$t('controls.playbackSpeed')"
              :aria-expanded="showSpeedMenu"
              @click.stop="toggleSpeedMenu"
            >
              <span
                class="text-[0.7rem] font-semibold tabular-nums min-w-[1.75rem] text-center rounded-md px-1 py-0.5"
                :class="store.playbackSpeed !== 1 ? 'bg-primary/15' : ''"
                >{{ store.playbackSpeed }}x</span
              >
            </button>
            <Transition name="speed-pop">
              <div
                v-if="showSpeedMenu"
                role="menu"
                class="absolute bottom-full right-0 mb-2 bg-card rounded-lg shadow-2xl border border-border p-1 z-50 min-w-[4.5rem]"
                @keydown="onSpeedMenuKeydown"
              >
                <button
                  v-for="s in SPEEDS"
                  :key="s"
                  class="w-full px-3 py-1.5 text-xs text-center rounded cursor-pointer transition-colors"
                  :class="
                    store.playbackSpeed === s
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-body hover:bg-surface'
                  "
                  @click="selectSpeed(s)"
                >
                  {{ s }}x
                </button>
              </div>
            </Transition>
          </div>

          <!-- Tools: volume, sleep timer, A-B repeat -->
          <div v-if="!compact" class="relative tools-wrapper">
            <button
              class="relative flex ctrl-btn"
              :class="toolsActive ? 'text-primary! bg-primary/10' : ''"
              :aria-label="$t('controls.audioTools')"
              :aria-expanded="showToolsMenu"
              @click.stop="toggleToolsMenu"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path
                  d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
                />
              </svg>
              <span v-if="sleepLabel" class="text-[0.7rem] font-semibold tabular-nums">{{
                sleepLabel
              }}</span>
              <span
                v-if="toolsActive"
                class="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary"
                aria-hidden="true"
              ></span>
            </button>
            <Transition name="speed-pop">
              <div
                v-if="showToolsMenu"
                class="absolute bottom-full right-0 mb-2 bg-card rounded-xl shadow-2xl border border-border p-3 z-50 w-60 text-left space-y-4"
              >
                <!-- Volume -->
                <div>
                  <div class="flex items-center justify-between mb-1.5">
                    <span class="text-[0.7rem] font-semibold text-muted uppercase tracking-wide">{{
                      $t('controls.volume')
                    }}</span>
                    <span class="text-[0.7rem] text-muted tabular-nums">{{ volumePercent }}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    :value="volumePercent"
                    class="w-full accent-[var(--color-primary)] cursor-pointer"
                    :aria-label="$t('controls.volume')"
                    @input="onVolumeInput"
                  />
                </div>

                <!-- A-B repeat -->
                <div>
                  <div class="flex items-center justify-between mb-1.5">
                    <span class="text-[0.7rem] font-semibold text-muted uppercase tracking-wide">{{
                      $t('controls.repeatRange')
                    }}</span>
                    <span v-if="store.abRepeat" class="text-[0.7rem] text-primary tabular-nums"
                      >{{ store.abRepeat.start + 1 }}-{{ store.abRepeat.end + 1 }}</span
                    >
                  </div>
                  <div class="flex items-center gap-1.5">
                    <button
                      class="flex-1 text-xs py-1.5 rounded-md bg-surface text-body hover:bg-primary/10 hover:text-primary cursor-pointer transition-colors"
                      @click="setRepeatA"
                    >
                      {{ $t('controls.setA') }}
                    </button>
                    <button
                      class="flex-1 text-xs py-1.5 rounded-md bg-surface text-body hover:bg-primary/10 hover:text-primary cursor-pointer transition-colors"
                      @click="setRepeatB"
                    >
                      {{ $t('controls.setB') }}
                    </button>
                    <button
                      class="flex-1 text-xs py-1.5 rounded-md cursor-pointer transition-colors"
                      :class="
                        store.abRepeat ? 'bg-primary/10 text-primary' : 'bg-surface text-muted'
                      "
                      :disabled="!store.abRepeat"
                      @click="clearRepeat"
                    >
                      {{ $t('controls.clear') }}
                    </button>
                  </div>
                </div>

                <!-- Sleep timer -->
                <div>
                  <div class="flex items-center justify-between mb-1.5">
                    <span class="text-[0.7rem] font-semibold text-muted uppercase tracking-wide">{{
                      $t('controls.sleepTimer')
                    }}</span>
                    <span v-if="sleepLabel" class="text-[0.7rem] text-primary tabular-nums">{{
                      sleepLabel
                    }}</span>
                  </div>
                  <div class="grid grid-cols-3 gap-1.5">
                    <button
                      v-for="m in SLEEP_TIMER_OPTIONS"
                      :key="m"
                      class="text-xs py-1.5 rounded-md cursor-pointer transition-colors"
                      :class="
                        sleepMinutes === m
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'bg-surface text-body hover:bg-primary/10 hover:text-primary'
                      "
                      @click="selectSleep(m)"
                    >
                      {{ m }}m
                    </button>
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </div>

    <div
      class="text-center landscape-compact:hidden"
      :class="[compact ? 'mt-1 mb-1' : 'mt-2 mb-3', store.currentVerse ? '' : 'invisible']"
    >
      <div class="relative inline-flex items-center gap-1 jump-verse-input-wrapper">
        <button
          class="verse-chip text-xs text-muted hover:text-primary transition-colors cursor-pointer px-3 py-1.5 min-h-10 rounded-full border border-border bg-surface/80 hover:border-primary/40 hover:bg-primary/5 inline-flex items-center gap-1.5"
          :aria-label="$t('controls.jumpToVerse')"
          :aria-expanded="showJumpInput"
          @click.stop="toggleJumpInput"
        >
          <span class="font-semibold text-body tabular-nums">{{
            store.currentVerse?.number || 0
          }}</span>
          <span class="opacity-50">/</span>
          <span class="tabular-nums">{{ store.totalVerses || 0 }}</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="currentColor"
            class="opacity-60"
            aria-hidden="true"
          >
            <path d="M7 10l5 5 5-5H7z" />
          </svg>
        </button>
        <Transition name="speed-pop">
          <div
            v-if="showJumpInput"
            class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-card rounded-lg shadow-2xl border border-border p-2 z-50 flex items-center gap-1.5"
            @keydown="onJumpKeydown"
          >
            <span class="text-[0.65rem] text-muted">{{ $t('controls.goTo') }}</span>
            <input
              ref="jumpInputRef"
              v-model="jumpVerseNum"
              type="number"
              min="1"
              :max="store.totalVerses"
              class="w-16 px-2 py-1 text-xs text-center rounded-md border border-border bg-surface text-body focus:outline-none focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="#"
              @keydown.enter="jumpToVerse"
              @keydown.escape.prevent="
                () => {
                  showJumpInput = false
                  jumpVerseNum = ''
                }
              "
            />
            <button
              class="text-xs px-2 py-1 bg-primary text-white rounded-md font-medium cursor-pointer hover:bg-primary-dark transition-colors"
              @click="jumpToVerse"
            >
              {{ $t('controls.go') }}
            </button>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.play-btn {
  box-shadow: 0 2px 8px color-mix(in srgb, var(--color-primary) 30%, transparent);
  transition:
    transform 0.2s cubic-bezier(0.25, 1, 0.5, 1),
    background-color 0.15s ease,
    box-shadow 0.2s ease;
  position: relative;
}
.play-btn:hover {
  background-color: var(--color-primary-dark);
  transform: scale(1.05);
  box-shadow: 0 4px 16px color-mix(in srgb, var(--color-primary) 35%, transparent);
}
.play-btn:active {
  transform: scale(0.95);
  box-shadow: 0 1px 4px color-mix(in srgb, var(--color-primary) 20%, transparent);
}
/* Quiet "live" affordance: soft outer ring, no pulsing glow. */
.play-btn-playing {
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--color-primary) 16%, transparent),
    0 3px 10px color-mix(in srgb, var(--color-primary) 28%, transparent);
}

.audio-unavailable {
  color: color-mix(in srgb, var(--color-accent) 90%, var(--color-body));
  background: color-mix(in srgb, var(--color-accent) 12%, var(--color-surface));
  border: 1px solid color-mix(in srgb, var(--color-accent) 28%, transparent);
}

.play-icon-enter-active,
.play-icon-leave-active {
  transition:
    opacity 0.1s ease,
    transform 0.1s cubic-bezier(0.25, 1, 0.5, 1);
}
.play-icon-enter-from {
  opacity: 0;
  transform: scale(0.7);
}
.play-icon-leave-to {
  opacity: 0;
  transform: scale(0.7);
}

.ctrl-btn {
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem;
  min-height: 44px;
  border-radius: 0.5rem;
  border: none;
  background: none;
  color: var(--color-body);
  font-size: 0.8rem;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background 0.15s cubic-bezier(0.25, 1, 0.5, 1),
    color 0.15s ease,
    transform 0.1s ease;
}
.ctrl-btn:hover:not(:disabled) {
  background: var(--color-primary-light);
  color: var(--color-primary);
}
.ctrl-btn:active:not(:disabled) {
  transform: scale(0.93);
}
.ctrl-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.speed-pop-enter-active,
.speed-pop-leave-active {
  transition:
    opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.speed-pop-enter-from,
.speed-pop-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(4px);
}
</style>
