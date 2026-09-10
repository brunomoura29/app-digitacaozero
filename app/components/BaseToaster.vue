<template>
  <ClientOnly>
    <Teleport to="body">
      <div class="pointer-events-none fixed top-4 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2">
        <TransitionGroup name="toast">
          <div
            v-for="t in toasts"
            :key="t.id"
            :class="[
              'pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-medium border bg-shift3-bg-card p-3 shadow-lg',
              borderClass(t.type)
            ]"
            role="status"
          >
            <Icon :name="iconFor(t.type)" :class="['mt-0.5 h-5 w-5 shrink-0', colorClass(t.type)]" />
            <div class="min-w-0 flex-1">
              <p v-if="t.title" class="text-sm font-semibold text-shift3-text">{{ t.title }}</p>
              <p class="text-sm text-shift3-text-secondary">{{ t.message }}</p>
            </div>
            <button
              type="button"
              aria-label="Fechar"
              class="shrink-0 rounded p-0.5 text-shift3-text-muted transition hover:bg-shift3-border/60 hover:text-shift3-text"
              @click="dismiss(t.id)"
            >
              <Icon name="heroicons:x-mark" class="h-4 w-4" />
            </button>
          </div>
        </TransitionGroup>
      </div>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
import type { ToastType } from '~/composables/useToast'

const { toasts, dismiss } = useToast()

const iconFor = (type: ToastType) =>
  ({
    success: 'heroicons:check-circle',
    error: 'heroicons:x-circle',
    warning: 'heroicons:exclamation-triangle',
    info: 'heroicons:information-circle'
  })[type]

const colorClass = (type: ToastType) =>
  ({
    success: 'text-success',
    error: 'text-danger',
    warning: 'text-warning',
    info: 'text-shift3-dark'
  })[type]

const borderClass = (type: ToastType) =>
  ({
    success: 'border-success/40',
    error: 'border-danger/40',
    warning: 'border-warning/40',
    info: 'border-shift3-border'
  })[type]
</script>
