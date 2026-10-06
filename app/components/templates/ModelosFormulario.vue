<template>
  <form id="modelos-formulario" @submit.prevent="enviar">
    <div class="mx-auto max-w-3xl space-y-8 pb-8">
      <p v-if="props.modelo?.nome" class="text-lg font-semibold text-shift3-text">{{ props.modelo.nome }}</p>
      <p v-else class="text-sm text-shift3-text-secondary">Defina os campos que a extração vai preencher a partir do arquivo</p>

      <!-- ───── Dados principais ───── -->
      <section class="space-y-4">
        <div class="flex items-center gap-2 border-b border-shift3-border pb-2">
          <Icon name="heroicons:identification" class="h-5 w-5 text-shift3-teal" />
          <p class="text-base font-semibold text-shift3-text">Dados principais</p>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-6">
          <div class="sm:col-span-4">
            <BaseInput
              v-model="form.nome"
              label="Nome *"
              type="text"
              placeholder="Ex: Pedidos Fábrica"
              icon="heroicons:document-duplicate"
              required
              :error="erros.nome"
            />
          </div>
          <div class="sm:col-span-2 flex items-end pb-2">
            <BaseSwitch v-model="form.ativo" :label="form.ativo ? 'Ativo' : 'Inativo'" />
          </div>

          <div class="sm:col-span-6">
            <label class="mb-1 block text-sm font-medium text-shift3-text">Destino dos dados</label>
            <select
              v-model="form.destino"
              class="w-full rounded-default border border-shift3-input-border bg-shift3-input px-3 py-2 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20"
            >
              <option v-for="d in DESTINOS_MODELO" :key="d.valor" :value="d.valor">{{ d.label }}</option>
            </select>
            <p class="mt-1 text-xs text-shift3-text-muted">
              {{
                paraDados
                  ? 'Usado em Importações: as linhas do arquivo viram um conjunto de dados que o Power BI lê pelo link.'
                  : 'Usado em Pedidos: o arquivo vira uma Ordem de Compra.'
              }}
            </p>
          </div>

          <div class="sm:col-span-3">
            <label class="mb-1 block text-sm font-medium text-shift3-text">Tipo de arquivo</label>
            <select
              v-model="form.tipo"
              class="w-full rounded-default border border-shift3-input-border bg-shift3-input px-3 py-2 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20"
            >
              <option v-for="t in TIPOS_MODELO" :key="t.valor" :value="t.valor">{{ t.label }}</option>
            </select>
          </div>
          <div class="sm:col-span-3">
            <BaseInput v-model="form.descricao" label="Descrição" type="text" placeholder="Opcional" icon="heroicons:pencil" />
          </div>
        </div>
      </section>

      <!-- ───── Colunas do conjunto de dados (destino = dados) — vem primeiro: é o que importa ───── -->
      <section v-if="paraDados" class="space-y-4">
        <div class="flex items-center gap-2 border-b border-shift3-border pb-2">
          <Icon name="heroicons:table-cells" class="h-5 w-5 text-shift3-teal" />
          <p class="text-base font-semibold text-shift3-text">Colunas dos dados *</p>
        </div>
        <p class="text-xs text-shift3-text-muted">
          As colunas da planilha que você quer analisar — cada campo vira uma coluna no Power BI (ex: código,
          descrição, débito, crédito, saldo). O tipo define como o valor é gravado (número, data, texto).
        </p>
        <p v-if="erros.colunas" class="text-xs text-danger">{{ erros.colunas }}</p>
        <TemplatesCamposEditor v-model="form.schema.campos_item" />
      </section>

      <!-- ───── Campos do cabeçalho ───── -->
      <section class="space-y-4">
        <div class="flex items-center gap-2 border-b border-shift3-border pb-2">
          <Icon name="heroicons:document-text" class="h-5 w-5 text-shift3-teal" />
          <p class="text-base font-semibold text-shift3-text">
            {{ paraDados ? 'Campos do documento (opcional)' : 'Campos do cabeçalho' }}
          </p>
        </div>
        <p class="text-xs text-shift3-text-muted">
          {{
            paraDados
              ? 'Só pra informação que aparece UMA vez no documento inteiro (ex: nome da empresa no topo de um PDF) — NÃO são as colunas da planilha. Na maioria dos casos fica vazio.'
              : 'Dados que aparecem uma vez no documento — ex: cliente, data do pedido.'
          }}
        </p>
        <!-- template de dados com campos aqui e nenhuma coluna: quase sempre foram cadastrados no lugar errado -->
        <div
          v-if="paraDados && form.schema.campos.length && !form.schema.campos_item.length"
          class="flex flex-wrap items-center gap-3 rounded-medium border border-warning/50 bg-warning/10 px-4 py-3"
        >
          <p class="min-w-0 flex-1 text-sm text-shift3-text">
            Esses campos são as colunas da sua planilha? Então o lugar deles é em “Colunas dos dados”.
          </p>
          <BaseButton type="button" variant="secondary" size="sm" icon-left="heroicons:arrow-up" @click="moverParaColunas">
            Mover para Colunas dos dados
          </BaseButton>
        </div>
        <TemplatesCamposEditor v-model="form.schema.campos" />
      </section>

      <!-- ───── Campos do item (destino = pedido) ───── -->
      <section v-if="!paraDados" class="space-y-4">
        <div class="flex items-center gap-2 border-b border-shift3-border pb-2">
          <Icon name="heroicons:list-bullet" class="h-5 w-5 text-shift3-teal" />
          <p class="text-base font-semibold text-shift3-text">Campos do item</p>
        </div>
        <p class="text-xs text-shift3-text-muted">
          Dados que se repetem por linha — ex: SKU, quantidade, preço. Se o documento trouxer mais de um campo
          parecido (ex: SKU da fábrica e SKU do cliente), use "Papel no pedido" pra dizer qual é qual.
        </p>
        <TemplatesCamposEditor v-model="form.schema.campos_item" papeis />

        <div class="max-w-xs">
          <label class="mb-1 block text-sm font-medium text-shift3-text">Identificar produto por</label>
          <select
            v-model="form.identificador_produto"
            class="w-full rounded-default border border-shift3-input-border bg-shift3-input px-3 py-2 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20"
          >
            <option v-for="i in IDENTIFICADORES_PRODUTO" :key="i.valor" :value="i.valor">{{ i.label }}</option>
          </select>
        </div>
        <p class="text-xs text-shift3-text-muted">
          Na revisão do pedido, o valor do campo com papel "Código do produto" é comparado com esse campo do
          cadastro de produtos — quando acha, o produto já vem selecionado e o preço é puxado da tabela.
        </p>
      </section>

      <!-- ───── Dicas pra extração ───── -->
      <section class="space-y-4">
        <div class="flex items-center gap-2 border-b border-shift3-border pb-2">
          <Icon name="heroicons:light-bulb" class="h-5 w-5 text-shift3-teal" />
          <p class="text-base font-semibold text-shift3-text">Dicas para a extração</p>
        </div>
        <BaseTextarea
          v-model="form.dicas"
          placeholder="Instruções livres pra guiar a leitura do arquivo (ex: 'o código do produto vem entre parênteses ao lado da descrição')…"
          :rows="3"
        />
      </section>
    </div>

    <!-- ───── Ações — teleportadas pra barra fixa do layout ───── -->
    <ClientOnly>
      <Teleport to="#dashboard-footer">
        <div class="border-t border-shift3-border bg-shift3-bg-card px-6 py-4">
          <div class="mx-auto flex max-w-3xl items-center gap-3">
            <BaseButton
              type="submit"
              form="modelos-formulario"
              variant="primary"
              :loading="salvando"
              icon-left="heroicons:check"
            >
              {{ modo === 'novo' ? 'Criar template' : 'Salvar alterações' }}
            </BaseButton>
            <BaseButton type="button" variant="ghost" @click="$emit('cancelar')">Cancelar</BaseButton>
          </div>
        </div>
      </Teleport>
    </ClientOnly>
  </form>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { DESTINOS_MODELO, IDENTIFICADORES_PRODUTO, TIPOS_MODELO, destinoDoModelo, schemaVazio } from '~/types/modelo'
import type { CampoSchema, DestinoModelo, IdentificadorProduto, Modelo, ModeloInput, TipoModelo } from '~/types/modelo'

interface Props {
  modo: 'novo' | 'editar'
  modelo?: Modelo
  salvando?: boolean
}

const props = withDefaults(defineProps<Props>(), { salvando: false })

const emit = defineEmits<{
  submit: [dados: ModeloInput]
  cancelar: []
}>()

const form = reactive<{
  nome: string
  descricao: string
  tipo: TipoModelo
  ativo: boolean
  schema: { campos: CampoSchema[]; campos_item: CampoSchema[] }
  identificador_produto: IdentificadorProduto
  destino: DestinoModelo
  dicas: string
}>({
  destino: destinoDoModelo(props.modelo),
  identificador_produto: props.modelo?.schema?.identificador_produto ?? 'sku',
  nome: props.modelo?.nome ?? '',
  descricao: props.modelo?.descricao ?? '',
  tipo: props.modelo?.tipo ?? 'misto',
  ativo: props.modelo?.ativo ?? true,
  schema: {
    campos: props.modelo?.schema?.campos ? [...props.modelo.schema.campos] : [],
    campos_item: props.modelo?.schema?.campos_item ? [...props.modelo.schema.campos_item] : []
  },
  dicas: props.modelo?.schema?.dicas?.geral ?? ''
})

const paraDados = computed(() => form.destino === 'dados')

const erros = reactive<{ nome?: string; colunas?: string }>({})

function moverParaColunas() {
  form.schema.campos_item = [...form.schema.campos]
  form.schema.campos = []
  delete erros.colunas
}

function validar() {
  if (!form.nome.trim()) {
    erros.nome = 'Nome é obrigatório'
  } else {
    delete erros.nome
  }
  // sem coluna (com nome) o conjunto de dados não tem o que importar
  if (paraDados.value && !form.schema.campos_item.some((c) => c.nome.trim())) {
    erros.colunas = 'Adicione pelo menos uma coluna — sem isso não dá pra importar com este template.'
  } else {
    delete erros.colunas
  }
}

function enviar() {
  validar()
  if (Object.keys(erros).length > 0) return

  const schema = schemaVazio()
  schema.campos = form.schema.campos
  schema.destino = form.destino
  // papel/identificador só existem no destino pedido — limpa pra não sobrar lixo ao trocar o destino
  schema.campos_item = paraDados.value
    ? form.schema.campos_item.map((c) => ({ ...c, papel: null }))
    : form.schema.campos_item
  if (!paraDados.value) schema.identificador_produto = form.identificador_produto
  if (form.dicas.trim()) schema.dicas = { geral: form.dicas.trim() }
  // o que o sistema aprendeu sobre a planilha de cada cliente não é editado aqui — só não pode se perder
  if (paraDados.value && props.modelo?.schema?.layouts) schema.layouts = props.modelo.schema.layouts

  emit('submit', {
    nome: form.nome.trim(),
    descricao: form.descricao.trim() || null,
    tipo: form.tipo,
    schema,
    ativo: form.ativo
  })
}
</script>
