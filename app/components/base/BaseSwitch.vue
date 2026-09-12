<template>
  <label class="flex cursor-pointer items-center gap-3" :class="{ 'cursor-not-allowed opacity-60': disabled }">
    <button
      type="button"
      role="switch"
      :aria-checked="modelValue"
      :disabled="disabled"
      class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-pill transition outline-none focus-visible:ring-2 focus-visible:ring-shift3-green/40"
      :class="modelValue ? 'bg-shift3-green' : 'bg-shift3-border'"
      @click="emit('update:modelValue', !modelValue)"
    >
      <span
        class="inline-block h-5 w-5 rounded-full bg-white shadow transition"
        :class="modelValue ? 'translate-x-[22px]' : 'translate-x-[2px]'"
      />
    </button>
    <span v-if="label" class="text-sm text-shift3-text">{{ label }}</span>
  </label>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue?: boolean
    label?: string
    disabled?: boolean
  }>(),
  { modelValue: false, disabled: false }
)

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>
