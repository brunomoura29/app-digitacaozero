<template>
  <div ref="raiz" class="relative">
    <label v-if="label" class="mb-2 block text-sm font-medium text-shift3-text">{{ label }}</label>
    <button
      type="button"
      class="flex w-full items-center justify-between gap-2 rounded-default border bg-shift3-input px-3 py-2 text-left text-sm outline-none transition"
      :class="aberto ? 'border-shift3-green ring-2 ring-shift3-green/20' : 'border-shift3-input-border'"
      @click="aberto = !aberto"
    >
      <span class="min-w-0 truncate" :class="selecionadas.length ? 'text-shift3-text' : 'text-shift3-text-muted'">
        {{ resumo }}
      </span>
      <Icon
        name="heroicons:chevron-down"
        class="h-4 w-4 shrink-0 text-shift3-text-muted transition-transform duration-200"
        :class="aberto && 'rotate-180'"
      />
    </button>

    <Transition name="slide">
      <div
        v-if="aberto"
        class="absolute left-0 right-0 top-full z-20 mt-1 rounded-medium border border-shift3-border bg-shift3-bg-card shadow-lg"
      >
        <div v-if="itens.length" class="flex items-center justify-between border-b border-shift3-border px-3 py-2 text-xs">
          <span class="text-shift3-text-muted">{{ modelValue.length }} de {{ itens.length }}</span>
          <div class="flex gap-3">
            <button type="button" class="font-semibold text-shift3-teal hover:underline" @click="emit('update:modelValue', itens.map((i) => i.id))">
              Marcar todas
            </button>
            <button type="button" class="font-semibold text-shift3-text-secondary hover:underline" @click="emit('update:modelValue', [])">
              Limpar
            </button>
          </div>
        </div>

        <div class="max-h-60 overflow-y-auto py-1">
          <label
            v-for="item in itens"
            :key="item.id"
            class="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-shift3-text transition hover:bg-shift3-bg-light"
          >
            <input type="checkbox" class="accent-shift3-teal" :checked="modelValue.includes(item.id)" @change="alternar(item.id)" />
            {{ item.nome }}
          </label>
          <p v-if="!itens.length" class="px-3 py-3 text-sm text-shift3-text-muted">Nenhuma tabela cadastrada ainda.</p>
        </div>

        <form v-if="aoCriar" class="flex gap-2 border-t border-shift3-border p-2" @submit.prevent="criar">
          <input
            v-model="novoNome"
            type="text"
            placeholder="Nova tabela (ex: Distribuidor)"
            class="min-w-0 flex-1 rounded-default border border-shift3-input-border bg-shift3-input px-3 py-1.5 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20"
          />
          <BaseButton type="submit" variant="secondary" size="sm" icon-left="heroicons:plus" :loading="criando" :disabled="!novoNome.trim()">
            Criar
          </BaseButton>
        </form>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

interface ItemTabela {
  id: string
  nome: string
}

const props = defineProps<{
  modelValue: string[]
  itens: ItemTabela[]
  label?: string
  /** Cria a tabela e devolve quando terminar (quem chama marca a nova). Sem ela, não mostra o campo de criar. */
  aoCriar?: (nome: string) => Promise<void>
}>()

const emit = defineEmits<{ 'update:modelValue': [ids: string[]] }>()

const raiz = ref<HTMLElement | null>(null)
const aberto = ref(false)
const novoNome = ref('')
const criando = ref(false)

const selecionadas = computed(() => props.itens.filter((i) => props.modelValue.includes(i.id)))

const resumo = computed(() => {
  const nomes = selecionadas.value.map((i) => i.nome)
  if (!nomes.length) return 'Selecione as tabelas'
  if (nomes.length <= 2) return nomes.join(', ')
  return `${nomes.length} tabelas selecionadas`
})

function alternar(id: string) {
  emit('update:modelValue', props.modelValue.includes(id) ? props.modelValue.filter((x) => x !== id) : [...props.modelValue, id])
}

async function criar() {
  const nome = novoNome.value.trim()
  if (!nome || !props.aoCriar) return
  criando.value = true
  try {
    await props.aoCriar(nome)
    novoNome.value = ''
  } catch {
    // quem criou já avisou do erro; o nome fica no campo pra tentar de novo
  } finally {
    criando.value = false
  }
}

function cliqueFora(e: MouseEvent) {
  if (aberto.value && raiz.value && !raiz.value.contains(e.target as Node)) aberto.value = false
}
onMounted(() => document.addEventListener('mousedown', cliqueFora))
onBeforeUnmount(() => document.removeEventListener('mousedown', cliqueFora))
</script>
