<template>
  <div class="w-full">
    <label v-if="label" :for="fieldId" class="mb-1 block">
      {{ label }}
      <span v-if="required" class="text-danger">*</span>
    </label>

    <textarea
      :id="fieldId"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :rows="rows"
      :maxlength="maxlength"
      :class="[
        'w-full resize-y rounded-default border bg-shift3-input px-3 py-2 text-sm text-shift3-text outline-none transition',
        'placeholder:text-shift3-text-muted',
        'disabled:bg-shift3-border/30 disabled:cursor-not-allowed',
        error
          ? 'border-danger focus:border-danger focus:ring-2 focus:ring-danger/20'
          : 'border-shift3-input-border focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20'
      ]"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      @blur="emit('blur', $event)"
    />

    <p v-if="error" class="mt-1 text-xs text-danger">{{ error }}</p>
    <p v-else-if="hint" class="mt-1 text-xs text-shift3-text-muted">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { useId } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    label?: string
    placeholder?: string
    error?: string
    hint?: string
    id?: string
    rows?: number
    maxlength?: number
    disabled?: boolean
    required?: boolean
  }>(),
  { rows: 3, disabled: false, required: false }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: [ev: FocusEvent]
}>()

const fieldId = props.id ?? `ta-${useId()}`
</script>
