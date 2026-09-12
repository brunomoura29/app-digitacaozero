<template>
  <form id="produtos-formulario" @submit.prevent="enviar">
    <!-- Conteúdo centralizado -->
    <div class="mx-auto max-w-3xl space-y-8 pb-8">
      <!-- Instrução -->
      <p class="text-sm text-shift3-text-secondary">Preencha os dados do produto</p>

      <!-- ───── Dados principais ───── -->
      <section class="space-y-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Dados principais</p>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-6">
          <div class="sm:col-span-4">
            <BaseInput
              v-model="form.descricao"
              label="Descrição *"
              type="text"
              placeholder="Nome / descrição do produto"
              icon="heroicons:cube"
              required
              :error="erros.descricao"
            />
          </div>
          <div class="sm:col-span-2 flex items-end pb-2">
            <BaseSwitch v-model="form.ativo" :label="form.ativo ? 'Ativo' : 'Inativo'" />
          </div>

          <div class="sm:col-span-3">
            <BaseInput v-model="form.sku" label="SKU" type="text" placeholder="Código interno" icon="heroicons:hashtag" />
          </div>
          <div class="sm:col-span-3">
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

      <!-- ───── Fabricação ───── -->
      <section class="space-y-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Fabricação</p>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <BaseInput v-model="form.modelo" label="Modelo" type="text" icon="heroicons:tag" />
          <BaseInput v-model="form.numero_serie" label="Número de série" type="text" icon="heroicons:identification" />
        </div>
      </section>

      <!-- ───── Fiscal / Unidade ───── -->
      <section class="space-y-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Fiscal e unidade</p>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <BaseInput v-model="form.unidade" label="Unidade" type="text" placeholder="UN, CX, KG…" icon="heroicons:cube-transparent" />
          <BaseInput v-model="form.ncm" label="NCM" type="text" placeholder="0000.00.00" icon="heroicons:document-text" />
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
import { reactive } from 'vue'
import type { Produto, ProdutoInput } from '~/types/produto'

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
onMounted(() => {
  marcas.carregar()
  fabricantes.carregar()
})

const form = reactive<{
  sku: string
  codigo_barras: string
  descricao: string
  marca_id: string | null
  fabricante_id: string | null
  modelo: string
  numero_serie: string
  unidade: string
  ncm: string
  ativo: boolean
}>({
  sku: props.produto?.sku ?? '',
  codigo_barras: props.produto?.codigo_barras ?? '',
  descricao: props.produto?.descricao ?? '',
  marca_id: props.produto?.marca_id ?? null,
  fabricante_id: props.produto?.fabricante_id ?? null,
  modelo: props.produto?.modelo ?? '',
  numero_serie: props.produto?.numero_serie ?? '',
  unidade: props.produto?.unidade ?? 'UN',
  ncm: props.produto?.ncm ?? '',
  ativo: props.produto?.ativo ?? true
})

const erros = reactive<{ descricao?: string }>({})

function validar() {
  if (!form.descricao || form.descricao.trim().length === 0) {
    erros.descricao = 'Descrição é obrigatória'
  } else if (form.descricao.length > 200) {
    erros.descricao = 'Descrição não pode ter mais de 200 caracteres'
  } else {
    delete erros.descricao
  }
}

const limpo = (v: string) => (v.trim() === '' ? null : v.trim())

function enviar() {
  validar()

  if (Object.keys(erros).length === 0) {
    emit('submit', {
      sku: limpo(form.sku),
      codigo_barras: limpo(form.codigo_barras),
      descricao: form.descricao.trim(),
      marca_id: form.marca_id,
      fabricante_id: form.fabricante_id,
      modelo: limpo(form.modelo),
      numero_serie: limpo(form.numero_serie),
      unidade: form.unidade.trim() || 'UN',
      ncm: limpo(form.ncm),
      ativo: form.ativo
    })
  }
}
</script>
