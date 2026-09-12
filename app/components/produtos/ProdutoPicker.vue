<template>
  <div>
    <label class="block text-sm font-medium text-shift3-text mb-2">Produto</label>
    <div class="relative">
      <BaseInput
        :model-value="textoBusca"
        type="text"
        placeholder="Buscar produto por descrição ou SKU…"
        icon="heroicons:magnifying-glass"
        @update:model-value="atualizarBusca"
        @focus="mostrarLista = true"
        @blur="fecharLista"
      />

      <!-- Dropdown de resultados -->
      <div
        v-if="mostrarLista && (filtrados.length > 0 || textoBusca)"
        class="absolute top-full left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-shift3-bg-card border border-shift3-border rounded-lg shadow-lg z-10"
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
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

interface Props {
  modelValue?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null
})

const emit = defineEmits<{
  'update:modelValue': [id: string | null]
}>()

const produtos = useProdutos()
const textoBusca = ref('')
const mostrarLista = ref(false)

onMounted(() => {
  produtos.carregar()
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
