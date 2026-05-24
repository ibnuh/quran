<script setup>
// A labelled toggle switch. When `disabled` is set, the row is dimmed, the switch is
// inert, and `disabledReason` replaces the hint to explain why the option is unavailable
// (e.g. a feature that cannot combine with the current font/reciter). This keeps
// incompatible options visible and self-explanatory instead of silently disappearing.
defineProps({
  label: { type: String, required: true },
  hint: { type: String, default: '' },
  modelValue: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  disabledReason: { type: String, default: '' },
  labelClass: { type: String, default: 'text-sm font-medium text-muted' }
})
const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <label
    class="flex items-center justify-between gap-3"
    :class="disabled ? 'cursor-not-allowed' : 'cursor-pointer'"
  >
    <div>
      <span :class="[labelClass, { 'opacity-50': disabled }]">{{ label }}</span>
      <p v-if="disabled && disabledReason" class="text-xs text-muted/60 mt-0.5">
        {{ disabledReason }}
      </p>
      <p v-else-if="hint" class="text-xs text-muted/60 mt-0.5">{{ hint }}</p>
    </div>
    <input
      type="checkbox"
      class="toggle-switch"
      :checked="modelValue"
      :disabled="disabled"
      @change="emit('update:modelValue', $event.target.checked)"
    />
  </label>
</template>
