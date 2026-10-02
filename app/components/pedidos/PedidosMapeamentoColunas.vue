<template>
  <div class="space-y-6">
    <div>
      <div class="flex items-center gap-2 border-b border-shift3-border pb-2">
        <Icon name="heroicons:table-cells" class="h-5 w-5 text-shift3-teal" />
        <p class="text-base font-semibold text-shift3-text">Mapeamento de colunas</p>
      </div>
      <p class="mt-2 text-sm text-shift3-text-secondary">
        Pra cada campo, escolha qual coluna do arquivo (identificada abaixo) corresponde a ele —
        {{ linhas.length }} linha(s) encontrada(s).
      </p>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div v-for="campo in camposAlvo" :key="campo.id">
        <label class="mb-1 block text-sm font-medium text-shift3-text">{{ campo.nome }}</label>
        <select
          :value="modelValue[campo.id] ?? ''"
          class="w-full rounded-default border border-shift3-input-border bg-shift3-input px-3 py-2 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20"
          @change="(e) => atualizar(campo.id, (e.target as HTMLSelectElement).value || null)"
        >
          <option value="">— Não mapear —</option>
          <option v-for="col in colunas" :key="col" :value="col">{{ col }}</option>
        </select>
      </div>
    </div>

    <div class="rounded-medium border border-shift3-border bg-shift3-bg-light p-3">
      <div class="max-w-xs">
        <label class="mb-1 block text-sm font-medium text-shift3-text">Identificar produto por</label>
        <select
          :value="identificador"
          class="w-full rounded-default border border-shift3-input-border bg-shift3-input px-3 py-2 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20"
          @change="(e) => emit('update:identificador', (e.target as HTMLSelectElement).value as IdentificadorProduto)"
        >
          <option v-for="i in IDENTIFICADORES_PRODUTO" :key="i.valor" :value="i.valor">{{ i.label }}</option>
        </select>
      </div>
      <p class="mt-2 text-xs text-shift3-text-muted">
        O código de cada item é procurado nesse campo do cadastro de produtos — quando acha, o produto já vem
        selecionado na revisão.
        {{ doTemplate ? 'O padrão vem do template; dá pra trocar só nesta importação.' : '' }}
      </p>
    </div>

    <div class="rounded-medium border border-shift3-border">
      <p class="border-b border-shift3-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">
        Colunas identificadas no arquivo — prévia (5 primeiras linhas)
      </p>
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="border-b border-shift3-border bg-shift3-bg-light text-left text-xs uppercase tracking-wide text-shift3-text-muted">
              <th v-for="col in colunas" :key="col" class="whitespace-nowrap px-3 py-2 font-semibold">{{ col }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-shift3-border/60">
            <tr v-for="(linha, i) in preview" :key="i">
              <td v-for="col in colunas" :key="col" class="whitespace-nowrap px-3 py-2 text-shift3-text">
                {{ linha[col] ?? '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { IDENTIFICADORES_PRODUTO } from '~/types/modelo'
import type { IdentificadorProduto } from '~/types/modelo'
import type { CampoAlvo } from '~/types/pedido'

const props = defineProps<{
  /** Colunas identificadas no arquivo (extraídas pela IA como impressas no documento, ou lidas direto da planilha). */
  colunas: string[]
  linhas: Record<string, unknown>[]
  /** Campos-alvo pra onde mapear — os campos do Template selecionado (extração por IA) ou os 4 papéis fixos (planilha sem template). */
  camposAlvo: CampoAlvo[]
  modelValue: Record<string, string | null>
  /** Campo do cadastro de produtos usado pra pré-selecionar o produto de cada item (v-model:identificador). */
  identificador: IdentificadorProduto
  /** O valor inicial veio de um Template (extração por IA) — só muda o texto de ajuda. */
  doTemplate?: boolean
}>()
const emit = defineEmits<{
  'update:modelValue': [mapeamento: Record<string, string | null>]
  'update:identificador': [identificador: IdentificadorProduto]
}>()

const preview = computed(() => props.linhas.slice(0, 5))

function atualizar(campoId: string, coluna: string | null) {
  emit('update:modelValue', { ...props.modelValue, [campoId]: coluna })
}
</script>
