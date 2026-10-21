<template>
  <ClientOnly>
    <Teleport to="body">
      <div class="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/50 p-4" @click.self="fechar">
        <div class="my-6 w-full max-w-3xl rounded-medium border border-shift3-border bg-shift3-bg-card shadow-xl">
          <div class="flex items-start justify-between gap-4 border-b border-shift3-border px-5 py-4">
            <div>
              <h3>Importar preços</h3>
              <p class="mt-1 text-sm text-shift3-text-secondary">
                Baixe o modelo com os SKUs e o preço atual de cada tabela, altere o que mudou e importe.
                Preço do mesmo mês é substituído; meses diferentes ficam no histórico.
              </p>
            </div>
            <button
              type="button"
              class="text-shift3-text-muted hover:text-shift3-text disabled:opacity-40"
              aria-label="Fechar"
              :disabled="etapa === 'gravando'"
              @click="fechar"
            >
              <Icon name="heroicons:x-mark" class="h-5 w-5" />
            </button>
          </div>

          <!-- ───── 1. Modelo + 2. Arquivo ───── -->
          <div v-if="etapa === 'inicio'" class="space-y-4 px-5 py-5">
            <div class="rounded-default border border-shift3-border">
              <button
                type="button"
                class="flex w-full items-start gap-3 p-4 text-left"
                :aria-expanded="modeloAberto"
                @click="alternarModelo"
              >
                <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-shift3-bg-light text-sm font-semibold">1</span>
                <span class="min-w-0 flex-1">
                  <span class="block font-semibold text-shift3-text">Baixar o modelo</span>
                  <span class="mt-0.5 block text-sm text-shift3-text-secondary">
                    Escolha a fábrica, o mês e as tabelas. O modelo sai com um SKU por linha, já com o preço atual.
                  </span>
                </span>
                <Icon
                  name="heroicons:chevron-down"
                  class="mt-1 h-5 w-5 shrink-0 text-shift3-text-muted transition-transform duration-300"
                  :class="modeloAberto && 'rotate-180'"
                />
              </button>

              <!-- altura animada com grid-rows 0fr ↔ 1fr; o corte só vale durante a animação,
                   senão as listas suspensas (fábrica, tabelas) ficariam cortadas -->
              <div
                class="grid transition-[grid-template-rows] duration-300 ease-in-out"
                :class="modeloAberto ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
                @transitionend.self="modeloAssentado = modeloAberto"
              >
              <div class="min-h-0" :class="!modeloAssentado && 'overflow-hidden'" :inert="!modeloAberto">
              <div class="space-y-4 px-4 pb-4 transition-opacity duration-300" :class="modeloAberto ? 'opacity-100' : 'opacity-0'">
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <BaseBuscaOuCria
                    v-model="modelo.fabricaId"
                    label="Fábrica *"
                    placeholder="Buscar fábrica…"
                    :itens="fabricas.itens.value"
                    :carregando="fabricas.carregando.value"
                    :ao-criar="(nome) => fabricas.criar(nome)"
                  />
                  <div>
                    <label class="mb-2 block text-sm font-medium text-shift3-text">Mês de competência *</label>
                    <input v-model="modelo.competenciaMes" type="month" :class="classeCampo" />
                  </div>
                </div>

                <TabelaPrecoSeletorTabelas
                  v-model="modelo.tabelaIds"
                  label="Tabelas (uma coluna de preço para cada) *"
                  :itens="referencias.itens.value"
                  :ao-criar="podeCriarTabela ? criarTabela : undefined"
                />

                <div>
                  <p class="mb-2 text-sm font-medium text-shift3-text">Quais produtos</p>
                  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <BaseInput v-model="modelo.filtros.q" placeholder="Buscar por descrição, SKU, OEM…" icon="heroicons:magnifying-glass" />
                    <select v-model="modelo.filtros.grupoId" :class="classeCampo">
                      <option value="">Todos os grupos</option>
                      <option v-for="g in grupos.itens.value" :key="g.id" :value="g.id">{{ g.nome }}</option>
                    </select>
                    <select v-model="modelo.filtros.marcaId" :class="classeCampo">
                      <option value="">Todas as marcas</option>
                      <option v-for="m in marcas.itens.value" :key="m.id" :value="m.id">{{ m.nome }}</option>
                    </select>
                    <select v-model="modelo.filtros.montadoraId" :class="classeCampo">
                      <option value="">Todas as montadoras</option>
                      <option v-for="m in montadoras.itens.value" :key="m.id" :value="m.id">{{ m.nome }}</option>
                    </select>
                  </div>
                  <label class="mt-3 flex cursor-pointer items-center gap-2 text-sm text-shift3-text">
                    <input v-model="modelo.filtros.apenasAtivos" type="checkbox" class="accent-shift3-teal" />
                    Só produtos ativos
                  </label>
                </div>

                <div class="flex justify-end">
                  <BaseButton
                    variant="secondary"
                    icon-left="heroicons:arrow-down-tray"
                    :loading="baixando"
                    :disabled="!podeBaixar"
                    @click="baixarModelo"
                  >
                    Baixar modelo
                  </BaseButton>
                </div>
              </div>
              </div>
              </div>
            </div>

            <div class="flex items-start gap-3 rounded-default border border-shift3-border p-4">
              <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-shift3-bg-light text-sm font-semibold">2</span>
              <div class="min-w-0 flex-1">
                <p class="font-semibold text-shift3-text">Importar a planilha preenchida</p>
                <p class="mt-0.5 text-sm text-shift3-text-secondary">
                  Excel (.xlsx, .xls) ou CSV. Antes de gravar, você confere o que vai ser criado e substituído.
                </p>
              </div>
              <BaseButton variant="primary" icon-left="heroicons:arrow-up-tray" :loading="lendo" @click="inputArquivo?.click()">
                Importar
              </BaseButton>
              <input ref="inputArquivo" type="file" class="hidden" accept=".xlsx,.xls,.csv" @change="escolherArquivo" />
            </div>
          </div>

          <!-- ───── Prévia ───── -->
          <div v-else-if="etapa === 'previa' && plano" class="space-y-4 px-5 py-5">
            <p class="flex items-center gap-2 text-sm text-shift3-text-secondary">
              <Icon name="heroicons:table-cells" class="h-4 w-4" /> {{ nomeArquivo }}
            </p>

            <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div v-for="t in cartoes" :key="t.label" class="rounded-default border border-shift3-border p-3">
                <p class="text-2xl font-semibold tabular-nums" :class="t.cor">{{ t.valor }}</p>
                <p class="text-xs text-shift3-text-muted">{{ t.label }}</p>
              </div>
            </div>

            <div class="space-y-1 text-sm">
              <p>
                <span class="text-shift3-text-muted">Colunas usadas:</span>
                {{ plano.colunasReconhecidas.join(', ') }}
              </p>
              <p v-if="plano.colunasIgnoradas.length" class="text-warning">
                <span class="text-shift3-text-muted">Colunas ignoradas (tabela não cadastrada ou título não reconhecido):</span>
                {{ plano.colunasIgnoradas.join(', ') }}
              </p>
            </div>

            <div v-if="substituicoes.length" class="space-y-2">
              <p class="text-sm font-semibold text-shift3-text">Preços que serão substituídos</p>
              <div class="max-h-56 overflow-y-auto rounded-default border border-shift3-border">
                <table class="min-w-full text-xs">
                  <thead class="sticky top-0 bg-shift3-bg-card">
                    <tr class="border-b border-shift3-border text-left uppercase tracking-wide text-shift3-text-muted">
                      <th class="px-3 py-2 font-semibold">Linha</th>
                      <th class="px-3 py-2 font-semibold">SKU</th>
                      <th class="px-3 py-2 font-semibold">Tabela</th>
                      <th class="px-3 py-2 font-semibold">Mês</th>
                      <th class="px-3 py-2 text-right font-semibold">De</th>
                      <th class="px-3 py-2 text-right font-semibold">Para</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="s in substituicoes.slice(0, 200)" :key="s.chave" class="border-b border-shift3-border/60">
                      <td class="px-3 py-2 tabular-nums">{{ s.numero }}</td>
                      <td class="px-3 py-2">{{ s.sku }}</td>
                      <td class="px-3 py-2">{{ s.tabela }}</td>
                      <td class="px-3 py-2 tabular-nums">{{ s.mes }}</td>
                      <td class="px-3 py-2 text-right tabular-nums text-shift3-text-muted">{{ formatarMoeda(s.de) }}</td>
                      <td class="px-3 py-2 text-right tabular-nums">{{ formatarMoeda(s.para) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p v-if="substituicoes.length > 200" class="text-xs text-shift3-text-muted">
                Mostrando 200 de {{ substituicoes.length }}.
              </p>
            </div>

            <div v-if="linhasComErro.length" class="space-y-2">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm font-semibold text-danger">Linhas com erro (não serão importadas)</p>
                <BaseButton variant="ghost" size="sm" icon-left="heroicons:arrow-down-tray" @click="importador.baixarFalhas(falhasDaPrevia)">
                  Baixar lista
                </BaseButton>
              </div>
              <div class="max-h-56 overflow-y-auto rounded-default border border-shift3-border">
                <table class="min-w-full text-xs">
                  <thead class="sticky top-0 bg-shift3-bg-card">
                    <tr class="border-b border-shift3-border text-left uppercase tracking-wide text-shift3-text-muted">
                      <th class="px-3 py-2 font-semibold">Linha</th>
                      <th class="px-3 py-2 font-semibold">SKU</th>
                      <th class="px-3 py-2 font-semibold">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="l in linhasComErro.slice(0, 200)" :key="l.numero" class="border-b border-shift3-border/60 align-top">
                      <td class="px-3 py-2 tabular-nums">{{ l.numero }}</td>
                      <td class="px-3 py-2">{{ l.sku || '—' }}</td>
                      <td class="px-3 py-2 text-shift3-text-secondary">{{ l.erros.join('; ') }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p v-if="linhasComErro.length > 200" class="text-xs text-shift3-text-muted">
                Mostrando 200 de {{ linhasComErro.length }} — baixe a lista para ver todas.
              </p>
            </div>

            <p v-if="!aGravar" class="rounded-default border border-dashed border-shift3-border px-4 py-4 text-center text-sm text-shift3-text-muted">
              Nenhum preço para gravar.
            </p>
          </div>

          <!-- ───── Gravando ───── -->
          <div v-else-if="etapa === 'gravando'" class="space-y-3 px-5 py-8">
            <p class="text-sm text-shift3-text">Gravando preços… {{ progresso.feitas }} de {{ progresso.total }}</p>
            <BaseProgress :value="progresso.total ? Math.round((progresso.feitas / progresso.total) * 100) : 0" />
            <p class="text-xs text-shift3-text-muted">Não feche esta janela até terminar.</p>
          </div>

          <!-- ───── Resultado ───── -->
          <div v-else-if="etapa === 'fim' && resultado" class="space-y-4 px-5 py-5">
            <div class="flex items-center gap-3">
              <Icon
                :name="resultado.falhas.length ? 'heroicons:exclamation-triangle' : 'heroicons:check-circle'"
                class="h-8 w-8"
                :class="resultado.falhas.length ? 'text-warning' : 'text-success'"
              />
              <p class="text-sm text-shift3-text">
                {{ resultado.criados }} {{ resultado.criados === 1 ? 'preço novo' : 'preços novos' }} e
                {{ resultado.substituidos }} {{ resultado.substituidos === 1 ? 'substituído' : 'substituídos' }}.
                <template v-if="resultado.falhas.length">
                  {{ resultado.falhas.length }} {{ resultado.falhas.length === 1 ? 'linha teve' : 'linhas tiveram' }} preço não gravado.
                </template>
              </p>
            </div>
            <BaseButton
              v-if="resultado.falhas.length"
              variant="secondary"
              size="sm"
              icon-left="heroicons:arrow-down-tray"
              @click="importador.baixarFalhas(resultado.falhas)"
            >
              Baixar as linhas que falharam
            </BaseButton>
          </div>

          <!-- ───── Rodapé ───── -->
          <div v-if="etapa === 'previa' || etapa === 'fim'" class="flex flex-wrap items-center justify-end gap-2 border-t border-shift3-border px-5 py-4">
            <template v-if="etapa === 'previa'">
              <BaseButton variant="ghost" @click="recomecar">Escolher outro arquivo</BaseButton>
              <BaseButton variant="primary" icon-left="heroicons:check" :disabled="!aGravar" @click="importar">
                Gravar {{ aGravar }} {{ aGravar === 1 ? 'preço' : 'preços' }}
              </BaseButton>
            </template>
            <BaseButton v-else variant="primary" @click="fechar">Concluir</BaseButton>
          </div>
        </div>
      </div>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { PlanoImportacaoPrecos } from '~/utils/importacaoPrecos'
import type { FalhaImportacaoPreco, ResultadoImportacaoPrecos } from '~/composables/useImportarPrecos'
import { useAuthStore } from '~/stores/auth'

const emit = defineEmits<{ fechar: []; importado: [] }>()

const importador = useImportarPrecos()
const fabricas = useFabricas()
const referencias = useReferenciasTabela()
const grupos = useGrupos()
const marcas = useMarcas()
const montadoras = useMontadoras()
const auth = useAuthStore()
const toast = useToast()

const classeCampo =
  'w-full rounded-default border border-shift3-input-border bg-shift3-input px-3 py-2 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20'

const etapa = ref<'inicio' | 'previa' | 'gravando' | 'fim'>('inicio')

// ───── Modelo ─────

const modelo = reactive({
  fabricaId: null as string | null,
  competenciaMes: new Date().toLocaleDateString('sv-SE').slice(0, 7),
  tabelaIds: [] as string[],
  filtros: { q: '', grupoId: '', marcaId: '', montadoraId: '', apenasAtivos: true }
})

onMounted(async () => {
  try {
    await Promise.all([fabricas.carregar(), referencias.carregar(), grupos.carregar(), marcas.carregar(), montadoras.carregar()])
    // todas as tabelas marcadas de início
    modelo.tabelaIds = referencias.itens.value.map((r) => r.id)
  } catch (erro) {
    console.error('Erro ao carregar cadastros do modal de preços:', erro)
    toast.error('Não foi possível carregar fábricas e tabelas')
  }
})

// card "Baixar o modelo" começa recolhido; `modeloAssentado` = terminou de abrir (libera o overflow)
const modeloAberto = ref(false)
const modeloAssentado = ref(false)

function alternarModelo() {
  // ao fechar, volta a cortar antes da animação começar
  if (modeloAberto.value) modeloAssentado.value = false
  modeloAberto.value = !modeloAberto.value
}

const podeCriarTabela = computed(() => auth.podeIncluirModulo('tabela_preco') || auth.podeEditarModulo('tabela_preco'))

/** Cria a tabela (ou só marca, se o nome já existe). Erro vira toast; o campo do seletor fica preenchido. */
async function criarTabela(nomeDigitado: string) {
  const nome = nomeDigitado.trim().replace(/\s+/g, ' ')
  if (!nome) return
  const existente = referencias.itens.value.find((r) => chaveNome(r.nome) === chaveNome(nome))
  if (existente) {
    if (!modelo.tabelaIds.includes(existente.id)) modelo.tabelaIds = [...modelo.tabelaIds, existente.id]
    toast.info(`A tabela "${existente.nome}" já existe — foi marcada`)
    return
  }
  try {
    const nova = await referencias.criar(nome)
    modelo.tabelaIds = [...modelo.tabelaIds, nova.id]
    toast.success(`Tabela "${nova.nome}" criada`)
  } catch (erro: any) {
    console.error('Erro ao criar tabela:', erro)
    toast.error(erro?.message || 'Não foi possível criar a tabela')
    throw erro
  }
}

const podeBaixar = computed(() => !!modelo.fabricaId && !!modelo.competenciaMes && modelo.tabelaIds.length > 0)
const baixando = ref(false)

async function baixarModelo() {
  const fabrica = fabricas.porId(modelo.fabricaId!)
  if (!fabrica || !podeBaixar.value) return
  // na ordem da lista (alfabética), não na ordem em que foram marcadas
  const tabelas = referencias.itens.value.filter((r) => modelo.tabelaIds.includes(r.id))
  baixando.value = true
  try {
    const { linhas, semSku } = await importador.baixarModelo({
      fabrica,
      competenciaMes: modelo.competenciaMes,
      tabelas,
      filtros: { ...modelo.filtros }
    })
    if (!linhas) toast.info('Nenhum produto com SKU nesse filtro — o modelo saiu só com os títulos')
    else if (semSku) toast.info(`${semSku} ${semSku === 1 ? 'produto ficou' : 'produtos ficaram'} de fora por não ter SKU`)
  } catch (erro) {
    console.error('Erro ao gerar modelo de preços:', erro)
    toast.error('Não foi possível gerar o modelo')
  } finally {
    baixando.value = false
  }
}

// ───── Arquivo e prévia ─────

const inputArquivo = ref<HTMLInputElement | null>(null)
const lendo = ref(false)
const nomeArquivo = ref('')
const plano = ref<PlanoImportacaoPrecos | null>(null)
const resultado = ref<ResultadoImportacaoPrecos | null>(null)
const progresso = reactive({ feitas: 0, total: 0 })

async function escolherArquivo(e: Event) {
  const el = e.target as HTMLInputElement
  const arquivo = el.files?.[0]
  el.value = '' // permite escolher o mesmo arquivo de novo
  if (!arquivo) return

  lendo.value = true
  try {
    const [planilha, cadastros] = await Promise.all([lerPlanilha(arquivo), importador.carregarCadastros()])
    if (!planilha.linhas.length) {
      toast.error('A planilha está vazia — preencha as linhas abaixo dos títulos')
      return
    }
    const precos = await importador.buscarPrecos(fabricasDaPlanilha(planilha.colunas, planilha.linhas, cadastros.fabricas))
    const novo = planejarImportacaoPrecos(planilha.colunas, planilha.linhas, { ...cadastros, precos }, {
      incluir: auth.podeIncluirModulo('tabela_preco'),
      editar: auth.podeEditarModulo('tabela_preco')
    })
    if (novo.colunasFaltando.length) {
      toast.error(`Faltam colunas na planilha: ${novo.colunasFaltando.join(', ')}`)
      return
    }
    if (!novo.linhas.length) {
      toast.error('Nenhum preço preenchido na planilha')
      return
    }
    plano.value = novo
    nomeArquivo.value = arquivo.name
    etapa.value = 'previa'
  } catch (erro) {
    console.error('Erro ao ler planilha de preços:', erro)
    toast.error('Não foi possível ler o arquivo')
  } finally {
    lendo.value = false
  }
}

const cartoes = computed(() => {
  const t = plano.value?.totais
  if (!t) return []
  return [
    { label: 'Preços novos', valor: t.criar, cor: 'text-success' },
    { label: 'Substituídos', valor: t.substituir, cor: 'text-shift3-teal' },
    { label: 'Iguais ao atual', valor: t.nada, cor: 'text-shift3-text-muted' },
    { label: 'Linhas com erro', valor: t.erro, cor: t.erro ? 'text-danger' : 'text-shift3-text-muted' }
  ]
})

const aGravar = computed(() => (plano.value ? plano.value.totais.criar + plano.value.totais.substituir : 0))

const substituicoes = computed(() =>
  (plano.value?.linhas ?? []).flatMap((l) =>
    l.precos
      .filter((p) => p.acao === 'substituir')
      .map((p) => ({
        chave: `${l.numero}|${p.referenciaId}`,
        numero: l.numero,
        sku: l.sku,
        tabela: p.tabela,
        mes: formatarCompetencia(l.competencia!),
        de: p.valorAnterior ?? 0,
        para: p.valor
      }))
  )
)

const linhasComErro = computed(() => plano.value?.linhas.filter((l) => l.erros.length) ?? [])

const falhasDaPrevia = computed<FalhaImportacaoPreco[]>(() =>
  linhasComErro.value.map((l) => ({ numero: l.numero, sku: l.sku, descricao: l.descricao, motivo: l.erros.join('; ') }))
)

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const formatarMoeda = (v: number) => moeda.format(v)

async function importar() {
  if (!plano.value || !aGravar.value) return
  etapa.value = 'gravando'
  try {
    resultado.value = await importador.gravar(plano.value, (feitas, total) => {
      progresso.feitas = feitas
      progresso.total = total
    })
    etapa.value = 'fim'
    emit('importado')
  } catch (erro: any) {
    console.error('Erro ao importar preços:', erro)
    toast.error(erro?.message || 'Não foi possível importar os preços')
    recomecar()
    emit('importado')
  }
}

function recomecar() {
  plano.value = null
  resultado.value = null
  etapa.value = 'inicio'
}

function fechar() {
  if (etapa.value === 'gravando') return
  emit('fechar')
}
</script>
