<template>
  <ClientOnly>
    <Teleport to="body">
      <!-- fundo escurece e o painel desliza da direita; ao fechar, faz o caminho inverso -->
      <Transition name="painel" appear :duration="300" @after-leave="aoSair">
      <div v-if="aberto" class="fixed inset-0 z-[90] flex justify-end bg-black/50" @click.self="fechar">
        <!-- painel vertical à direita -->
        <aside class="flex h-full w-full max-w-md flex-col border-l border-shift3-border bg-shift3-bg-card shadow-xl">
          <div class="flex items-start justify-between gap-4 border-b border-shift3-border px-5 py-4">
            <div>
              <h3>Edição em massa</h3>
              <p class="mt-1 text-sm text-shift3-text-secondary">
                {{ ids.length }} {{ ids.length === 1 ? 'produto selecionado' : 'produtos selecionados' }}. Marque os campos que quer
                alterar — os outros ficam como estão. Marcado e vazio apaga o valor.
              </p>
            </div>
            <button type="button" class="text-shift3-text-muted hover:text-shift3-text" aria-label="Fechar" @click="fechar">
              <Icon name="heroicons:x-mark" class="h-5 w-5" />
            </button>
          </div>

          <div class="flex-1 space-y-6 overflow-y-auto px-5 py-5">
            <!-- ───── Classificação ───── -->
            <section class="space-y-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Classificação</p>

              <div>
                <label class="mb-1 flex items-center gap-2">
                  <input v-model="alterar.grupo_id" type="checkbox" class="h-4 w-4 accent-shift3-green" />
                  Grupo
                </label>
                <BaseBuscaOuCria
                  v-model="valores.grupo_id"
                  placeholder="Buscar grupo ou digitar pra criar…"
                  :itens="grupos.itens.value"
                  :carregando="grupos.carregando.value"
                  :disabled="!alterar.grupo_id"
                  :ao-criar="(nome) => grupos.criar(nome)"
                />
              </div>

              <div>
                <label class="mb-1 flex items-center gap-2" :class="{ 'opacity-50': !alterar.grupo_id }">
                  <input
                    v-model="alterar.subgrupo_id"
                    type="checkbox"
                    class="h-4 w-4 accent-shift3-green"
                    :disabled="!alterar.grupo_id"
                  />
                  Subgrupo
                </label>
                <BaseBuscaOuCria
                  v-model="valores.subgrupo_id"
                  :placeholder="valores.grupo_id ? 'Buscar subgrupo ou digitar pra criar…' : 'Escolha o grupo primeiro'"
                  :itens="subgrupos.doGrupo(valores.grupo_id)"
                  :carregando="subgrupos.carregando.value"
                  :disabled="!alterar.subgrupo_id || !valores.grupo_id"
                  :ao-criar="(nome) => subgrupos.criar(nome, valores.grupo_id!)"
                />
                <p class="mt-1 text-xs text-shift3-text-muted">
                  Só muda junto com o Grupo. Alterar o Grupo sem escolher subgrupo limpa o subgrupo.
                </p>
              </div>

              <div v-for="c in CAMPOS_APOIO" :key="c.campo">
                <label class="mb-1 flex items-center gap-2">
                  <input v-model="alterar[c.campo]" type="checkbox" class="h-4 w-4 accent-shift3-green" />
                  {{ c.label }}
                </label>
                <BaseBuscaOuCria
                  v-model="valores[c.campo]"
                  :placeholder="`Buscar ${c.label.toLowerCase()} ou digitar pra criar…`"
                  :itens="c.fonte.itens.value"
                  :carregando="c.fonte.carregando.value"
                  :disabled="!alterar[c.campo]"
                  :ao-criar="(nome) => c.fonte.criar(nome)"
                />
              </div>

              <div>
                <label class="mb-1 flex items-center gap-2">
                  <input v-model="alterar.modelo" type="checkbox" class="h-4 w-4 accent-shift3-green" />
                  Modelo
                </label>
                <BaseInput v-model="valores.modelo" type="text" icon="heroicons:tag" :disabled="!alterar.modelo" />
              </div>
            </section>

            <!-- ───── Aplicação ───── -->
            <section class="space-y-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Aplicação</p>
              <div>
                <label class="mb-1 flex items-center gap-2">
                  <input v-model="alterar.aplicacao" type="checkbox" class="h-4 w-4 accent-shift3-green" />
                  Aplicação do produto
                </label>
                <BaseTextarea
                  v-model="valores.aplicacao"
                  placeholder="Veículos, modelos e anos em que o produto é usado"
                  :rows="3"
                  :disabled="!alterar.aplicacao"
                />
              </div>
            </section>

            <!-- ───── Medidas e embalagem ───── -->
            <section class="space-y-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Medidas e embalagem</p>
              <div class="grid grid-cols-2 gap-3">
                <div v-for="c in CAMPOS_NUMERO_MEDIDAS" :key="c.campo">
                  <label class="mb-1 flex items-center gap-2">
                    <input v-model="alterar[c.campo]" type="checkbox" class="h-4 w-4 accent-shift3-green" />
                    {{ c.label }}
                  </label>
                  <BaseInput
                    v-model="valores[c.campo]"
                    type="text"
                    inputmode="decimal"
                    :placeholder="c.placeholder"
                    :disabled="!alterar[c.campo]"
                    :error="erros[c.campo]"
                  />
                </div>
                <div>
                  <label class="mb-1 flex items-center gap-2">
                    <input v-model="alterar.unidade" type="checkbox" class="h-4 w-4 accent-shift3-green" />
                    Unidade
                  </label>
                  <BaseInput
                    v-model="valores.unidade"
                    type="text"
                    placeholder="UN, CX, KG…"
                    :disabled="!alterar.unidade"
                    :error="erros.unidade"
                  />
                </div>
              </div>
            </section>

            <!-- ───── Fiscal ───── -->
            <section class="space-y-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Fiscal</p>
              <div>
                <label class="mb-1 flex items-center gap-2">
                  <input v-model="alterar.origem" type="checkbox" class="h-4 w-4 accent-shift3-green" />
                  Origem
                </label>
                <select
                  v-model="valores.origem"
                  :disabled="!alterar.origem"
                  class="w-full rounded-default border border-shift3-input-border bg-shift3-input px-3 py-2 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20 disabled:cursor-not-allowed disabled:bg-shift3-border/30 disabled:text-shift3-text-muted"
                >
                  <option :value="null">Não informada</option>
                  <option v-for="o in ORIGENS_PRODUTO" :key="o.valor" :value="o.valor">{{ o.label }}</option>
                </select>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="mb-1 flex items-center gap-2">
                    <input v-model="alterar.ncm" type="checkbox" class="h-4 w-4 accent-shift3-green" />
                    NCM
                  </label>
                  <BaseInput v-model="valores.ncm" type="text" placeholder="0000.00.00" :disabled="!alterar.ncm" />
                </div>
                <div>
                  <label class="mb-1 flex items-center gap-2">
                    <input v-model="alterar.ipi" type="checkbox" class="h-4 w-4 accent-shift3-green" />
                    % IPI
                  </label>
                  <BaseInput
                    v-model="valores.ipi"
                    type="text"
                    inputmode="decimal"
                    placeholder="0,00"
                    :disabled="!alterar.ipi"
                    :error="erros.ipi"
                  />
                </div>
              </div>
            </section>

            <!-- ───── Situação ───── -->
            <section class="space-y-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Situação</p>
              <div class="flex items-center gap-4">
                <label class="flex items-center gap-2">
                  <input v-model="alterar.ativo" type="checkbox" class="h-4 w-4 accent-shift3-green" />
                  Alterar situação
                </label>
                <BaseSwitch
                  v-if="alterar.ativo"
                  v-model="valores.ativo"
                  :label="valores.ativo ? 'Ativo' : 'Inativo'"
                />
              </div>
            </section>
          </div>

          <div class="flex items-center justify-between gap-3 border-t border-shift3-border px-5 py-4">
            <p class="text-xs text-shift3-text-muted">
              {{ qtdMarcados }} {{ qtdMarcados === 1 ? 'campo marcado' : 'campos marcados' }}
            </p>
            <div class="flex gap-2">
              <BaseButton variant="ghost" @click="fechar">Cancelar</BaseButton>
              <BaseButton variant="primary" icon-left="heroicons:check" :disabled="!qtdMarcados" @click="pedirConfirmacao">
                Aplicar
              </BaseButton>
            </div>
          </div>
        </aside>
      </div>
      </Transition>

      <BaseConfirmDialog
        v-model="confirmando"
        title="Aplicar edição em massa"
        :message="`Alterar ${qtdMarcados} ${qtdMarcados === 1 ? 'campo' : 'campos'} em ${ids.length} ${ids.length === 1 ? 'produto' : 'produtos'}? Não dá pra desfazer.`"
        confirm-label="Aplicar"
        :loading="salvando"
        @confirm="aplicar"
      />
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ORIGENS_PRODUTO, type ProdutoInput } from '~/types/produto'

const props = defineProps<{ ids: string[] }>()
const emit = defineEmits<{ fechar: []; aplicado: [] }>()

const { atualizarEmMassa } = useProdutos()
const toast = useToast()
const marcas = useMarcas()
const fabricantes = useFabricantes()
const montadoras = useMontadoras()
const grupos = useGrupos()
const subgrupos = useSubgrupos()
onMounted(() => {
  marcas.carregar()
  fabricantes.carregar()
  montadoras.carregar()
  grupos.carregar()
  subgrupos.carregar()
})

const CAMPOS_APOIO = [
  { campo: 'marca_id', label: 'Marca', fonte: marcas },
  { campo: 'fabricante_id', label: 'Fabricante', fonte: fabricantes },
  { campo: 'montadora_id', label: 'Montadora', fonte: montadoras }
] as const

const CAMPOS_NUMERO_MEDIDAS = [
  { campo: 'peso', label: 'Peso (kg)', placeholder: '0,000' },
  { campo: 'altura', label: 'Altura (cm)', placeholder: '0,00' },
  { campo: 'largura', label: 'Largura (cm)', placeholder: '0,00' },
  { campo: 'comprimento', label: 'Comprimento (cm)', placeholder: '0,00' },
  { campo: 'caixa_master', label: 'Caixa master', placeholder: 'Unid. por caixa' },
  { campo: 'qtd_minima_venda', label: 'Qtd. mínima', placeholder: '1' }
] as const

const CAMPOS_NUMERICOS = ['peso', 'altura', 'largura', 'comprimento', 'caixa_master', 'qtd_minima_venda', 'ipi'] as const
const CAMPOS_TEXTO = ['modelo', 'aplicacao', 'ncm'] as const

const alterar = reactive({
  grupo_id: false,
  subgrupo_id: false,
  marca_id: false,
  fabricante_id: false,
  montadora_id: false,
  modelo: false,
  aplicacao: false,
  peso: false,
  altura: false,
  largura: false,
  comprimento: false,
  unidade: false,
  caixa_master: false,
  qtd_minima_venda: false,
  origem: false,
  ncm: false,
  ipi: false,
  ativo: false
})

const valores = reactive({
  grupo_id: null as string | null,
  subgrupo_id: null as string | null,
  marca_id: null as string | null,
  fabricante_id: null as string | null,
  montadora_id: null as string | null,
  modelo: '',
  aplicacao: '',
  peso: '',
  altura: '',
  largura: '',
  comprimento: '',
  unidade: 'UN',
  caixa_master: '',
  qtd_minima_venda: '',
  origem: null as number | null,
  ncm: '',
  ipi: '',
  ativo: true
})

// subgrupo depende do grupo escolhido aqui
watch(
  () => valores.grupo_id,
  () => {
    valores.subgrupo_id = null
  }
)
watch(
  () => alterar.grupo_id,
  (sim) => {
    if (!sim) alterar.subgrupo_id = false
  }
)

const qtdMarcados = computed(() => Object.values(alterar).filter(Boolean).length)

const erros = reactive<Partial<Record<(typeof CAMPOS_NUMERICOS)[number] | 'unidade', string>>>({})

/** Monta o que vai pro banco — só os campos marcados. `null` se algo estiver inválido. */
function montarDados(): Partial<ProdutoInput> | null {
  for (const k of Object.keys(erros)) delete erros[k as keyof typeof erros]
  const dados: Record<string, unknown> = {}

  for (const campo of ['grupo_id', 'marca_id', 'fabricante_id', 'montadora_id'] as const) {
    if (alterar[campo]) dados[campo] = valores[campo]
  }
  if (alterar.grupo_id) dados.subgrupo_id = alterar.subgrupo_id ? valores.subgrupo_id : null

  for (const campo of CAMPOS_TEXTO) {
    if (alterar[campo]) dados[campo] = valores[campo].trim() || null
  }
  for (const campo of CAMPOS_NUMERICOS) {
    if (!alterar[campo]) continue
    const n = textoParaNumero(valores[campo])
    if (Number.isNaN(n)) erros[campo] = 'Número inválido'
    else if (campo === 'ipi' && n !== null && n > 100) erros[campo] = 'No máximo 100'
    else dados[campo] = n
  }
  if (alterar.unidade) {
    if (!valores.unidade.trim()) erros.unidade = 'Informe a unidade'
    else dados.unidade = valores.unidade.trim()
  }
  if (alterar.origem) dados.origem = valores.origem
  if (alterar.ativo) dados.ativo = valores.ativo

  return Object.keys(erros).length ? null : (dados as Partial<ProdutoInput>)
}

const confirmando = ref(false)
const salvando = ref(false)

function pedirConfirmacao() {
  if (!montarDados()) {
    toast.error('Corrija os campos marcados em vermelho')
    return
  }
  confirmando.value = true
}

async function aplicar() {
  const dados = montarDados()
  if (!dados) return
  salvando.value = true
  try {
    const alterados = await atualizarEmMassa(props.ids, dados)
    if (alterados < props.ids.length) {
      toast.warning(`${alterados} de ${props.ids.length} produtos alterados — os outros foram barrados pela permissão`)
    } else {
      toast.success(`${alterados} ${alterados === 1 ? 'produto alterado' : 'produtos alterados'}`)
    }
    confirmando.value = false
    sair('aplicado')
  } catch (erro: any) {
    console.error('Erro na edição em massa:', erro)
    toast.error(erro?.message || 'Não foi possível aplicar a edição em massa')
  } finally {
    salvando.value = false
  }
}

/** Começa aberto: a animação de entrada roda ao montar (`appear`). */
const aberto = ref(true)
let saida: 'fechar' | 'aplicado' = 'fechar'

/** Fecha com a animação e só avisa o pai no fim dela (o pai desmonta o componente). */
function sair(motivo: 'fechar' | 'aplicado') {
  saida = motivo
  aberto.value = false
}

function aoSair() {
  if (saida === 'aplicado') emit('aplicado')
  else emit('fechar')
}

function fechar() {
  if (salvando.value) return
  sair('fechar')
}
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
