<template>
  <div>
    <!-- Carregando -->
    <div v-if="carregando" class="flex items-center justify-center gap-2 py-14 text-sm text-shift3-text-muted">
      <BaseSpinner size="md" />
      Carregando produtos…
    </div>

    <!-- Vazio -->
    <BaseEmptyState
      v-else-if="!itens.length"
      icon="heroicons:cube"
      title="Nenhum produto encontrado"
      description="Ajuste a busca ou cadastre o primeiro produto."
    />

    <!-- Tabela — só linhas, sem card -->
    <div v-else class="overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="border-b border-shift3-border text-left text-xs uppercase tracking-wide text-shift3-text-muted">
            <th class="px-4 py-3 font-semibold" style="width: 30%">Descrição</th>
            <th class="px-4 py-3 font-semibold" style="width: 12%">SKU</th>
            <th class="px-4 py-3 font-semibold" style="width: 15%">Marca</th>
            <th class="px-4 py-3 font-semibold" style="width: 15%">Fabricante</th>
            <th class="px-4 py-3 font-semibold" style="width: 10%">Unidade</th>
            <th class="px-4 py-3 font-semibold" style="width: 10%">Situação</th>
            <th class="px-4 py-3" style="width: 3%" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="p in itens"
            :key="p.id"
            class="border-b border-shift3-border/60 transition hover:bg-shift3-bg-light"
          >
            <td class="px-4 py-3" style="width: 30%">
              <button
                v-if="podeEditar"
                class="text-base font-semibold text-shift3-text hover:text-shift3-teal"
                @click="emit('editar', p.id)"
              >
                {{ p.descricao }}
              </button>
              <span v-else class="text-base font-semibold text-shift3-text">{{ p.descricao }}</span>
            </td>
            <td class="px-4 py-3 text-shift3-text-secondary" style="width: 12%">{{ p.sku || '—' }}</td>
            <td class="px-4 py-3 text-shift3-text-secondary" style="width: 15%">{{ p.marcas?.nome || '—' }}</td>
            <td class="px-4 py-3 text-shift3-text-secondary" style="width: 15%">{{ p.fabricantes?.nome || '—' }}</td>
            <td class="px-4 py-3 text-shift3-text-secondary" style="width: 10%">{{ p.unidade || '—' }}</td>
            <td class="px-4 py-3" style="width: 10%">
              <span
                class="inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-xs font-medium"
                :class="p.ativo ? 'bg-success/15 text-success' : 'bg-shift3-border/60 text-shift3-text-muted'"
              >
                <span class="h-1.5 w-1.5 rounded-full" :class="p.ativo ? 'bg-success' : 'bg-shift3-text-muted'" />
                {{ p.ativo ? 'Ativo' : 'Inativo' }}
              </span>
            </td>
            <td class="px-4 py-3 text-right" style="width: 3%">
              <BaseDropdown v-if="podeEditar || podeExcluir" align="right" :items="acoes(p)">
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
          {{ itens.length }} {{ itens.length === 1 ? 'produto' : 'produtos' }}
        </div>
      </Teleport>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import type { Produto } from '~/types/produto'

const props = withDefaults(
  defineProps<{ itens: Produto[]; carregando: boolean; podeEditar?: boolean; podeExcluir?: boolean }>(),
  { podeEditar: true, podeExcluir: true }
)
const emit = defineEmits<{ editar: [id: string]; excluir: [produto: Produto] }>()

function acoes(p: Produto) {
  const itens: any[] = []
  if (props.podeEditar) itens.push({ label: 'Editar', icon: 'heroicons:pencil-square', onClick: () => emit('editar', p.id) })
  if (props.podeEditar && props.podeExcluir) itens.push({ divider: true })
  if (props.podeExcluir) itens.push({ label: 'Excluir', icon: 'heroicons:trash', danger: true, onClick: () => emit('excluir', p) })
  return itens
}
</script>
