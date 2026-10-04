<template>
  <!--
    Folha da Ordem de Compra — o mesmo documento serve o link do cliente e o PDF
    (impressão do navegador). `.papel` mantém o tema claro mesmo com o app no dark.
  -->
  <article
    class="papel mx-auto w-full max-w-[210mm] overflow-hidden rounded-large border border-shift3-border bg-shift3-bg-card text-shift3-text shadow-lg print:max-w-none print:rounded-none print:border-0 print:shadow-none"
  >
    <div class="h-1.5 bg-gradient-to-r from-shift3-dark via-shift3-teal to-shift3-green" />

    <div class="space-y-8 p-6 sm:p-10 print:p-0 print:pt-6">
      <!-- ───── Cabeçalho: representante + número ───── -->
      <header class="flex flex-wrap items-start justify-between gap-6">
        <div class="flex min-w-0 items-center gap-4">
          <img
            v-if="empresa?.logo_url"
            :src="empresa.logo_url"
            :alt="empresa.nome ?? 'Logomarca'"
            class="h-16 w-auto max-w-[11rem] shrink-0 object-contain"
          />
          <div
            v-else-if="iniciais"
            class="flex h-14 w-14 shrink-0 items-center justify-center rounded-medium bg-shift3-dark text-lg font-bold text-shift3-green"
          >
            {{ iniciais }}
          </div>

          <div v-if="empresa" class="min-w-0 space-y-0.5">
            <p class="text-base font-semibold leading-tight text-shift3-text">{{ empresa.nome }}</p>
            <p v-if="empresa.documento_legal" class="text-xs text-shift3-text-secondary">
              {{ rotuloDocumento(empresa.documento_legal) }} {{ formatarDocumento(empresa.documento_legal) }}
            </p>
            <p v-for="linha in formatarEndereco(empresa.endereco)" :key="linha" class="text-xs text-shift3-text-secondary">
              {{ linha }}
            </p>
            <p v-if="contatoEmpresa" class="text-xs text-shift3-text-secondary">{{ contatoEmpresa }}</p>
          </div>
        </div>

        <div class="ml-auto text-right">
          <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-shift3-teal">Ordem de Compra</p>
          <p class="mt-1 text-2xl font-bold leading-none tracking-tight text-shift3-text">{{ pedido.numero }}</p>
          <span
            class="mt-3 inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-xs font-medium"
            :class="situacao.classe"
          >
            <span class="h-1.5 w-1.5 rounded-full" :class="situacao.bolinha" />
            {{ situacao.rotulo }}
          </span>
        </div>
      </header>

      <!-- ───── Cliente + condições ───── -->
      <section class="grid grid-cols-1 gap-4 sm:grid-cols-5 print:grid-cols-5">
        <div class="rounded-medium border border-shift3-border p-4 sm:col-span-3 print:col-span-3">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-shift3-text-muted">Cliente</p>
          <p class="mt-2 text-base font-semibold leading-tight text-shift3-text">{{ nomeCliente }}</p>
          <div class="mt-1 space-y-0.5 text-xs text-shift3-text-secondary">
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

      <!-- ───── Itens ───── -->
      <section class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b-2 border-shift3-dark text-[11px] uppercase tracking-wide text-shift3-text-muted">
              <th class="w-8 py-2 pr-2 text-left font-semibold">#</th>
              <th v-if="temCodigo" class="px-2 py-2 text-left font-semibold">Código</th>
              <th class="px-2 py-2 text-left font-semibold">Descrição</th>
              <th class="px-2 py-2 text-right font-semibold">Qtd</th>
              <th class="px-2 py-2 text-right font-semibold">Unitário</th>
              <th class="py-2 pl-2 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody class="tabular-nums">
            <tr v-for="(item, i) in itens" :key="item.id" class="break-inside-avoid border-b border-shift3-border">
              <td class="py-2.5 pr-2 text-shift3-text-muted">{{ i + 1 }}</td>
              <td v-if="temCodigo" class="whitespace-nowrap px-2 py-2.5 text-shift3-text-secondary">{{ item.sku || '—' }}</td>
              <td class="px-2 py-2.5 text-shift3-text">{{ item.descricao || item.descricao_original || '—' }}</td>
              <td class="whitespace-nowrap px-2 py-2.5 text-right text-shift3-text">{{ formatQtd(item.quantidade) }}</td>
              <td class="whitespace-nowrap px-2 py-2.5 text-right text-shift3-text">{{ formatValor(item.preco_unitario) }}</td>
              <td class="whitespace-nowrap py-2.5 pl-2 text-right font-medium text-shift3-text">
                {{ formatValor(item.quantidade * item.preco_unitario) }}
              </td>
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
            <span class="text-shift3-text">{{ formatValor(subtotal) }}</span>
          </div>
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

const nomeCliente = computed(() => props.cliente?.nome || props.pedido.clientes?.nome || '—')
const subtotal = computed(() => props.itens.reduce((acc, item) => acc + item.quantidade * item.preco_unitario, 0))
const temCodigo = computed(() => props.itens.some((item) => item.sku))

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
