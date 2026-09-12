<template>
  <div>
    <label class="block text-sm font-medium text-shift3-text mb-2">Cliente</label>
    <div class="relative">
      <BaseInput
        :model-value="textoBusca"
        type="text"
        placeholder="Buscar cliente..."
        @update:model-value="atualizarBusca"
        @focus="mostrarLista = true"
        @blur="fecharLista"
      />

      <!-- Dropdown de resultados -->
      <div
        v-if="mostrarLista && (filtrados.length > 0 || textoBusca)"
        class="absolute top-full left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-shift3-bg-card border border-shift3-border rounded-lg shadow-lg z-10"
      >
        <div v-if="clientes.carregando.value" class="p-3 text-sm text-shift3-text-muted">
          Carregando clientes…
        </div>

        <button
          v-else-if="filtrados.length === 0"
          type="button"
          class="w-full px-3 py-2 text-sm text-shift3-text-muted hover:bg-shift3-bg-light"
        >
          Nenhum cliente encontrado
        </button>

        <button
          v-for="c in filtrados"
          v-else
          :key="c.id"
          type="button"
          class="w-full px-3 py-2 text-left text-sm hover:bg-shift3-bg-light transition flex items-center justify-between"
          :class="{ 'bg-shift3-teal/10': modelValue === c.id }"
          @click="selecionar(c)"
        >
          <span :class="{ 'font-semibold text-shift3-teal': modelValue === c.id }">
            {{ c.nome }}
          </span>
          <Icon v-if="modelValue === c.id" name="heroicons:check" class="w-4 h-4 text-shift3-teal" />
        </button>

        <button
          v-if="modelValue"
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
import type { Cliente } from '~/types/cliente'

interface Props {
  modelValue?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null
})

const emit = defineEmits<{
  'update:modelValue': [id: string | null]
}>()

const clientes = useClientes()
const textoBusca = ref('')
const mostrarLista = ref(false)

onMounted(() => {
  clientes.carregar()
})

function sincronizarTexto() {
  if (!props.modelValue) return
  const c = clientes.itens.value.find((i) => i.id === props.modelValue)
  if (c) textoBusca.value = c.nome
}
watch(() => props.modelValue, sincronizarTexto, { immediate: true })
watch(() => clientes.itens.value, sincronizarTexto)

const filtrados = computed(() => {
  if (!textoBusca.value.trim()) return clientes.itens.value.filter((c) => c.ativo)

  const termo = textoBusca.value.toLowerCase()
  return clientes.itens.value.filter((c) => c.ativo && c.nome.toLowerCase().includes(termo))
})

function atualizarBusca(valor: string) {
  textoBusca.value = valor
  mostrarLista.value = true
}

function selecionar(c: Cliente) {
  emit('update:modelValue', c.id)
  textoBusca.value = c.nome
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
