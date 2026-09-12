<template>
  <div>
    <!-- Carregando -->
    <div v-if="carregando" class="flex items-center justify-center gap-2 py-14 text-sm text-shift3-text-muted">
      <BaseSpinner size="md" />
      Carregando pedidos…
    </div>

    <!-- Vazio -->
    <BaseEmptyState
      v-else-if="!itens.length"
      icon="heroicons:clipboard-document-list"
      title="Nenhum pedido encontrado"
      description="Ajuste a busca ou importe o primeiro pedido."
    />

    <!-- Tabela — só linhas, sem card -->
    <div v-else class="overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="border-b border-shift3-border text-left text-xs uppercase tracking-wide text-shift3-text-muted">
            <th class="px-4 py-3 font-semibold" style="width: 15%">Número</th>
            <th class="px-4 py-3 font-semibold" style="width: 30%">Cliente</th>
            <th class="px-4 py-3 font-semibold" style="width: 15%">Emissão</th>
            <th class="px-4 py-3 font-semibold" style="width: 15%">Situação</th>
            <th class="px-4 py-3 font-semibold" style="width: 15%">Total</th>
            <th class="px-4 py-3" style="width: 3%" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="p in itens"
            :key="p.id"
            class="border-b border-shift3-border/60 transition hover:bg-shift3-bg-light"
          >
            <td class="px-4 py-3" style="width: 15%">
              <button class="text-base font-semibold text-shift3-text hover:text-shift3-teal" @click="emit('ver', p.id)">
                {{ p.numero }}
              </button>
            </td>
            <td class="px-4 py-3 text-shift3-text-secondary" style="width: 30%">{{ p.clientes?.nome || '—' }}</td>
            <td class="px-4 py-3 text-shift3-text-secondary" style="width: 15%">{{ formatData(p.data_emissao) }}</td>
            <td class="px-4 py-3" style="width: 15%">
              <span class="inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-xs font-medium" :class="corStatus(p.status)">
                <span class="h-1.5 w-1.5 rounded-full" :class="corBolinha(p.status)" />
                {{ labelStatus(p.status) }}
              </span>
            </td>
            <td class="px-4 py-3 font-medium text-shift3-text" style="width: 15%">{{ formatValor(p.total) }}</td>
            <td class="px-4 py-3 text-right" style="width: 3%">
              <BaseDropdown
                align="right"
                :items="[
                  { label: 'Ver', icon: 'heroicons:eye', onClick: () => emit('ver', p.id) },
                  ...(podeExcluir ? [{ divider: true }, { label: 'Excluir', icon: 'heroicons:trash', danger: true, onClick: () => emit('excluir', p) }] : [])
                ]"
              >
                <BaseButton variant="ghost" size="sm" icon-left="heroicons:ellipsis-vertical" />
              </BaseDropdown>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Totalizador — teleportado pra barra fixa do layout (dashboard.vue), sempre visível -->
    <ClientOnly>
      <Teleport to="#dashboard-footer">
        <div
          v-if="!carregando && itens.length"
          class="border-t border-shift3-border bg-shift3-bg-card px-6 py-3 text-xs text-shift3-text-muted"
        >
          {{ itens.length }} {{ itens.length === 1 ? 'pedido' : 'pedidos' }}
        </div>
      </Teleport>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import type { Pedido, StatusPedido } from '~/types/pedido'

withDefaults(defineProps<{ itens: Pedido[]; carregando: boolean; podeExcluir?: boolean }>(), {
  podeExcluir: true
})
const emit = defineEmits<{ ver: [id: string]; excluir: [pedido: Pedido] }>()

const LABELS: Record<StatusPedido, string> = {
  rascunho: 'Rascunho',
  aprovado: 'Aprovado',
  enviado: 'Enviado',
  cancelado: 'Cancelado'
}
const CORES: Record<StatusPedido, string> = {
  rascunho: 'bg-shift3-border/60 text-shift3-text-muted',
  aprovado: 'bg-success/15 text-success',
  enviado: 'bg-shift3-green/20 text-shift3-teal',
  cancelado: 'bg-danger/15 text-danger'
}
const BOLINHAS: Record<StatusPedido, string> = {
  rascunho: 'bg-shift3-text-muted',
  aprovado: 'bg-success',
  enviado: 'bg-shift3-teal',
  cancelado: 'bg-danger'
}

function labelStatus(s: StatusPedido) {
  return LABELS[s]
}
function corStatus(s: StatusPedido) {
  return CORES[s]
}
function corBolinha(s: StatusPedido) {
  return BOLINHAS[s]
}

function formatValor(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function formatData(v: string) {
  const [ano, mes, dia] = v.split('-')
  return `${dia}/${mes}/${ano}`
}
</script>
