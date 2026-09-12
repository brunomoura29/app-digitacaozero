<template>
  <div>
    <label class="block text-sm font-medium text-shift3-text mb-2">Vendedor</label>
    <div class="relative">
      <BaseInput
        :model-value="textoBusca"
        type="text"
        placeholder="Buscar vendedor..."
        @update:model-value="atualizarBusca"
        @focus="mostrarLista = true"
        @blur="fecharLista"
      />

      <!-- Dropdown de resultados -->
      <div
        v-if="mostrarLista && (filtrados.length > 0 || textoBusca)"
        class="absolute top-full left-0 right-0 mt-1 bg-shift3-bg-card border border-shift3-border rounded-lg shadow-lg z-10"
      >
        <div v-if="vendedores.carregando.value" class="p-3 text-sm text-shift3-text-muted">
          Carregando vendedores…
        </div>

        <button
          v-else-if="filtrados.length === 0"
          type="button"
          class="w-full px-3 py-2 text-sm text-shift3-text-muted hover:bg-shift3-bg-light"
        >
          Nenhum vendedor encontrado
        </button>

        <button
          v-for="v in filtrados"
          v-else
          :key="v.id"
          type="button"
          class="w-full px-3 py-2 text-left text-sm hover:bg-shift3-bg-light transition flex items-center justify-between"
          :class="{ 'bg-shift3-teal/10': modelValue === v.id }"
          @click="selecionarVendedor(v)"
        >
          <span :class="{ 'font-semibold text-shift3-teal': modelValue === v.id }">
            {{ v.nome }}
          </span>
          <Icon v-if="modelValue === v.id" name="heroicons:check" class="w-4 h-4 text-shift3-teal" />
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
import { computed } from 'vue'

interface Props {
  modelValue?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null
})

const emit = defineEmits<{
  'update:modelValue': [id: string | null]
}>()

const vendedores = useVendedores()
const textoBusca = ref('')
const mostrarLista = ref(false)

onMounted(() => {
  vendedores.carregar()
})

const filtrados = computed(() => {
  if (!textoBusca.value.trim()) return vendedores.itens.value.filter((v) => v.ativo)

  const termo = textoBusca.value.toLowerCase()
  return vendedores.itens.value.filter(
    (v) => v.ativo && v.nome.toLowerCase().includes(termo)
  )
})

function atualizarBusca(valor: string) {
  textoBusca.value = valor
  mostrarLista.value = true
}

function selecionarVendedor(v: any) {
  emit('update:modelValue', v.id)
  textoBusca.value = v.nome
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
  }, 100)
}
</script>
