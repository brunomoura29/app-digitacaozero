<template>
  <BaseModal @close="emit('close')">
    <div class="space-y-4">
      <div>
        <h3 class="text-lg font-semibold text-shift3-text">Enviar para o cliente</h3>
        <p class="text-sm text-shift3-text-secondary">
          {{ pedido.numero }}<span v-if="pedido.clientes?.nome"> · {{ pedido.clientes.nome }}</span>
        </p>
      </div>

      <div v-if="carregando" class="flex items-center gap-2 py-4 text-sm text-shift3-text-muted">
        <BaseSpinner size="md" /> Carregando…
      </div>

      <!-- Ainda sem link válido -->
      <template v-else-if="!link">
        <p class="text-sm text-shift3-text-secondary">
          {{
            pedido.status === 'em_aprovacao'
              ? 'O link deste pedido expirou. Gere um novo pra o cliente aprovar ou rejeitar.'
              : 'Gere o link pra o cliente aprovar ou rejeitar o pedido. Ao gerar, o pedido vai para "Em Aprovação".'
          }}
        </p>
        <BaseButton variant="primary" icon-left="heroicons:link" :loading="gerando" block @click="gerar">
          Gerar link
        </BaseButton>
      </template>

      <!-- Link pronto: copiar ou enviar -->
      <template v-else>
        <div class="flex gap-2 rounded-medium border border-shift3-border bg-shift3-bg-light p-3">
          <input :value="link" type="text" readonly class="min-w-0 flex-1 bg-transparent text-sm text-shift3-text outline-none" />
          <BaseButton size="sm" variant="secondary" icon-left="heroicons:clipboard-document" @click="copiar">
            Copiar
          </BaseButton>
        </div>
        <p v-if="expiraEm" class="text-xs text-shift3-text-muted">Válido até {{ formatData(expiraEm) }}.</p>

        <div class="grid grid-cols-2 gap-2">
          <a :href="urlWhatsapp" target="_blank" rel="noopener" :class="CLASSE_BOTAO_LINK">
            <Icon name="heroicons:chat-bubble-left-right" class="h-4 w-4" /> WhatsApp
          </a>
          <a :href="urlEmail" :class="CLASSE_BOTAO_LINK">
            <Icon name="heroicons:envelope" class="h-4 w-4" /> E-mail
          </a>
        </div>
        <p class="text-xs text-shift3-text-muted">
          Abre o WhatsApp ou o seu programa de e-mail com a mensagem pronta — você confere e envia.
        </p>

        <BaseButton variant="ghost" size="sm" icon-left="heroicons:arrow-path" :loading="gerando" @click="gerar">
          Gerar novo link (o atual deixa de funcionar)
        </BaseButton>
      </template>

      <BaseButton variant="secondary" block @click="emit('close')">Fechar</BaseButton>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Pedido } from '~/types/pedido'

const props = defineProps<{ pedido: Pedido }>()
const emit = defineEmits<{ close: [] }>()

const { criarLink, buscarLinkAtual } = useCompartilhamentos()
const { atualizar } = usePedidos()
const toast = useToast()

const carregando = ref(true)
const gerando = ref(false)
const link = ref('')
const expiraEm = ref<string | null>(null)

const CLASSE_BOTAO_LINK =
  'inline-flex items-center justify-center gap-2 rounded-default border border-shift3-input-border bg-shift3-bg-card px-4 py-2 text-sm font-semibold text-shift3-text transition hover:bg-shift3-bg-light'

async function carregarLinkAtual() {
  const atual = await buscarLinkAtual(props.pedido.id)
  link.value = atual?.url ?? ''
  expiraEm.value = atual?.expiraEm ?? null
}

onMounted(async () => {
  try {
    // link só vale com o pedido em aprovação — fora disso não adianta mostrar um link antigo
    if (props.pedido.status === 'em_aprovacao') await carregarLinkAtual()
  } catch {
    // sem conseguir consultar, cai no estado "sem link" — o usuário ainda pode gerar um
  } finally {
    carregando.value = false
  }
})

/** Gera o link (invalidando o anterior) e, se o pedido ainda estava em validação, move pra "Em Aprovação". */
async function gerar() {
  gerando.value = true
  try {
    link.value = await criarLink(props.pedido.id)
    if (props.pedido.status !== 'em_aprovacao') await atualizar(props.pedido.id, { status: 'em_aprovacao' })
    await carregarLinkAtual()
    toast.success('Link gerado com sucesso!')
  } catch (err: any) {
    toast.error(err?.message || 'Não foi possível gerar o link')
  } finally {
    gerando.value = false
  }
}

async function copiar() {
  try {
    await navigator.clipboard.writeText(link.value)
    toast.success('Link copiado!')
  } catch {
    toast.error('Não foi possível copiar — selecione o link e copie manualmente.')
  }
}

const mensagem = computed(
  () => `Olá! Segue o pedido ${props.pedido.numero} para sua aprovação: ${link.value}`
)

/** wa.me exige o número só com dígitos e com DDI — telefone brasileiro sem DDI (10/11 dígitos) ganha o 55. */
const urlWhatsapp = computed(() => {
  let numero = (props.pedido.clientes?.telefone ?? '').replace(/\D/g, '')
  if (numero.length === 10 || numero.length === 11) numero = `55${numero}`
  // sem telefone no cadastro: o WhatsApp abre pedindo pra escolher o contato
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem.value)}`
})

const urlEmail = computed(() => {
  const para = props.pedido.clientes?.email ?? ''
  const assunto = encodeURIComponent(`Pedido ${props.pedido.numero} para aprovação`)
  return `mailto:${para}?subject=${assunto}&body=${encodeURIComponent(mensagem.value)}`
})

function formatData(v: string) {
  return new Date(v).toLocaleDateString('pt-BR')
}
</script>
