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
    <!-- no desktop sem overflow: senão a div vira a área de rolagem e o título não gruda no topo -->
    <div v-else class="overflow-x-auto lg:overflow-visible">
      <table class="min-w-full text-sm">
        <!-- títulos grudam no topo da área que rola (igual Produtos). -top-6 = o p-6 do <main> do
             layout; a linha de baixo é sombra porque border de <tr> some no sticky -->
        <thead class="sticky -top-6 z-10 bg-shift3-bg-card shadow-[inset_0_-1px_0_rgb(var(--s3-border))]">
          <tr class="text-left text-xs uppercase tracking-wide text-shift3-text-muted">
            <th class="px-4 py-3 font-semibold" style="width: 46%">Produto</th>
            <th class="px-4 py-3 font-semibold" style="width: 14%">Fábrica</th>
            <th class="px-4 py-3 font-semibold" style="width: 14%">Referência</th>
            <th class="whitespace-nowrap px-4 py-3 font-semibold" style="width: 10%">Competência</th>
            <th class="px-4 py-3 text-right font-semibold" style="width: 12%">Valor</th>
            <th class="px-4 py-3" style="width: 4%" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="p in itens"
            :key="p.id"
            class="border-b border-shift3-border/60 transition hover:bg-shift3-bg-light"
          >
            <td class="px-4 py-3 text-left">
              <!-- block + text-left: botão centraliza o texto por padrão quando a descrição quebra linha -->
              <button
                v-if="podeEditar"
                class="block w-full text-left text-sm font-medium leading-snug text-shift3-text hover:text-shift3-teal"
                @click="emit('editar', p.id)"
              >
                {{ p.produtos?.descricao }}
              </button>
              <span v-else class="block text-sm font-medium leading-snug text-shift3-text">{{ p.produtos?.descricao }}</span>
              <div v-if="p.produtos?.sku" class="mt-0.5 text-xs text-shift3-text-muted">SKU: {{ p.produtos.sku }}</div>
            </td>
            <td class="px-4 py-3 text-shift3-text-secondary">{{ p.fabricas?.nome || '—' }}</td>
            <td class="px-4 py-3 text-shift3-text-secondary">{{ p.referencias_tabela?.nome || '—' }}</td>
            <td class="px-4 py-3 tabular-nums text-shift3-text-secondary">{{ formatCompetencia(p.competencia) }}</td>
            <td class="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums text-shift3-text">{{ formatValor(p.valor) }}</td>
            <td class="px-4 py-3 text-right">
              <BaseDropdown v-if="podeEditar || podeExcluir" align="right" :items="acoes(p)">
                <BaseButton variant="ghost" size="sm" icon-left="heroicons:ellipsis-vertical" />
              </BaseDropdown>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Paginação — teleportada pra barra fixa do layout (dashboard.vue), sempre visível -->
    <ClientOnly>
      <Teleport to="#dashboard-footer">
        <div
          v-if="total"
          class="flex flex-wrap items-center justify-between gap-3 border-t border-shift3-border bg-shift3-bg-card px-6 py-2.5 text-xs text-shift3-text-muted"
        >
          <span class="tabular-nums">
            {{ fmt(inicio) }}–{{ fmt(fim) }} de {{ fmt(total) }} {{ total === 1 ? 'preço' : 'preços' }}
          </span>

          <div class="flex items-center gap-3">
            <label class="flex items-center gap-1.5">
              Por página
              <select
                :value="porPagina"
                class="rounded-default border border-shift3-input-border bg-shift3-input px-2 py-1 text-xs text-shift3-text outline-none focus:border-shift3-green"
                @change="emit('por-pagina', Number(($event.target as HTMLSelectElement).value))"
              >
                <option v-for="n in PRECOS_POR_PAGINA_OPCOES" :key="n" :value="n">{{ n }}</option>
              </select>
            </label>

            <div class="flex items-center gap-1">
              <BaseButton
                variant="ghost"
                size="sm"
                icon-left="heroicons:chevron-double-left"
                aria-label="Primeira página"
                :disabled="pagina <= 1 || carregando"
                @click="emit('pagina', 1)"
              />
              <BaseButton
                variant="ghost"
                size="sm"
                icon-left="heroicons:chevron-left"
                aria-label="Página anterior"
                :disabled="pagina <= 1 || carregando"
                @click="emit('pagina', pagina - 1)"
              />
              <span class="px-1 tabular-nums text-shift3-text">Página {{ pagina }} de {{ totalPaginas }}</span>
              <BaseButton
                variant="ghost"
                size="sm"
                icon-left="heroicons:chevron-right"
                aria-label="Próxima página"
                :disabled="pagina >= totalPaginas || carregando"
                @click="emit('pagina', pagina + 1)"
              />
              <BaseButton
                variant="ghost"
                size="sm"
                icon-left="heroicons:chevron-double-right"
                aria-label="Última página"
                :disabled="pagina >= totalPaginas || carregando"
                @click="emit('pagina', totalPaginas)"
              />
            </div>
          </div>
        </div>
      </Teleport>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Preco } from '~/types/preco'

const props = withDefaults(
  defineProps<{
    itens: Preco[]
    carregando: boolean
    podeEditar?: boolean
    podeExcluir?: boolean
    /** Paginação: total de preços com o filtro atual, página atual e tamanho da página. */
    total?: number
    pagina?: number
    porPagina?: number
  }>(),
  { podeEditar: true, podeExcluir: true, total: 0, pagina: 1, porPagina: 50 }
)
const emit = defineEmits<{
  editar: [id: string]
  excluir: [preco: Preco]
  pagina: [pagina: number]
  'por-pagina': [tamanho: number]
}>()

const totalPaginas = computed(() => Math.max(1, Math.ceil(props.total / props.porPagina)))
const inicio = computed(() => (props.total ? (props.pagina - 1) * props.porPagina + 1 : 0))
const fim = computed(() => Math.min(props.pagina * props.porPagina, props.total))
const fmt = (n: number) => n.toLocaleString('pt-BR')

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
