<template>
  <div>
    <label v-if="label" class="block text-sm font-medium text-shift3-text mb-2">{{ label }}</label>
    <div class="relative">
      <BaseInput
        :model-value="textoBusca"
        type="text"
        :placeholder="placeholder"
        icon="heroicons:magnifying-glass"
        @update:model-value="atualizarBusca"
        @focus="mostrarLista = true"
        @blur="fecharLista"
      />

      <!-- Dropdown de resultados -->
      <div
        v-if="mostrarLista"
        class="absolute top-full left-0 right-0 z-10 mt-1 max-h-64 overflow-y-auto rounded-lg border border-shift3-border bg-shift3-bg-card shadow-lg"
      >
        <div v-if="carregando" class="p-3 text-sm text-shift3-text-muted">Carregando…</div>

        <template v-else>
          <button
            v-for="item in filtrados"
            :key="item.id"
            type="button"
            class="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-shift3-bg-light"
            :class="{ 'bg-shift3-teal/10': modelValue === item.id }"
            @click="selecionar(item)"
          >
            <span :class="{ 'font-semibold text-shift3-teal': modelValue === item.id }">{{ item.nome }}</span>
            <Icon v-if="modelValue === item.id" name="heroicons:check" class="h-4 w-4 text-shift3-teal" />
          </button>

          <p v-if="!filtrados.length && !podeCriar" class="px-3 py-2 text-sm text-shift3-text-muted">
            Nenhum resultado
          </p>

          <button
            v-if="podeCriar"
            type="button"
            class="flex w-full items-center gap-2 border-t border-shift3-border/60 px-3 py-2 text-left text-sm text-shift3-teal transition hover:bg-shift3-bg-light disabled:opacity-60"
            :disabled="criando"
            @click="criarNovo"
          >
            <Icon name="heroicons:plus" class="h-4 w-4" />
            Criar "{{ textoBusca.trim() }}"
          </button>

          <button
            v-if="modelValue"
            type="button"
            class="w-full border-t border-shift3-border/60 px-3 py-2 text-sm text-shift3-text-muted hover:bg-shift3-bg-light"
            @click="limpar"
          >
            Limpar seleção
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

interface ItemBusca {
  id: string
  nome: string
}

const props = withDefaults(
  defineProps<{
    modelValue?: string | null
    label?: string
    placeholder?: string
    itens: ItemBusca[]
    carregando?: boolean
    /** Cria um novo registro com o nome digitado e retorna o item criado. */
    aoCriar: (nome: string) => Promise<ItemBusca>
  }>(),
  { modelValue: null, placeholder: 'Buscar ou digitar pra criar…', carregando: false }
)

const emit = defineEmits<{ 'update:modelValue': [id: string | null] }>()

const textoBusca = ref('')
const mostrarLista = ref(false)
const criando = ref(false)

function sincronizarTexto() {
  if (!props.modelValue) return
  const item = props.itens.find((i) => i.id === props.modelValue)
  if (item) textoBusca.value = item.nome
}

watch(() => props.modelValue, (id) => {
  if (!id) {
    textoBusca.value = ''
    return
  }
  sincronizarTexto()
}, { immediate: true })

// a lista pode chegar depois (carregamento async) — sincroniza o texto quando isso acontece
watch(() => props.itens, sincronizarTexto)

const filtrados = computed(() => {
  const termo = textoBusca.value.trim().toLowerCase()
  if (!termo) return props.itens
  return props.itens.filter((i) => i.nome.toLowerCase().includes(termo))
})

const existeExato = computed(() =>
  props.itens.some((i) => i.nome.toLowerCase() === textoBusca.value.trim().toLowerCase())
)
const podeCriar = computed(() => textoBusca.value.trim().length > 0 && !existeExato.value)

function atualizarBusca(valor: string) {
  textoBusca.value = valor
  mostrarLista.value = true
}

function selecionar(item: ItemBusca) {
  emit('update:modelValue', item.id)
  textoBusca.value = item.nome
  mostrarLista.value = false
}

async function criarNovo() {
  const nome = textoBusca.value.trim()
  if (!nome || criando.value) return
  criando.value = true
  try {
    const novo = await props.aoCriar(nome)
    selecionar(novo)
  } finally {
    criando.value = false
  }
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
