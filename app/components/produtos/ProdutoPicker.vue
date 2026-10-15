<template>
  <div>
    <label v-if="!hideLabel" class="block text-sm font-medium text-shift3-text mb-2">Produto</label>
    <div ref="inputRef">
      <BaseInput
        :model-value="textoBusca"
        type="text"
        placeholder="Buscar por descrição, SKU, OEM ou código de barras…"
        icon="heroicons:magnifying-glass"
        :disabled="disabled"
        @update:model-value="atualizarBusca"
        @focus="mostrarLista = true"
        @blur="fecharLista"
      />
    </div>

    <!-- Dropdown de resultados — mais largo que o campo (a coluna da tabela é estreita) e preso
         à tela (fixed), pra não ser cortado pela tabela; acompanha rolagem e redimensionamento -->
    <div
      v-if="mostrarLista && (filtrados.length > 0 || textoBusca)"
      class="fixed z-[100] flex flex-col overflow-hidden rounded-lg border border-shift3-border bg-shift3-bg-card shadow-xl"
      :style="dropdownStyle"
    >
      <div class="min-h-0 flex-1 overflow-y-auto">
      <div v-if="produtos.carregando.value && !produtos.itens.value.length" class="p-3 text-sm text-shift3-text-muted">
        Carregando produtos…
      </div>

      <button
        v-else-if="filtrados.length === 0"
        type="button"
        class="w-full px-3 py-2 text-sm text-shift3-text-muted hover:bg-shift3-bg-light"
      >
        Nenhum produto encontrado
      </button>

      <button
        v-for="p in visiveis"
        v-else
        :key="p.id"
        type="button"
        class="flex w-full items-start justify-between gap-3 border-b border-shift3-border/40 px-3 py-2.5 text-left text-sm transition last:border-b-0 hover:bg-shift3-bg-light"
        :class="{ 'bg-shift3-teal/10': modelValue === p.id }"
        :title="p.descricao"
        @mousedown.prevent
        @click="selecionar(p)"
      >
        <span class="min-w-0 flex-1">
          <!-- descrição inteira, quebrando linha — nada de cortar com reticências -->
          <span class="block break-words font-medium leading-snug text-shift3-text" :class="{ 'text-shift3-teal': modelValue === p.id }">
            {{ p.descricao }}
          </span>
          <span class="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-shift3-text-muted">
            <span v-if="p.sku"><span class="text-shift3-text-secondary">SKU</span> {{ p.sku }}</span>
            <span v-if="p.oem"><span class="text-shift3-text-secondary">OEM</span> {{ p.oem }}</span>
            <span v-if="p.marcas?.nome">{{ p.marcas.nome }}</span>
            <span v-if="p.grupos?.nome">{{ p.grupos.nome }}{{ p.subgrupos?.nome ? ` › ${p.subgrupos.nome}` : '' }}</span>
            <span v-if="p.unidade">{{ p.unidade }}</span>
          </span>
        </span>
        <Icon v-if="modelValue === p.id" name="heroicons:check" class="mt-0.5 h-4 w-4 shrink-0 text-shift3-teal" />
      </button>

      <p v-if="filtrados.length > visiveis.length" class="px-3 py-2 text-xs text-shift3-text-muted">
        Mostrando {{ visiveis.length }} de {{ filtrados.length.toLocaleString('pt-BR') }} — digite mais para filtrar.
      </p>
      </div>

      <button
        type="button"
        class="w-full shrink-0 border-t border-shift3-border/60 px-3 py-2 text-sm text-shift3-text-muted hover:bg-shift3-bg-light"
        @mousedown.prevent
        @click="limpar"
      >
        Limpar seleção
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch, nextTick } from 'vue'
import type { Produto } from '~/types/produto'

/** Quantos resultados desenhar de uma vez — o catálogo inteiro pesaria a tela. */
const MAX_RESULTADOS = 50
/** Largura mínima da lista: a coluna "Produto" da tabela de itens é estreita. */
const LARGURA_MINIMA = 520
const ALTURA_MAXIMA = 384

interface Props {
  modelValue?: string | null
  /** Esconde o rótulo "Produto" — útil quando já usado dentro de uma coluna de tabela. */
  hideLabel?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  hideLabel: false,
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [id: string | null]
}>()

const produtos = useProdutos()
const textoBusca = ref('')
const mostrarLista = ref(false)
const dropdownStyle = ref<Record<string, string>>({})
const inputRef = ref<HTMLElement | null>(null)

// várias buscas na mesma tela (uma por linha de item) dividem o mesmo catálogo
onMounted(() => {
  produtos.garantirCatalogo().catch(() => {})
})

/**
 * Posiciona a lista: pelo menos LARGURA_MINIMA (sem passar da tela), alinhada ao campo e puxada
 * pra esquerda se fosse sair pela direita; abre pra cima quando não cabe embaixo.
 */
function posicionar() {
  if (!inputRef.value) return
  const rect = inputRef.value.getBoundingClientRect()
  const margem = 16
  const largura = Math.min(Math.max(rect.width, LARGURA_MINIMA), window.innerWidth - margem * 2)
  const esquerda = Math.max(margem, Math.min(rect.left, window.innerWidth - largura - margem))
  const espacoAbaixo = window.innerHeight - rect.bottom - margem
  const espacoAcima = rect.top - margem
  const paraCima = espacoAbaixo < 240 && espacoAcima > espacoAbaixo
  const altura = Math.min(ALTURA_MAXIMA, (paraCima ? espacoAcima : espacoAbaixo) - 8)
  dropdownStyle.value = {
    left: `${esquerda}px`,
    width: `${largura}px`,
    maxHeight: `${altura}px`,
    ...(paraCima ? { bottom: `${window.innerHeight - rect.top + 8}px` } : { top: `${rect.bottom + 8}px` })
  }
}

// a lista é fixed: acompanha a rolagem (de qualquer área, por isso capture) e o redimensionamento
watch(mostrarLista, async (show) => {
  if (!import.meta.client) return
  if (show) {
    await nextTick()
    posicionar()
    window.addEventListener('scroll', posicionar, true)
    window.addEventListener('resize', posicionar)
  } else {
    window.removeEventListener('scroll', posicionar, true)
    window.removeEventListener('resize', posicionar)
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', posicionar, true)
  window.removeEventListener('resize', posicionar)
})

// pré-preenche o texto de busca quando já vem um produto selecionado (edição) —
// inclusive se a lista carregar depois do valor já estar setado.
function sincronizarTexto() {
  if (!props.modelValue) return
  const p = produtos.itens.value.find((i) => i.id === props.modelValue)
  if (p) textoBusca.value = p.descricao
}
watch(() => props.modelValue, sincronizarTexto, { immediate: true })
watch(() => produtos.itens.value, sincronizarTexto)

const filtrados = computed(() => {
  const termo = textoBusca.value.trim().toLowerCase()
  if (!termo) return produtos.itens.value
  const contem = (v: string | null | undefined) => (v ?? '').toLowerCase().includes(termo)
  return produtos.itens.value.filter(
    (p: Produto) => contem(p.descricao) || contem(p.sku) || contem(p.oem) || contem(p.codigo_barras)
  )
})

const visiveis = computed(() => filtrados.value.slice(0, MAX_RESULTADOS))

function atualizarBusca(valor: string) {
  textoBusca.value = valor
  mostrarLista.value = true
}

function selecionar(p: { id: string; descricao: string }) {
  emit('update:modelValue', p.id)
  textoBusca.value = p.descricao
  mostrarLista.value = false
}

function limpar() {
  emit('update:modelValue', null)
  textoBusca.value = ''
  mostrarLista.value = false
}

function fecharLista() {
  setTimeout(() => {
    mostrarLista.value = false
  }, 150)
}
</script>
