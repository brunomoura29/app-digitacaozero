<template>
  <div class="mx-auto max-w-3xl space-y-5 pb-8">
    <p class="max-w-xl text-sm text-shift3-text-secondary">
      O que já vem preenchido ao importar um pedido deste cliente. No pedido dá pra trocar, se aquele for diferente.
    </p>

    <div v-if="carregando" class="flex items-center justify-center gap-2 py-10 text-sm text-shift3-text-muted">
      <BaseSpinner size="md" /> Carregando…
    </div>

    <template v-else>
      <!-- sem fábrica com tabela a importação do pedido fica bloqueada pra este cliente -->
      <p
        v-if="!fabricasCliente.some((f) => f.referencia_id)"
        class="flex items-start gap-2 rounded-default border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-shift3-text"
      >
        <Icon name="heroicons:exclamation-triangle" class="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        Defina ao menos uma fábrica com tabela de preço — sem isso não dá pra importar pedido deste cliente.
      </p>

      <!-- ───── Template ───── -->
      <section class="overflow-hidden rounded-medium border border-shift3-border bg-shift3-bg-card">
        <div class="flex items-center gap-2 border-b border-shift3-border bg-shift3-bg-light px-5 py-3">
          <span class="flex h-8 w-8 items-center justify-center rounded-full bg-shift3-teal/10 text-shift3-teal">
            <Icon name="heroicons:document-duplicate" class="h-4 w-4" />
          </span>
          <div>
            <p class="font-semibold text-shift3-text">Template do pedido</p>
            <p class="text-xs text-shift3-text-muted">O formato da planilha ou do documento que esta loja manda.</p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-3 px-5 py-4">
          <select
            :value="modeloId ?? ''"
            :disabled="!podeEditar || salvandoModelo || !modelosPedido.length"
            :class="[CAMPO, 'max-w-sm flex-1']"
            @change="trocarModelo(($event.target as HTMLSelectElement).value || null)"
          >
            <option value="">Nenhum — escolher na hora</option>
            <option v-for="m in modelosPedido" :key="m.id" :value="m.id">{{ m.nome }}</option>
            <!-- template guardado que não aparece na lista (inativo, ou o usuário não vê templates) -->
            <option v-if="modeloId && !modelosPedido.some((m) => m.id === modeloId)" :value="modeloId">
              {{ modeloForaDaLista }}
            </option>
          </select>
          <BaseSpinner v-if="salvandoModelo" size="sm" />
          <p v-if="!modelosPedido.length" class="w-full text-xs text-shift3-text-muted">
            {{ auth.isAdmin ? 'Nenhum template de pedido ativo — crie um em Templates.' : 'Os templates são cadastrados pelo administrador.' }}
          </p>
        </div>
      </section>

      <!-- ───── Fábricas e tabela ───── -->
      <!-- sem overflow-hidden: cortaria a lista suspensa da busca de fábrica/tabela; os cantos
           arredondados vão direto no cabeçalho e no rodapé -->
      <section class="rounded-medium border border-shift3-border bg-shift3-bg-card">
        <div class="flex items-center gap-2 rounded-t-medium border-b border-shift3-border bg-shift3-bg-light px-5 py-3">
          <span class="flex h-8 w-8 items-center justify-center rounded-full bg-shift3-teal/10 text-shift3-teal">
            <Icon name="heroicons:building-office-2" class="h-4 w-4" />
          </span>
          <div>
            <p class="font-semibold text-shift3-text">Fábricas e tabela de preço</p>
            <p class="text-xs text-shift3-text-muted">
              De quem este cliente compra e qual tabela usar em cada uma. A principal já vem no pedido.
            </p>
          </div>
        </div>

        <ul v-if="fabricasCliente.length">
          <li
            v-for="f in fabricasCliente"
            :key="f.id"
            class="flex flex-wrap items-center gap-3 border-b border-shift3-border/60 px-5 py-3 sm:flex-nowrap"
          >
            <button
              type="button"
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition disabled:cursor-default"
              :class="f.principal ? 'text-warning' : 'text-shift3-text-muted hover:bg-shift3-bg-light hover:text-warning'"
              :title="f.principal ? 'Fábrica principal' : 'Tornar principal'"
              :aria-label="f.principal ? 'Fábrica principal' : 'Tornar principal'"
              :disabled="!podeEditar || f.principal || ocupado"
              @click="tornarPrincipal(f.id)"
            >
              <Icon :name="f.principal ? 'heroicons:star-solid' : 'heroicons:star'" class="h-5 w-5" />
            </button>
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium text-shift3-text">{{ f.fabricas?.nome ?? '—' }}</p>
              <p v-if="!f.referencia_id" class="text-xs text-warning">Sem tabela — não aparece no pedido</p>
              <p v-else-if="f.principal" class="text-xs text-shift3-text-muted">Principal</p>
            </div>
            <select
              :value="f.referencia_id ?? ''"
              :disabled="!podeEditar || ocupado"
              :class="[CAMPO, 'w-full sm:w-56', !f.referencia_id && 'border-warning']"
              aria-label="Tabela de preço"
              @change="trocarTabela(f.id, ($event.target as HTMLSelectElement).value || null)"
            >
              <option value="" disabled>Escolha a tabela</option>
              <option v-for="r in referencias.itens.value" :key="r.id" :value="r.id">{{ r.nome }}</option>
            </select>
            <button
              v-if="podeEditar"
              type="button"
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-default text-shift3-text-muted transition hover:bg-danger/10 hover:text-danger disabled:opacity-40"
              aria-label="Remover fábrica"
              :disabled="ocupado"
              @click="remover(f.id)"
            >
              <Icon name="heroicons:trash" class="h-4 w-4" />
            </button>
          </li>
        </ul>
        <p v-else class="px-5 py-4 text-sm text-shift3-text-muted">Nenhuma fábrica definida para este cliente.</p>

        <form
          v-if="podeEditar"
          class="grid grid-cols-1 items-end gap-3 rounded-b-medium bg-shift3-bg-light/50 px-5 py-4 sm:grid-cols-[1fr_1fr_auto]"
          @submit.prevent="adicionar"
        >
          <BaseBuscaOuCria
            v-model="nova.fabricaId"
            label="Fábrica *"
            placeholder="Buscar ou criar fábrica…"
            :itens="fabricasDisponiveis"
            :carregando="fabricas.carregando.value"
            :ao-criar="(nome) => fabricas.criar(nome)"
          />
          <BaseBuscaOuCria
            v-model="nova.referenciaId"
            label="Tabela de preço *"
            placeholder="Ex: Tabela 1, Distribuidor…"
            :itens="referencias.itens.value"
            :carregando="referencias.carregando.value"
            :ao-criar="(nome) => referencias.criar(nome)"
          />
          <BaseButton type="submit" variant="primary" icon-left="heroicons:plus" :loading="adicionando" :disabled="!nova.fabricaId || !nova.referenciaId">
            Adicionar
          </BaseButton>
        </form>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import type { ClienteFabrica } from '~/types/cliente'
import { destinoDoModelo } from '~/types/modelo'
import { useAuthStore } from '~/stores/auth'

const props = defineProps<{ clienteId: string }>()

const CAMPO =
  'rounded-default border border-shift3-input-border bg-shift3-input px-3 py-2 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20 disabled:opacity-60'

const auth = useAuthStore()
const toast = useToast()
const servico = usePadroesCliente()
const modelos = useModelos()
const fabricas = useFabricas()
const referencias = useReferenciasTabela()

const podeEditar = computed(() => auth.podeEditarModulo('clientes'))
const carregando = ref(true)
const modeloId = ref<string | null>(null)
const fabricasCliente = ref<ClienteFabrica[]>([])

onMounted(async () => {
  try {
    const [padroes] = await Promise.all([
      servico.carregar(props.clienteId),
      // templates só o admin lê (RLS); pro vendedor a lista volta vazia
      modelos.carregar().catch(() => undefined),
      fabricas.carregar(),
      referencias.carregar()
    ])
    modeloId.value = padroes.modeloId
    fabricasCliente.value = padroes.fabricas
  } catch (e) {
    console.error('Erro ao carregar padrões do cliente:', e)
    toast.error('Não foi possível carregar os padrões do pedido')
  } finally {
    carregando.value = false
  }
})

const modelosPedido = computed(() => modelos.itens.value.filter((m) => m.ativo && destinoDoModelo(m) === 'pedido'))
const modeloForaDaLista = computed(() => {
  const m = modelos.itens.value.find((x) => x.id === modeloId.value)
  return m ? `${m.nome} (inativo)` : 'Template definido'
})

// ───── template ─────

const salvandoModelo = ref(false)

async function trocarModelo(id: string | null) {
  const anterior = modeloId.value
  modeloId.value = id
  salvandoModelo.value = true
  try {
    await servico.definirModelo(props.clienteId, id)
    toast.success(id ? 'Template do pedido definido' : 'Template do pedido removido')
  } catch (e: any) {
    console.error('Erro ao salvar template do cliente:', e)
    modeloId.value = anterior
    toast.error(e?.message || 'Não foi possível salvar o template')
  } finally {
    salvandoModelo.value = false
  }
}

// ───── fábricas ─────

const ocupado = ref(false)
const fabricasDisponiveis = computed(() => {
  const ja = new Set(fabricasCliente.value.map((f) => f.fabrica_id))
  return fabricas.itens.value.filter((f) => !ja.has(f.id))
})

/** Roda uma alteração da lista com trava e mensagem de erro; `ok` = toast de sucesso. */
async function alterar(acao: () => Promise<ClienteFabrica[]>, ok: string, falha: string) {
  ocupado.value = true
  try {
    fabricasCliente.value = await acao()
    toast.success(ok)
    return true
  } catch (e: any) {
    console.error(falha, e)
    toast.error(e?.code === '23505' ? 'Essa fábrica já está na lista' : e?.message || falha)
    return false
  } finally {
    ocupado.value = false
  }
}

const nova = reactive<{ fabricaId: string | null; referenciaId: string | null }>({ fabricaId: null, referenciaId: null })
const adicionando = ref(false)

async function adicionar() {
  if (!nova.fabricaId || !nova.referenciaId) return
  if (fabricasCliente.value.some((f) => f.fabrica_id === nova.fabricaId)) {
    toast.error('Essa fábrica já está na lista')
    return
  }
  adicionando.value = true
  const certo = await alterar(
    () => servico.adicionarFabrica(props.clienteId, nova.fabricaId!, nova.referenciaId, fabricasCliente.value),
    'Fábrica adicionada',
    'Não foi possível adicionar a fábrica'
  )
  adicionando.value = false
  if (certo) {
    nova.fabricaId = null
    nova.referenciaId = null
  }
}

function trocarTabela(id: string, referenciaId: string | null) {
  alterar(() => servico.definirTabela(id, referenciaId, fabricasCliente.value), 'Tabela de preço salva', 'Não foi possível salvar a tabela')
}

function tornarPrincipal(id: string) {
  alterar(() => servico.definirPrincipal(id, fabricasCliente.value), 'Fábrica principal alterada', 'Não foi possível alterar a principal')
}

function remover(id: string) {
  alterar(() => servico.remover(id, fabricasCliente.value), 'Fábrica removida', 'Não foi possível remover a fábrica')
}
</script>
