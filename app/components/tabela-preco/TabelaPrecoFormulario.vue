<template>
  <form id="tabela-preco-formulario" @submit.prevent="enviar">
    <div class="mx-auto max-w-3xl space-y-8 pb-8">
      <p v-if="props.preco?.produtos?.descricao" class="text-lg font-semibold text-shift3-text">
        {{ props.preco.produtos.descricao }}
      </p>

      <!-- ───── Produto e origem ───── -->
      <section class="space-y-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Produto e origem</p>

        <div class="space-y-4">
          <ProdutosProdutoPicker v-model="form.produto_id" />
          <p v-if="erros.produto_id" class="text-xs text-danger">{{ erros.produto_id }}</p>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <BaseBuscaOuCria
                v-model="form.fabrica_id"
                label="Fábrica *"
                placeholder="Buscar fábrica ou digitar pra criar…"
                :itens="fabricas.itens.value"
                :carregando="fabricas.carregando.value"
                :ao-criar="(nome) => fabricas.criar(nome)"
              />
              <p v-if="erros.fabrica_id" class="mt-1 text-xs text-danger">{{ erros.fabrica_id }}</p>
            </div>
            <BaseBuscaOuCria
              v-model="form.referencia_id"
              label="Referência da tabela"
              placeholder="Ex: Preço fábrica, Distribuidor…"
              :itens="referencias.itens.value"
              :carregando="referencias.carregando.value"
              :ao-criar="(nome) => referencias.criar(nome)"
            />
          </div>
        </div>
      </section>

      <!-- ───── Preço e período ───── -->
      <section class="space-y-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">Preço e período</p>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <BaseInput
            v-model.number="form.valor"
            label="Valor (R$) *"
            type="number"
            step="0.01"
            min="0"
            placeholder="0,00"
            icon="heroicons:currency-dollar"
            :error="erros.valor"
          />
          <div>
            <label class="mb-1 block text-sm font-medium text-shift3-text">Mês de competência *</label>
            <input
              v-model="form.competenciaMes"
              type="month"
              class="w-full rounded-default border border-shift3-input-border bg-shift3-input px-3 py-2 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20"
            />
            <p v-if="erros.competencia" class="mt-1 text-xs text-danger">{{ erros.competencia }}</p>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-shift3-text">Data do registro</label>
            <input
              v-model="form.data_registro"
              type="date"
              class="w-full rounded-default border border-shift3-input-border bg-shift3-input px-3 py-2 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20"
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
              form="tabela-preco-formulario"
              variant="primary"
              :loading="salvando"
              icon-left="heroicons:check"
            >
              {{ modo === 'novo' ? 'Registrar preço' : 'Salvar alterações' }}
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
import type { Preco, PrecoInput } from '~/types/preco'

interface Props {
  modo: 'novo' | 'editar'
  preco?: Preco
  salvando?: boolean
}

const props = withDefaults(defineProps<Props>(), { salvando: false })

const emit = defineEmits<{
  submit: [dados: PrecoInput]
  cancelar: []
}>()

const fabricas = useFabricas()
const referencias = useReferenciasTabela()
onMounted(() => {
  fabricas.carregar()
  referencias.carregar()
})

const hoje = new Date().toISOString().slice(0, 10)

const form = reactive<{
  produto_id: string | null
  fabrica_id: string | null
  referencia_id: string | null
  valor: number | null
  /** "YYYY-MM" — o que o <input type="month"> usa. */
  competenciaMes: string
  data_registro: string
}>({
  produto_id: props.preco?.produto_id ?? null,
  fabrica_id: props.preco?.fabrica_id ?? null,
  referencia_id: props.preco?.referencia_id ?? null,
  valor: props.preco?.valor ?? null,
  competenciaMes: props.preco?.competencia?.slice(0, 7) ?? hoje.slice(0, 7),
  data_registro: props.preco?.data_registro ?? hoje
})

const erros = reactive<{ produto_id?: string; fabrica_id?: string; competencia?: string; valor?: string }>({})

function validar() {
  erros.produto_id = form.produto_id ? undefined : 'Selecione o produto'
  erros.fabrica_id = form.fabrica_id ? undefined : 'Selecione ou crie a fábrica'
  erros.competencia = form.competenciaMes ? undefined : 'Informe o mês de competência'
  erros.valor = form.valor !== null && form.valor >= 0 ? undefined : 'Informe um valor válido'
}

function enviar() {
  validar()
  if (Object.values(erros).some(Boolean)) return

  emit('submit', {
    produto_id: form.produto_id!,
    fabrica_id: form.fabrica_id!,
    referencia_id: form.referencia_id,
    valor: form.valor!,
    competencia: `${form.competenciaMes}-01`,
    data_registro: form.data_registro || hoje
  })
}
</script>
