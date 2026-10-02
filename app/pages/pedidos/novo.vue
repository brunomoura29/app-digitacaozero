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
            ? undefined
            : 'Documentos com várias páginas ou muitos itens podem levar alguns minutos — pode deixar a aba aberta.'
        "
      />

      <template v-else>
        <p class="text-sm text-shift3-text-secondary">
          Escolha o cliente e o documento — foto/PDF passa pela IA com um template; planilha (XLSX/CSV) é lida
          direto, sem template.
        </p>

        <section class="space-y-4">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div v-if="!ehPlanilhaAtual">
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
            </div>
            <div v-else class="flex items-end pb-2 text-sm text-shift3-text-muted">
              Planilha detectada — o mapeamento de colunas acontece no próximo passo, sem precisar de template.
            </div>

            <ClientesClientePicker v-model="clienteId" />
          </div>

          <BaseUpload
            v-model="arquivos"
            :multiple="false"
            accept=".pdf,image/*,.xlsx,.xls,.csv"
            :max-size-mb="20"
            hint="PDF, foto ou planilha (XLSX/CSV) do pedido — até 20 MB"
          />
        </section>

        <div class="flex items-center gap-3">
          <BaseButton
            v-if="ehPlanilhaAtual"
            type="button"
            variant="primary"
            icon-left="heroicons:table-cells"
            :disabled="!podeProcessar"
            @click="mapearPlanilha"
          >
            Mapear colunas
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
        </div>
      </template>
    </div>

    <!-- ───── Etapa 2: mapeamento de colunas (planilha OU itens extraídos pela IA) ───── -->
    <div v-else-if="etapa === 'mapeamento'" class="space-y-8">
      <PedidosMapeamentoColunas
        v-model="mapeamentoColunas"
        v-model:identificador="identificador"
        :do-template="!ehPlanilhaAtual"
        :colunas="colunasArquivo"
        :linhas="linhasArquivo"
        :campos-alvo="camposAlvoAtual"
      />

      <div class="flex items-center gap-3">
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
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <BaseBuscaOuCria
            v-model="fabricaId"
            label="Fábrica"
            placeholder="Buscar fábrica ou digitar pra criar…"
            :itens="fabricas.itens.value"
            :carregando="fabricas.carregando.value"
            :ao-criar="(nome) => fabricas.criar(nome)"
          />
          <BaseBuscaOuCria
            v-model="referenciaId"
            label="Referência da tabela"
            placeholder="Ex: Preço fábrica, Distribuidor…"
            :itens="referencias.itens.value"
            :carregando="referencias.carregando.value"
            :ao-criar="(nome) => referencias.criar(nome)"
          />
        </div>
        <p class="text-xs text-shift3-text-muted">
          Escolha a fábrica pra preencher o preço unitário dos itens que já têm produto selecionado — e dos próximos
          que você selecionar.
        </p>
      </section>

      <!-- Campos do cabeçalho, do jeito que o template definiu -->
      <section v-if="modeloAtual?.schema.campos.length" class="space-y-4">
        <div class="flex items-center gap-2 border-b border-shift3-border pb-2">
          <Icon name="heroicons:document-text" class="h-5 w-5 text-shift3-teal" />
          <p class="text-base font-semibold text-shift3-text">Dados do pedido</p>
        </div>
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
          preco-ao-carregar
        />
      </section>

      <div class="flex items-center gap-3">
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
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { UploadFile } from '~/composables/useUpload'
import { lerPlanilha } from '~/composables/useImportarPlanilha'
import {
  CAMPOS_ALVO_PADRAO,
  aplicarMapeamento,
  camposAlvoDoTemplate,
  itensDoMapeamento,
  sugerirMapeamentoColunas,
  vincularProdutos
} from '~/types/pedido'
import type { IdentificadorProduto } from '~/types/modelo'
import type { CampoAlvo, PedidoItemInput } from '~/types/pedido'

definePageMeta({ layout: 'dashboard', title: 'Novo pedido', backTo: '/pedidos' })

const modelos = useModelos()
const { extrair: extrairArquivo } = useExtracao()
const { criar } = usePedidos()
const clientes = useClientes()
const fabricas = useFabricas()
const referencias = useReferenciasTabela()
const produtos = useProdutos()
const toast = useToast()

onMounted(() => {
  // a lista de produtos é compartilhada com a tela /produtos — um filtro esquecido lá
  // esconderia produtos do vínculo automático e do seletor de produto daqui
  produtos.filtros.value = { q: '', ativo: 'todos' }
  modelos.carregar()
  clientes.carregar()
  fabricas.carregar()
  referencias.carregar()
})

const modelosAtivos = computed(() => modelos.itens.value.filter((m) => m.ativo))
const modeloAtual = computed(() => modelos.itens.value.find((m) => m.id === modeloId.value) ?? null)
const clienteSelecionado = computed(() => clientes.itens.value.find((c) => c.id === clienteId.value) ?? null)

const ETAPAS_LABEL = ['Importação', 'Mapeamento de colunas', 'Revisão']

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

const podeProcessar = computed(() => {
  if (!clienteId.value || !arquivos.value.length) return false
  return ehPlanilhaAtual.value || !!modeloId.value
})

const podeConfirmarMapeamento = computed(() => Object.values(mapeamentoColunas.value).some(Boolean))

async function extrair() {
  if (!podeProcessar.value || !modeloId.value) return
  const arquivo = arquivos.value[0]?.file
  if (!arquivo) return

  extraindo.value = true
  try {
    const resposta = await extrairArquivo(arquivo, modeloId.value)
    extracaoId.value = resposta.extracaoId

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

/** Lê a planilha no navegador (sem IA) e sugere um mapeamento inicial de colunas pro usuário confirmar. */
async function mapearPlanilha() {
  const arquivo = arquivos.value[0]?.file
  if (!arquivo || !podeProcessar.value) return

  extraindo.value = true
  try {
    const { colunas, linhas } = await lerPlanilha(arquivo)
    if (!colunas.length || !linhas.length) {
      toast.error('Não encontrei dados nessa planilha — confira se a primeira linha tem os cabeçalhos das colunas.')
      return
    }

    colunasArquivo.value = colunas
    linhasArquivo.value = linhas
    camposAlvoAtual.value = CAMPOS_ALVO_PADRAO
    identificador.value = 'sku'
    mapeamentoColunas.value = sugerirMapeamentoColunas(colunas, CAMPOS_ALVO_PADRAO)
    etapa.value = 'mapeamento'
  } catch {
    toast.error('Não foi possível ler essa planilha. Confira se o formato do arquivo está correto.')
  } finally {
    extraindo.value = false
  }
}

/** Converte as linhas mapeadas em itens e já pré-seleciona o produto de cada um pelo código (ver `vincularProdutos`). */
async function confirmarMapeamento() {
  const linhasMapeadas = aplicarMapeamento(linhasArquivo.value, mapeamentoColunas.value)
  const itens = itensDoMapeamento(linhasMapeadas, camposAlvoAtual.value)

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
      campos: { ...camposCabecalho },
      itens: itensPedido.value
    })
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
