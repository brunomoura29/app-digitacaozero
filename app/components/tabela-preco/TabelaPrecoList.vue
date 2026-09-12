<template>
  <div>
    <!-- Carregando -->
    <div v-if="carregando" class="flex items-center justify-center gap-2 py-14 text-sm text-shift3-text-muted">
      <BaseSpinner size="md" />
      Carregando preços…
    </div>

    <!-- Vazio -->
    <BaseEmptyState
      v-else-if="!itens.length"
      icon="heroicons:currency-dollar"
      title="Nenhum preço registrado"
      description="Ajuste os filtros ou registre o primeiro preço."
    />

    <!-- Tabela — só linhas, sem card -->
    <div v-else class="overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="border-b border-shift3-border text-left text-xs uppercase tracking-wide text-shift3-text-muted">
            <th class="px-4 py-3 font-semibold" style="width: 30%">Produto</th>
            <th class="px-4 py-3 font-semibold" style="width: 18%">Fábrica</th>
            <th class="px-4 py-3 font-semibold" style="width: 17%">Referência</th>
            <th class="px-4 py-3 font-semibold" style="width: 10%">Competência</th>
            <th class="px-4 py-3 font-semibold" style="width: 12%">Valor</th>
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
                {{ p.produtos?.descricao }}
              </button>
              <span v-else class="text-base font-semibold text-shift3-text">{{ p.produtos?.descricao }}</span>
              <div v-if="p.produtos?.sku" class="text-xs text-shift3-text-muted">SKU: {{ p.produtos.sku }}</div>
            </td>
            <td class="px-4 py-3 text-shift3-text-secondary" style="width: 18%">{{ p.fabricas?.nome || '—' }}</td>
            <td class="px-4 py-3 text-shift3-text-secondary" style="width: 17%">{{ p.referencias_tabela?.nome || '—' }}</td>
            <td class="px-4 py-3 text-shift3-text-secondary" style="width: 10%">{{ formatCompetencia(p.competencia) }}</td>
            <td class="px-4 py-3 font-medium text-shift3-text" style="width: 12%">{{ formatValor(p.valor) }}</td>
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
          {{ itens.length }} {{ itens.length === 1 ? 'preço registrado' : 'preços registrados' }}
        </div>
      </Teleport>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import type { Preco } from '~/types/preco'

const props = withDefaults(
  defineProps<{ itens: Preco[]; carregando: boolean; podeEditar?: boolean; podeExcluir?: boolean }>(),
  { podeEditar: true, podeExcluir: true }
)
const emit = defineEmits<{ editar: [id: string]; excluir: [preco: Preco] }>()

function acoes(p: Preco) {
  const itens: any[] = []
  if (props.podeEditar) itens.push({ label: 'Editar', icon: 'heroicons:pencil-square', onClick: () => emit('editar', p.id) })
  if (props.podeEditar && props.podeExcluir) itens.push({ divider: true })
  if (props.podeExcluir) itens.push({ label: 'Excluir', icon: 'heroicons:trash', danger: true, onClick: () => emit('excluir', p) })
  return itens
}

function formatValor(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatCompetencia(v: string) {
  const [ano, mes] = v.split('-')
  return `${mes}/${ano}`
}
</script>
