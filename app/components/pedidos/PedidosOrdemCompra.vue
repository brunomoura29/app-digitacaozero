<template>
  <!--
    Folha da Ordem de Compra — o mesmo documento serve o link do cliente e o PDF
    (impressão do navegador). `.papel` mantém o tema claro mesmo com o app no dark.
  -->
  <article
    class="papel mx-auto w-full max-w-[210mm] overflow-hidden rounded-large border border-shift3-border bg-shift3-bg-card text-shift3-text shadow-lg print:max-w-none print:rounded-none print:border-0 print:shadow-none"
  >
    <div class="h-1.5 bg-gradient-to-r from-shift3-dark via-shift3-teal to-shift3-green" />

    <div class="space-y-6 p-4 sm:space-y-8 sm:p-10 print:space-y-8 print:p-0 print:pt-6">
      <!-- ───── Cabeçalho: representante + número (no celular, um embaixo do outro) ───── -->
      <header
        class="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-6 print:flex-row print:flex-wrap print:items-start print:justify-between print:gap-6"
      >
        <div class="flex min-w-0 items-center gap-3 sm:gap-4 print:gap-4">
          <img
            v-if="empresa?.logo_url"
            :src="empresa.logo_url"
            :alt="empresa.nome ?? 'Logomarca'"
            class="h-12 w-auto max-w-[7rem] shrink-0 object-contain sm:h-16 sm:max-w-[11rem] print:h-16 print:max-w-[11rem]"
          />
          <div
            v-else-if="iniciais"
            class="flex h-14 w-14 shrink-0 items-center justify-center rounded-medium bg-shift3-dark text-lg font-bold text-shift3-green"
          >
            {{ iniciais }}
          </div>

          <div v-if="empresa" class="min-w-0 space-y-0.5">
            <p class="break-words text-base font-semibold leading-tight text-shift3-text">{{ empresa.nome }}</p>
            <p v-if="empresa.documento_legal" class="text-xs text-shift3-text-secondary">
              {{ rotuloDocumento(empresa.documento_legal) }} {{ formatarDocumento(empresa.documento_legal) }}
            </p>
            <p v-for="linha in formatarEndereco(empresa.endereco)" :key="linha" class="text-xs text-shift3-text-secondary">
              {{ linha }}
            </p>
            <p v-if="contatoEmpresa" class="break-words text-xs text-shift3-text-secondary">{{ contatoEmpresa }}</p>
          </div>
        </div>

        <div
          class="flex items-end justify-between gap-3 border-t border-shift3-border pt-4 sm:ml-auto sm:block sm:border-0 sm:pt-0 sm:text-right print:ml-auto print:block print:border-0 print:pt-0 print:text-right"
        >
          <div class="min-w-0">
            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-shift3-teal">Ordem de Compra</p>
            <p class="mt-1 break-words text-2xl font-bold leading-none tracking-tight text-shift3-text">{{ pedido.numero }}</p>
          </div>
          <span
            class="inline-flex shrink-0 items-center gap-1.5 rounded-pill px-3 py-1 text-xs font-medium sm:mt-3 print:mt-3"
            :class="situacao.classe"
          >
            <span class="h-1.5 w-1.5 rounded-full" :class="situacao.bolinha" />
            {{ situacao.rotulo }}
          </span>
        </div>
      </header>

      <!-- ───── Cliente + condições ───── -->
      <section class="grid grid-cols-1 gap-4 sm:grid-cols-5 print:grid-cols-5">
        <div class="min-w-0 rounded-medium border border-shift3-border p-4 sm:col-span-3 print:col-span-3">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-shift3-text-muted">Cliente</p>
          <p class="mt-2 break-words text-base font-semibold leading-tight text-shift3-text">{{ nomeCliente }}</p>
          <div class="mt-1 space-y-0.5 break-words text-xs text-shift3-text-secondary">
            <p v-if="cliente?.documento || cliente?.inscricao_estadual">
              <template v-if="cliente?.documento">
                {{ rotuloDocumento(cliente.documento) }} {{ formatarDocumento(cliente.documento) }}
              </template>
              <template v-if="cliente?.documento && cliente?.inscricao_estadual"> · </template>
              <template v-if="cliente?.inscricao_estadual">IE {{ cliente.inscricao_estadual }}</template>
            </p>
            <p v-for="linha in formatarEndereco(cliente?.endereco)" :key="linha">{{ linha }}</p>
            <p v-if="contatoCliente">{{ contatoCliente }}</p>
          </div>
        </div>

        <dl
          class="grid grid-cols-2 content-start gap-x-4 gap-y-3 rounded-medium bg-shift3-bg-light p-4 sm:col-span-2 print:col-span-2"
        >
          <div>
            <dt class="text-[11px] font-semibold uppercase tracking-wide text-shift3-text-muted">Emissão</dt>
            <dd class="mt-0.5 text-sm font-medium text-shift3-text">{{ formatData(pedido.data_emissao) }}</dd>
          </div>
          <div>
            <dt class="text-[11px] font-semibold uppercase tracking-wide text-shift3-text-muted">Entrega</dt>
            <dd class="mt-0.5 text-sm font-medium text-shift3-text">{{ pedido.prazo_entrega || '—' }}</dd>
          </div>
          <div class="col-span-2">
            <dt class="text-[11px] font-semibold uppercase tracking-wide text-shift3-text-muted">Pagamento</dt>
            <dd class="mt-0.5 text-sm font-medium text-shift3-text">{{ pedido.condicao_pagamento || '—' }}</dd>
          </div>
          <div v-if="fabrica" class="col-span-2">
            <dt class="text-[11px] font-semibold uppercase tracking-wide text-shift3-text-muted">Fábrica</dt>
            <dd class="mt-0.5 text-sm font-medium text-shift3-text">{{ fabrica }}</dd>
          </div>
        </dl>
      </section>

      <!-- ───── Informações do pedido: os campos do cabeçalho do template que vieram preenchidos ───── -->
      <section v-if="informacoes.length">
        <p class="border-b border-shift3-border pb-2 text-[11px] font-semibold uppercase tracking-wide text-shift3-text-muted">
          Informações do pedido
        </p>
        <dl
          class="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3"
        >
          <div v-for="info in informacoes" :key="info.id" class="min-w-0">
            <dt class="text-[11px] font-semibold uppercase tracking-wide text-shift3-text-muted">{{ info.nome }}</dt>
            <dd class="mt-0.5 break-words text-sm font-medium text-shift3-text">{{ exibirInformacao(info) }}</dd>
          </div>
        </dl>
      </section>

      <!-- ───── Itens ───── -->
      <!-- Celular: um cartão por item, sem rolagem lateral. O PDF sempre usa a tabela. -->
      <section class="sm:hidden print:hidden">
        <p class="border-b-2 border-shift3-dark pb-2 text-[11px] font-semibold uppercase tracking-wide text-shift3-text-muted">
          Itens
        </p>
        <ul class="tabular-nums">
          <li v-for="(l, i) in linhas" :key="l.item.id" class="flex gap-3 border-b border-shift3-border py-3">
            <span class="w-5 shrink-0 pt-0.5 text-xs text-shift3-text-muted">{{ i + 1 }}</span>
            <div class="min-w-0 flex-1">
              <p class="break-words text-sm font-medium text-shift3-text">
                {{ primeiraMaiuscula(l.item.descricao || l.item.descricao_original) || '—' }}
              </p>
              <p v-if="l.item.sku" class="mt-0.5 break-words text-xs text-shift3-text-secondary">Cód. {{ l.item.sku }}</p>
              <div class="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <span class="text-xs text-shift3-text-secondary">
                  {{ formatQtd(l.item.quantidade) }} × {{ formatValor(l.unitLiquido) }}
                </span>
                <span class="ml-auto text-sm font-semibold text-shift3-text">{{ formatValor(l.total) }}</span>
              </div>
              <p v-if="l.item.ipi != null" class="mt-0.5 text-xs font-semibold text-shift3-text">IPI {{ formatPct(l.item.ipi) }}</p>
              <p v-if="l.pct !== null" class="mt-0.5 text-xs">
                <span class="text-shift3-text-muted line-through">{{ formatValor(l.base) }}</span>
                <span class="ml-1.5 font-semibold" :class="classePct(l.pct)">{{ rotuloPercentual(l.pct) }}</span>
              </p>
            </div>
          </li>
        </ul>
      </section>

      <section class="hidden overflow-x-auto sm:block print:block">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b-2 border-shift3-dark text-[11px] uppercase tracking-wide text-shift3-text-muted">
              <th class="w-8 py-2 pr-2 text-left font-semibold">#</th>
              <th v-if="temCodigo" class="px-2 py-2 text-left font-semibold">Código</th>
              <th class="px-2 py-2 text-left font-semibold">Descrição</th>
              <th class="px-2 py-2 text-right font-semibold">Qtd</th>
              <th class="px-2 py-2 text-right font-semibold">Unitário</th>
              <template v-if="temAjuste">
                <th class="px-2 py-2 text-right font-semibold">Desc.</th>
                <th class="whitespace-nowrap px-2 py-2 text-right font-semibold">Unit. líq.</th>
              </template>
              <th v-if="temIpi" class="whitespace-nowrap px-2 py-2 text-right font-semibold">% IPI</th>
              <th class="py-2 pl-2 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody class="tabular-nums">
            <tr v-for="(l, i) in linhas" :key="l.item.id" class="break-inside-avoid border-b border-shift3-border">
              <td class="py-2.5 pr-2 text-shift3-text-muted">{{ i + 1 }}</td>
              <td v-if="temCodigo" class="whitespace-nowrap px-2 py-2.5 text-shift3-text-secondary">{{ l.item.sku || '—' }}</td>
              <td class="px-2 py-2.5 text-shift3-text">{{ primeiraMaiuscula(l.item.descricao || l.item.descricao_original) || '—' }}</td>
              <td class="whitespace-nowrap px-2 py-2.5 text-right text-shift3-text">{{ formatQtd(l.item.quantidade) }}</td>
              <template v-if="temAjuste">
                <td class="whitespace-nowrap px-2 py-2.5 text-right text-shift3-text">{{ formatValor(l.base) }}</td>
                <td class="whitespace-nowrap px-2 py-2.5 text-right font-semibold" :class="classePct(l.pct)">
                  {{ l.pct !== null ? rotuloPercentual(l.pct) : '—' }}
                </td>
              </template>
              <td class="whitespace-nowrap px-2 py-2.5 text-right text-shift3-text">{{ formatValor(l.unitLiquido) }}</td>
              <td v-if="temIpi" class="whitespace-nowrap px-2 py-2.5 text-right font-semibold text-shift3-text">
                {{ l.item.ipi != null ? formatPct(l.item.ipi) : '—' }}
              </td>
              <td class="whitespace-nowrap py-2.5 pl-2 text-right font-medium text-shift3-text">{{ formatValor(l.total) }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- ───── Observações + totais ───── -->
      <section class="flex break-inside-avoid flex-wrap items-start justify-between gap-6">
        <div class="min-w-0 flex-1 basis-56">
          <template v-if="pedido.observacoes">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-shift3-text-muted">Observações</p>
            <p class="mt-1 whitespace-pre-line text-sm text-shift3-text-secondary">{{ pedido.observacoes }}</p>
          </template>
        </div>

        <div class="ml-auto w-full space-y-2 tabular-nums sm:w-72 print:w-72">
          <div class="flex justify-between px-4 text-sm">
            <span class="text-shift3-text-secondary">Subtotal · {{ itens.length }} {{ itens.length === 1 ? 'item' : 'itens' }}</span>
            <span class="text-shift3-text">{{ formatValor(subtotalLiquido) }}</span>
          </div>
          <!-- a condição de pagamento já está dentro de cada item: aqui só a nota, sem descontar de novo -->
          <p v-if="pctCondicao" class="-mt-1 px-4 text-right text-xs text-shift3-text-muted">
            inclui {{ pedido.condicao_pagamento || 'condição de pagamento' }} ({{ rotuloPercentual(pctCondicao) }}):
            {{ valorCondicao < 0 ? '−' : '+' }} {{ formatValor(Math.abs(valorCondicao)) }}
          </p>
          <div v-if="pedido.frete_valor" class="flex justify-between px-4 text-sm">
            <span class="text-shift3-text-secondary">Frete</span>
            <span class="text-shift3-text">+ {{ formatValor(pedido.frete_valor) }}</span>
          </div>
          <div v-if="pedido.desconto_valor" class="flex justify-between px-4 text-sm">
            <span class="text-shift3-text-secondary">Desconto</span>
            <span class="text-shift3-text">− {{ formatValor(pedido.desconto_valor) }}</span>
          </div>
          <div class="flex items-baseline justify-between rounded-medium bg-shift3-dark px-4 py-3">
            <span class="text-xs font-semibold uppercase tracking-wide text-white/70">Total</span>
            <span class="text-xl font-bold text-shift3-green">{{ formatValor(pedido.total) }}</span>
          </div>
        </div>
      </section>

      <!-- ───── Registro da decisão do cliente ───── -->
      <section
        v-if="pedido.status === 'aprovado' || pedido.status === 'rejeitado'"
        class="flex break-inside-avoid items-center gap-3 rounded-medium border px-4 py-3"
        :class="pedido.status === 'aprovado' ? 'border-success/50 bg-success/10' : 'border-danger/40 bg-danger/10'"
      >
        <Icon
          :name="pedido.status === 'aprovado' ? 'heroicons:check-badge-solid' : 'heroicons:x-circle-solid'"
          class="h-6 w-6 shrink-0"
          :class="pedido.status === 'aprovado' ? 'text-shift3-teal' : 'text-danger'"
        />
        <div>
          <p class="text-sm font-semibold text-shift3-text">
            {{ pedido.status === 'aprovado' ? 'Pedido aprovado' : 'Pedido rejeitado' }}
          </p>
          <p v-if="pedido.decidido_por" class="text-xs text-shift3-text-secondary">
            por {{ pedido.decidido_por }} em {{ formatDataHora(pedido.decidido_em) }}
          </p>
        </div>
      </section>

      <footer class="flex flex-wrap justify-between gap-2 border-t border-shift3-border pt-4 text-[11px] text-shift3-text-muted">
        <span>{{ empresa?.nome }}</span>
        <span>Ordem de Compra {{ pedido.numero }} · gerada via DigitacaoZero</span>
      </footer>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ParteOC } from '~/types/empresa'
import { exibirInformacao, informacoesDoPedido } from '~/types/pedido'
import type { Pedido, PedidoItem } from '~/types/pedido'

const props = withDefaults(
  defineProps<{
    pedido: Pedido
    itens: PedidoItem[]
    empresa?: ParteOC | null
    cliente?: ParteOC | null
    fabrica?: string | null
  }>(),
  { empresa: null, cliente: null, fabrica: null }
)

/** Só as preenchidas — campo do template que a loja não mandou não ocupa espaço na OC. */
const informacoes = computed(() => informacoesDoPedido(props.pedido.dados_extras).filter((i) => i.valor.trim()))
const nomeCliente = computed(() => props.cliente?.nome || props.pedido.clientes?.nome || '—')
const subtotal = computed(() => props.itens.reduce((acc, item) => acc + item.quantidade * item.preco_unitario, 0))
const temCodigo = computed(() => props.itens.some((item) => item.sku))

/**
 * % do item sobre o preço de tabela: o da política do cliente, ou o efetivo quando o preço foi
 * mexido à mão. null = vendido pelo preço de tabela (ou item sem preço de tabela guardado).
 */
function ajusteItem(item: PedidoItem): number | null {
  if (item.preco_tabela == null) return null
  const tabela = Number(item.preco_tabela)
  const final = Number(item.preco_unitario)
  if (tabela <= 0 || Math.abs(final - tabela) < 0.005) return null
  const daPolitica = item.politica_percentual == null ? null : Number(item.politica_percentual)
  if (daPolitica !== null && Math.abs(aplicarPercentual(tabela, daPolitica) - final) < 0.005) return daPolitica
  return Math.round((final / tabela - 1) * 10000) / 100
}

/** Coluna % IPI só aparece se algum item tem IPI guardado (pedidos antigos não têm). */
const temIpi = computed(() => props.itens.some((item) => item.ipi != null))
const formatPct = (v: number) => `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`

/** % da condição de pagamento — entra em cada item (desconto/acréscimo da OC inteira). */
const pctCondicao = computed(() => Number(props.pedido.condicao_percentual) || 0)
const valorCondicao = computed(() => Number(props.pedido.condicao_valor) || 0)

interface LinhaOC {
  item: PedidoItem
  /** "Unitário": preço de tabela quando a política mexeu; senão, o preço do item. */
  base: number
  /** % total sobre o `base` (política e condição, um sobre o outro) — null = sem ajuste. */
  pct: number | null
  unitLiquido: number
  total: number
}

/**
 * Cada item já com a política e a condição de pagamento. O total de cada linha sai do preço
 * cheio × (1 + % condição), arredondado; o centavo que sobrar do arredondamento vai pra linha
 * maior — assim a soma dos itens bate com o subtotal + condição que o banco gravou.
 */
const linhas = computed<LinhaOC[]>(() => {
  const fator = 1 + pctCondicao.value / 100
  const lista = props.itens.map((item) => {
    const politica = ajusteItem(item)
    const base = politica !== null ? Number(item.preco_tabela) : Number(item.preco_unitario)
    const composto = ((1 + (politica ?? 0) / 100) * fator - 1) * 100
    const pct = Math.abs(composto) < 0.005 ? null : Math.round(composto * 100) / 100
    return {
      item,
      base,
      pct,
      unitLiquido: Math.round(Number(item.preco_unitario) * fator * 100) / 100,
      total: Math.round(item.quantidade * Number(item.preco_unitario) * fator * 100) / 100
    }
  })
  if (pctCondicao.value && lista.length) {
    const esperado = subtotal.value + valorCondicao.value
    const sobra = Math.round((esperado - lista.reduce((s, l) => s + l.total, 0)) * 100) / 100
    if (sobra) {
      const maior = lista.reduce((a, b) => (Math.abs(b.total) > Math.abs(a.total) ? b : a))
      maior.total = Math.round((maior.total + sobra) * 100) / 100
    }
  }
  return lista
})
/** Subtotal mostrado: soma dos itens já líquidos (com a condição dentro). */
const subtotalLiquido = computed(() => Math.round(linhas.value.reduce((s, l) => s + l.total, 0) * 100) / 100)

/** Colunas Desc. e Unit. líq. só aparecem se algum item saiu diferente da tabela (política ou condição). */
const temAjuste = computed(() => linhas.value.some((l) => l.pct !== null))

/** Desconto em destaque (verde-escuro: o verde claro some no papel/PDF); acréscimo em texto normal. */
const classePct = (pct: number | null) => ((pct ?? 0) < 0 ? 'text-shift3-teal' : 'text-shift3-text-secondary')

/** Monograma usado no lugar da logo enquanto o representante não envia uma. */
const iniciais = computed(() =>
  (props.empresa?.nome ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('')
)

function contato(parte: ParteOC | null) {
  return [parte?.telefone ? formatarTelefone(parte.telefone) : '', parte?.email ?? ''].filter(Boolean).join(' · ')
}
const contatoEmpresa = computed(() => contato(props.empresa))
const contatoCliente = computed(() => contato(props.cliente))

const situacao = computed(() => {
  switch (props.pedido.status) {
    case 'em_aprovacao':
      return { rotulo: 'Aguardando aprovação', classe: 'bg-warning/20 text-shift3-text', bolinha: 'bg-warning' }
    case 'aprovado':
    case 'enviado':
      return { rotulo: 'Aprovado', classe: 'bg-success/20 text-shift3-teal', bolinha: 'bg-shift3-teal' }
    case 'rejeitado':
      return { rotulo: 'Rejeitado', classe: 'bg-danger/15 text-danger', bolinha: 'bg-danger' }
    case 'cancelado':
      return { rotulo: 'Cancelado', classe: 'bg-danger/15 text-danger', bolinha: 'bg-danger' }
    default:
      return { rotulo: 'Em elaboração', classe: 'bg-shift3-border/60 text-shift3-text-secondary', bolinha: 'bg-shift3-text-muted' }
  }
})

function rotuloDocumento(v: string) {
  return v.replace(/\D/g, '').length > 11 ? 'CNPJ' : 'CPF'
}
function formatValor(v: number) {
  return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function formatQtd(v: number) {
  return (v ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 })
}
function formatData(v: string) {
  const [ano, mes, dia] = v.split('-')
  return `${dia}/${mes}/${ano}`
}
function formatDataHora(v: string | null) {
  if (!v) return ''
  return new Date(v).toLocaleString('pt-BR')
}
</script>
