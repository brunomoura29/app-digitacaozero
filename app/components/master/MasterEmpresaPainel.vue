<template>
  <ClientOnly>
    <Teleport to="body">
      <Transition name="painel" appear :duration="300" @after-leave="emit('fechar')">
        <div v-if="aberto" class="fixed inset-0 z-[90] flex justify-end bg-black/50" @click.self="aberto = false">
          <aside class="flex h-full w-full max-w-lg flex-col border-l border-shift3-border bg-shift3-bg-card shadow-xl">
            <!-- ───── cabeçalho ───── -->
            <div class="flex items-start justify-between gap-4 border-b border-shift3-border px-5 py-4">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="truncate">{{ empresa.nome }}</h3>
                  <span class="rounded-pill px-2.5 py-0.5 text-xs font-semibold" :class="SITUACOES[empresa.situacao].classe">
                    {{ SITUACOES[empresa.situacao].label }}
                  </span>
                </div>
                <p class="mt-1 text-sm text-shift3-text-secondary">
                  {{ empresa.admin_email || empresa.email || 'sem e-mail' }}
                  <template v-if="empresa.telefone"> · {{ formatarTelefone(empresa.telefone) }}</template>
                </p>
                <p class="mt-0.5 text-xs text-shift3-text-muted">
                  Cadastrada em {{ dataBR(empresa.criado_em) }} · {{ empresa.usuarios }}
                  {{ empresa.usuarios === 1 ? 'usuário' : 'usuários' }} · {{ empresa.pedidos }}
                  {{ empresa.pedidos === 1 ? 'pedido' : 'pedidos' }}
                </p>
              </div>
              <button type="button" class="text-shift3-text-muted hover:text-shift3-text" aria-label="Fechar" @click="aberto = false">
                <Icon name="heroicons:x-mark" class="h-5 w-5" />
              </button>
            </div>

            <div class="flex-1 space-y-7 overflow-y-auto px-5 py-5">
              <BaseButton variant="primary" block icon-left="heroicons:arrow-right-end-on-rectangle" @click="emit('entrar', empresa)">
                Entrar no acesso da empresa
              </BaseButton>

              <!-- ───── assinatura ───── -->
              <section class="space-y-3">
                <p class="text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Assinatura</p>
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label class="mb-1 block">Plano</label>
                    <select v-model="assinatura.plano_id" :class="[CAMPO, 'w-full']">
                      <option :value="null">Sem plano</option>
                      <option v-for="p in planosDaLista" :key="p.id" :value="p.id">
                        {{ p.nome }} — {{ formatarMoedaBR(p.valor) }}/{{ p.ciclo === 'anual' ? 'ano' : 'mês' }}
                      </option>
                    </select>
                  </div>
                  <div>
                    <label class="mb-1 block">Status</label>
                    <select v-model="assinatura.status" :class="[CAMPO, 'w-full']">
                      <option v-for="s in STATUS_ASSINATURA" :key="s.valor" :value="s.valor">{{ s.label }}</option>
                    </select>
                  </div>
                  <BaseInput v-model="assinatura.vence_em" type="date" label="Vence em" hint="Vazio = sem vencimento" />
                </div>
                <BaseTextarea v-model="assinatura.obs" label="Observação" :rows="2" placeholder="Ex.: combinado desconto até março" />
                <p class="text-xs text-shift3-text-muted">
                  Suspensa ou cancelada bloqueia na hora. Vencida bloqueia 5 dias depois do vencimento.
                </p>
                <div class="flex justify-end">
                  <BaseButton variant="primary" size="sm" icon-left="heroicons:check" :loading="salvandoAssinatura" @click="salvarAssinatura">
                    Salvar assinatura
                  </BaseButton>
                </div>
              </section>

              <!-- ───── registrar pagamento ───── -->
              <section class="space-y-3">
                <p class="text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Registrar pagamento</p>
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <BaseInput v-model="pagamento.valor" label="Valor (R$)" placeholder="0,00" :error="erroValor" />
                  <BaseInput v-model="pagamento.pago_em" type="date" label="Pago em" />
                  <BaseInput v-model="pagamento.referencia" label="Referência" placeholder="Ex.: novembro/2026" />
                  <BaseInput v-model="pagamento.vencimento_novo" type="date" label="Novo vencimento" />
                </div>
                <p class="text-xs text-shift3-text-muted">Registrar deixa a assinatura ativa e muda o vencimento.</p>
                <div class="flex justify-end">
                  <BaseButton variant="accent" size="sm" icon-left="heroicons:banknotes" :loading="registrando" @click="registrarPagamento">
                    Registrar pagamento
                  </BaseButton>
                </div>

                <div v-if="carregandoHistorico" class="flex items-center gap-2 text-sm text-shift3-text-muted">
                  <BaseSpinner size="sm" /> Carregando histórico…
                </div>
                <ul v-else-if="pagamentos.length" class="divide-y divide-shift3-border/60 rounded-medium border border-shift3-border">
                  <li v-for="p in pagamentos" :key="p.id" class="flex items-center gap-3 px-3 py-2 text-sm">
                    <div class="min-w-0 flex-1">
                      <p class="font-medium text-shift3-text">
                        {{ formatarMoedaBR(p.valor) }}
                        <span class="font-normal text-shift3-text-muted">em {{ dataBR(p.pago_em) }}</span>
                      </p>
                      <p class="truncate text-xs text-shift3-text-muted">
                        {{ [p.referencia, p.vencimento_novo && `venc. → ${dataBR(p.vencimento_novo)}`].filter(Boolean).join(' · ') || '—' }}
                      </p>
                    </div>
                    <button
                      type="button"
                      class="text-shift3-text-muted transition hover:text-danger"
                      title="Excluir registro"
                      aria-label="Excluir registro"
                      @click="pagamentoExcluir = p"
                    >
                      <Icon name="heroicons:trash" class="h-4 w-4" />
                    </button>
                  </li>
                </ul>
                <p v-else class="text-sm text-shift3-text-muted">Nenhum pagamento registrado.</p>
              </section>

              <!-- ───── acessos de suporte ───── -->
              <section class="space-y-2">
                <p class="text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Acessos de suporte</p>
                <ul v-if="acessos.length" class="space-y-1 text-sm text-shift3-text-secondary">
                  <li v-for="a in acessos" :key="a.id" class="flex items-center gap-2">
                    <Icon name="heroicons:arrow-right-end-on-rectangle" class="h-4 w-4 shrink-0 text-shift3-text-muted" />
                    {{ dataHora(a.entrou_em) }}
                    <span class="text-shift3-text-muted">
                      {{ a.saiu_em ? `· ${duracao(a.entrou_em, a.saiu_em)}` : '· em andamento' }}
                    </span>
                  </li>
                </ul>
                <p v-else-if="!carregandoHistorico" class="text-sm text-shift3-text-muted">Nenhum acesso registrado.</p>
              </section>
            </div>
          </aside>
        </div>
      </Transition>
    </Teleport>
  </ClientOnly>

  <BaseConfirmDialog
    :model-value="!!pagamentoExcluir"
    danger
    title="Excluir registro de pagamento"
    message="O registro sai do histórico. O vencimento e o status não mudam — ajuste na assinatura se precisar."
    confirm-label="Excluir"
    :loading="excluindo"
    @update:model-value="(v: boolean) => !v && (pagamentoExcluir = null)"
    @confirm="excluirPagamento"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  STATUS_ASSINATURA,
  SITUACOES,
  type AcessoSuporte,
  type EmpresaMaster,
  type PagamentoAssinatura,
  type Plano,
  type StatusAssinatura
} from '~/types/master'
import { dataBR, hojeISO, somarCiclo } from '~/composables/useMaster'
import { formatarMoedaBR } from '~/utils/dashboard'
import { formatarTelefone } from '~/utils/formatos'
import { textoParaNumero } from '~/utils/importacaoProdutos'

const props = defineProps<{ empresa: EmpresaMaster; planos: Plano[] }>()
const emit = defineEmits<{ fechar: []; alterado: []; entrar: [empresa: EmpresaMaster] }>()

const CAMPO =
  'rounded-default border border-shift3-input-border bg-shift3-input px-3 py-2 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20 disabled:opacity-60'

const master = useMaster()
const toast = useToast()
const aberto = ref(true)

/** Planos ativos + o atual da empresa, mesmo que inativo (senão o select some com ele). */
const planosDaLista = computed(() =>
  props.planos.filter((p) => p.ativo || p.id === props.empresa.plano_id)
)

// ───── assinatura ─────

const assinatura = reactive<{ plano_id: string | null; status: StatusAssinatura; vence_em: string; obs: string }>({
  plano_id: null,
  status: 'teste',
  vence_em: '',
  obs: ''
})

function preencherAssinatura() {
  assinatura.plano_id = props.empresa.plano_id
  assinatura.status = props.empresa.assinatura_status
  assinatura.vence_em = props.empresa.assinatura_vence_em ?? ''
  assinatura.obs = props.empresa.assinatura_obs ?? ''
}

const salvandoAssinatura = ref(false)
async function salvarAssinatura() {
  salvandoAssinatura.value = true
  try {
    await master.salvarAssinatura(props.empresa.id, {
      plano_id: assinatura.plano_id,
      status: assinatura.status,
      vence_em: assinatura.vence_em || null,
      obs: assinatura.obs || null
    })
    toast.success('Assinatura salva')
    emit('alterado')
  } catch (e: any) {
    console.error('Erro ao salvar assinatura:', e)
    toast.error(e?.message || 'Não foi possível salvar a assinatura')
  } finally {
    salvandoAssinatura.value = false
  }
}

// ───── pagamento ─────

const pagamento = reactive({ valor: '', pago_em: hojeISO(), referencia: '', vencimento_novo: '' })
const erroValor = ref('')

/** Sugere valor do plano e o próximo vencimento: um ciclo depois do vencimento atual (ou de hoje, se já passou). */
function sugerirPagamento() {
  const plano = props.planos.find((p) => p.id === props.empresa.plano_id)
  pagamento.valor = plano ? plano.valor.toFixed(2).replace('.', ',') : ''
  pagamento.pago_em = hojeISO()
  pagamento.referencia = ''
  const hoje = hojeISO()
  const atual = props.empresa.assinatura_vence_em
  const base = atual && atual > hoje ? atual : hoje
  pagamento.vencimento_novo = somarCiclo(base, plano?.ciclo ?? 'mensal')
  erroValor.value = ''
}

const registrando = ref(false)
async function registrarPagamento() {
  const valor = textoParaNumero(pagamento.valor)
  if (valor === null || Number.isNaN(valor)) {
    erroValor.value = 'Informe o valor'
    return
  }
  erroValor.value = ''
  registrando.value = true
  try {
    await master.registrarPagamento(props.empresa.id, {
      valor,
      pago_em: pagamento.pago_em || hojeISO(),
      referencia: pagamento.referencia.trim() || null,
      vencimento_novo: pagamento.vencimento_novo || null
    })
    toast.success('Pagamento registrado')
    emit('alterado')
    await carregarHistorico()
  } catch (e: any) {
    console.error('Erro ao registrar pagamento:', e)
    toast.error(e?.message || 'Não foi possível registrar o pagamento')
  } finally {
    registrando.value = false
  }
}

// ───── histórico ─────

const pagamentos = ref<PagamentoAssinatura[]>([])
const acessos = ref<AcessoSuporte[]>([])
const carregandoHistorico = ref(true)

async function carregarHistorico() {
  try {
    const [p, a] = await Promise.all([master.listarPagamentos(props.empresa.id), master.listarAcessos(props.empresa.id)])
    pagamentos.value = p
    acessos.value = a
  } catch (e) {
    console.error('Erro ao carregar histórico da empresa:', e)
    toast.error('Não foi possível carregar o histórico')
  } finally {
    carregandoHistorico.value = false
  }
}

const pagamentoExcluir = ref<PagamentoAssinatura | null>(null)
const excluindo = ref(false)
async function excluirPagamento() {
  const p = pagamentoExcluir.value
  if (!p) return
  excluindo.value = true
  try {
    await master.removerPagamento(p.id)
    pagamentos.value = pagamentos.value.filter((x) => x.id !== p.id)
    pagamentoExcluir.value = null
  } catch (e) {
    console.error('Erro ao excluir pagamento:', e)
    toast.error('Não foi possível excluir o registro')
  } finally {
    excluindo.value = false
  }
}

function dataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function duracao(inicio: string, fim: string) {
  const min = Math.max(1, Math.round((new Date(fim).getTime() - new Date(inicio).getTime()) / 60000))
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`
}

// trocar de empresa com o painel aberto (ou dados recarregados) reinicia os formulários
watch(
  () => [props.empresa.id, props.empresa.assinatura_vence_em, props.empresa.plano_id, props.empresa.assinatura_status],
  ([id], [idAntes]) => {
    preencherAssinatura()
    sugerirPagamento()
    if (id !== idAntes) {
      carregandoHistorico.value = true
      carregarHistorico()
    }
  }
)

onMounted(() => {
  preencherAssinatura()
  sugerirPagamento()
  carregarHistorico()
})
</script>

<style scoped>
.painel-enter-active,
.painel-leave-active {
  transition: opacity 0.25s ease;
}
.painel-enter-active aside,
.painel-leave-active aside {
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
.painel-enter-from,
.painel-leave-to {
  opacity: 0;
}
.painel-enter-from aside,
.painel-leave-to aside {
  transform: translateX(100%);
}

@media (prefers-reduced-motion: reduce) {
  .painel-enter-active,
  .painel-leave-active,
  .painel-enter-active aside,
  .painel-leave-active aside {
    transition: none;
  }
}
</style>
