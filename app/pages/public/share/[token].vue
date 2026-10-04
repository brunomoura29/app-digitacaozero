<template>
  <div class="flex min-h-screen flex-col bg-shift3-bg-light print:block print:min-h-0 print:bg-transparent">
    <div class="mx-auto w-full max-w-[210mm] flex-1 px-4 py-6 sm:py-10 print:max-w-none print:p-0">
      <div v-if="pending" class="flex items-center justify-center gap-2 py-14 text-sm text-shift3-text-muted">
        <BaseSpinner size="md" /> Carregando…
      </div>

      <BaseEmptyState v-else-if="!pedido" icon="heroicons:exclamation-triangle" title="Link inválido ou expirado">
        <p class="mt-2 text-sm text-shift3-text-secondary">{{ erro }}</p>
      </BaseEmptyState>

      <PedidosOrdemCompra
        v-else
        :pedido="pedido"
        :itens="itens"
        :empresa="cabecalho?.empresa"
        :cliente="cabecalho?.cliente"
        :fabrica="cabecalho?.fabrica"
      />
    </div>

    <!-- Barra de ações — fixa no rodapé da tela, fora do PDF -->
    <div
      v-if="pedido"
      class="sticky bottom-0 border-t border-shift3-border bg-shift3-bg-card/95 px-4 py-3 backdrop-blur print:hidden"
    >
      <div class="mx-auto flex max-w-[210mm] flex-wrap items-center gap-2">
        <BaseButton variant="secondary" icon-left="heroicons:arrow-down-tray" @click="baixarPdf">Baixar PDF</BaseButton>

        <template v-if="pedido.status === 'em_aprovacao'">
          <BaseButton variant="ghost" class="ml-auto text-danger" :disabled="processando" @click="abrirModal('rejeitar')">
            Rejeitar
          </BaseButton>
          <BaseButton variant="accent" icon-left="heroicons:check" :loading="processando" @click="abrirModal('aprovar')">
            Aprovar pedido
          </BaseButton>
        </template>
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
import type { CabecalhoOC } from '~/types/empresa'
import type { Pedido, PedidoItem, StatusPedido } from '~/types/pedido'

definePageMeta({ layout: 'default', title: 'Pedido' })

const route = useRoute()
const { buscarPorToken, aprovar: aprovarCompartilhamento, rejeitar: rejeitarCompartilhamento } = useCompartilhamentos()
const toast = useToast()

const token = route.params.token as string
const pedido = ref<Pedido | null>(null)
const itens = ref<PedidoItem[]>([])
const cabecalho = ref<CabecalhoOC | null>(null)
const pending = ref(true)
const processando = ref(false)
const erro = ref('')
const acaoModal = ref<'aprovar' | 'rejeitar' | null>(null)
const nomeDecisor = ref('')

// o título da aba vira o nome sugerido do arquivo em "Salvar como PDF"
useHead({ title: computed(() => (pedido.value ? `Ordem de Compra ${pedido.value.numero}` : 'Ordem de Compra')) })

onMounted(async () => {
  try {
    const resultado = await buscarPorToken(token)
    if (resultado) {
      pedido.value = resultado.pedido
      itens.value = resultado.itens
      cabecalho.value = resultado.cabecalho
    }
  } catch (err: any) {
    erro.value = err.message || 'Erro ao carregar pedido'
  } finally {
    pending.value = false
  }
})

function baixarPdf() {
  window.print()
}

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
</script>
