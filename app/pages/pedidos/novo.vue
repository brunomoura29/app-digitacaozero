<template>
  <div class="mx-auto max-w-4xl pb-8">
    <BaseStepper :steps="ETAPAS_LABEL" :atual="indiceEtapa" class="mb-8" />

    <!-- ───── Etapa 1: importar ───── -->
    <div v-if="etapa === 'upload'" class="space-y-8">
      <BaseLoadingBar
        v-if="extraindo"
        :label="ehPlanilhaAtual ? 'Lendo planilha' : 'Extraindo dados do documento'"
        :hint="
          ehPlanilhaAtual
            ? 'Na primeira planilha de cada loja a IA estuda o formato — leva alguns segundos.'
            : 'Documentos com várias páginas ou muitos itens podem levar alguns minutos — pode deixar a aba aberta.'
        "
      />

      <template v-else>
        <p class="text-sm text-shift3-text-secondary">
          Escolha o cliente, o template e o documento — foto, PDF ou a planilha do jeito que a loja mandou. Na
          planilha, a IA entende o formato na primeira vez e o sistema lembra dele nas próximas deste cliente.
        </p>

        <section class="space-y-4">
          <!-- cliente primeiro: escolher ele já preenche o template (padrões do cadastro do cliente) -->
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ClientesClientePicker v-model="clienteId" />

            <div>
              <label class="mb-1 block text-sm font-medium text-shift3-text">Template *</label>
              <select
                v-model="modeloId"
                class="w-full rounded-default border border-shift3-input-border bg-shift3-input px-3 py-2 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20"
              >
                <option :value="null" disabled>Selecione um template</option>
                <option v-for="m in modelosAtivos" :key="m.id" :value="m.id">{{ m.nome }}</option>
              </select>
              <p v-if="!modelosAtivos.length && !modelos.carregando.value" class="mt-1 text-xs text-shift3-text-muted">
                Nenhum template ativo — crie um em
                <NuxtLink to="/templates" class="text-shift3-teal hover:underline">Templates</NuxtLink>.
              </p>
              <p v-else-if="modeloId && modeloId === preenchidoAuto.modelo" class="mt-1 flex items-center gap-1 text-xs text-shift3-text-muted">
                <Icon name="heroicons:adjustments-horizontal" class="h-3.5 w-3.5" /> Padrão do cadastro do cliente
              </p>
            </div>
          </div>

          <!-- cliente sem fábrica + tabela no cadastro: bloqueia e leva pra configurar -->
          <div
            v-if="clienteSemPadrao || statusPadroes === 'erro'"
            class="flex flex-wrap items-start gap-3 rounded-medium border border-warning/40 bg-warning/10 p-4"
          >
            <Icon name="heroicons:exclamation-triangle" class="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            <div class="min-w-0 flex-1 basis-64">
              <p class="text-sm font-semibold text-shift3-text">
                {{ statusPadroes === 'erro' ? 'Não foi possível ler o cadastro do cliente' : 'Este cliente ainda não tem fábrica e tabela de preço' }}
              </p>
              <p class="mt-0.5 text-sm text-shift3-text-secondary">
                Defina no cadastro do cliente de quais fábricas ele compra e a tabela de cada uma — é dali que sai o preço
                dos itens. Depois volte aqui e clique em “Já configurei”.
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <BaseButton
                v-if="auth.podeEditarModulo('clientes')"
                :to="`/clientes/${clienteId}?aba=padroes`"
                target="_blank"
                variant="primary"
                size="sm"
                icon-left="heroicons:adjustments-horizontal"
              >
                Configurar cliente
              </BaseButton>
              <BaseButton variant="secondary" size="sm" icon-left="heroicons:arrow-path" @click="carregarPadroes(clienteId)">
                Já configurei
              </BaseButton>
            </div>
            <p v-if="!auth.podeEditarModulo('clientes')" class="w-full text-xs text-shift3-text-muted">
              Você não tem permissão para editar clientes — peça ao administrador.
            </p>
          </div>

          <BaseUpload
            v-model="arquivos"
            :multiple="false"
            accept=".pdf,image/*,.xlsx,.xls,.csv"
            :max-size-mb="20"
            hint="PDF, foto ou planilha (XLSX/CSV) do pedido — até 20 MB"
          />

          <div v-if="ehPlanilhaAtual">
            <label for="instrucoes-pedido" class="mb-1 block text-sm font-medium text-shift3-text">
              Instruções para a IA <span class="font-normal text-shift3-text-muted">(opcional)</span>
            </label>
            <textarea
              id="instrucoes-pedido"
              v-model="instrucoes"
              rows="2"
              maxlength="2000"
              :placeholder="EXEMPLO_INSTRUCOES"
              class="w-full rounded-default border border-shift3-input-border bg-shift3-input px-3 py-2 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20"
            />
            <p class="mt-1 text-xs text-shift3-text-muted">
              Só se a IA errar alguma coisa nesta loja — diga onde está o código, a quantidade ou o que deixar de fora.
              Fica guardado pra este cliente.
            </p>
          </div>
        </section>

        <!-- ───── Ações — teleportadas pra barra fixa do layout (dashboard.vue) ───── -->
        <ClientOnly>
          <Teleport to="#dashboard-footer">
            <div class="border-t border-shift3-border bg-shift3-bg-card px-6 py-4">
              <div class="mx-auto flex max-w-4xl items-center gap-3">
                <BaseButton
                  v-if="ehPlanilhaAtual"
                  type="button"
                  variant="primary"
                  icon-left="heroicons:table-cells"
                  :disabled="!podeProcessar"
                  @click="lerPlanilhaPedido"
                >
                  Ler planilha
                </BaseButton>
                <BaseButton
                  v-else
                  type="button"
                  variant="primary"
                  icon-left="heroicons:sparkles"
                  :disabled="!podeProcessar"
                  @click="extrair"
                >
                  Extrair
                </BaseButton>
                <BaseButton type="button" variant="ghost" @click="navigateTo('/pedidos')">Cancelar</BaseButton>
                <!-- diz o que falta — botão desabilitado sem explicação parece defeito -->
                <span v-if="faltando" class="text-xs text-shift3-text-muted">Falta: {{ faltando }}</span>
              </div>
            </div>
          </Teleport>
        </ClientOnly>
      </template>
    </div>

    <!-- ───── Etapa 2: mapeamento de colunas (planilha OU itens extraídos pela IA) ───── -->
    <div v-else-if="etapa === 'mapeamento'" class="space-y-8">
      <!-- planilha: como ela foi entendida (IA, memória da loja ou regras) e quantas linhas viram item -->
      <section v-if="pedidoLido" class="space-y-3">
        <div class="flex items-center gap-2 border-b border-shift3-border pb-2">
          <Icon name="heroicons:bars-3-bottom-left" class="h-5 w-5 text-shift3-teal" />
          <p class="text-base font-semibold text-shift3-text">Leitura da planilha</p>
        </div>

        <div class="flex flex-wrap items-start gap-3 rounded-medium border border-shift3-border bg-shift3-bg-card p-4">
          <span
            class="grid h-9 w-9 shrink-0 place-items-center rounded-default"
            :class="origemLayout === 'regras' ? 'bg-warning/20 text-yellow-600' : 'bg-success/20 text-shift3-teal dark:text-success'"
          >
            <Icon :name="ORIGENS_LAYOUT[origemLayout].icone" class="h-5 w-5" />
          </span>
          <div class="min-w-0 flex-1 basis-72 space-y-1">
            <p class="text-sm font-semibold text-shift3-text">{{ ORIGENS_LAYOUT[origemLayout].titulo }}</p>
            <p class="text-sm text-shift3-text-secondary">
              {{ origemLayout === 'ia' ? resumoIa : ORIGENS_LAYOUT[origemLayout].texto }}
            </p>
            <p v-if="origemLayout === 'ia' && confiancaIa !== 'alta'" class="text-xs font-medium text-yellow-600">
              A IA ficou em dúvida neste arquivo — confira o mapeamento abaixo com atenção.
            </p>
            <p v-if="falhaIa" class="text-xs text-danger">A IA não foi usada: {{ falhaIa }}</p>
            <p v-if="errosEtapas.length" class="text-xs text-danger">
              Parte das instruções não pôde ser aplicada: {{ errosEtapas.join(' · ') }}
            </p>
          </div>
          <BaseButton
            variant="secondary"
            size="sm"
            icon-left="heroicons:sparkles"
            :loading="analisando"
            @click="analisarDeNovo"
          >
            {{ origemLayout === 'ia' ? 'Analisar de novo' : 'Analisar com IA' }}
          </BaseButton>

          <div class="w-full">
            <label for="instrucoes-leitura" class="mb-1 block text-xs font-medium text-shift3-text">
              Instruções para a IA <span class="font-normal text-shift3-text-muted">(opcional)</span>
            </label>
            <textarea
              id="instrucoes-leitura"
              v-model="instrucoes"
              rows="2"
              maxlength="2000"
              :placeholder="EXEMPLO_INSTRUCOES"
              class="w-full rounded-default border border-shift3-input-border bg-shift3-input px-3 py-2 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20"
            />
            <p v-if="instrucoesMudaram" class="mt-1 text-xs font-medium text-yellow-600">
              Você mudou as instruções — clique em “{{ origemLayout === 'ia' ? 'Analisar de novo' : 'Analisar com IA' }}”
              pra IA reler o arquivo com elas.
            </p>
          </div>
        </div>

        <!-- o número que importa: das centenas de linhas do catálogo, quantas a loja pediu -->
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div class="rounded-medium border border-shift3-border bg-shift3-bg-card p-4">
            <p class="text-xs font-medium uppercase tracking-wide text-shift3-text-muted">Aba</p>
            <p class="mt-1 truncate text-sm font-semibold text-shift3-text">{{ pedidoLido.aba.nome }}</p>
            <p class="text-xs text-shift3-text-muted">títulos na linha {{ pedidoLido.aba.linhaCabecalho + 1 }}</p>
          </div>
          <div class="rounded-medium border border-shift3-border bg-shift3-bg-card p-4">
            <p class="text-xs font-medium uppercase tracking-wide text-shift3-text-muted">Linhas na planilha</p>
            <p class="mt-1 text-2xl font-bold text-shift3-text">{{ linhasArquivo.length.toLocaleString('pt-BR') }}</p>
          </div>
          <div class="rounded-medium border border-shift3-green/40 bg-success/10 p-4">
            <p class="text-xs font-medium uppercase tracking-wide text-shift3-text-muted">Com quantidade = itens</p>
            <p class="mt-1 text-2xl font-bold text-shift3-teal dark:text-success">
              {{ colunaQuantidade ? linhasDoPedido.length.toLocaleString('pt-BR') : '—' }}
            </p>
            <p v-if="!colunaQuantidade" class="text-xs text-yellow-600">Escolha a coluna da quantidade abaixo.</p>
          </div>
        </div>
      </section>

      <PedidosMapeamentoColunas
        v-model="mapeamentoColunas"
        v-model:identificador="identificador"
        :do-template="!ehPlanilhaAtual"
        :colunas="colunasArquivo"
        :linhas="linhasDoPedido"
        :campos-alvo="camposAlvoAtual"
      />

      <ClientOnly>
        <Teleport to="#dashboard-footer">
          <div class="border-t border-shift3-border bg-shift3-bg-card px-6 py-4">
            <div class="mx-auto flex max-w-4xl items-center gap-3">
              <BaseButton
                type="button"
                variant="primary"
                icon-left="heroicons:check"
                :disabled="!podeConfirmarMapeamento"
                :loading="vinculando"
                @click="confirmarMapeamento"
              >
                Continuar
              </BaseButton>
              <BaseButton type="button" variant="ghost" @click="etapa = 'upload'">Voltar</BaseButton>
            </div>
          </div>
        </Teleport>
      </ClientOnly>
    </div>

    <!-- ───── Etapa 3: revisão (tabela editável) ───── -->
    <div v-else class="space-y-8">
      <div>
        <p class="text-lg font-semibold text-shift3-text">Revisar pedido</p>
        <p class="text-sm text-shift3-text-secondary">
          Cliente: <span class="font-medium text-shift3-text">{{ clienteSelecionado?.nome }}</span>
        </p>
      </div>

      <!-- Fábrica/lista de preço — usada pra buscar o preço unitário ao selecionar o produto -->
      <section class="space-y-4">
        <div class="flex items-center gap-2 border-b border-shift3-border pb-2">
          <Icon name="heroicons:currency-dollar" class="h-5 w-5 text-shift3-teal" />
          <p class="text-base font-semibold text-shift3-text">Fábrica e lista de preço</p>
        </div>
        <!-- só as fábricas do cadastro do cliente e as tabelas definidas lá -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label for="fabrica-do-cliente" class="mb-2 block text-sm font-medium text-shift3-text">Fábrica</label>
            <select id="fabrica-do-cliente" v-model="fabricaId" :class="CLASSE_SELECT">
              <option :value="null" disabled>Selecione a fábrica</option>
              <option v-for="f in fabricasUsaveis" :key="f.id" :value="f.fabrica_id">
                {{ f.fabricas?.nome }}{{ f.principal ? ' (principal)' : '' }}
              </option>
            </select>
          </div>
          <div>
            <label for="tabela-do-cliente" class="mb-2 block text-sm font-medium text-shift3-text">Referência da tabela</label>
            <select id="tabela-do-cliente" v-model="referenciaId" :class="CLASSE_SELECT">
              <option :value="null" disabled>Selecione a tabela</option>
              <option v-for="t in tabelasDoCliente" :key="t.id" :value="t.id">{{ t.nome }}</option>
            </select>
          </div>
        </div>
        <p class="text-xs text-shift3-text-muted">
          A fábrica preenche o preço unitário dos itens. Fábricas e tabelas vêm do
          <NuxtLink :to="`/clientes/${clienteId}?aba=padroes`" target="_blank" class="text-shift3-teal hover:underline">
            cadastro do cliente</NuxtLink>.
        </p>
      </section>

      <!-- Campos do cabeçalho, do jeito que o template definiu -->
      <section v-if="modeloAtual?.schema.campos.length" class="space-y-4">
        <div class="flex items-center gap-2 border-b border-shift3-border pb-2">
          <Icon name="heroicons:document-text" class="h-5 w-5 text-shift3-teal" />
          <p class="text-base font-semibold text-shift3-text">Informações do pedido</p>
        </div>
        <p class="text-xs text-shift3-text-muted">
          Os campos do cabeçalho do template — os preenchidos aparecem na Ordem de Compra.
        </p>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div v-for="campo in modeloAtual.schema.campos" :key="campo.id">
            <label class="mb-1 block text-sm font-medium text-shift3-text">{{ campo.nome }}</label>
            <input
              v-if="campo.tipo === 'booleano'"
              type="checkbox"
              class="h-4 w-4 accent-shift3-green"
              :checked="!!camposCabecalho[campo.id]"
              @change="(e) => (camposCabecalho[campo.id] = (e.target as HTMLInputElement).checked)"
            />
            <input
              v-else
              :value="camposCabecalho[campo.id] ?? ''"
              :type="campo.tipo === 'data' ? 'date' : campo.tipo === 'numero' || campo.tipo === 'moeda' ? 'number' : 'text'"
              class="w-full rounded-default border border-shift3-input-border bg-shift3-input px-3 py-2 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20"
              @input="(e) => (camposCabecalho[campo.id] = (e.target as HTMLInputElement).value)"
            />
          </div>
        </div>
      </section>

      <!-- Itens — tabela editável -->
      <section class="space-y-4">
        <div class="flex items-center gap-2 border-b border-shift3-border pb-2">
          <Icon name="heroicons:table-cells" class="h-5 w-5 text-shift3-teal" />
          <p class="text-base font-semibold text-shift3-text">Itens</p>
        </div>
        <PedidosItensEditor
          v-model="itensPedido"
          :fabrica-id="fabricaId"
          :referencia-id="referenciaId"
          :identificador="identificador"
          :cliente-id="clienteId"
          preco-ao-carregar
        />
      </section>

      <ClientOnly>
        <Teleport to="#dashboard-footer">
          <div class="border-t border-shift3-border bg-shift3-bg-card px-6 py-4">
            <div class="mx-auto flex max-w-4xl items-center gap-3">
              <BaseButton
                type="button"
                variant="primary"
                icon-left="heroicons:check"
                :loading="salvando"
                :disabled="!itensPedido.length"
                @click="salvar"
              >
                Validar e salvar
              </BaseButton>
              <BaseButton type="button" variant="ghost" @click="etapa = 'upload'">Voltar</BaseButton>
            </div>
          </div>
        </Teleport>
      </ClientOnly>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, shallowRef, watch } from 'vue'
import type { UploadFile } from '~/composables/useUpload'
import { lerGradesPlanilha } from '~/composables/useImportarPlanilha'
import {
  aplicarMapeamento,
  camposAlvoDoTemplate,
  informacoesDoCabecalho,
  itensDoMapeamento,
  sugerirMapeamentoColunas,
  temQuantidade,
  vincularProdutos
} from '~/types/pedido'
import { destinoDoModelo } from '~/types/modelo'
import type { AnaliseLayout, IdentificadorProduto, ReceitaLayout } from '~/types/modelo'
import type { CampoAlvo, PedidoItemInput } from '~/types/pedido'
import type { ClienteFabrica, PadroesPedidoCliente } from '~/types/cliente'
import { useAuthStore } from '~/stores/auth'
import type { GradePlanilha } from '~/utils/gradePlanilha'
import { amostraDasAbas, mapeamentoDaReceita, receitaDoMapeamento, receitaVazia } from '~/utils/layoutPlanilha'
import { cabecalhoDoPedido, lerPedido, lerPedidoComLayoutGuardado } from '~/utils/pedidoPlanilha'
import type { PedidoLido } from '~/utils/pedidoPlanilha'

definePageMeta({ layout: 'dashboard', title: 'Novo pedido', backTo: '/pedidos' })

const modelos = useModelos()
const { extrair: extrairArquivo } = useExtracao()
const { criar } = usePedidos()
const clientes = useClientes()
const produtos = useProdutos()
const toast = useToast()
const auth = useAuthStore()

onMounted(() => {
  // a lista de produtos é compartilhada com a tela /produtos — um filtro esquecido lá
  // esconderia produtos do vínculo automático e do seletor de produto daqui
  produtos.filtros.value = { q: '', ativo: 'todos' }
  modelos.carregar()
  clientes.carregar()
})

// templates de "dados para análise" são usados em /importacoes, não aqui
const modelosAtivos = computed(() => modelos.itens.value.filter((m) => m.ativo && destinoDoModelo(m) === 'pedido'))
const modeloAtual = computed(() => modelos.itens.value.find((m) => m.id === modeloId.value) ?? null)
const clienteSelecionado = computed(() => clientes.itens.value.find((c) => c.id === clienteId.value) ?? null)

const ETAPAS_LABEL = ['Importação', 'Mapeamento de colunas', 'Revisão']
const EXEMPLO_INSTRUCOES =
  'Ex: o código está na coluna C e a descrição na D; a quantidade pedida é a coluna "Qnt. Ped.", não a de estoque.'
const ORIGENS_LAYOUT = {
  ia: { icone: 'heroicons:sparkles', titulo: 'Formato lido pela IA', texto: '' },
  memoria: {
    icone: 'heroicons:bookmark',
    titulo: 'Formato já conhecido desta loja',
    texto: 'A planilha tem o mesmo formato da última deste cliente neste template — usei o que ficou guardado, sem chamar a IA.'
  },
  regras: {
    icone: 'heroicons:cog-6-tooth',
    titulo: 'Leitura automática, sem IA',
    texto: 'As colunas foram ligadas aos campos só pelo nome. Confira o mapeamento abaixo.'
  }
}

const etapa = ref<'upload' | 'mapeamento' | 'revisao'>('upload')
const indiceEtapa = computed(() => ({ upload: 0, mapeamento: 1, revisao: 2 })[etapa.value])
const modeloId = ref<string | null>(null)
const clienteId = ref<string | null>(null)
const fabricaId = ref<string | null>(null)
const referenciaId = ref<string | null>(null)
const arquivos = ref<UploadFile[]>([])
const extraindo = ref(false)
const salvando = ref(false)

const extracaoId = ref<string | null>(null)
const camposCabecalho = reactive<Record<string, unknown>>({})
const itensPedido = ref<PedidoItemInput[]>([])

const colunasArquivo = ref<string[]>([])
const linhasArquivo = ref<Record<string, unknown>[]>([])
const camposAlvoAtual = ref<CampoAlvo[]>([])
const mapeamentoColunas = ref<Record<string, string | null>>({})
/** Campo do cadastro de produtos usado pra pré-selecionar o produto — padrão do template, ajustável no mapeamento. */
const identificador = ref<IdentificadorProduto>('sku')
const vinculando = ref(false)

const EXTENSOES_PLANILHA = ['xlsx', 'xls', 'csv']
function ehPlanilha(nome: string): boolean {
  const ext = nome.split('.').pop()?.toLowerCase() ?? ''
  return EXTENSOES_PLANILHA.includes(ext)
}

const ehPlanilhaAtual = computed(() => {
  const nome = arquivos.value[0]?.file.name
  return !!nome && ehPlanilha(nome)
})

/** O que ainda falta preencher pra liberar o botão (vazio = tudo certo). */
const faltando = computed(() =>
  [
    !clienteId.value && 'cliente',
    statusPadroes.value === 'carregando' && 'carregando o cadastro do cliente',
    (clienteSemPadrao.value || statusPadroes.value === 'erro') && 'fábrica e tabela no cadastro do cliente',
    !modeloId.value && 'template',
    !arquivos.value.length && 'arquivo'
  ]
    .filter(Boolean)
    .join(', ')
)
const podeProcessar = computed(() => !faltando.value)

// --- planilha do pedido ---
const grades = shallowRef<GradePlanilha[]>([])
/** A aba do pedido já lida — `null` fora do fluxo de planilha (foto/PDF). */
const pedidoLido = shallowRef<PedidoLido | null>(null)
/**
 * Como o formato da planilha foi entendido: pela IA, pelo que ficou guardado da última planilha
 * desta loja (`memoria`) ou só pelas regras do leitor.
 */
const origemLayout = ref<'ia' | 'memoria' | 'regras'>('regras')
const receitaEmUso = ref<ReceitaLayout | null>(null)
const resumoIa = ref('')
const confiancaIa = ref<AnaliseLayout['confianca']>('alta')
/** Por que a IA não foi usada quando deveria (fica na tela, não só num aviso que some). */
const falhaIa = ref('')
const errosEtapas = ref<string[]>([])
const analisando = ref(false)
/** O que o usuário pede pra IA sobre as planilhas desta loja — fica guardado com o formato dela. */
const instrucoes = ref('')
/** As instruções que valeram na leitura que está na tela — o que for digitado depois só vale ao analisar de novo. */
const instrucoesLidas = ref('')
const instrucoesMudaram = computed(() => instrucoes.value.trim() !== instrucoesLidas.value)
const layoutSalvo = computed(() => (clienteId.value ? modeloAtual.value?.schema.layouts?.[clienteId.value] : null) ?? null)
watch([modeloId, clienteId], () => {
  instrucoes.value = layoutSalvo.value?.instrucoes ?? ''
})

// --- padrões do cliente (cadastro do cliente → aba "Padrões do pedido") ---
// Escolher o cliente preenche template, fábrica principal e a tabela dela; trocar a fábrica puxa a
// tabela que o cliente usa nela. Só preenche campo vazio ou que o próprio padrão tinha preenchido
// — o que o usuário escolheu à mão fica.
const padroesCliente = usePadroesCliente()
const fabricasDoCliente = ref<ClienteFabrica[]>([])
const preenchidoAuto = reactive<{ modelo: string | null; fabrica: string | null; referencia: string | null }>({
  modelo: null,
  fabrica: null,
  referencia: null
})

/**
 * Fábrica + tabela no cadastro do cliente é obrigatório pra importar: sem isso o pedido nasce sem
 * preço certo. Fábrica sem tabela não conta (não aparece no pedido).
 */
const statusPadroes = ref<'vazio' | 'carregando' | 'ok' | 'erro'>('vazio')
const fabricasUsaveis = computed(() => fabricasDoCliente.value.filter((f) => f.referencia_id))
const clienteSemPadrao = computed(() => !!clienteId.value && statusPadroes.value === 'ok' && !fabricasUsaveis.value.length)

watch(clienteId, (id) => carregarPadroes(id))

async function carregarPadroes(id: string | null) {
  fabricasDoCliente.value = []
  statusPadroes.value = id ? 'carregando' : 'vazio'
  if (!id) return
  let padroes: PadroesPedidoCliente
  try {
    padroes = await padroesCliente.carregar(id)
  } catch (e) {
    console.error('Erro ao carregar padrões do cliente:', e)
    if (clienteId.value === id) statusPadroes.value = 'erro'
    return
  }
  if (clienteId.value !== id) return // trocou de cliente enquanto carregava

  fabricasDoCliente.value = padroes.fabricas
  statusPadroes.value = 'ok'
  const modelo = padroes.modeloId
  if (modelo && modelosAtivos.value.some((m) => m.id === modelo) && (!modeloId.value || modeloId.value === preenchidoAuto.modelo)) {
    modeloId.value = modelo
    preenchidoAuto.modelo = modelo
  }
  // a escolha fica restrita às fábricas do cadastro — fábrica de fora da lista (escolhida antes,
  // de outro cliente) cede lugar à principal
  const usaveis = fabricasUsaveis.value
  const principal = usaveis.find((f) => f.principal) ?? usaveis[0]
  const foraDaLista = !!fabricaId.value && !usaveis.some((f) => f.fabrica_id === fabricaId.value)
  if (principal && (!fabricaId.value || fabricaId.value === preenchidoAuto.fabrica || foraDaLista)) {
    fabricaId.value = principal.fabrica_id
    preenchidoAuto.fabrica = principal.fabrica_id
  }
  if (fabricaId.value) aplicarTabelaDaFabrica(fabricaId.value)
}

watch(fabricaId, (id) => {
  if (id) aplicarTabelaDaFabrica(id)
})

/** Tabelas que aparecem no cadastro do cliente (sem repetir) — as únicas oferecidas no pedido. */
const tabelasDoCliente = computed(() => {
  const vistas = new Map<string, string>()
  for (const f of fabricasUsaveis.value) vistas.set(f.referencia_id!, f.referencias_tabela?.nome ?? '—')
  return [...vistas].map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome))
})

const CLASSE_SELECT =
  'w-full rounded-default border border-shift3-input-border bg-shift3-input px-3 py-2 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20'

/**
 * Tabela da fábrica no cadastro do cliente. Com o cliente configurado, a tabela segue a fábrica
 * sempre (a lista é restrita); sem configuração não há o que aplicar.
 */
function aplicarTabelaDaFabrica(id: string) {
  const doCliente = fabricasUsaveis.value.find((f) => f.fabrica_id === id)
  if (!doCliente) return
  referenciaId.value = doCliente.referencia_id
  preenchidoAuto.referencia = doCliente.referencia_id
}

/** Coluna do arquivo ligada ao campo de quantidade do template. */
const colunaQuantidade = computed(() => {
  const campo = camposAlvoAtual.value.find((c) => c.papel === 'quantidade')
  return campo ? (mapeamentoColunas.value[campo.id] ?? null) : null
})
/**
 * Na planilha, só viram item as linhas com quantidade — a loja costuma mandar o catálogo
 * inteiro e preencher só o que quer. Sem coluna de quantidade escolhida, todas.
 */
const linhasDoPedido = computed(() => {
  const coluna = colunaQuantidade.value
  if (!pedidoLido.value || !coluna) return linhasArquivo.value
  return linhasArquivo.value.filter((linha) => temQuantidade(linha[coluna]))
})

const podeConfirmarMapeamento = computed(
  () => linhasDoPedido.value.length > 0 && Object.values(mapeamentoColunas.value).some(Boolean)
)

async function extrair() {
  if (!podeProcessar.value || !modeloId.value) return
  const arquivo = arquivos.value[0]?.file
  if (!arquivo) return

  extraindo.value = true
  try {
    const resposta = await extrairArquivo(arquivo, modeloId.value)
    extracaoId.value = resposta.extracaoId
    pedidoLido.value = null

    for (const campo of modeloAtual.value?.schema.campos ?? []) {
      camposCabecalho[campo.id] = resposta.dadosExtraidos.campos?.[campo.id] ?? ''
    }

    // a extração devolve a tabela como impressa no documento (colunas livres) — quem
    // decide qual coluna vira qual campo do template é o usuário, na tela de mapeamento
    const camposAlvo = camposAlvoDoTemplate(modeloAtual.value?.schema.campos_item ?? [])
    const colunas = resposta.dadosExtraidos.colunasItem ?? []
    const linhas = resposta.dadosExtraidos.linhas ?? []

    if (resposta.reaproveitado) toast.info('Esse arquivo já tinha sido extraído antes — reaproveitando o resultado.')

    if (!linhas.length) {
      // nada extraído pra mapear — segue direto pra revisão, o usuário adiciona itens à mão
      itensPedido.value = []
      etapa.value = 'revisao'
    } else {
      colunasArquivo.value = colunas
      linhasArquivo.value = linhas
      camposAlvoAtual.value = camposAlvo
      identificador.value = modeloAtual.value?.schema.identificador_produto ?? 'sku'
      mapeamentoColunas.value = sugerirMapeamentoColunas(colunas, camposAlvo)
      etapa.value = 'mapeamento'
    }
  } catch (e) {
    const erro = e as any
    toast.error(erro?.data?.statusMessage || erro?.message || 'Não foi possível extrair o documento')
  } finally {
    extraindo.value = false
  }
}

/** Põe a aba lida na tela, com o mapeamento da receita (ou, sem receita, o palpite pelo nome das colunas) e o cabeçalho. */
function usarPedidoLido(lido: PedidoLido, receita: ReceitaLayout | null) {
  pedidoLido.value = lido
  receitaEmUso.value = receita
  errosEtapas.value = lido.erros
  colunasArquivo.value = lido.aba.colunas
  linhasArquivo.value = lido.aba.linhas
  mapeamentoColunas.value = receita
    ? mapeamentoDaReceita(receita, lido.aba, camposAlvoAtual.value.map((c) => c.id))
    : sugerirMapeamentoColunas(lido.aba.colunas, camposAlvoAtual.value)
  const cabecalho = cabecalhoDoPedido(lido, receita, modeloAtual.value?.schema.campos ?? [])
  for (const [id, valor] of Object.entries(cabecalho)) camposCabecalho[id] = valor
}

/**
 * Descobre como ler a planilha e lê a aba do pedido. Ordem: o que ficou guardado desta loja
 * (se o arquivo ainda tem o mesmo formato) → IA → regras do leitor. `forcarIa` pula a memória.
 * Devolve `false` se não achou dado nenhum.
 */
async function entenderPlanilha(forcarIa = false): Promise<boolean> {
  if (!grades.value.length || !modeloId.value) return false
  falhaIa.value = ''
  resumoIa.value = ''

  const pedido = instrucoes.value.trim()
  instrucoesLidas.value = pedido
  const salvo = layoutSalvo.value
  // instrução diferente da que gerou a receita guardada = o usuário quer outra leitura
  if (salvo && !forcarIa && (salvo.instrucoes ?? '') === pedido) {
    const lido = lerPedidoComLayoutGuardado(grades.value, salvo.receita, salvo.assinatura)
    if (lido) {
      origemLayout.value = 'memoria'
      usarPedidoLido(lido, salvo.receita)
      return true
    }
  }

  try {
    const analise = await $fetch<AnaliseLayout>('/api/importacoes/layout', {
      method: 'POST',
      body: {
        modeloId: modeloId.value,
        amostra: amostraDasAbas(grades.value, pedido),
        instrucoes: pedido,
        abas: grades.value.map((g) => g.nome)
      }
    })
    const lido = lerPedido(grades.value, analise)
    if (lido) {
      origemLayout.value = 'ia'
      resumoIa.value = analise.resumo
      confiancaIa.value = analise.confianca
      usarPedidoLido(lido, analise)
      return true
    }
    falhaIa.value = 'A IA não achou os itens do pedido nesta planilha.'
  } catch (e) {
    const erro = e as any
    falhaIa.value = erro?.data?.statusMessage || erro?.message || 'Não foi possível analisar a planilha com a IA.'
  }

  // sem IA, o que ficou guardado desta loja ainda é melhor que ligar as colunas só pelo nome
  if (salvo) {
    const lido = lerPedidoComLayoutGuardado(grades.value, salvo.receita, salvo.assinatura)
    if (lido) {
      origemLayout.value = 'memoria'
      instrucoesLidas.value = salvo.instrucoes ?? ''
      usarPedidoLido(lido, salvo.receita)
      return true
    }
  }

  const lido = lerPedido(grades.value, null)
  if (!lido) return false
  origemLayout.value = 'regras'
  usarPedidoLido(lido, null)
  return true
}

/** Lê a planilha no navegador e entende o formato dela (memória da loja → IA → regras) pro usuário conferir. */
async function lerPlanilhaPedido() {
  const arquivo = arquivos.value[0]?.file
  if (!arquivo || !podeProcessar.value) return

  extraindo.value = true
  try {
    for (const chave of Object.keys(camposCabecalho)) delete camposCabecalho[chave]
    extracaoId.value = null
    camposAlvoAtual.value = camposAlvoDoTemplate(modeloAtual.value?.schema.campos_item ?? [])
    identificador.value = modeloAtual.value?.schema.identificador_produto ?? 'sku'
    grades.value = await lerGradesPlanilha(arquivo)
    if (!(await entenderPlanilha())) {
      pedidoLido.value = null
      toast.error('Não encontrei dados nessa planilha — confira se ela tem uma linha com os títulos das colunas.')
      return
    }
    etapa.value = 'mapeamento'
  } catch {
    toast.error('Não foi possível ler essa planilha. Confira se o formato do arquivo está correto.')
  } finally {
    extraindo.value = false
  }
}

async function analisarDeNovo() {
  analisando.value = true
  try {
    await entenderPlanilha(true)
  } finally {
    analisando.value = false
  }
}

/**
 * Guarda no template como ler a planilha desta loja — a estrutura usada + o mapeamento que
 * foi conferido — pra próxima dela entrar sem IA. Se não der pra guardar, o pedido já está
 * salvo: só não fica lembrado.
 */
async function lembrarLayout() {
  const lido = pedidoLido.value
  if (!lido || !modeloId.value || !clienteId.value) return
  try {
    await modelos.salvarLayout(modeloId.value, clienteId.value, {
      receita: receitaDoMapeamento(
        { ...(receitaEmUso.value ?? receitaVazia()), aba: lido.aba.nome },
        lido.aba,
        mapeamentoColunas.value
      ),
      assinatura: lido.aba.assinatura,
      // as que geraram esta leitura — texto mudado sem analisar de novo não entra
      instrucoes: instrucoesLidas.value,
      salvo_em: new Date().toISOString()
    })
  } catch {
    toast.info('O pedido foi salvo, mas não consegui guardar o formato desta planilha pra próxima vez.')
  }
}

/** Converte as linhas mapeadas em itens e já pré-seleciona o produto de cada um pelo código (ver `vincularProdutos`). */
async function confirmarMapeamento() {
  const linhasMapeadas = aplicarMapeamento(linhasDoPedido.value, mapeamentoColunas.value)
  let itens = itensDoMapeamento(linhasMapeadas, camposAlvoAtual.value)
  // na planilha da loja, custo/preço sugerido não valem: o preço vem da tabela de preço (na revisão, ao escolher a fábrica)
  if (pedidoLido.value) itens = itens.map((item) => ({ ...item, preco_unitario: 0 }))

  vinculando.value = true
  try {
    await produtos.carregar()
    itensPedido.value = vincularProdutos(itens, produtos.itens.value, identificador.value)

    const comCodigo = itensPedido.value.filter((i) => i.sku?.trim()).length
    const encontrados = itensPedido.value.filter((i) => i.produto_id).length
    if (comCodigo) toast.info(`${encontrados} de ${itensPedido.value.length} item(ns) com produto encontrado no catálogo.`)
  } catch {
    // sem catálogo não dá pra vincular — segue pra revisão e o usuário seleciona à mão
    itensPedido.value = itens
    toast.error('Não foi possível carregar os produtos pra pré-selecionar — selecione manualmente.')
  } finally {
    vinculando.value = false
  }
  etapa.value = 'revisao'
}

async function salvar() {
  if (!clienteId.value) return
  salvando.value = true
  try {
    const id = await criar({
      cliente_id: clienteId.value,
      extracao_id: extracaoId.value,
      fabrica_id: fabricaId.value,
      referencia_id: referenciaId.value,
      // vai pra dados_extras: o bloco "Informações do pedido" da OC
      campos: { informacoes: informacoesDoCabecalho(modeloAtual.value?.schema.campos ?? [], camposCabecalho) },
      itens: itensPedido.value
    })
    await lembrarLayout()
    toast.success('Pedido salvo')
    await navigateTo(`/pedidos/${id}`)
  } catch (e) {
    const erro = e as any
    toast.error(erro?.message || 'Não foi possível salvar o pedido')
  } finally {
    salvando.value = false
  }
}
</script>
