<template>
  <ClientOnly>
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="modelValue"
          class="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4"
          @click.self="cancelar"
        >
          <div class="w-full max-w-sm rounded-medium border border-shift3-border bg-shift3-bg-card p-lg shadow-xl">
            <div class="flex items-start gap-3">
              <span
                class="grid h-10 w-10 shrink-0 place-items-center rounded-full"
                :class="danger ? 'bg-danger/15 text-danger' : 'bg-shift3-green/20 text-shift3-teal'"
              >
                <Icon :name="danger ? 'heroicons:exclamation-triangle' : 'heroicons:question-mark-circle'" class="h-5 w-5" />
              </span>
              <div class="min-w-0">
                <h3>{{ title }}</h3>
                <p v-if="message" class="mt-1 text-sm text-shift3-text-secondary">{{ message }}</p>
              </div>
            </div>

            <div class="mt-6 flex justify-end gap-2">
              <BaseButton variant="secondary" size="sm" @click="cancelar">{{ cancelLabel }}</BaseButton>
              <BaseButton :variant="danger ? 'danger' : 'primary'" size="sm" :loading="loading" @click="confirmar">
                {{ confirmLabel }}
              </BaseButton>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: boolean
    title: string
    message?: string
    confirmLabel?: string
    cancelLabel?: string
    danger?: boolean
    loading?: boolean
  }>(),
  { confirmLabel: 'Confirmar', cancelLabel: 'Cancelar', danger: false, loading: false }
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
  cancel: []
}>()

function cancelar() {
  emit('update:modelValue', false)
  emit('cancel')
}
function confirmar() {
  emit('confirm')
}
</script>
