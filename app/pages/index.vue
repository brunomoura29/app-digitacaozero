<template>
  <div class="space-y-6">
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="c in cards"
        :key="c.label"
        class="rounded-medium border border-shift3-border bg-shift3-bg-card p-lg shadow-sm"
      >
        <div class="flex items-center gap-2 text-shift3-text-muted">
          <Icon :name="c.icon" class="h-5 w-5" />
          <span class="text-xs">{{ c.label }}</span>
        </div>
        <p class="mt-2 text-2xl font-semibold text-shift3-text">{{ c.value }}</p>
      </div>
    </div>

    <div class="rounded-medium border border-shift3-border bg-shift3-bg-card p-lg shadow-sm">
      <h3>Bem-vindo{{ auth.nome ? `, ${auth.nome}` : '' }}</h3>
      <p class="mt-1 text-secondary">
        {{ auth.empresa?.nome || 'Sua empresa' }} · painel em construção.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'dashboard', title: 'Dashboard' })

const auth = useAuthStore()

const cards = [
  { label: 'Pedidos no mês', value: '—', icon: 'heroicons:clipboard-document-list' },
  { label: 'Clientes ativos', value: '—', icon: 'heroicons:users' },
  { label: 'Produtos', value: '—', icon: 'heroicons:cube' }
]
</script>
