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
    <!-- no desktop sem overflow: senão a div vira a área de rolagem e o título não gruda no topo -->
    <div v-else class="overflow-x-auto lg:overflow-visible">
      <table class="min-w-full text-sm">
        <!-- títulos grudam no topo da área que rola, encostados no cabeçalho da página.
             -top-6 = o p-6 do <main> do layout: sem isso o sticky para 24px abaixo do topo e as
             linhas aparecem passando nessa faixa -->
        <thead class="sticky -top-6 z-10 bg-shift3-bg-card shadow-[inset_0_-1px_0_rgb(var(--s3-border))]">
          <tr class="text-left text-xs uppercase tracking-wide text-shift3-text-muted">
            <th v-if="podeEditar" class="w-10 py-3 pl-4">
              <input
                type="checkbox"
                class="h-4 w-4 accent-shift3-green"
                :checked="todosMarcados"
                :indeterminate.prop="algunsMarcados"
                aria-label="Selecionar todos os produtos da lista"
                @change="alternarTodos"
              />
            </th>
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
            :class="{ 'bg-shift3-teal/5': marcados.has(p.id) }"
          >
            <td v-if="podeEditar" class="w-10 py-3 pl-4">
              <input
                type="checkbox"
                class="h-4 w-4 accent-shift3-green"
                :checked="marcados.has(p.id)"
                :aria-label="`Selecionar ${p.descricao}`"
                @change="alternar(p.id)"
              />
            </td>
            <td class="px-4 py-3" style="width: 30%">
              <button
                v-if="podeEditar"
                class="block w-full text-left text-sm font-semibold text-shift3-text hover:text-shift3-teal"
                @click="emit('editar', p.id)"
              >
                {{ p.descricao }}
              </button>
              <span v-else class="block text-left text-sm font-semibold text-shift3-text">{{ p.descricao }}</span>
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

    <!-- Paginação — teleportada pra barra fixa do layout (dashboard.vue), sempre visível -->
    <ClientOnly>
      <Teleport to="#dashboard-footer">
        <div
          v-if="total"
          class="flex flex-wrap items-center justify-between gap-3 border-t border-shift3-border bg-shift3-bg-card px-6 py-2.5 text-xs text-shift3-text-muted"
        >
          <span class="tabular-nums">
            {{ fmt(inicio) }}–{{ fmt(fim) }} de {{ fmt(total) }} {{ total === 1 ? 'produto' : 'produtos' }}
          </span>

          <div class="flex items-center gap-3">
            <label class="flex items-center gap-1.5">
              Por página
              <select
                :value="porPagina"
                class="rounded-default border border-shift3-input-border bg-shift3-input px-2 py-1 text-xs text-shift3-text outline-none focus:border-shift3-green"
                @change="emit('por-pagina', Number(($event.target as HTMLSelectElement).value))"
              >
                <option v-for="n in PRODUTOS_POR_PAGINA_OPCOES" :key="n" :value="n">{{ n }}</option>
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
import type { Produto } from '~/types/produto'

const props = withDefaults(
  defineProps<{
    itens: Produto[]
    carregando: boolean
    podeEditar?: boolean
    podeExcluir?: boolean
    /** Paginação: total de produtos com o filtro atual, página atual e tamanho da página. */
    total?: number
    pagina?: number
    porPagina?: number
  }>(),
  { podeEditar: true, podeExcluir: true, total: 0, pagina: 1, porPagina: 50 }
)
const emit = defineEmits<{
  editar: [id: string]
  excluir: [produto: Produto]
  pagina: [pagina: number]
  'por-pagina': [tamanho: number]
}>()

const totalPaginas = computed(() => Math.max(1, Math.ceil(props.total / props.porPagina)))
const inicio = computed(() => (props.total ? (props.pagina - 1) * props.porPagina + 1 : 0))
const fim = computed(() => Math.min(props.pagina * props.porPagina, props.total))
const fmt = (n: number) => n.toLocaleString('pt-BR')

/** Ids marcados pra edição em massa (v-model:selecionados). */
const selecionados = defineModel<string[]>('selecionados', { default: () => [] })
const marcados = computed(() => new Set(selecionados.value))
const todosMarcados = computed(() => props.itens.length > 0 && props.itens.every((p) => marcados.value.has(p.id)))
const algunsMarcados = computed(() => !todosMarcados.value && props.itens.some((p) => marcados.value.has(p.id)))

function alternar(id: string) {
  selecionados.value = marcados.value.has(id) ? selecionados.value.filter((s) => s !== id) : [...selecionados.value, id]
}

/** Marca/desmarca todos os que estão na lista (já filtrada). */
function alternarTodos() {
  selecionados.value = todosMarcados.value ? [] : props.itens.map((p) => p.id)
}

function acoes(p: Produto) {
  const itens: any[] = []
  if (props.podeEditar) itens.push({ label: 'Editar', icon: 'heroicons:pencil-square', onClick: () => emit('editar', p.id) })
  if (props.podeEditar && props.podeExcluir) itens.push({ divider: true })
  if (props.podeExcluir) itens.push({ label: 'Excluir', icon: 'heroicons:trash', danger: true, onClick: () => emit('excluir', p) })
  return itens
}
</script>
