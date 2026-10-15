<template>
  <div class="space-y-3">
    <div v-if="!disabled && itensSemCadastro.length" class="flex flex-wrap items-center justify-between gap-2 rounded-medium border border-shift3-border bg-shift3-bg-light px-3 py-2 text-sm">
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
                v-if="!disabled && !linha.produto_id"
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
                :disabled="disabled"
                :model-value="linha.produto_id"
                @update:model-value="(v) => onProdutoSelecionado(idx, v)"
              />
              <p v-if="qtdComMesmoCodigo(linha) > 1" class="mt-1 flex items-start gap-1 text-xs text-warning">
                <Icon name="heroicons:exclamation-triangle" class="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {{ qtdComMesmoCodigo(linha) }} produtos com esse código — confira se é o certo
              </p>
            </td>
            <td class="px-3 py-2 align-top">
              <input
                :value="linha.descricao ?? ''"
                type="text"
                :disabled="disabled"
                class="w-full rounded-default border border-shift3-input-border bg-shift3-input px-2 py-1.5 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20 disabled:cursor-not-allowed disabled:bg-shift3-border/30 disabled:text-shift3-text-muted"
                @input="(e) => atualizar(idx, { descricao: (e.target as HTMLInputElement).value })"
              />
            </td>
            <td class="px-3 py-2 align-top">
              <input
                :value="linha.sku ?? ''"
                type="text"
                :disabled="disabled"
                class="w-full rounded-default border border-shift3-input-border bg-shift3-input px-2 py-1.5 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20 disabled:cursor-not-allowed disabled:bg-shift3-border/30 disabled:text-shift3-text-muted"
                @input="(e) => atualizar(idx, { sku: (e.target as HTMLInputElement).value })"
              />
            </td>
            <td class="px-3 py-2 align-top">
              <input
                :value="linha.quantidade"
                type="number"
                step="0.001"
                min="0"
                :disabled="disabled"
                class="w-full rounded-default border border-shift3-input-border bg-shift3-input px-2 py-1.5 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20 disabled:cursor-not-allowed disabled:bg-shift3-border/30 disabled:text-shift3-text-muted"
                @input="(e) => mudarQuantidade(idx, Number((e.target as HTMLInputElement).value) || 0)"
              />
            </td>
            <td class="px-3 py-2 align-top">
              <input
                :value="linha.preco_unitario"
                type="number"
                step="0.01"
                min="0"
                :disabled="disabled"
                class="w-full rounded-default border border-shift3-input-border bg-shift3-input px-2 py-1.5 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20 disabled:cursor-not-allowed disabled:bg-shift3-border/30 disabled:text-shift3-text-muted"
                @input="(e) => mudarPrecoAMao(idx, Number((e.target as HTMLInputElement).value) || 0)"
              />
              <p v-if="origemPreco(linha)" class="mt-1 text-xs" :class="linha.politica_id ? 'text-shift3-teal' : 'text-shift3-text-muted'">
                {{ origemPreco(linha) }}
              </p>
              <div v-if="!disabled && semPreco.has(linha._id) && !precoSalvo.has(linha._id)" class="mt-1 space-y-1">
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
                v-if="!disabled"
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
              {{ disabled ? 'Nenhum item neste pedido.' : 'Nenhum item ainda — adicione manualmente ou extraia de um documento.' }}
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>

    <div class="flex items-center justify-between">
      <BaseButton v-if="!disabled" type="button" variant="secondary" size="sm" icon-left="heroicons:plus" @click="adicionar">
        Adicionar item
      </BaseButton>
      <span v-else />
      <p class="text-sm text-shift3-text-secondary">
        Total: <span class="font-semibold text-shift3-text">{{ formatValor(totalGeral) }}</span>
      </p>
    </div>

    <!-- Cadastro em lote dos itens sem produto no catálogo -->
    <BaseModal v-if="mostrarCadastroLote" @close="mostrarCadastroLote = false">
      <div class="space-y-4">
        <h3 class="text-lg font-semibold text-shift3-text">Cadastrar produtos</h3>
        <p class="text-sm text-shift3-text-secondary">
          Confira ou ajuste o código ({{ rotuloCodigo }}) e a descrição antes de criar — já vêm preenchidos com o que foi extraído/mapeado.
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
              :placeholder="rotuloCodigo"
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
import { computed, onMounted, ref, watch } from 'vue'
import { IDENTIFICADORES_PRODUTO } from '~/types/modelo'
import type { IdentificadorProduto } from '~/types/modelo'
import { normalizarCodigo, produtosPorCodigo } from '~/types/pedido'
import type { PedidoItemInput } from '~/types/pedido'
import type { PoliticaCliente } from '~/types/politica'

type LinhaEditavel = PedidoItemInput & { _id: string }

const props = defineProps<{
  modelValue: PedidoItemInput[]
  /** Fábrica/lista escolhida no pedido — usada pra buscar o preço automaticamente ao selecionar o produto. */
  fabricaId?: string | null
  referenciaId?: string | null
  /** Somente leitura — pedido fora de rascunho/rejeitado não pode ter itens alterados. */
  disabled?: boolean
  /**
   * Campo do cadastro de produtos pelo qual os itens foram pré-selecionados na importação —
   * usado pra sinalizar código duplicado no catálogo e pra saber em qual campo gravar o
   * código no cadastro em lote. Sem ele (edição de pedido já salvo), vale SKU e não sinaliza.
   */
  identificador?: IdentificadorProduto
  /** Busca o preço de tabela dos itens que já chegam com produto (importação) — não usar em pedido salvo, sobrescreveria o preço gravado. */
  precoAoCarregar?: boolean
  /** Cliente do pedido — as políticas comerciais dele (na fábrica do pedido) ajustam o preço de tabela. */
  clienteId?: string | null
  /** Data do pedido (AAAA-MM-DD…) — decide se a política ainda vale. Sem ela, hoje. */
  dataPedido?: string | null
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

/**
 * Linhas com preço digitado à mão (o preço não é o da tabela com a política) — mudar a
 * quantidade não recalcula essas. Fica fora da linha pra não ir pro banco.
 */
const precoManual = ref<Set<string>>(new Set())

function comId(itens: PedidoItemInput[]): LinhaEditavel[] {
  const linhas = itens.map((item) => ({ ...item, _id: crypto.randomUUID() }))
  precoManual.value = new Set(
    linhas
      .filter((l) => {
        if (l.preco_tabela == null) return false
        const esperado = l.politica_percentual != null ? aplicarPercentual(l.preco_tabela, l.politica_percentual) : l.preco_tabela
        return Math.abs(esperado - l.preco_unitario) >= 0.005
      })
      .map((l) => l._id)
  )
  return linhas
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

// ───── políticas comerciais do cliente ─────

const servicoPoliticas = usePoliticasCliente()
const politicas = ref<PoliticaCliente[]>([])
let politicasProntas: Promise<void> = Promise.resolve()
let catalogoPronto: Promise<void> | null = null

/** Recarrega as políticas do cliente na fábrica do pedido. Quem aplica preço espera `politicasProntas`. */
function carregarPoliticas() {
  const cliente = props.clienteId
  const fabrica = props.fabricaId
  if (!cliente || !fabrica) {
    politicas.value = []
    politicasProntas = Promise.resolve()
    return
  }
  politicasProntas = servicoPoliticas
    .doClienteNaFabrica(cliente, fabrica)
    .then((lista) => {
      // trocou de cliente/fábrica enquanto buscava: essa resposta já não vale
      if (props.clienteId === cliente && props.fabricaId === fabrica) politicas.value = lista
    })
    .catch(() => {
      politicas.value = []
    })
}

/** % IPI do cadastro do produto — o item guarda o da época (mudar o cadastro depois não mexe no pedido). */
function ipiDoProduto(produtoId: string | null): number | null {
  if (!produtoId) return null
  const ipi = produtos.itens.value.find((p) => p.id === produtoId)?.ipi
  return ipi == null ? null : Number(ipi)
}

/** O grupo do produto vem do catálogo — garante que ele foi carregado antes de aplicar política por grupo. */
function garantirCatalogo(): Promise<void> {
  catalogoPronto ??= produtos.garantirCatalogo().catch(() => {})
  return catalogoPronto
}

const dataReferencia = computed(() => props.dataPedido?.slice(0, 10) || hojeLocal())

/** Preço final + anotação da política pra esse produto/quantidade a partir do preço de tabela. */
function precoComPolitica(produtoId: string, quantidade: number, precoTabela: number): Partial<PedidoItemInput> {
  const grupoId = produtos.itens.value.find((p) => p.id === produtoId)?.grupo_id ?? null
  const aplicada = resolverPolitica(politicas.value, { id: produtoId, grupo_id: grupoId }, quantidade, dataReferencia.value)
  if (!aplicada) return { preco_unitario: precoTabela, politica_id: null, politica_percentual: null }
  return {
    preco_unitario: aplicarPercentual(precoTabela, aplicada.percentual),
    politica_id: aplicada.politica.id,
    politica_percentual: aplicada.percentual
  }
}

/** Quantidade mudou: política por quantidade pode cair noutra faixa — recalcula (se o preço não foi digitado à mão). */
function mudarQuantidade(idx: number, quantidade: number) {
  atualizar(idx, { quantidade })
  const linha = linhas.value[idx]
  if (!linha?.produto_id || linha.preco_tabela == null || precoManual.value.has(linha._id)) return
  atualizar(idx, precoComPolitica(linha.produto_id, quantidade, linha.preco_tabela))
}

/** Preço digitado: vale o que a pessoa escreveu — sai da política, mas guarda o preço de tabela pra referência. */
function mudarPrecoAMao(idx: number, preco: number) {
  const linha = linhas.value[idx]
  if (!linha) return
  precoManual.value.add(linha._id)
  atualizar(idx, { preco_unitario: preco, politica_id: null, politica_percentual: null })
}

const formatarMoeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** Texto embaixo do preço: de onde ele saiu. Nada quando é o preço de tabela puro. */
function origemPreco(linha: LinhaEditavel): string | null {
  if (linha.preco_tabela == null) return null
  const tabela = `Tabela ${formatarMoeda(linha.preco_tabela)}`
  if (linha.politica_id && linha.politica_percentual != null) {
    const politica = politicas.value.find((p) => p.id === linha.politica_id)
    return `${tabela} · ${rotuloPercentual(linha.politica_percentual)}${politica ? ` (${rotuloAlcance(politica)})` : ''}`
  }
  if (Math.abs(linha.preco_tabela - linha.preco_unitario) >= 0.005) return `${tabela} · preço alterado à mão`
  return null
}

/** Busca o preço mais recente na fábrica/lista do pedido, aplica a política do cliente e grava na linha, se ainda for válida. */
async function buscarEAplicarPreco(linhaId: string, produtoId: string) {
  if (!props.fabricaId) return
  semPreco.value.delete(linhaId)
  precoSalvo.value.delete(linhaId)

  try {
    const [valor] = await Promise.all([
      precos.buscarAtual(produtoId, props.fabricaId, props.referenciaId ?? null),
      politicasProntas,
      garantirCatalogo()
    ])
    // a linha pode ter mudado de produto (ou sido removida) enquanto a busca corria
    const idxAtual = linhas.value.findIndex((l) => l._id === linhaId)
    const linha = linhas.value[idxAtual]
    if (idxAtual === -1 || !linha || linha.produto_id !== produtoId) return

    precoManual.value.delete(linhaId)
    if (valor != null) {
      atualizar(idxAtual, { preco_tabela: valor, ...precoComPolitica(produtoId, linha.quantidade, valor) })
    } else {
      atualizar(idxAtual, { preco_tabela: null, politica_id: null, politica_percentual: null })
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
  // escolha feita à mão deixa de ser "correspondido" — some o aviso de código duplicado
  atualizar(idx, { produto_id: produtoId, status_match: 'manual', ipi: ipiDoProduto(produtoId) })
  const linhaId = linhas.value[idx]?._id
  if (!linhaId) return
  semPreco.value.delete(linhaId)
  if (produtoId) selecionados.value.delete(linhaId) // já tem produto — sai da lista de "sem cadastro"
  if (!produtoId) {
    precoManual.value.delete(linhaId)
    atualizar(idx, { preco_tabela: null, politica_id: null, politica_percentual: null })
    return
  }

  await buscarEAplicarPreco(linhaId, produtoId)
}

const campoCodigo = computed<IdentificadorProduto>(() => props.identificador ?? 'sku')
const rotuloCodigo = computed(() => IDENTIFICADORES_PRODUTO.find((i) => i.valor === campoCodigo.value)?.label ?? 'SKU')

const catalogoPorCodigo = computed(() =>
  props.identificador ? produtosPorCodigo(produtos.itens.value, props.identificador) : null
)

/** Quantos produtos do catálogo têm o código dessa linha — só conta pra linha pré-selecionada automaticamente. */
function qtdComMesmoCodigo(linha: LinhaEditavel): number {
  if (props.disabled || !linha.produto_id || linha.status_match !== 'correspondido') return 0
  return catalogoPorCodigo.value?.get(normalizarCodigo(linha.sku))?.length ?? 0
}

onMounted(() => {
  carregarPoliticas()
  if (props.precoAoCarregar) {
    garantirCatalogo().then(() => {
      linhas.value.forEach((linha, idx) => {
        if (linha.produto_id && linha.ipi == null) atualizar(idx, { ipi: ipiDoProduto(linha.produto_id) })
      })
    })
  }
  if (!props.precoAoCarregar || !props.fabricaId) return
  for (const linha of linhas.value) {
    if (linha.produto_id) buscarEAplicarPreco(linha._id, linha.produto_id)
  }
})

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
        sku: null,
        codigo_barras: null,
        descricao: r.descricao.trim(),
        marca_id: null,
        fabricante_id: null,
        modelo: null,
        numero_serie: null,
        unidade: 'UN',
        ncm: null,
        origem: null,
        montadora_id: null,
        oem: null,
        grupo_id: null,
        subgrupo_id: null,
        aplicacao: null,
        peso: null,
        altura: null,
        largura: null,
        comprimento: null,
        caixa_master: null,
        qtd_minima_venda: null,
        ipi: null,
        ativo: true,
        // o código vai pro campo que identifica o produto nessa importação (SKU, cód. de
        // barras ou nº de série) — senão a próxima importação não acharia o produto
        [campoCodigo.value]: r.sku.trim() || null
      }))
    )

    validos.forEach((rascunho, i) => {
      const produto = criados[i]
      if (!produto) return
      const idx = linhas.value.findIndex((l) => l._id === rascunho.linhaId)
      if (idx === -1) return
      atualizar(idx, { produto_id: produto.id, status_match: 'correspondido', ipi: null })
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

// se a fábrica/referência (ou o cliente, que muda as políticas) mudar DEPOIS de itens já terem
// produto selecionado (ordem comum: usuário mexe na tabela antes de escolher a fábrica lá em
// cima), refaz a busca de preço pra essas linhas — senão elas ficam presas no valor anterior.
watch(
  () => [props.fabricaId, props.referenciaId, props.clienteId],
  () => {
    carregarPoliticas()
    if (props.disabled) return
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
    status_match: 'manual',
    preco_tabela: null,
    politica_id: null,
    politica_percentual: null,
    ipi: null
  })
  emitir()
}

function remover(idx: number) {
  const linhaId = linhas.value[idx]?._id
  if (linhaId) {
    selecionados.value.delete(linhaId)
    semPreco.value.delete(linhaId)
    precoSalvo.value.delete(linhaId)
    precoManual.value.delete(linhaId)
  }
  linhas.value.splice(idx, 1)
  emitir()
}

const totalGeral = computed(() => linhas.value.reduce((soma, l) => soma + l.quantidade * l.preco_unitario, 0))

function formatValor(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
</script>
