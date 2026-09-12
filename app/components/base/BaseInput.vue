<template>
  <div class="w-full">
    <label v-if="label" :for="fieldId" class="block mb-1">
      {{ label }}
      <span v-if="required" class="text-danger">*</span>
    </label>

    <div class="relative">
      <Icon
        v-if="icon"
        :name="icon"
        class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-shift3-text-muted"
      />
      <input
        :id="fieldId"
        :value="modelValue"
        :type="resolvedType"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :autocomplete="autocomplete"
        :maxlength="maxlength"
        :inputmode="inputmode"
        :class="[
          'w-full py-2 rounded-default border bg-shift3-input text-sm text-shift3-text outline-none transition',
          'placeholder:text-shift3-text-muted',
          'disabled:bg-shift3-border/30 disabled:text-shift3-text-muted disabled:cursor-not-allowed',
          icon ? 'pl-9' : 'pl-3',
          revealable ? 'pr-10' : 'pr-3',
          error
            ? 'border-danger focus:border-danger focus:ring-2 focus:ring-danger/20'
            : 'border-shift3-input-border focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20'
        ]"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @blur="emit('blur', $event)"
        @focus="emit('focus', $event)"
      />
      <button
        v-if="revealable"
        type="button"
        :aria-label="revealed ? 'Ocultar senha' : 'Mostrar senha'"
        tabindex="-1"
        class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-shift3-text-muted transition hover:bg-shift3-border/50 hover:text-shift3-text"
        @click="revealed = !revealed"
      >
        <Icon :name="revealed ? 'heroicons:eye-slash' : 'heroicons:eye'" class="h-4 w-4" />
      </button>
    </div>

    <p v-if="error" class="mt-1 text-xs text-danger">{{ error }}</p>
    <p v-else-if="hint" class="mt-1 text-xs text-shift3-text-muted">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useId } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue?: string | number
    label?: string
    placeholder?: string
    type?: string
    error?: string
    hint?: string
    icon?: string
    id?: string
    disabled?: boolean
    required?: boolean
    /** mostra o botão de olho e alterna password/text */
    revealable?: boolean
    autocomplete?: string
    maxlength?: number
    inputmode?: 'text' | 'numeric' | 'tel' | 'email' | 'decimal' | 'search' | 'url'
  }>(),
  { type: 'text', disabled: false, required: false, revealable: false }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: [ev: FocusEvent]
  focus: [ev: FocusEvent]
}>()

const fieldId = props.id ?? `input-${useId()}`

const revealed = ref(false)
const resolvedType = computed(() =>
  props.revealable ? (revealed.value ? 'text' : 'password') : props.type
)
</script>
