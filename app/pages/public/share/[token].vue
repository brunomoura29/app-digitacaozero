<template>
  <div class="min-h-screen bg-shift3-bg">
    <!-- Header minimalista -->
    <div class="border-b border-shift3-border bg-white px-4 py-4 dark:bg-shift3-bg-dark">
      <div class="mx-auto max-w-4xl">
        <p class="text-lg font-semibold text-shift3-text">DigitacaoZero</p>
      </div>
    </div>

    <div class="mx-auto max-w-4xl px-4 py-8">
      <div v-if="pending" class="flex items-center gap-2 py-14 text-sm text-shift3-text-muted">
        <BaseSpinner size="md" /> Carregando…
      </div>

      <BaseEmptyState v-else-if="!pedido" icon="heroicons:exclamation-triangle" title="Link inválido ou expirado">
        <p class="mt-2 text-sm text-shift3-text-secondary">{{ erro }}</p>
      </BaseEmptyState>

      <div v-else class="space-y-6">
        <!-- Header -->
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-lg font-semibold text-shift3-text">{{ pedido.numero || 'Novo pedido' }}</p>
            <p class="text-sm text-shift3-text-secondary">{{ pedido.clientes?.nome }}</p>
          </div>
          <span class="inline-flex items-center gap-1 rounded-pill px-3 py-1 text-xs font-medium" :class="CORES[pedido.status]">
            <span class="h-1.5 w-1.5 rounded-full" :class="BOLINHAS[pedido.status]" />
            {{ LABELS[pedido.status] }}
          </span>
        </div>

        <!-- Informações básicas -->
        <section class="grid grid-cols-1 gap-4 rounded-medium border border-shift3-border p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label class="text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Emissão</label>
            <p class="mt-1 text-sm text-shift3-text">{{ formatData(pedido.data_emissao) }}</p>
          </div>
          <div>
            <label class="text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Condição de Pagamento</label>
            <p class="mt-1 text-sm text-shift3-text">{{ pedido.condicao_pagamento || '—' }}</p>
          </div>
          <div>
            <label class="text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Prazo de Entrega</label>
            <p class="mt-1 text-sm text-shift3-text">{{ pedido.prazo_entrega || '—' }}</p>
          </div>
          <div />
        </section>

        <!-- Itens -->
        <section class="space-y-4">
          <div class="flex items-center gap-2 border-b border-shift3-border pb-2">
            <Icon name="heroicons:table-cells" class="h-5 w-5 text-shift3-teal" />
            <p class="text-base font-semibold text-shift3-text">Itens</p>
          </div>
          <div class="overflow-x-auto rounded-medium border border-shift3-border">
            <table class="w-full text-sm">
              <thead class="bg-shift3-bg-light">
                <tr class="border-b border-shift3-border">
                  <th class="px-4 py-2 text-left font-semibold text-shift3-text">Descrição</th>
                  <th class="px-4 py-2 text-right font-semibold text-shift3-text">Qtd</th>
                  <th class="px-4 py-2 text-right font-semibold text-shift3-text">Unitário</th>
                  <th class="px-4 py-2 text-right font-semibold text-shift3-text">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in itens" :key="item.id" class="border-b border-shift3-border hover:bg-shift3-bg-light">
                  <td class="px-4 py-3 text-shift3-text">{{ item.descricao || item.descricao_original || '—' }}</td>
                  <td class="px-4 py-3 text-right text-shift3-text">{{ item.quantidade }}</td>
                  <td class="px-4 py-3 text-right text-shift3-text">{{ formatValor(item.preco_unitario) }}</td>
                  <td class="px-4 py-3 text-right font-medium text-shift3-text">{{ formatValor(item.quantidade * item.preco_unitario) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Totais -->
        <section class="rounded-medium border border-shift3-border bg-shift3-bg-light p-4">
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-shift3-text-secondary">Subtotal:</span>
              <span class="text-shift3-text">{{ formatValor(subtotal) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-shift3-text-secondary">Frete:</span>
              <span class="text-shift3-text">+ {{ formatValor(pedido.frete_valor) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-shift3-text-secondary">Desconto:</span>
              <span class="text-shift3-text">- {{ formatValor(pedido.desconto_valor) }}</span>
            </div>
            <div class="flex justify-between border-t border-shift3-border pt-2 text-base font-semibold">
              <span class="text-shift3-text">Total:</span>
              <span class="text-shift3-text">{{ formatValor(pedido.total) }}</span>
            </div>
          </div>
        </section>

        <!-- Observações -->
        <section v-if="pedido.observacoes" class="space-y-2 rounded-medium border border-shift3-border p-4">
          <label class="text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Observações</label>
          <p class="text-sm text-shift3-text">{{ pedido.observacoes }}</p>
        </section>

        <!-- Botões de ação (apenas em em_aprovacao) -->
        <div v-if="pedido.status === 'em_aprovacao'" class="flex flex-wrap gap-3 border-t border-shift3-border pt-6">
          <BaseButton @click="abrirModal('aprovar')" variant="primary" :loading="processando">
            Aprovar
          </BaseButton>
          <BaseButton @click="abrirModal('rejeitar')" variant="danger" :loading="processando">
            Rejeitar
          </BaseButton>
        </div>

        <div v-else class="rounded-medium border border-shift3-border bg-shift3-teal/10 p-4">
          <p class="text-sm text-shift3-text">
            <span v-if="pedido.status === 'aprovado'" class="text-shift3-teal">✓ Este pedido foi aprovado</span>
            <span v-else-if="pedido.status === 'rejeitado'" class="text-danger">✕ Este pedido foi rejeitado</span>
            <span v-else class="text-shift3-text-muted">Este pedido ainda não foi enviado para aprovação</span>
          </p>
          <p v-if="pedido.decidido_por" class="mt-1 text-xs text-shift3-text-muted">
            por {{ pedido.decidido_por }} em {{ formatDataHora(pedido.decidido_em) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Modal de confirmação com nome -->
    <BaseModal v-if="acaoModal" @close="acaoModal = null">
      <div class="space-y-4">
        <h3 class="text-lg font-semibold text-shift3-text">
          {{ acaoModal === 'aprovar' ? 'Aprovar pedido' : 'Rejeitar pedido' }}
        </h3>
        <p class="text-sm text-shift3-text-secondary">Informe seu nome para confirmar:</p>
        <BaseInput v-model="nomeDecisor" placeholder="Seu nome" @keyup.enter="confirmarAcao" />
        <div class="flex gap-2">
          <BaseButton
            :variant="acaoModal === 'aprovar' ? 'primary' : 'danger'"
            :loading="processando"
            class="flex-1"
            @click="confirmarAcao"
          >
            Confirmar {{ acaoModal === 'aprovar' ? 'Aprovação' : 'Rejeição' }}
          </BaseButton>
          <BaseButton variant="secondary" @click="acaoModal = null">Cancelar</BaseButton>
        </div>
      </div>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Pedido, PedidoItem, StatusPedido } from '~/types/pedido'

definePageMeta({ layout: 'default', title: 'Pedido' })

const route = useRoute()
const { buscarPorToken, aprovar: aprovarCompartilhamento, rejeitar: rejeitarCompartilhamento } = useCompartilhamentos()
const toast = useToast()

const token = route.params.token as string
const pedido = ref<Pedido | null>(null)
const itens = ref<PedidoItem[]>([])
const pending = ref(true)
const processando = ref(false)
const erro = ref('')
const acaoModal = ref<'aprovar' | 'rejeitar' | null>(null)
const nomeDecisor = ref('')

const subtotal = computed(() => itens.value.reduce((acc, item) => acc + item.quantidade * item.preco_unitario, 0))

onMounted(async () => {
  try {
    const resultado = await buscarPorToken(token)
    if (resultado) {
      pedido.value = resultado.pedido
      itens.value = resultado.itens
    }
  } catch (err: any) {
    erro.value = err.message || 'Erro ao carregar pedido'
  } finally {
    pending.value = false
  }
})

function abrirModal(acao: 'aprovar' | 'rejeitar') {
  nomeDecisor.value = ''
  acaoModal.value = acao
}

async function confirmarAcao() {
  if (!nomeDecisor.value.trim()) {
    toast.error('Informe seu nome')
    return
  }
  const acao = acaoModal.value
  processando.value = true
  try {
    if (acao === 'aprovar') {
      await aprovarCompartilhamento(token, nomeDecisor.value)
      toast.success('Pedido aprovado com sucesso!')
      if (pedido.value) pedido.value.status = 'aprovado' as StatusPedido
    } else if (acao === 'rejeitar') {
      await rejeitarCompartilhamento(token, nomeDecisor.value)
      toast.success('Pedido rejeitado. Admin será notificado.')
      if (pedido.value) pedido.value.status = 'rejeitado' as StatusPedido
    }
    if (pedido.value) {
      pedido.value.decidido_por = nomeDecisor.value.trim()
      pedido.value.decidido_em = new Date().toISOString()
    }
    acaoModal.value = null
  } catch (err: any) {
    toast.error(err.message || 'Erro ao processar')
  } finally {
    processando.value = false
  }
}

const LABELS: Record<StatusPedido, string> = {
  rascunho: 'Rascunho',
  em_validacao: 'Em Validação',
  em_aprovacao: 'Em Aprovação',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
  enviado: 'Enviado',
  cancelado: 'Cancelado'
}

const CORES: Record<StatusPedido, string> = {
  rascunho: 'bg-shift3-border/60 text-shift3-text-muted',
  em_validacao: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200',
  em_aprovacao: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200',
  aprovado: 'bg-success/15 text-success',
  rejeitado: 'bg-danger/15 text-danger',
  enviado: 'bg-shift3-green/20 text-shift3-teal',
  cancelado: 'bg-danger/15 text-danger'
}

const BOLINHAS: Record<StatusPedido, string> = {
  rascunho: 'bg-shift3-text-muted',
  em_validacao: 'bg-blue-500',
  em_aprovacao: 'bg-yellow-500',
  aprovado: 'bg-success',
  rejeitado: 'bg-danger',
  enviado: 'bg-shift3-teal',
  cancelado: 'bg-danger'
}

function formatValor(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
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
