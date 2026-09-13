<template>
  <div class="space-y-3">
    <div class="rounded-medium border border-shift3-border">
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
        <thead>
          <tr class="border-b border-shift3-border bg-shift3-bg-light text-left text-xs uppercase tracking-wide text-shift3-text-muted">
            <th class="px-3 py-2 font-semibold" style="width: 26%">Produto</th>
            <th class="px-3 py-2 font-semibold" style="width: 26%">Descrição</th>
            <th class="px-3 py-2 font-semibold" style="width: 12%">SKU</th>
            <th class="px-3 py-2 font-semibold" style="width: 10%">Qtd.</th>
            <th class="px-3 py-2 font-semibold" style="width: 13%">Preço Unit.</th>
            <th class="px-3 py-2 text-right font-semibold" style="width: 10%">Total</th>
            <th class="px-3 py-2" style="width: 3%" />
          </tr>
        </thead>
        <tbody class="divide-y divide-shift3-border/60">
          <tr v-for="(linha, idx) in linhas" :key="linha._id">
            <td class="px-3 py-2 align-top">
              <ProdutosProdutoPicker
                hide-label
                :model-value="linha.produto_id"
                @update:model-value="(v) => atualizar(idx, { produto_id: v })"
              />
            </td>
            <td class="px-3 py-2 align-top">
              <input
                :value="linha.descricao ?? ''"
                type="text"
                class="w-full rounded-default border border-shift3-input-border bg-shift3-input px-2 py-1.5 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20"
                @input="(e) => atualizar(idx, { descricao: (e.target as HTMLInputElement).value })"
              />
            </td>
            <td class="px-3 py-2 align-top">
              <input
                :value="linha.sku ?? ''"
                type="text"
                class="w-full rounded-default border border-shift3-input-border bg-shift3-input px-2 py-1.5 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20"
                @input="(e) => atualizar(idx, { sku: (e.target as HTMLInputElement).value })"
              />
            </td>
            <td class="px-3 py-2 align-top">
              <input
                :value="linha.quantidade"
                type="number"
                step="0.001"
                min="0"
                class="w-full rounded-default border border-shift3-input-border bg-shift3-input px-2 py-1.5 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20"
                @input="(e) => atualizar(idx, { quantidade: Number((e.target as HTMLInputElement).value) || 0 })"
              />
            </td>
            <td class="px-3 py-2 align-top">
              <input
                :value="linha.preco_unitario"
                type="number"
                step="0.01"
                min="0"
                class="w-full rounded-default border border-shift3-input-border bg-shift3-input px-2 py-1.5 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20"
                @input="(e) => atualizar(idx, { preco_unitario: Number((e.target as HTMLInputElement).value) || 0 })"
              />
            </td>
            <td class="px-3 py-2 text-right align-top font-medium text-shift3-text">
              {{ formatValor(linha.quantidade * linha.preco_unitario) }}
            </td>
            <td class="px-3 py-2 text-right align-top">
              <BaseButton
                type="button"
                variant="ghost"
                size="sm"
                icon-left="heroicons:trash"
                class="text-danger"
                @click="remover(idx)"
              />
            </td>
          </tr>

          <tr v-if="!linhas.length">
            <td colspan="7" class="px-3 py-6 text-center text-sm text-shift3-text-muted">
              Nenhum item ainda — adicione manualmente ou extraia de um documento.
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>

    <div class="flex items-center justify-between">
      <BaseButton type="button" variant="secondary" size="sm" icon-left="heroicons:plus" @click="adicionar">
        Adicionar item
      </BaseButton>
      <p class="text-sm text-shift3-text-secondary">
        Total: <span class="font-semibold text-shift3-text">{{ formatValor(totalGeral) }}</span>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { PedidoItemInput } from '~/types/pedido'

type LinhaEditavel = PedidoItemInput & { _id: string }

const props = defineProps<{ modelValue: PedidoItemInput[] }>()
const emit = defineEmits<{ 'update:modelValue': [itens: PedidoItemInput[]] }>()

function comId(itens: PedidoItemInput[]): LinhaEditavel[] {
  return itens.map((item) => ({ ...item, _id: crypto.randomUUID() }))
}

const linhas = ref<LinhaEditavel[]>(comId(props.modelValue))

// se o pai trocar o array inteiro (ex: acabou de extrair), resincroniza
watch(
  () => props.modelValue,
  (novo) => {
    if (novo !== linhas.value) linhas.value = comId(novo)
  }
)

function emitir() {
  emit(
    'update:modelValue',
    linhas.value.map(({ _id, ...resto }) => resto)
  )
}

function atualizar(idx: number, parcial: Partial<PedidoItemInput>) {
  linhas.value[idx] = { ...linhas.value[idx], ...parcial }
  emitir()
}

function adicionar() {
  linhas.value.push({
    _id: crypto.randomUUID(),
    produto_id: null,
    descricao_original: null,
    sku: null,
    descricao: '',
    quantidade: 1,
    preco_unitario: 0,
    status_match: 'manual'
  })
  emitir()
}

function remover(idx: number) {
  linhas.value.splice(idx, 1)
  emitir()
}

const totalGeral = computed(() => linhas.value.reduce((soma, l) => soma + l.quantidade * l.preco_unitario, 0))

function formatValor(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
</script>
