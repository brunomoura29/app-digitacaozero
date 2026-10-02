<template>
  <!-- página ocupa a altura toda da área de conteúdo: cabeçalho e filtro fixos em cima, e o
       Kanban fica com o resto — as colunas vão até o fim da tela e rolam por dentro -->
  <div class="flex h-full flex-col">
    <BasePageHeader title="Pedidos" subtitle="Ordens de compra importadas e criadas">
      <template #actions>
        <!-- o cliente aprova/rejeita pelo link, fora do sistema — isso busca as situações atuais -->
        <BaseButton
          variant="secondary"
          icon-left="heroicons:arrow-path"
          :loading="carregando"
          title="Sincronizar situações dos pedidos"
          aria-label="Sincronizar situações dos pedidos"
          @click="sincronizar"
        />
        <BaseButton v-if="auth.podeIncluirModulo('pedidos')" to="/pedidos/novo" variant="primary" icon-left="heroicons:plus">
          Novo pedido
        </BaseButton>
      </template>
    </BasePageHeader>

    <div class="mb-4">
      <PedidosFiltros :filtros="filtros" @filtrar="carregar" />
    </div>

    <!-- spinner de página só na primeira carga; ao sincronizar o quadro continua na tela -->
    <div v-if="carregando && !itens.length" class="flex justify-center py-12">
      <div class="animate-spin">
        <BaseIcon icon="heroicons:arrow-path" class="w-6 h-6" />
      </div>
    </div>

    <!-- min-h: em tela muito baixa o quadro não encolhe além disso — aí quem rola é a página -->
    <div v-else class="relative min-h-[24rem] flex-1">
      <!-- absolute inset-0 dá uma altura definida pro quadro, que usa h-full por dentro -->
      <div class="absolute inset-0">
        <PedidosKanban
          :pedidos="itens"
          :pode-mover="auth.podeEditarModulo('pedidos')"
          :pode-excluir="auth.podeExcluirModulo('pedidos')"
          @mover="moverPedido"
          @link-cliente="(pedido) => (pedidoLinkId = pedido.id)"
          @excluir="(pedido) => (pedidoExcluir = pedido)"
        />
      </div>
    </div>

    <BaseConfirmDialog
      :model-value="!!pedidoExcluir"
      title="Excluir pedido?"
      :message="mensagemExcluir"
      confirm-label="Excluir"
      danger
      :loading="excluindo"
      @update:model-value="(v) => !v && (pedidoExcluir = null)"
      @confirm="confirmarExcluir"
    />

    <PedidosLinkClienteModal v-if="pedidoLink" :pedido="pedidoLink" @close="pedidoLinkId = null" />

    <BaseConfirmDialog
      :model-value="!!pedidoVoltarId"
      title="Voltar para edição?"
      message="O pedido volta para Rascunho e o link enviado ao cliente deixa de funcionar. Depois de alterar, valide e gere um novo link."
      confirm-label="Voltar para edição"
      :loading="voltando"
      @update:model-value="(v) => !v && (pedidoVoltarId = null)"
      @confirm="confirmarVoltarParaEdicao"
    />

  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import type { Pedido, StatusPedido } from '~/types/pedido'

definePageMeta({ layout: 'dashboard', title: 'Pedidos' })

const { itens, carregando, filtros, carregar, validar, voltarParaRascunho, remover } = usePedidos()
const auth = useAuthStore()
const toast = useToast()

onMounted(() => carregar())

async function sincronizar() {
  try {
    await carregar()
    toast.success('Situações atualizadas')
  } catch {
    toast.error('Não foi possível atualizar os pedidos')
  }
}

// pedido com o modal de link aberto — guardado por id porque o objeto na lista é trocado
// quando o status muda (o modal precisa enxergar o status novo)
const pedidoLinkId = ref<string | null>(null)
const pedidoLink = computed(() => itens.value.find((p) => p.id === pedidoLinkId.value) ?? null)

/** Card solto em outra coluna do Kanban — validar exige itens; o resto é só troca de status. */
async function moverPedido(pedido: Pedido, destino: StatusPedido) {
  // mandar pra aprovação não troca o status aqui: abre o modal, e é gerar o link que move o card
  if (destino === 'em_aprovacao') {
    pedidoLinkId.value = pedido.id
    return
  }
  // mesma regra do botão "Validar" em /pedidos/[id]
  if (destino === 'em_validacao' && !auth.isAdmin) {
    toast.error('Só administradores podem validar pedidos')
    return
  }
  // tirar da aprovação cancela o link que o cliente já pode ter recebido — confirma antes
  if (destino === 'rascunho' && pedido.status === 'em_aprovacao') {
    pedidoVoltarId.value = pedido.id
    return
  }
  try {
    if (destino === 'em_validacao') {
      await validar(pedido.id)
      toast.success('Pedido validado')
    } else {
      await voltarParaRascunho(pedido.id)
      toast.success('Pedido retornou para edição')
    }
  } catch (err: any) {
    toast.error(err?.message || 'Não foi possível mover o pedido')
  }
}

// pedido aguardando a confirmação de exclusão
const pedidoExcluir = ref<Pedido | null>(null)
const excluindo = ref(false)
const mensagemExcluir = computed(() => {
  const p = pedidoExcluir.value
  if (!p) return ''
  const aviso = p.status === 'aprovado' ? ' Este pedido já foi aprovado pelo cliente.' : ''
  return `${p.numero} de ${p.clientes?.nome ?? 'cliente desconhecido'} será apagado com todos os itens e o link do cliente.${aviso} Não dá pra desfazer.`
})

async function confirmarExcluir() {
  if (!pedidoExcluir.value) return
  excluindo.value = true
  try {
    await remover(pedidoExcluir.value.id)
    toast.success('Pedido excluído')
    pedidoExcluir.value = null
  } catch (err: any) {
    toast.error(err?.message || 'Não foi possível excluir o pedido')
  } finally {
    excluindo.value = false
  }
}

// pedido em aprovação aguardando a confirmação de "voltar para edição"
const pedidoVoltarId = ref<string | null>(null)
const voltando = ref(false)

async function confirmarVoltarParaEdicao() {
  if (!pedidoVoltarId.value) return
  voltando.value = true
  try {
    await voltarParaRascunho(pedidoVoltarId.value)
    toast.success('Pedido retornou para edição — o link do cliente foi cancelado')
    pedidoVoltarId.value = null
  } catch (err: any) {
    toast.error(err?.message || 'Não foi possível voltar o pedido para edição')
  } finally {
    voltando.value = false
  }
}
</script>
