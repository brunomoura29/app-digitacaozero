<template>
  <ClientOnly>
    <Teleport to="body">
      <Transition name="fade">
        <div class="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4" @click.self="fechar">
          <div class="w-full max-w-md rounded-medium border border-shift3-border bg-shift3-bg-card p-lg shadow-xl">
            <slot />
          </div>
        </div>
      </Transition>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  close: []
}>()

function fechar() {
  emit('close')
}
</script>
