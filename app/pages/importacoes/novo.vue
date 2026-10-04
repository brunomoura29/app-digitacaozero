<template>
  <div class="mx-auto max-w-5xl pb-8">
    <BaseStepper :steps="ETAPAS_LABEL" :atual="indiceEtapa" class="mb-8" />

    <!-- ───── Etapa 1: arquivo ───── -->
    <div v-if="etapa === 'upload'" class="space-y-8">
      <BaseLoadingBar
        v-if="lendo"
        :label="ehPlanilhaAtual ? 'Lendo planilha' : 'Extraindo dados do documento'"
        :hint="
          ehPlanilhaAtual
            ? undefined
            : 'Documentos com várias páginas podem levar alguns minutos — pode deixar a aba aberta.'
        "
      />

      <template v-else>
        <p class="text-sm text-shift3-text-secondary">
          Escolha o conjunto de dados, o cliente e o período. Planilha (XLSX/CSV) é lida direto, com todas as abas;
          foto/PDF passa pela IA.
        </p>

        <section class="space-y-4">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-sm font-medium text-shift3-text">Conjunto de dados (template) *</label>
              <select
                v-model="modeloId"
                class="w-full rounded-default border border-shift3-input-border bg-shift3-input px-3 py-2 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20"
              >
                <option :value="null" disabled>Selecione um template</option>
                <option v-for="m in modelosDados" :key="m.id" :value="m.id">{{ m.nome }}</option>
              </select>
              <p v-if="!modelosDados.length && !modelos.carregando.value" class="mt-1 text-xs text-shift3-text-muted">
                Nenhum template com destino “Dados para análise” — crie um em
                <NuxtLink to="/templates" class="text-shift3-teal hover:underline">Templates</NuxtLink>.
              </p>
              <p v-else-if="modeloAtual && !campos.length" class="mt-1 text-xs text-danger">
                Este template não tem nenhuma coluna em “Colunas dos dados” — sem isso não dá pra importar.
                <NuxtLink :to="`/templates/${modeloAtual.id}`" class="font-medium underline">Editar template</NuxtLink>
              </p>
            </div>

            <ClientesClientePicker v-model="clienteId" />

            <div>
              <label class="mb-1 block text-sm font-medium text-shift3-text">Período *</label>
              <div class="flex gap-2">
                <select
                  v-model="tipoPeriodo"
                  class="w-32 rounded-default border border-shift3-input-border bg-shift3-input px-3 py-2 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20"
                >
                  <option value="mensal">Mensal</option>
                  <option value="anual">Anual</option>
                </select>
                <input
                  v-if="tipoPeriodo === 'mensal'"
                  v-model="mes"
                  type="month"
                  class="min-w-0 flex-1 rounded-default border border-shift3-input-border bg-shift3-input px-3 py-2 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20"
                />
                <input
                  v-else
                  v-model="ano"
                  type="number"
                  min="1900"
                  max="2999"
                  placeholder="2026"
                  class="min-w-0 flex-1 rounded-default border border-shift3-input-border bg-shift3-input px-3 py-2 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20"
                />
              </div>
              <p class="mt-1 text-xs text-shift3-text-muted">
                Importar de novo o mesmo cliente e período substitui os dados anteriores. Use “Anual” pra arquivo com
                uma aba por mês.
              </p>
            </div>
          </div>

          <BaseUpload
            v-model="arquivos"
            :multiple="false"
            accept=".pdf,image/*,.xlsx,.xls,.csv"
            :max-size-mb="20"
            hint="Planilha (XLSX/CSV), PDF ou foto — até 20 MB"
          />
        </section>

        <ClientOnly>
          <Teleport to="#dashboard-footer">
            <div class="border-t border-shift3-border bg-shift3-bg-card px-6 py-4">
              <div class="mx-auto flex max-w-5xl items-center gap-3">
                <BaseButton
                  type="button"
                  variant="primary"
                  :icon-left="ehPlanilhaAtual ? 'heroicons:table-cells' : 'heroicons:sparkles'"
                  :disabled="!podeProcessar"
                  @click="processar"
                >
                  {{ ehPlanilhaAtual ? 'Ler planilha' : 'Extrair' }}
                </BaseButton>
                <BaseButton type="button" variant="ghost" @click="navigateTo('/importacoes')">Cancelar</BaseButton>
                <!-- diz o que falta — botão desabilitado sem explicação parece defeito -->
                <span v-if="faltando" class="text-xs text-shift3-text-muted">Falta: {{ faltando }}</span>
              </div>
            </div>
          </Teleport>
        </ClientOnly>
      </template>
    </div>

    <!-- ───── Etapa 2: mapeamento de colunas ───── -->
    <div v-else-if="etapa === 'mapeamento'" class="space-y-8">
      <!-- planilha com várias abas: escolhe quais entram (todas com o mesmo layout de colunas) -->
      <section v-if="abas.length > 1" class="space-y-3">
        <div class="flex items-center gap-2 border-b border-shift3-border pb-2">
          <Icon name="heroicons:square-3-stack-3d" class="h-5 w-5 text-shift3-teal" />
          <p class="text-base font-semibold text-shift3-text">Abas da planilha</p>
        </div>
        <p class="text-sm text-shift3-text-secondary">
          Marque as abas que entram na importação — o mesmo mapeamento vale pra todas, e cada linha guarda o nome da
          aba de onde veio.
        </p>
        <div class="flex flex-wrap gap-2">
          <label
            v-for="aba in abas"
            :key="aba.nome"
            class="flex cursor-pointer items-center gap-2 rounded-default border border-shift3-border px-3 py-2 text-sm text-shift3-text"
            :class="abasSelecionadas.includes(aba.nome) ? 'bg-shift3-sidebar-active/40' : 'bg-shift3-bg-card'"
          >
            <input v-model="abasSelecionadas" type="checkbox" :value="aba.nome" class="h-4 w-4 accent-shift3-green" />
            {{ aba.nome }}
            <span class="text-xs text-shift3-text-muted">{{ aba.linhas.length }}</span>
          </label>
        </div>
      </section>

      <PedidosMapeamentoColunas
        v-model="mapeamentoColunas"
        :colunas="colunasArquivo"
        :linhas="linhasArquivo"
        :campos-alvo="camposAlvo"
      />

      <ClientOnly>
        <Teleport to="#dashboard-footer">
          <div class="border-t border-shift3-border bg-shift3-bg-card px-6 py-4">
            <div class="mx-auto flex max-w-5xl items-center gap-3">
              <BaseButton
                type="button"
                variant="primary"
                icon-left="heroicons:check"
                :disabled="!podeConfirmarMapeamento"
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

    <!-- ───── Etapa 3: revisão ───── -->
    <div v-else class="space-y-8">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="text-lg font-semibold text-shift3-text">Revisar dados</p>
          <p class="text-sm text-shift3-text-secondary">
            {{ modeloAtual?.nome }} · {{ clienteSelecionado?.nome }} · {{ formatarPeriodo(periodo) }} ·
            {{ linhas.length.toLocaleString('pt-BR') }} linha(s)
          </p>
        </div>
        <BasePesquisa v-if="linhas.length > POR_PAGINA" v-model="busca" placeholder="Buscar nas linhas…" class="max-w-xs" />
      </div>

      <!-- Campos do cabeçalho do template (preenchidos pela IA em foto/PDF; à mão em planilha) -->
      <section v-if="modeloAtual?.schema.campos.length" class="space-y-4">
        <div class="flex items-center gap-2 border-b border-shift3-border pb-2">
          <Icon name="heroicons:document-text" class="h-5 w-5 text-shift3-teal" />
          <p class="text-base font-semibold text-shift3-text">Dados do documento</p>
        </div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <BaseInput
            v-for="campo in modeloAtual.schema.campos"
            :key="campo.id"
            :model-value="exibirValor(cabecalho[campo.id])"
            :label="campo.nome"
            @update:model-value="(v) => (cabecalho[campo.id] = converterValor(v, campo.tipo))"
          />
        </div>
      </section>

      <!-- Aviso de problemas -->
      <div
        v-if="totalProblemas"
        class="flex flex-wrap items-center gap-3 rounded-medium border border-danger/40 bg-danger/10 px-4 py-3"
      >
        <Icon name="heroicons:exclamation-triangle" class="h-5 w-5 shrink-0 text-danger" />
        <p class="min-w-0 flex-1 text-sm text-shift3-text">
          {{ linhasComProblema.size }} linha(s) com valor inválido ou obrigatório em branco (células em vermelho).
          Corrija ou remova antes de salvar — é comum em linha de total ou de título no meio da planilha.
        </p>
        <BaseButton variant="secondary" size="sm" @click="soProblemas = !soProblemas">
          {{ soProblemas ? 'Mostrar todas' : 'Ver só as com problema' }}
        </BaseButton>
        <BaseButton variant="ghost" size="sm" icon-left="heroicons:trash" class="text-danger" @click="removerComProblema">
          Remover essas linhas
        </BaseButton>
      </div>

      <!-- Tabela editável -->
      <section class="overflow-x-auto rounded-medium border border-shift3-border">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="border-b border-shift3-border bg-shift3-bg-light text-left text-xs uppercase tracking-wide text-shift3-text-muted">
              <th class="w-10 px-3 py-2 font-semibold">#</th>
              <th v-if="temAba" class="whitespace-nowrap px-3 py-2 font-semibold">Aba</th>
              <th v-for="campo in campos" :key="campo.id" class="whitespace-nowrap px-3 py-2 font-semibold">
                {{ campo.nome }}<span v-if="campo.obrigatorio" class="text-danger"> *</span>
              </th>
              <th class="w-10 px-3 py-2" />
            </tr>
          </thead>
          <tbody class="divide-y divide-shift3-border/60">
            <tr v-for="{ linha, indice } in pagina" :key="indice">
              <td class="px-3 py-1.5 text-xs tabular-nums text-shift3-text-muted">{{ indice + 1 }}</td>
              <td v-if="temAba" class="whitespace-nowrap px-3 py-1.5 text-shift3-text-secondary">{{ linha.aba || '—' }}</td>
              <td v-for="campo in campos" :key="campo.id" class="px-1.5 py-1">
                <input
                  :value="exibirValor(linha.dados[campo.id])"
                  :title="problemaDaCelula(linha.dados[campo.id], campo) ?? undefined"
                  class="w-full min-w-[7rem] rounded-default border bg-transparent px-2 py-1 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:bg-shift3-input"
                  :class="[
                    problemaDaCelula(linha.dados[campo.id], campo) ? 'border-danger bg-danger/10' : 'border-transparent hover:border-shift3-input-border',
                    campo.tipo === 'numero' || campo.tipo === 'moeda' ? 'text-right tabular-nums' : ''
                  ]"
                  @change="(e) => (linha.dados[campo.id] = converterValor((e.target as HTMLInputElement).value, campo.tipo))"
                />
              </td>
              <td class="px-1.5 py-1 text-right">
                <button
                  type="button"
                  aria-label="Remover linha"
                  class="rounded-default p-1 text-shift3-text-muted transition hover:bg-danger/10 hover:text-danger"
                  @click="linhas.splice(indice, 1)"
                >
                  <Icon name="heroicons:x-mark" class="h-4 w-4" />
                </button>
              </td>
            </tr>
            <tr v-if="!pagina.length">
              <td :colspan="campos.length + 3" class="px-3 py-8 text-center text-sm text-shift3-text-muted">
                Nenhuma linha {{ linhas.length ? 'nesse filtro' : 'pra importar' }}.
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <div v-if="totalPaginas > 1" class="flex items-center justify-end gap-3 text-sm text-shift3-text-secondary">
        <BaseButton variant="ghost" size="sm" icon-left="heroicons:chevron-left" :disabled="paginaAtual === 0" @click="paginaAtual--" />
        Página {{ paginaAtual + 1 }} de {{ totalPaginas }}
        <BaseButton
          variant="ghost"
          size="sm"
          icon-left="heroicons:chevron-right"
          :disabled="paginaAtual >= totalPaginas - 1"
          @click="paginaAtual++"
        />
      </div>

      <ClientOnly>
        <Teleport to="#dashboard-footer">
          <div class="border-t border-shift3-border bg-shift3-bg-card px-6 py-4">
            <div class="mx-auto flex max-w-5xl items-center gap-3">
              <BaseButton
                type="button"
                variant="primary"
                icon-left="heroicons:check"
                :loading="salvando"
                :disabled="!linhas.length || !!totalProblemas"
                @click="salvar"
              >
                Salvar importação
              </BaseButton>
              <BaseButton type="button" variant="ghost" @click="etapa = colunasArquivo.length ? 'mapeamento' : 'upload'">
                Voltar
              </BaseButton>
            </div>
          </div>
        </Teleport>
      </ClientOnly>
    </div>

    <BaseConfirmDialog
      v-model="confirmandoSubstituir"
      title="Substituir importação anterior?"
      :message="mensagemSubstituir"
      confirm-label="Substituir"
      :loading="salvando"
      @confirm="gravar"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import type { UploadFile } from '~/composables/useUpload'
import { lerPlanilhaAbas } from '~/composables/useImportarPlanilha'
import type { AbaLida } from '~/composables/useImportarPlanilha'
import { converterLinhas, converterValor, exibirValor, formatarPeriodo, problemaDaCelula } from '~/types/importacao'
import type { Importacao, LinhaImportacao } from '~/types/importacao'
import { destinoDoModelo } from '~/types/modelo'
import { aplicarMapeamento, sugerirMapeamentoColunas } from '~/types/pedido'
import type { CampoAlvo } from '~/types/pedido'

definePageMeta({ layout: 'dashboard', title: 'Nova importação', backTo: '/importacoes' })

const POR_PAGINA = 50
const ETAPAS_LABEL = ['Arquivo', 'Mapeamento de colunas', 'Revisão']

const modelos = useModelos()
const clientes = useClientes()
const { extrair: extrairArquivo } = useExtracao()
const { salvar: salvarImportacao, buscarExistente } = useImportacoes()
const toast = useToast()

onMounted(() => {
  modelos.carregar()
  clientes.carregar()
})

const etapa = ref<'upload' | 'mapeamento' | 'revisao'>('upload')
const indiceEtapa = computed(() => ({ upload: 0, mapeamento: 1, revisao: 2 })[etapa.value])

// --- etapa 1 ---
const modeloId = ref<string | null>(null)
const clienteId = ref<string | null>(null)
const tipoPeriodo = ref<'mensal' | 'anual'>('mensal')
const mes = ref('')
const ano = ref('')
const arquivos = ref<UploadFile[]>([])
const lendo = ref(false)

const modelosDados = computed(() => modelos.itens.value.filter((m) => m.ativo && destinoDoModelo(m) === 'dados'))
const modeloAtual = computed(() => modelos.itens.value.find((m) => m.id === modeloId.value) ?? null)
const clienteSelecionado = computed(() => clientes.itens.value.find((c) => c.id === clienteId.value) ?? null)
/** Colunas do conjunto de dados = campos de item do template. */
const campos = computed(() => modeloAtual.value?.schema.campos_item ?? [])
const camposAlvo = computed<CampoAlvo[]>(() => campos.value.map((c) => ({ id: c.id, nome: c.nome, papel: null })))

/** 'AAAA-MM' ou 'AAAA' — vazio enquanto o período não estiver completo. */
const periodo = computed(() => {
  if (tipoPeriodo.value === 'mensal') return /^\d{4}-\d{2}$/.test(mes.value) ? mes.value : ''
  return /^\d{4}$/.test(String(ano.value)) ? String(ano.value) : ''
})

const EXTENSOES_PLANILHA = ['xlsx', 'xls', 'csv']
const ehPlanilhaAtual = computed(() => {
  const ext = arquivos.value[0]?.file.name.split('.').pop()?.toLowerCase() ?? ''
  return EXTENSOES_PLANILHA.includes(ext)
})

/** O que ainda falta preencher pra liberar o botão (vazio = tudo certo). */
const faltando = computed(() =>
  [
    !modeloId.value && 'template',
    modeloId.value && !campos.value.length && 'colunas no template',
    !clienteId.value && 'cliente',
    !periodo.value && 'período',
    !arquivos.value.length && 'arquivo'
  ]
    .filter(Boolean)
    .join(', ')
)
const podeProcessar = computed(() => !faltando.value)

// --- etapa 2 ---
const abas = ref<AbaLida[]>([])
const abasSelecionadas = ref<string[]>([])
/** Linhas vindas da IA (foto/PDF) — sem aba. */
const colunasIa = ref<string[]>([])
const linhasIa = ref<Record<string, unknown>[]>([])
const extracaoId = ref<string | null>(null)
const mapeamentoColunas = ref<Record<string, string | null>>({})

const abasAtivas = computed(() => abas.value.filter((a) => abasSelecionadas.value.includes(a.nome)))

/** União das colunas das abas marcadas, na ordem em que aparecem. */
const colunasArquivo = computed(() => {
  if (!abas.value.length) return colunasIa.value
  const vistas = new Set<string>()
  for (const aba of abasAtivas.value) for (const col of aba.colunas) vistas.add(col)
  return [...vistas]
})
const linhasArquivo = computed(() => (abas.value.length ? abasAtivas.value.flatMap((a) => a.linhas) : linhasIa.value))
/** Aba de cada linha de `linhasArquivo` (mesma ordem) — só guarda quando o arquivo tem mais de uma. */
const abaDeCadaLinha = computed<(string | null)[]>(() =>
  abas.value.length > 1 ? abasAtivas.value.flatMap((a) => a.linhas.map(() => a.nome)) : linhasArquivo.value.map(() => null)
)

const podeConfirmarMapeamento = computed(
  () => linhasArquivo.value.length > 0 && Object.values(mapeamentoColunas.value).some(Boolean)
)

// --- etapa 3 ---
const cabecalho = reactive<Record<string, unknown>>({})
const linhas = ref<LinhaImportacao[]>([])
const busca = ref('')
const soProblemas = ref(false)
const paginaAtual = ref(0)
const salvando = ref(false)

const temAba = computed(() => linhas.value.some((l) => l.aba))

function linhaTemProblema(linha: LinhaImportacao) {
  return campos.value.some((campo) => problemaDaCelula(linha.dados[campo.id], campo))
}
const linhasComProblema = computed(() => new Set(linhas.value.filter(linhaTemProblema)))
const totalProblemas = computed(() => linhasComProblema.value.size)

const filtradas = computed(() => {
  const termo = busca.value.trim().toLowerCase()
  return linhas.value
    .map((linha, indice) => ({ linha, indice }))
    .filter(({ linha }) => !soProblemas.value || linhasComProblema.value.has(linha))
    .filter(
      ({ linha }) => !termo || Object.values(linha.dados).some((v) => exibirValor(v).toLowerCase().includes(termo))
    )
})
const totalPaginas = computed(() => Math.max(1, Math.ceil(filtradas.value.length / POR_PAGINA)))
const pagina = computed(() =>
  filtradas.value.slice(paginaAtual.value * POR_PAGINA, (paginaAtual.value + 1) * POR_PAGINA)
)
// filtro mudou ou linhas saíram: não deixa a página atual passar do fim
watch([busca, soProblemas, totalPaginas], () => {
  if (paginaAtual.value > totalPaginas.value - 1) paginaAtual.value = totalPaginas.value - 1
})
watch(totalProblemas, (n) => {
  if (!n) soProblemas.value = false
})

async function processar() {
  const arquivo = arquivos.value[0]?.file
  if (!arquivo || !podeProcessar.value || !modeloId.value) return

  lendo.value = true
  try {
    for (const chave of Object.keys(cabecalho)) delete cabecalho[chave]

    if (ehPlanilhaAtual.value) {
      const lidas = await lerPlanilhaAbas(arquivo)
      if (!lidas.length) {
        toast.error('Não encontrei dados nessa planilha — confira se a primeira linha tem os cabeçalhos das colunas.')
        return
      }
      abas.value = lidas
      abasSelecionadas.value = lidas.map((a) => a.nome)
      extracaoId.value = null
    } else {
      const resposta = await extrairArquivo(arquivo, modeloId.value)
      if (resposta.reaproveitado) toast.info('Esse arquivo já tinha sido extraído antes — reaproveitando o resultado.')
      if (!resposta.dadosExtraidos.linhas?.length) {
        toast.error('A extração não encontrou nenhuma tabela nesse documento.')
        return
      }
      abas.value = []
      colunasIa.value = resposta.dadosExtraidos.colunasItem ?? []
      linhasIa.value = resposta.dadosExtraidos.linhas
      extracaoId.value = resposta.extracaoId
      for (const campo of modeloAtual.value?.schema.campos ?? []) {
        cabecalho[campo.id] = converterValor(resposta.dadosExtraidos.campos?.[campo.id], campo.tipo)
      }
    }

    mapeamentoColunas.value = sugerirMapeamentoColunas(colunasArquivo.value, camposAlvo.value)
    etapa.value = 'mapeamento'
  } catch (e) {
    const erro = e as any
    toast.error(erro?.data?.statusMessage || erro?.message || 'Não foi possível ler esse arquivo')
  } finally {
    lendo.value = false
  }
}

function confirmarMapeamento() {
  const mapeadas = aplicarMapeamento(linhasArquivo.value, mapeamentoColunas.value)
  linhas.value = converterLinhas(mapeadas, abaDeCadaLinha.value, campos.value)
  busca.value = ''
  soProblemas.value = false
  paginaAtual.value = 0
  etapa.value = 'revisao'
}

function removerComProblema() {
  linhas.value = linhas.value.filter((l) => !linhaTemProblema(l))
}

// --- salvar (substitui a importação do mesmo template + cliente + período) ---
const existente = ref<Importacao | null>(null)
const confirmandoSubstituir = ref(false)
const mensagemSubstituir = computed(() => {
  const e = existente.value
  if (!e) return ''
  return `Já existe uma importação de ${e.clientes?.nome ?? 'esse cliente'} em ${formatarPeriodo(e.periodo)} (${e.total_linhas} linha(s), de ${new Date(e.criado_em).toLocaleDateString('pt-BR')}). Ela será apagada e trocada por esta.`
})

async function salvar() {
  if (!modeloId.value || !clienteId.value || !periodo.value) return
  salvando.value = true
  try {
    existente.value = await buscarExistente(modeloId.value, clienteId.value, periodo.value)
  } catch {
    toast.error('Não foi possível conferir se já existe importação desse período')
    return
  } finally {
    salvando.value = false
  }
  if (existente.value) confirmandoSubstituir.value = true
  else await gravar()
}

async function gravar() {
  if (!modeloId.value || !clienteId.value || !periodo.value) return
  salvando.value = true
  try {
    await salvarImportacao({
      modelo_id: modeloId.value,
      cliente_id: clienteId.value,
      periodo: periodo.value,
      arquivo_nome: arquivos.value[0]?.file.name ?? null,
      extracao_id: extracaoId.value,
      cabecalho: { ...cabecalho },
      linhas: linhas.value
    })
    confirmandoSubstituir.value = false
    toast.success('Importação salva')
    await navigateTo('/importacoes')
  } catch (e) {
    const erro = e as any
    toast.error(erro?.message || 'Não foi possível salvar a importação')
  } finally {
    salvando.value = false
  }
}
</script>
