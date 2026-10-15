<template>
  <form id="produtos-formulario" @submit.prevent="enviar">
    <!-- Conteúdo centralizado -->
    <div class="mx-auto max-w-3xl space-y-8 pb-8">
      <!-- Instrução -->
      <p class="text-sm text-shift3-text-secondary">Preencha os dados do produto</p>

      <!-- ───── Identificação ───── -->
      <section class="space-y-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Identificação</p>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-6">
          <!-- descrição vai até a borda direita, com o Ativo no fim da mesma linha -->
          <div class="flex items-end gap-4 sm:col-span-6">
            <div class="min-w-0 flex-1">
              <BaseInput
                v-model="form.descricao"
                label="Descrição do produto"
                type="text"
                placeholder="Nome / descrição do produto"
                icon="heroicons:cube"
                required
                :error="erros.descricao"
              />
            </div>
            <!-- largura fixa: trocar Ativo/Inativo não mexe no tamanho do campo -->
            <div class="w-24 shrink-0 pb-2">
              <BaseSwitch v-model="form.ativo" :label="form.ativo ? 'Ativo' : 'Inativo'" />
            </div>
          </div>

          <div class="sm:col-span-2">
            <BaseInput v-model="form.sku" label="SKU" type="text" placeholder="Código interno" icon="heroicons:hashtag" />
          </div>
          <div class="sm:col-span-2">
            <BaseInput
              v-model="form.oem"
              label="OEM"
              type="text"
              placeholder="Código original da peça"
              icon="heroicons:wrench-screwdriver"
            />
          </div>
          <div class="sm:col-span-2">
            <BaseInput
              v-model="form.codigo_barras"
              label="Código de barras"
              type="text"
              placeholder="EAN / GTIN"
              icon="heroicons:qr-code"
            />
          </div>
        </div>
      </section>

      <!-- ───── Classificação ───── -->
      <section class="space-y-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Classificação</p>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <BaseBuscaOuCria
            v-model="form.grupo_id"
            label="Grupo"
            placeholder="Buscar grupo ou digitar pra criar…"
            :itens="grupos.itens.value"
            :carregando="grupos.carregando.value"
            :ao-criar="(nome) => grupos.criar(nome)"
          />
          <BaseBuscaOuCria
            v-model="form.subgrupo_id"
            label="Subgrupo"
            :placeholder="form.grupo_id ? 'Buscar subgrupo ou digitar pra criar…' : 'Escolha o grupo primeiro'"
            :itens="subgruposDoGrupo"
            :carregando="subgrupos.carregando.value"
            :disabled="!form.grupo_id"
            :ao-criar="(nome) => subgrupos.criar(nome, form.grupo_id!)"
          />
          <BaseBuscaOuCria
            v-model="form.marca_id"
            label="Marca"
            placeholder="Buscar marca ou digitar pra criar…"
            :itens="marcas.itens.value"
            :carregando="marcas.carregando.value"
            :ao-criar="(nome) => marcas.criar(nome)"
          />
          <BaseBuscaOuCria
            v-model="form.fabricante_id"
            label="Fabricante"
            placeholder="Buscar fabricante ou digitar pra criar…"
            :itens="fabricantes.itens.value"
            :carregando="fabricantes.carregando.value"
            :ao-criar="(nome) => fabricantes.criar(nome)"
          />
          <BaseBuscaOuCria
            v-model="form.montadora_id"
            label="Montadora"
            placeholder="Buscar montadora ou digitar pra criar…"
            :itens="montadoras.itens.value"
            :carregando="montadoras.carregando.value"
            :ao-criar="(nome) => montadoras.criar(nome)"
          />
          <BaseInput v-model="form.modelo" label="Modelo" type="text" icon="heroicons:tag" />
          <BaseInput v-model="form.numero_serie" label="Número de série" type="text" icon="heroicons:identification" />
        </div>
      </section>

      <!-- ───── Aplicação ───── -->
      <section class="space-y-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Aplicação</p>

        <BaseTextarea
          v-model="form.aplicacao"
          label="Aplicação do produto"
          placeholder="Veículos, modelos e anos em que o produto é usado"
          :rows="4"
        />
      </section>

      <!-- ───── Medidas e embalagem ───── -->
      <section class="space-y-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Medidas e embalagem</p>

        <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <BaseInput v-model="form.peso" label="Peso (kg)" type="text" inputmode="decimal" placeholder="0,000" :error="erros.peso" />
          <BaseInput v-model="form.altura" label="Altura (cm)" type="text" inputmode="decimal" placeholder="0,00" :error="erros.altura" />
          <BaseInput v-model="form.largura" label="Largura (cm)" type="text" inputmode="decimal" placeholder="0,00" :error="erros.largura" />
          <BaseInput
            v-model="form.comprimento"
            label="Comprimento (cm)"
            type="text"
            inputmode="decimal"
            placeholder="0,00"
            :error="erros.comprimento"
          />
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <BaseInput v-model="form.unidade" label="Unidade" type="text" placeholder="UN, CX, KG…" icon="heroicons:cube-transparent" />
          <BaseInput
            v-model="form.caixa_master"
            label="Caixa master"
            type="text"
            inputmode="decimal"
            placeholder="Unidades por caixa"
            icon="heroicons:archive-box"
            :error="erros.caixa_master"
          />
          <BaseInput
            v-model="form.qtd_minima_venda"
            label="Qtd. mínima de venda"
            type="text"
            inputmode="decimal"
            placeholder="1"
            icon="heroicons:shopping-cart"
            :error="erros.qtd_minima_venda"
          />
        </div>
      </section>

      <!-- ───── Fiscal ───── -->
      <section class="space-y-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Fiscal</p>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label for="produto-origem" class="mb-1 block">Origem</label>
            <select
              id="produto-origem"
              v-model="form.origem"
              class="w-full rounded-default border border-shift3-input-border bg-shift3-input px-3 py-2 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20"
            >
              <option :value="null">Não informada</option>
              <option v-for="o in ORIGENS_PRODUTO" :key="o.valor" :value="o.valor">{{ o.label }}</option>
            </select>
          </div>
          <div>
            <BaseInput v-model="form.ncm" label="NCM" type="text" placeholder="0000.00.00" icon="heroicons:document-text" />
          </div>
          <div>
            <BaseInput
              v-model="form.ipi"
              label="% IPI"
              type="text"
              inputmode="decimal"
              placeholder="0,00"
              icon="heroicons:receipt-percent"
              :error="erros.ipi"
            />
          </div>
        </div>
      </section>
    </div>

    <!-- ───── Ações — teleportadas pra barra fixa do layout ───── -->
    <ClientOnly>
      <Teleport to="#dashboard-footer">
        <div class="border-t border-shift3-border bg-shift3-bg-card px-6 py-4">
          <div class="mx-auto flex max-w-3xl items-center gap-3">
            <BaseButton
              type="submit"
              form="produtos-formulario"
              variant="primary"
              :loading="salvando"
              icon-left="heroicons:check"
            >
              {{ modo === 'novo' ? 'Criar produto' : 'Salvar alterações' }}
            </BaseButton>
            <BaseButton type="button" variant="ghost" @click="$emit('cancelar')">Cancelar</BaseButton>
          </div>
        </div>
      </Teleport>
    </ClientOnly>
  </form>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { ORIGENS_PRODUTO, type Produto, type ProdutoInput } from '~/types/produto'

interface Props {
  modo: 'novo' | 'editar'
  produto?: Produto
  salvando?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  salvando: false
})

const emit = defineEmits<{
  submit: [dados: ProdutoInput]
  cancelar: []
}>()

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

/** Campos numéricos: no formulário são texto (aceita vírgula), no banco são número. */
const CAMPOS_NUMERICOS = ['peso', 'altura', 'largura', 'comprimento', 'caixa_master', 'qtd_minima_venda', 'ipi'] as const
type CampoNumerico = (typeof CAMPOS_NUMERICOS)[number]

const numeroParaTexto = (v: number | null | undefined) =>
  v === null || v === undefined ? '' : String(v).replace('.', ',')

const form = reactive<{
  sku: string
  codigo_barras: string
  oem: string
  descricao: string
  marca_id: string | null
  fabricante_id: string | null
  montadora_id: string | null
  grupo_id: string | null
  subgrupo_id: string | null
  modelo: string
  numero_serie: string
  aplicacao: string
  peso: string
  altura: string
  largura: string
  comprimento: string
  unidade: string
  caixa_master: string
  qtd_minima_venda: string
  origem: number | null
  ncm: string
  ipi: string
  ativo: boolean
}>({
  sku: props.produto?.sku ?? '',
  codigo_barras: props.produto?.codigo_barras ?? '',
  oem: props.produto?.oem ?? '',
  descricao: props.produto?.descricao ?? '',
  marca_id: props.produto?.marca_id ?? null,
  fabricante_id: props.produto?.fabricante_id ?? null,
  montadora_id: props.produto?.montadora_id ?? null,
  grupo_id: props.produto?.grupo_id ?? null,
  subgrupo_id: props.produto?.subgrupo_id ?? null,
  modelo: props.produto?.modelo ?? '',
  numero_serie: props.produto?.numero_serie ?? '',
  aplicacao: props.produto?.aplicacao ?? '',
  peso: numeroParaTexto(props.produto?.peso),
  altura: numeroParaTexto(props.produto?.altura),
  largura: numeroParaTexto(props.produto?.largura),
  comprimento: numeroParaTexto(props.produto?.comprimento),
  unidade: props.produto?.unidade ?? 'UN',
  caixa_master: numeroParaTexto(props.produto?.caixa_master),
  qtd_minima_venda: numeroParaTexto(props.produto?.qtd_minima_venda),
  origem: props.produto?.origem ?? null,
  ncm: props.produto?.ncm ?? '',
  ipi: numeroParaTexto(props.produto?.ipi),
  ativo: props.produto?.ativo ?? true
})

const subgruposDoGrupo = computed(() => subgrupos.doGrupo(form.grupo_id))

// trocou o grupo → o subgrupo escolhido era do grupo anterior
watch(
  () => form.grupo_id,
  () => {
    form.subgrupo_id = null
  }
)

const erros = reactive<{ descricao?: string } & Partial<Record<CampoNumerico, string>>>({})

function validar() {
  if (!form.descricao || form.descricao.trim().length === 0) {
    erros.descricao = 'Descrição é obrigatória'
  } else if (form.descricao.length > 200) {
    erros.descricao = 'Descrição não pode ter mais de 200 caracteres'
  } else {
    delete erros.descricao
  }

  for (const campo of CAMPOS_NUMERICOS) {
    const n = textoParaNumero(form[campo])
    if (Number.isNaN(n)) erros[campo] = 'Número inválido'
    else if (campo === 'ipi' && n !== null && n > 100) erros[campo] = 'No máximo 100'
    else delete erros[campo]
  }
}

const limpo = (v: string) => (v.trim() === '' ? null : v.trim())

function enviar() {
  validar()

  if (Object.keys(erros).length === 0) {
    emit('submit', {
      sku: limpo(form.sku),
      codigo_barras: limpo(form.codigo_barras),
      oem: limpo(form.oem),
      descricao: form.descricao.trim(),
      marca_id: form.marca_id,
      fabricante_id: form.fabricante_id,
      montadora_id: form.montadora_id,
      grupo_id: form.grupo_id,
      subgrupo_id: form.grupo_id ? form.subgrupo_id : null,
      modelo: limpo(form.modelo),
      numero_serie: limpo(form.numero_serie),
      aplicacao: limpo(form.aplicacao),
      peso: textoParaNumero(form.peso),
      altura: textoParaNumero(form.altura),
      largura: textoParaNumero(form.largura),
      comprimento: textoParaNumero(form.comprimento),
      unidade: form.unidade.trim() || 'UN',
      caixa_master: textoParaNumero(form.caixa_master),
      qtd_minima_venda: textoParaNumero(form.qtd_minima_venda),
      origem: form.origem,
      ncm: limpo(form.ncm),
      ipi: textoParaNumero(form.ipi),
      ativo: form.ativo
    })
  }
}
</script>
