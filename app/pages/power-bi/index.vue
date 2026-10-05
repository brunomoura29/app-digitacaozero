<template>
  <div class="mx-auto max-w-4xl space-y-8 pb-8">
    <BasePageHeader title="Power BI" subtitle="Links de dados para montar dashboards e análises" />

    <div v-if="carregando" class="flex items-center justify-center gap-2 py-14 text-sm text-shift3-text-muted">
      <BaseSpinner size="md" />
      Carregando…
    </div>

    <template v-else>
      <!-- ───── Chave de acesso + como conectar ───── -->
      <section class="rounded-medium border border-shift3-border bg-shift3-bg-card p-5 shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="flex min-w-0 items-start gap-3">
            <span
              class="grid h-10 w-10 shrink-0 place-items-center rounded-default"
              :class="chave ? 'bg-success/20 text-shift3-teal dark:text-success' : 'bg-warning/20 text-yellow-600'"
            >
              <Icon :name="chave ? 'heroicons:key' : 'heroicons:lock-closed'" class="h-5 w-5" />
            </span>
            <div class="min-w-0">
              <p class="text-base font-semibold text-shift3-text">
                {{ chave ? 'Chave de acesso ativa' : 'Gere a chave de acesso pra liberar os links' }}
              </p>
              <p class="mt-0.5 text-sm text-shift3-text-secondary">
                Todos os links abaixo usam a mesma chave da sua empresa. Quem tiver um link lê os dados — trate como
                senha.
              </p>
            </div>
          </div>

          <BaseButton
            v-if="!chave"
            variant="primary"
            icon-left="heroicons:key"
            :loading="gerandoChave"
            @click="gerarNovaChave"
          >
            Gerar chave
          </BaseButton>
          <BaseButton v-else variant="ghost" size="sm" icon-left="heroicons:arrow-path" @click="confirmandoTroca = true">
            Gerar nova chave
          </BaseButton>
        </div>

        <ol class="mt-5 grid grid-cols-1 gap-3 border-t border-shift3-border pt-5 sm:grid-cols-3">
          <li v-for="(passo, i) in PASSOS" :key="passo.titulo" class="flex gap-3">
            <span
              class="grid h-6 w-6 shrink-0 place-items-center rounded-pill bg-shift3-dark text-xs font-semibold text-shift3-green"
            >
              {{ i + 1 }}
            </span>
            <div>
              <p class="text-sm font-semibold text-shift3-text">{{ passo.titulo }}</p>
              <p class="text-xs text-shift3-text-secondary">{{ passo.texto }}</p>
            </div>
          </li>
        </ol>
      </section>

      <!-- ───── Links, por grupo ───── -->
      <section v-for="grupo in grupos" :key="grupo.titulo" class="space-y-3">
        <div class="flex items-center gap-2 border-b border-shift3-border pb-2">
          <Icon :name="grupo.icone" class="h-5 w-5 text-shift3-teal" />
          <p class="text-base font-semibold text-shift3-text">{{ grupo.titulo }}</p>
        </div>

        <p v-if="!grupo.conjuntos.length" class="text-sm text-shift3-text-muted">
          Nenhum conjunto ainda — crie um template com destino “Dados para análise” em
          <NuxtLink to="/templates" class="text-shift3-teal hover:underline">Templates</NuxtLink> e faça uma
          <NuxtLink to="/importacoes" class="text-shift3-teal hover:underline">importação</NuxtLink>.
        </p>

        <div
          v-for="conjunto in grupo.conjuntos"
          :key="conjunto.id"
          class="rounded-medium border border-shift3-border bg-shift3-bg-card p-4"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0 flex-1 basis-64">
              <p class="text-sm font-semibold text-shift3-text">{{ conjunto.nome }}</p>
              <p class="mt-0.5 text-xs text-shift3-text-secondary">{{ conjunto.descricao }}</p>
            </div>
            <div class="flex shrink-0 gap-2">
              <BaseButton
                variant="secondary"
                size="sm"
                icon-left="heroicons:clipboard-document"
                :disabled="!chave"
                @click="copiar(conjunto)"
              >
                Copiar link
              </BaseButton>
              <BaseButton
                variant="ghost"
                size="sm"
                icon-left="heroicons:arrow-down-tray"
                :disabled="!chave"
                title="Baixar CSV"
                aria-label="Baixar CSV"
                @click="baixar(conjunto)"
              />
            </div>
          </div>
          <input
            v-if="chave"
            :value="linkDe(conjunto)"
            type="text"
            readonly
            class="mt-3 w-full truncate rounded-default border border-shift3-border bg-shift3-bg-light px-3 py-1.5 font-mono text-xs text-shift3-text-secondary outline-none"
            @focus="(e) => (e.target as HTMLInputElement).select()"
          />
        </div>
      </section>
    </template>

    <BaseConfirmDialog
      v-model="confirmandoTroca"
      title="Gerar nova chave?"
      message="Todos os links atuais param de funcionar na hora — os relatórios do Power BI que já usam esses links deixam de atualizar até você trocar o link em cada um. Use isso se um link vazou."
      confirm-label="Gerar nova chave"
      danger
      :loading="gerandoChave"
      @confirm="gerarNovaChave"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { destinoDoModelo } from '~/types/modelo'

definePageMeta({ layout: 'dashboard', title: 'Power BI' })

/** Um link de dados — `id` é o nome do arquivo em /api/dados/<id>.csv. */
interface Conjunto {
  id: string
  nome: string
  descricao: string
}

const PASSOS = [
  { titulo: 'Copie o link', texto: 'Escolha abaixo o conjunto de dados que quer analisar.' },
  { titulo: 'Obter dados → Web', texto: 'No Power BI Desktop, cole o link e confirme. Um link vira uma tabela.' },
  { titulo: 'Publique e agende', texto: 'No Power BI online, use autenticação “Anônimo” e agende a atualização.' }
]

// conjuntos fixos — os dados do próprio sistema (ver server/api/dados/*.csv.get.ts)
const PEDIDOS: Conjunto[] = [
  {
    id: 'pedidos',
    nome: 'Pedidos',
    descricao: 'Uma linha por pedido, em qualquer situação — cliente, vendedor, fábrica, pagamento e totais.'
  },
  {
    id: 'pedidos-itens',
    nome: 'Itens dos pedidos',
    descricao: 'Uma linha por item, com os dados do pedido repetidos — produto, quantidade, preço e total do item.'
  }
]
const CADASTROS: Conjunto[] = [
  { id: 'clientes', nome: 'Clientes', descricao: 'Nome, documento, contato, cidade/UF, vendedor responsável e se está ativo.' },
  { id: 'produtos', nome: 'Produtos', descricao: 'SKU, código de barras, descrição, unidade, NCM, marca e fabricante.' },
  { id: 'vendedores', nome: 'Vendedores', descricao: 'Nome, e-mail, telefone e se está ativo.' },
  {
    id: 'tabela-preco',
    nome: 'Tabela de preço',
    descricao: 'Histórico de preços — uma linha por produto, fábrica, referência e competência.'
  }
]

const { buscarChave, gerarChave } = useImportacoes()
const modelos = useModelos()
const auth = useAuthStore()
const toast = useToast()

const carregando = ref(true)
const chave = ref<string | null>(null)
const gerandoChave = ref(false)
const confirmandoTroca = ref(false)

onMounted(async () => {
  try {
    const [atual] = await Promise.all([buscarChave(), modelos.carregar()])
    chave.value = atual
  } catch {
    toast.error('Não foi possível carregar os links de dados')
  } finally {
    carregando.value = false
  }
})

/** Um conjunto por template com destino "dados" — traz todas as importações dele. */
const importacoes = computed<Conjunto[]>(() =>
  modelos.itens.value
    .filter((m) => destinoDoModelo(m) === 'dados')
    .map((m) => ({
      id: m.id,
      nome: m.nome,
      descricao: m.descricao || 'Todas as importações desse template — todos os clientes e períodos.'
    }))
)

const grupos = computed(() => [
  { titulo: 'Pedidos de compra', icone: 'heroicons:clipboard-document-list', conjuntos: PEDIDOS },
  { titulo: 'Cadastros', icone: 'heroicons:inbox-stack', conjuntos: CADASTROS },
  { titulo: 'Importações de dados', icone: 'heroicons:arrow-down-on-square-stack', conjuntos: importacoes.value }
])

function linkDe(conjunto: Conjunto): string {
  return `${window.location.origin}/api/dados/${conjunto.id}.csv?chave=${chave.value}`
}

function copiar(conjunto: Conjunto) {
  navigator.clipboard.writeText(linkDe(conjunto))
  toast.success(`Link de “${conjunto.nome}” copiado`)
}

function baixar(conjunto: Conjunto) {
  window.open(`${linkDe(conjunto)}&baixar=1`, '_blank')
}

async function gerarNovaChave() {
  const empresaId = auth.perfil?.empresa_id
  if (!empresaId) return
  gerandoChave.value = true
  try {
    const tinhaChave = !!chave.value
    chave.value = await gerarChave(empresaId)
    confirmandoTroca.value = false
    toast.success(tinhaChave ? 'Nova chave gerada — os links anteriores deixaram de funcionar' : 'Chave gerada — os links estão liberados')
  } catch (err: any) {
    toast.error(err?.message || 'Não foi possível gerar a chave')
  } finally {
    gerandoChave.value = false
  }
}
</script>
