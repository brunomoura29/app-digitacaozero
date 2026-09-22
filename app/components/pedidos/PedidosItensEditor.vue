<template>
  <div class="space-y-3">
    <div v-if="itensSemCadastro.length" class="flex flex-wrap items-center justify-between gap-2 rounded-medium border border-shift3-border bg-shift3-bg-light px-3 py-2 text-sm">
      <span class="text-shift3-text-secondary">
        {{ itensSemCadastro.length }} item(ns) sem produto cadastrado no catálogo.
      </span>
      <div class="flex items-center gap-2">
        <BaseButton type="button" variant="ghost" size="sm" @click="alternarSelecaoTodos">
          {{ todosSemCadastroSelecionados ? 'Desmarcar todos' : 'Selecionar todos' }}
        </BaseButton>
        <BaseButton
          type="button"
          variant="primary"
          size="sm"
          icon-left="heroicons:plus"
          :disabled="!selecionados.size"
          @click="abrirCadastroLote"
        >
          Cadastrar selecionados ({{ selecionados.size }})
        </BaseButton>
      </div>
    </div>

    <div class="rounded-medium border border-shift3-border">
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
        <thead>
          <tr class="border-b border-shift3-border bg-shift3-bg-light text-left text-xs uppercase tracking-wide text-shift3-text-muted">
            <th class="px-2 py-2" style="width: 3%" />
            <th class="px-3 py-2 font-semibold" style="width: 24%">Produto</th>
            <th class="px-3 py-2 font-semibold" style="width: 24%">Descrição</th>
            <th class="px-3 py-2 font-semibold" style="width: 12%">SKU</th>
            <th class="px-3 py-2 font-semibold" style="width: 10%">Qtd.</th>
            <th class="px-3 py-2 font-semibold" style="width: 13%">Preço Unit.</th>
            <th class="px-3 py-2 text-right font-semibold" style="width: 10%">Total</th>
            <th class="px-3 py-2" style="width: 3%" />
          </tr>
        </thead>
        <tbody class="divide-y divide-shift3-border/60">
          <tr v-for="(linha, idx) in linhas" :key="linha._id">
            <td class="px-2 py-2 align-top">
              <input
                v-if="!linha.produto_id"
                type="checkbox"
                class="mt-2 h-4 w-4 accent-shift3-green"
                :checked="selecionados.has(linha._id)"
                :aria-label="`Selecionar item ${idx + 1} pra cadastrar produto`"
                @change="alternarSelecao(linha._id)"
              />
            </td>
            <td class="px-3 py-2 align-top">
              <ProdutosProdutoPicker
                hide-label
                :model-value="linha.produto_id"
                @update:model-value="(v) => onProdutoSelecionado(idx, v)"
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
              <div v-if="semPreco.has(linha._id) && !precoSalvo.has(linha._id)" class="mt-1 space-y-1">
                <p class="text-xs text-shift3-text-muted">Sem preço cadastrado pra esse produto na fábrica/lista escolhida.</p>
                <label v-if="linha.produto_id" class="flex items-center gap-1.5 text-xs text-shift3-text-secondary">
                  <input
                    type="checkbox"
                    class="h-3.5 w-3.5 accent-shift3-green"
                    :disabled="salvandoPrecoLinha.has(linha._id)"
                    @change="(e) => (e.target as HTMLInputElement).checked && salvarPrecoNaTabela(idx)"
                  />
                  Salvar esse preço na tabela
                </label>
              </div>
              <p v-else-if="precoSalvo.has(linha._id)" class="mt-1 flex items-center gap-1 text-xs text-success">
                <Icon name="heroicons:check-circle" class="h-3.5 w-3.5" /> Preço salvo na tabela
              </p>
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
            <td colspan="8" class="px-3 py-6 text-center text-sm text-shift3-text-muted">
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

    <!-- Cadastro em lote dos itens sem produto no catálogo -->
    <BaseModal v-if="mostrarCadastroLote" @close="mostrarCadastroLote = false">
      <div class="space-y-4">
        <h3 class="text-lg font-semibold text-shift3-text">Cadastrar produtos</h3>
        <p class="text-sm text-shift3-text-secondary">
          Confira ou ajuste SKU e descrição antes de criar — já vêm preenchidos com o que foi extraído/mapeado.
        </p>

        <div class="max-h-80 space-y-3 overflow-y-auto pr-1">
          <div
            v-for="rascunho in rascunhosLote"
            :key="rascunho.linhaId"
            class="space-y-2 rounded-default border border-shift3-border p-3"
          >
            <input
              v-model="rascunho.sku"
              type="text"
              placeholder="SKU"
              class="w-full rounded-default border border-shift3-input-border bg-shift3-input px-2 py-1.5 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20"
            />
            <input
              v-model="rascunho.descricao"
              type="text"
              placeholder="Descrição *"
              class="w-full rounded-default border border-shift3-input-border bg-shift3-input px-2 py-1.5 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20"
            />
          </div>
        </div>

        <div class="flex items-center gap-3">
          <BaseButton
            type="button"
            variant="primary"
            icon-left="heroicons:check"
            :loading="cadastrandoLote"
            :disabled="!rascunhosLote.some((r) => r.descricao.trim())"
            @click="confirmarCadastroLote"
          >
            Criar {{ rascunhosLote.length }} produto(s)
          </BaseButton>
          <BaseButton type="button" variant="ghost" @click="mostrarCadastroLote = false">Cancelar</BaseButton>
        </div>
      </div>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { PedidoItemInput } from '~/types/pedido'

type LinhaEditavel = PedidoItemInput & { _id: string }

const props = defineProps<{
  modelValue: PedidoItemInput[]
  /** Fábrica/lista escolhida no pedido — usada pra buscar o preço automaticamente ao selecionar o produto. */
  fabricaId?: string | null
  referenciaId?: string | null
}>()
const emit = defineEmits<{ 'update:modelValue': [itens: PedidoItemInput[]] }>()

const precos = usePrecos()
const produtos = useProdutos()
const toast = useToast()
const semPreco = ref<Set<string>>(new Set())

const selecionados = ref<Set<string>>(new Set())
const mostrarCadastroLote = ref(false)
const cadastrandoLote = ref(false)
const rascunhosLote = ref<{ linhaId: string; sku: string; descricao: string }[]>([])

const salvandoPrecoLinha = ref<Set<string>>(new Set())
const precoSalvo = ref<Set<string>>(new Set())

function comId(itens: PedidoItemInput[]): LinhaEditavel[] {
  return itens.map((item) => ({ ...item, _id: crypto.randomUUID() }))
}

const linhas = ref<LinhaEditavel[]>(comId(props.modelValue))

// `emitir()` sempre manda um array novo (sem os `_id`), que o pai guarda e devolve como
// prop — ou seja, todo `update:modelValue` nosso volta pra cá pelo watcher abaixo. Sem essa
// flag, o watcher achava que era o PAI trocando tudo (ex: nova extração) e regenerava os
// `_id` de TODAS as linhas a cada edição — inclusive durante uma busca de preço assíncrona
// em andamento, que perdia a referência da linha e descartava o resultado (bug real:
// selecionar produto/fábrica não atualizava o preço unitário).
let ecoDoProprioEmit = false

// se o pai trocar o array inteiro de verdade (ex: acabou de extrair), resincroniza
watch(
  () => props.modelValue,
  (novo) => {
    if (ecoDoProprioEmit) {
      ecoDoProprioEmit = false
      return
    }
    if (novo !== linhas.value) linhas.value = comId(novo)
  }
)

function emitir() {
  ecoDoProprioEmit = true
  emit(
    'update:modelValue',
    linhas.value.map(({ _id, ...resto }) => resto)
  )
}

function atualizar(idx: number, parcial: Partial<PedidoItemInput>) {
  linhas.value[idx] = { ...linhas.value[idx], ...parcial }
  emitir()
}

/** Busca o preço mais recente na fábrica/lista do pedido e aplica na linha, se ainda for válido. */
async function buscarEAplicarPreco(linhaId: string, produtoId: string) {
  if (!props.fabricaId) return
  semPreco.value.delete(linhaId)
  precoSalvo.value.delete(linhaId)

  try {
    const valor = await precos.buscarAtual(produtoId, props.fabricaId, props.referenciaId ?? null)
    // a linha pode ter mudado de produto (ou sido removida) enquanto a busca corria
    const idxAtual = linhas.value.findIndex((l) => l._id === linhaId)
    if (idxAtual === -1 || linhas.value[idxAtual]?.produto_id !== produtoId) return

    if (valor != null) {
      atualizar(idxAtual, { preco_unitario: valor })
    } else {
      semPreco.value.add(linhaId)
    }
  } catch {
    // falha na busca de preço não deve travar a seleção do produto — usuário completa manualmente
  }
}

/**
 * Grava o preço unitário dessa linha na tabela de preço (produto + fábrica + referência do
 * pedido) — opt-in, marcado item a item, porque nem todo preço de pedido é "preço de
 * tabela" de verdade (pode ser pontual/negociado); quem decide o que vira histórico é o
 * usuário, não o sistema sozinho.
 */
async function salvarPrecoNaTabela(idx: number) {
  const linha = linhas.value[idx]
  if (!linha?.produto_id || !props.fabricaId) return
  if (!linha.preco_unitario || linha.preco_unitario <= 0) {
    toast.error('Informe um preço unitário válido antes de salvar na tabela.')
    return
  }

  const linhaId = linha._id
  salvandoPrecoLinha.value.add(linhaId)
  try {
    const hoje = new Date().toISOString().slice(0, 10)
    await precos.criar({
      produto_id: linha.produto_id,
      fabrica_id: props.fabricaId,
      referencia_id: props.referenciaId ?? null,
      valor: linha.preco_unitario,
      data_registro: hoje,
      competencia: `${hoje.slice(0, 7)}-01`
    })
    precoSalvo.value.add(linhaId)
    semPreco.value.delete(linhaId)
    toast.success('Preço salvo na tabela de preço')
  } catch {
    toast.error('Não foi possível salvar esse preço na tabela')
  } finally {
    salvandoPrecoLinha.value.delete(linhaId)
  }
}

/** Ao trocar o produto da linha, busca o preço mais recente na fábrica/lista do pedido. */
async function onProdutoSelecionado(idx: number, produtoId: string | null) {
  atualizar(idx, { produto_id: produtoId })
  const linhaId = linhas.value[idx]?._id
  if (!linhaId) return
  semPreco.value.delete(linhaId)
  if (produtoId) selecionados.value.delete(linhaId) // já tem produto — sai da lista de "sem cadastro"
  if (!produtoId) return

  await buscarEAplicarPreco(linhaId, produtoId)
}

const itensSemCadastro = computed(() => linhas.value.filter((l) => !l.produto_id))
const todosSemCadastroSelecionados = computed(
  () => itensSemCadastro.value.length > 0 && itensSemCadastro.value.every((l) => selecionados.value.has(l._id))
)

function alternarSelecao(linhaId: string) {
  if (selecionados.value.has(linhaId)) selecionados.value.delete(linhaId)
  else selecionados.value.add(linhaId)
}

function alternarSelecaoTodos() {
  if (todosSemCadastroSelecionados.value) {
    selecionados.value.clear()
  } else {
    for (const l of itensSemCadastro.value) selecionados.value.add(l._id)
  }
}

function abrirCadastroLote() {
  rascunhosLote.value = linhas.value
    .filter((l) => selecionados.value.has(l._id))
    .map((l) => ({ linhaId: l._id, sku: l.sku ?? '', descricao: l.descricao ?? '' }))
  mostrarCadastroLote.value = true
}

/** Cria os produtos em lote e já vincula cada um de volta na linha correspondente, disparando a busca de preço. */
async function confirmarCadastroLote() {
  const validos = rascunhosLote.value.filter((r) => r.descricao.trim())
  if (!validos.length) return

  cadastrandoLote.value = true
  try {
    const criados = await produtos.criarEmLote(
      validos.map((r) => ({
        sku: r.sku.trim() || null,
        codigo_barras: null,
        descricao: r.descricao.trim(),
        marca_id: null,
        fabricante_id: null,
        modelo: null,
        numero_serie: null,
        unidade: 'UN',
        ncm: null,
        ativo: true
      }))
    )

    validos.forEach((rascunho, i) => {
      const produto = criados[i]
      if (!produto) return
      const idx = linhas.value.findIndex((l) => l._id === rascunho.linhaId)
      if (idx === -1) return
      atualizar(idx, { produto_id: produto.id, status_match: 'correspondido' })
      selecionados.value.delete(rascunho.linhaId)
      buscarEAplicarPreco(rascunho.linhaId, produto.id)
    })

    toast.success(`${criados.length} produto(s) cadastrado(s)`)
    mostrarCadastroLote.value = false
  } catch {
    toast.error('Não foi possível cadastrar os produtos')
  } finally {
    cadastrandoLote.value = false
  }
}

// se a fábrica/referência do pedido mudar DEPOIS de itens já terem produto selecionado
// (ordem comum: usuário mexe na tabela antes de escolher a fábrica lá em cima), refaz a
// busca de preço pra essas linhas — senão elas ficam presas no valor da extração.
watch(
  () => [props.fabricaId, props.referenciaId],
  () => {
    for (const linha of linhas.value) {
      if (linha.produto_id) buscarEAplicarPreco(linha._id, linha.produto_id)
    }
  }
)

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
  const linhaId = linhas.value[idx]?._id
  if (linhaId) {
    selecionados.value.delete(linhaId)
    semPreco.value.delete(linhaId)
    precoSalvo.value.delete(linhaId)
  }
  linhas.value.splice(idx, 1)
  emitir()
}

const totalGeral = computed(() => linhas.value.reduce((soma, l) => soma + l.quantidade * l.preco_unitario, 0))

function formatValor(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
</script>
