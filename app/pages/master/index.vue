<template>
  <div class="mx-auto max-w-6xl space-y-5 pb-8">
    <BasePageHeader title="Master" subtitle="Empresas cadastradas, assinaturas e acesso de suporte" />

    <!-- ───── abas ───── -->
    <div class="border-b border-shift3-border">
      <nav class="-mb-px flex gap-6" aria-label="Seções do master">
        <button
          v-for="a in ABAS"
          :key="a.valor"
          type="button"
          class="flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium transition"
          :class="
            aba === a.valor
              ? 'border-shift3-teal text-shift3-teal'
              : 'border-transparent text-shift3-text-muted hover:border-shift3-border hover:text-shift3-text'
          "
          :aria-current="aba === a.valor ? 'page' : undefined"
          @click="aba = a.valor"
        >
          <Icon :name="a.icone" class="h-4 w-4" />
          {{ a.label }}
        </button>
      </nav>
    </div>

    <MasterPlanos v-if="aba === 'planos'" @alterado="carregar" />

    <template v-else>
      <!-- ───── resumo = filtro ───── -->
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <button
          v-for="c in cartoes"
          :key="c.valor"
          type="button"
          class="rounded-medium border px-4 py-3 text-left transition"
          :class="
            filtro === c.valor
              ? 'border-shift3-teal bg-shift3-teal/5'
              : 'border-shift3-border bg-shift3-bg-card hover:border-shift3-input-border'
          "
          @click="filtro = c.valor"
        >
          <p class="text-xs font-medium text-shift3-text-muted">{{ c.label }}</p>
          <p class="mt-1 text-xl font-semibold" :class="c.destaque && c.qtd ? c.destaque : 'text-shift3-text'">{{ c.qtd }}</p>
        </button>
      </div>

      <BaseInput v-model="busca" placeholder="Buscar por empresa, e-mail ou telefone…" icon="heroicons:magnifying-glass" />

      <div v-if="carregando" class="flex items-center justify-center gap-2 py-10 text-sm text-shift3-text-muted">
        <BaseSpinner size="md" /> Carregando empresas…
      </div>

      <BaseEmptyState
        v-else-if="!visiveis.length"
        icon="heroicons:building-office"
        title="Nenhuma empresa aqui"
        :description="empresas.length ? 'Nada com esse filtro ou busca.' : 'Ainda não há empresas cadastradas.'"
      />

      <div v-else class="overflow-x-auto rounded-medium border border-shift3-border bg-shift3-bg-card">
        <table class="w-full min-w-[860px] text-sm">
          <thead>
            <tr class="border-b border-shift3-border text-left text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">
              <th class="px-4 py-3">Empresa</th>
              <th class="px-4 py-3">Plano</th>
              <th class="px-4 py-3">Situação</th>
              <th class="px-4 py-3">Vence em</th>
              <th class="px-4 py-3 text-right">Usuários</th>
              <th class="px-4 py-3 text-right">Pedidos</th>
              <th class="px-4 py-3">Último login</th>
              <th class="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="e in visiveis"
              :key="e.id"
              class="cursor-pointer border-b border-shift3-border/60 transition last:border-0 hover:bg-shift3-bg-light"
              @click="selecionada = e"
            >
              <td class="px-4 py-3">
                <p class="flex items-center gap-2 font-medium text-shift3-text">
                  {{ e.nome }}
                  <span
                    v-if="auth.emSuporte && auth.perfil?.empresa_id === e.id"
                    class="rounded-pill bg-shift3-green/25 px-2 py-0.5 text-[11px] font-semibold text-shift3-teal"
                  >
                    você está aqui
                  </span>
                </p>
                <p class="text-xs text-shift3-text-muted">{{ e.admin_email || e.email || '—' }}</p>
              </td>
              <td class="px-4 py-3 text-shift3-text-secondary">{{ e.plano_nome || '—' }}</td>
              <td class="px-4 py-3">
                <span class="rounded-pill px-2.5 py-1 text-xs font-semibold" :class="SITUACOES[e.situacao].classe">
                  {{ rotuloSituacao(e) }}
                </span>
              </td>
              <td class="px-4 py-3 text-shift3-text-secondary">{{ dataBR(e.assinatura_vence_em) }}</td>
              <td class="px-4 py-3 text-right tabular-nums">{{ e.usuarios }}</td>
              <td class="px-4 py-3 text-right tabular-nums">{{ e.pedidos }}</td>
              <td class="px-4 py-3 text-shift3-text-secondary">{{ dataHora(e.ultimo_login_em) }}</td>
              <td class="px-4 py-3 text-right" @click.stop>
                <BaseButton
                  variant="secondary"
                  size="sm"
                  icon-left="heroicons:arrow-right-end-on-rectangle"
                  :loading="entrando === e.id"
                  @click="entrar(e)"
                >
                  Entrar
                </BaseButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <MasterEmpresaPainel
      v-if="selecionada"
      :empresa="selecionada"
      :planos="planos"
      @fechar="selecionada = null"
      @alterado="carregar"
      @entrar="entrar"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { SITUACOES, type EmpresaMaster, type Plano } from '~/types/master'
import type { SituacaoAssinatura } from '~/stores/auth'
import { useAuthStore } from '~/stores/auth'
import { dataBR } from '~/composables/useMaster'
import { chaveNome } from '~/utils/importacaoProdutos'

definePageMeta({ layout: 'dashboard', title: 'Master' })

type Aba = 'empresas' | 'planos'
const ABAS: { valor: Aba; label: string; icone: string }[] = [
  { valor: 'empresas', label: 'Empresas', icone: 'heroicons:building-office' },
  { valor: 'planos', label: 'Planos', icone: 'heroicons:rectangle-stack' }
]
const aba = ref<Aba>('empresas')

const auth = useAuthStore()
const toast = useToast()
const master = useMaster()

const empresas = ref<EmpresaMaster[]>([])
const planos = ref<Plano[]>([])
const carregando = ref(true)
const selecionada = ref<EmpresaMaster | null>(null)

async function carregar() {
  try {
    const [lista, listaPlanos] = await Promise.all([master.listarEmpresas(), master.listarPlanos()])
    empresas.value = lista
    planos.value = listaPlanos
    // o painel aberto passa a mostrar os dados novos
    if (selecionada.value) selecionada.value = lista.find((e) => e.id === selecionada.value!.id) ?? null
  } catch (e) {
    console.error('Erro ao carregar empresas:', e)
    toast.error('Não foi possível carregar as empresas')
  } finally {
    carregando.value = false
  }
}
onMounted(carregar)

// ───── filtro e busca ─────

type Filtro = 'todas' | SituacaoAssinatura
const filtro = ref<Filtro>('todas')
const busca = ref('')

const cartoes = computed(() => {
  const qtd = (s: SituacaoAssinatura) => empresas.value.filter((e) => e.situacao === s).length
  return [
    { valor: 'todas' as Filtro, label: 'Todas', qtd: empresas.value.length, destaque: '' },
    { valor: 'ativa' as Filtro, label: 'Ativas', qtd: qtd('ativa'), destaque: '' },
    { valor: 'teste' as Filtro, label: 'Em teste', qtd: qtd('teste'), destaque: '' },
    { valor: 'vencida' as Filtro, label: 'Vencidas', qtd: qtd('vencida'), destaque: 'text-warning' },
    { valor: 'bloqueada' as Filtro, label: 'Bloqueadas', qtd: qtd('bloqueada'), destaque: 'text-danger' }
  ]
})

const visiveis = computed(() => {
  const termo = chaveNome(busca.value)
  const digitos = busca.value.replace(/\D/g, '')
  return empresas.value.filter((e) => {
    if (filtro.value !== 'todas' && e.situacao !== filtro.value) return false
    if (!termo) return true
    return (
      chaveNome(e.nome).includes(termo) ||
      chaveNome(e.admin_email ?? '').includes(termo) ||
      chaveNome(e.email ?? '').includes(termo) ||
      (!!digitos && (e.telefone ?? '').includes(digitos))
    )
  })
})

/** Bloqueada por status manual diz qual foi (suspensa/cancelada); por falta de pagamento, "Bloqueada". */
function rotuloSituacao(e: EmpresaMaster) {
  if (e.situacao === 'bloqueada' && (e.assinatura_status === 'suspensa' || e.assinatura_status === 'cancelada')) {
    return e.assinatura_status === 'suspensa' ? 'Suspensa' : 'Cancelada'
  }
  return SITUACOES[e.situacao].label
}

function dataHora(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// ───── entrar na empresa ─────

const entrando = ref<string | null>(null)
async function entrar(e: EmpresaMaster) {
  entrando.value = e.id
  try {
    await auth.entrarEmpresa(e.id)
  } catch (err) {
    console.error('Erro ao entrar na empresa:', err)
    toast.error('Não foi possível entrar na empresa')
    entrando.value = null
  }
}
</script>
