<template>
  <!-- Ocupa a altura que a página der (h-full): as colunas vão até o fim da tela e cada uma
       rola os próprios cards. Na largura, dividem o espaço por igual com mínimo de 16rem —
       abaixo disso o quadro rola na horizontal. -->
  <div class="flex h-full gap-4 overflow-x-auto pb-2">
    <section
      v-for="col in colunas"
      :key="col.status"
      class="flex min-h-0 min-w-[16rem] flex-1 basis-0 flex-col overflow-hidden rounded-medium border border-shift3-border bg-shift3-bg-light transition"
      :class="classeColuna(col.status)"
      @dragover="aoPassarSobre($event, col.status)"
      @drop="soltar($event, col.status)"
    >
      <!-- Cabeçalho da coluna: faixa na cor do status, ícone, nome, soma dos pedidos e contador -->
      <header class="shrink-0 border-b border-t-[3px] border-b-shift3-border bg-shift3-bg-card px-3 py-3" :class="col.faixa">
        <div class="flex items-center gap-2.5">
          <span class="grid h-8 w-8 shrink-0 place-items-center rounded-default" :class="col.icone_cor">
            <Icon :name="col.icone" class="h-4 w-4" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-shift3-text">{{ col.label }}</p>
            <p class="truncate text-xs text-shift3-text-muted">{{ formatarMoeda(totalPorStatus[col.status]) }}</p>
          </div>
          <span
            class="grid h-6 min-w-[1.5rem] shrink-0 place-items-center rounded-pill border border-shift3-border bg-shift3-bg-light px-1.5 text-xs font-semibold text-shift3-text-secondary"
          >
            {{ pedidosPorStatus[col.status].length }}
          </span>
        </div>
      </header>

      <!-- Cards da coluna — única parte que rola -->
      <div class="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-2.5 [scrollbar-width:thin]">
        <article
          v-for="pedido in pedidosPorStatus[col.status]"
          :key="pedido.id"
          :draggable="podeArrastar(pedido)"
          class="cursor-pointer rounded-default border border-l-4 border-shift3-border bg-shift3-bg-card p-3 shadow-sm transition hover:shadow-md"
          :class="[col.borda_card, { 'opacity-50': arrastando?.id === pedido.id }]"
          @click="selecionarPedido(pedido)"
          @dragstart="iniciarArraste($event, pedido)"
          @dragend="encerrarArraste"
        >
          <!-- Cliente + menu de ações -->
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-shift3-text">
                {{ pedido.clientes?.nome || 'Cliente desconhecido' }}
              </p>
              <p v-if="pedido.numero" class="text-xs text-shift3-text-muted">{{ pedido.numero }}</p>
            </div>
            <!-- .stop: clicar no menu não pode abrir o pedido -->
            <div class="-mr-2 -mt-2 shrink-0" @click.stop>
              <BaseDropdown :items="acoesDoCard(pedido)" align="right">
                <button
                  type="button"
                  aria-label="Ações do pedido"
                  class="rounded-default p-1 text-shift3-text-muted transition hover:bg-shift3-border/60 hover:text-shift3-text"
                >
                  <Icon name="heroicons:ellipsis-vertical" class="h-5 w-5" />
                </button>
              </BaseDropdown>
            </div>
          </div>

          <!-- Total + data -->
          <div class="mt-3 flex items-end justify-between gap-2">
            <p class="text-sm font-semibold text-shift3-text">{{ formatarMoeda(pedido.total) }}</p>
            <p class="flex items-center gap-1 text-xs text-shift3-text-muted">
              <Icon name="heroicons:calendar-days" class="h-3.5 w-3.5" />
              {{ formatarData(pedido.criado_em) }}
            </p>
          </div>
        </article>

        <!-- Coluna vazia -->
        <div
          v-if="!pedidosPorStatus[col.status].length"
          class="grid place-items-center gap-1 rounded-default border border-dashed border-shift3-border px-3 py-8 text-center text-shift3-text-muted"
        >
          <Icon name="heroicons:inbox" class="h-6 w-6" />
          <p class="text-xs">{{ colunaAlvo === col.status ? 'Solte aqui' : 'Nenhum pedido' }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { TRANSICOES_KANBAN } from '~/types/pedido'
import type { Pedido, StatusPedido } from '~/types/pedido'
import type { DropdownItem } from '~/components/base/BaseDropdown.vue'

interface Props {
  pedidos: Pedido[]
  /** Libera o arrastar-e-soltar entre colunas (quem não pode editar pedidos só clica pra abrir). */
  podeMover?: boolean
  /** Mostra "Excluir pedido" no menu do card. */
  podeExcluir?: boolean
}

interface Coluna {
  status: StatusPedido
  label: string
  icone: string
  /** Faixa colorida no topo do cabeçalho. */
  faixa: string
  /** Fundo + cor do ícone do cabeçalho. */
  icone_cor: string
  /** Borda esquerda dos cards da coluna. */
  borda_card: string
}

const props = withDefaults(defineProps<Props>(), { podeMover: false, podeExcluir: false })
const emit = defineEmits<{
  selecionarPedido: [pedido: Pedido]
  mover: [pedido: Pedido, destino: StatusPedido]
  /** Abrir o modal de link (copiar / enviar / gerar novo) de um pedido já em aprovação. */
  linkCliente: [pedido: Pedido]
  /** Pedido de exclusão — quem confirma e apaga é a página. */
  excluir: [pedido: Pedido]
}>()

// mesmas cores de status de /pedidos/[id] (cinza, azul, amarelo, verde, vermelho)
const colunas: Coluna[] = [
  {
    status: 'rascunho',
    label: 'Rascunho',
    icone: 'heroicons:pencil-square',
    faixa: 'border-t-shift3-text-muted',
    icone_cor: 'bg-shift3-border/60 text-shift3-text-secondary',
    borda_card: 'border-l-shift3-text-muted'
  },
  {
    status: 'em_validacao',
    label: 'Em Validação',
    icone: 'heroicons:clipboard-document-check',
    faixa: 'border-t-blue-500',
    icone_cor: 'bg-blue-500/15 text-blue-500',
    borda_card: 'border-l-blue-500'
  },
  {
    status: 'em_aprovacao',
    label: 'Em Aprovação',
    icone: 'heroicons:clock',
    faixa: 'border-t-warning',
    icone_cor: 'bg-warning/20 text-yellow-600',
    borda_card: 'border-l-warning'
  },
  {
    status: 'aprovado',
    label: 'Aprovado',
    icone: 'heroicons:check-circle',
    faixa: 'border-t-success',
    icone_cor: 'bg-success/20 text-shift3-teal dark:text-success',
    borda_card: 'border-l-success'
  },
  {
    status: 'rejeitado',
    label: 'Rejeitado',
    icone: 'heroicons:x-circle',
    faixa: 'border-t-danger',
    icone_cor: 'bg-danger/15 text-danger',
    borda_card: 'border-l-danger'
  }
]

const pedidosPorStatus = computed(() => {
  const agrupados: Record<StatusPedido, Pedido[]> = {
    rascunho: [],
    em_validacao: [],
    em_aprovacao: [],
    aprovado: [],
    rejeitado: [],
    enviado: [],
    cancelado: []
  }

  for (const pedido of props.pedidos) {
    if (agrupados[pedido.status]) {
      agrupados[pedido.status].push(pedido)
    }
  }

  return agrupados
})

/** Soma dos totais de cada coluna — aparece no cabeçalho. */
const totalPorStatus = computed(() => {
  const totais = {} as Record<StatusPedido, number>
  for (const [status, lista] of Object.entries(pedidosPorStatus.value)) {
    totais[status as StatusPedido] = lista.reduce((soma, p) => soma + (Number(p.total) || 0), 0)
  }
  return totais
})

function selecionarPedido(pedido: Pedido) {
  emit('selecionarPedido', pedido)
  navigateTo(`/pedidos/${pedido.id}`)
}

/** Menu dos três pontinhos — as mesmas ações do arrastar-e-soltar, pra quem prefere clicar. */
function acoesDoCard(pedido: Pedido): DropdownItem[] {
  const acoes: DropdownItem[] = [
    { label: 'Abrir pedido', icon: 'heroicons:arrow-top-right-on-square', onClick: () => selecionarPedido(pedido) }
  ]
  const excluir: DropdownItem[] = props.podeExcluir
    ? [{ divider: true }, { label: 'Excluir pedido', icon: 'heroicons:trash', danger: true, onClick: () => emit('excluir', pedido) }]
    : []
  if (!props.podeMover) return [...acoes, ...excluir]

  if (pedido.status === 'rascunho') {
    acoes.push({ label: 'Validar', icon: 'heroicons:check', onClick: () => emit('mover', pedido, 'em_validacao') })
  }
  if (pedido.status === 'em_validacao') {
    acoes.push({ label: 'Enviar para o cliente', icon: 'heroicons:paper-airplane', onClick: () => emit('mover', pedido, 'em_aprovacao') })
  }
  if (pedido.status === 'em_aprovacao') {
    acoes.push({ label: 'Link do cliente', icon: 'heroicons:link', onClick: () => emit('linkCliente', pedido) })
    acoes.push({ label: 'Aprovar manualmente', icon: 'heroicons:check-circle', onClick: () => emit('mover', pedido, 'aprovado') })
    acoes.push({ label: 'Rejeitar manualmente', icon: 'heroicons:x-circle', onClick: () => emit('mover', pedido, 'rejeitado') })
    acoes.push({ label: 'Voltar para edição', icon: 'heroicons:pencil-square', onClick: () => emit('mover', pedido, 'rascunho') })
  }
  if (pedido.status === 'em_validacao' || pedido.status === 'rejeitado') {
    acoes.push({ label: 'Voltar para rascunho', icon: 'heroicons:arrow-uturn-left', onClick: () => emit('mover', pedido, 'rascunho') })
  }
  return [...acoes, ...excluir]
}

// --- arrastar-e-soltar (só as transições de TRANSICOES_KANBAN) ---
const arrastando = ref<Pedido | null>(null)
const colunaAlvo = ref<StatusPedido | null>(null)

function podeArrastar(pedido: Pedido): boolean {
  return props.podeMover && !!TRANSICOES_KANBAN[pedido.status]?.length
}

function podeSoltarEm(destino: StatusPedido): boolean {
  if (!arrastando.value) return false
  return TRANSICOES_KANBAN[arrastando.value.status]?.includes(destino) ?? false
}

function iniciarArraste(ev: DragEvent, pedido: Pedido) {
  arrastando.value = pedido
  if (ev.dataTransfer) {
    ev.dataTransfer.effectAllowed = 'move'
    ev.dataTransfer.setData('text/plain', pedido.id) // Firefox só inicia o arraste com algum dado
  }
}

function aoPassarSobre(ev: DragEvent, destino: StatusPedido) {
  if (!podeSoltarEm(destino)) return
  ev.preventDefault() // sem isso o navegador não dispara o `drop`
  colunaAlvo.value = destino
}

function soltar(ev: DragEvent, destino: StatusPedido) {
  ev.preventDefault()
  const pedido = arrastando.value
  if (pedido && podeSoltarEm(destino)) emit('mover', pedido, destino)
  encerrarArraste()
}

function encerrarArraste() {
  arrastando.value = null
  colunaAlvo.value = null
}

/** Durante o arraste: destaca as colunas que aceitam o card e esmaece as que não aceitam. */
function classeColuna(status: StatusPedido): string {
  if (!arrastando.value || arrastando.value.status === status) return ''
  if (!podeSoltarEm(status)) return 'opacity-50'
  // ring-inset: o quadro rola (overflow), um anel por fora da coluna seria cortado nas bordas
  return colunaAlvo.value === status ? 'ring-2 ring-inset ring-shift3-green' : 'ring-2 ring-inset ring-shift3-green/40'
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor || 0)
}

function formatarData(data: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  }).format(new Date(data))
}
</script>
