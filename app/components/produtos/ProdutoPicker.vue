<template>
  <div>
    <label v-if="!hideLabel" class="block text-sm font-medium text-shift3-text mb-2">Produto</label>
    <div>
      <div ref="inputRef">
        <BaseInput
          :model-value="textoBusca"
          type="text"
          placeholder="Buscar produto por descrição ou SKU…"
          icon="heroicons:magnifying-glass"
          @update:model-value="atualizarBusca"
          @focus="mostrarLista = true"
          @blur="fecharLista"
        />
      </div>

      <!-- Dropdown de resultados -->
      <div
        v-if="mostrarLista && (filtrados.length > 0 || textoBusca)"
        class="fixed max-h-64 overflow-y-auto bg-shift3-bg-card border border-shift3-border rounded-lg shadow-lg z-50"
        :style="dropdownStyle"
      >
        <div v-if="produtos.carregando.value" class="p-3 text-sm text-shift3-text-muted">
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
          v-for="p in filtrados"
          v-else
          :key="p.id"
          type="button"
          class="w-full px-3 py-2 text-left text-sm hover:bg-shift3-bg-light transition flex items-center justify-between"
          :class="{ 'bg-shift3-teal/10': modelValue === p.id }"
          @click="selecionar(p)"
        >
          <span class="min-w-0">
            <span class="block truncate" :class="{ 'font-semibold text-shift3-teal': modelValue === p.id }">
              {{ p.descricao }}
            </span>
            <span v-if="p.sku" class="block text-xs text-shift3-text-muted">SKU: {{ p.sku }}</span>
          </span>
          <Icon v-if="modelValue === p.id" name="heroicons:check" class="w-4 h-4 shrink-0 text-shift3-teal" />
        </button>

        <button
          type="button"
          class="w-full px-3 py-2 text-sm text-shift3-text-muted hover:bg-shift3-bg-light border-t border-shift3-border/60"
          @click="limpar"
        >
          Limpar seleção
        </button>
      </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'

interface Props {
  modelValue?: string | null
  /** Esconde o rótulo "Produto" — útil quando já usado dentro de uma coluna de tabela. */
  hideLabel?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  hideLabel: false
})

const emit = defineEmits<{
  'update:modelValue': [id: string | null]
}>()

const produtos = useProdutos()
const textoBusca = ref('')
const mostrarLista = ref(false)
const dropdownStyle = ref<Record<string, string>>({})
const inputRef = ref<HTMLElement | null>(null)

onMounted(() => {
  produtos.carregar()
})

watch(mostrarLista, async (show) => {
  if (show && inputRef.value) {
    await nextTick()
    const rect = inputRef.value.getBoundingClientRect()
    dropdownStyle.value = {
      left: `${rect.left}px`,
      top: `${rect.bottom + 8}px`,
      width: `${rect.width}px`
    }
  }
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
  return produtos.itens.value.filter(
    (p) => p.descricao.toLowerCase().includes(termo) || (p.sku ?? '').toLowerCase().includes(termo)
  )
})

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
