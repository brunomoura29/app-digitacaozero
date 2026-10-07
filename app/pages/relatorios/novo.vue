<template>
  <div class="mx-auto max-w-3xl space-y-6 pb-8">
    <BasePageHeader subtitle="Escolha de onde vêm os dados e diga, do seu jeito, o que você quer ver" />

    <!-- ───── 1. Fontes ───── -->
    <section class="rounded-medium border border-shift3-border bg-shift3-bg-card p-5 shadow-sm">
      <p class="text-base font-semibold text-shift3-text">1. Fontes de dados</p>
      <p class="mt-0.5 text-sm text-shift3-text-secondary">
        Marque tudo o que pode ser útil. Os cadastros já entram ligados a cada pedido — não precisa relacionar nada.
      </p>

      <div class="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          v-for="f in FONTES_RELATORIO"
          :key="f.id"
          type="button"
          class="flex items-start gap-3 rounded-default border p-3 text-left transition"
          :class="[
            marcadas.includes(f.id) ? 'border-shift3-green bg-shift3-green/10' : 'border-shift3-border hover:border-shift3-input-border',
            f.obrigatoria ? 'cursor-default' : ''
          ]"
          :aria-pressed="marcadas.includes(f.id)"
          @click="alternarFonte(f.id)"
        >
          <span
            class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-small border"
            :class="marcadas.includes(f.id) ? 'border-shift3-teal bg-shift3-teal text-white' : 'border-shift3-input-border'"
          >
            <Icon v-if="marcadas.includes(f.id)" name="heroicons:check" class="h-3.5 w-3.5" />
          </span>
          <span class="min-w-0">
            <span class="flex items-center gap-1.5 text-sm font-semibold text-shift3-text">
              <Icon :name="f.icone" class="h-4 w-4 text-shift3-text-secondary" />
              {{ f.nome }}
              <span v-if="f.obrigatoria" class="text-xs font-normal text-shift3-text-muted">(sempre)</span>
            </span>
            <span class="mt-0.5 block text-xs text-shift3-text-secondary">{{ f.descricao }}</span>
          </span>
        </button>
      </div>
    </section>

    <!-- ───── 2. Pedido pra IA ───── -->
    <section class="rounded-medium border border-shift3-border bg-shift3-bg-card p-5 shadow-sm">
      <p class="text-base font-semibold text-shift3-text">2. O que você quer analisar?</p>
      <p class="mt-0.5 text-sm text-shift3-text-secondary">
        A IA monta o painel a partir do seu texto. Depois você ajusta pedindo de novo ou mexendo em cada bloco.
      </p>

      <BaseTextarea
        v-model="pedido"
        class="mt-4"
        :rows="5"
        :maxlength="2000"
        placeholder="Ex: quero acompanhar quanto foi vendido por mês, ver as fábricas e os 10 produtos que mais vendem, e uma tabela com os pedidos aprovados."
        :disabled="montando"
      />

      <div class="mt-3 flex flex-wrap gap-2">
        <button
          v-for="s in SUGESTOES"
          :key="s.titulo"
          type="button"
          class="rounded-pill border border-shift3-border px-3 py-1 text-xs text-shift3-text-secondary transition hover:border-shift3-green hover:text-shift3-text"
          :disabled="montando"
          @click="pedido = s.texto"
        >
          {{ s.titulo }}
        </button>
      </div>

      <div v-if="montando" class="mt-5 flex items-center gap-3 rounded-default bg-shift3-green/10 px-4 py-3 text-sm text-shift3-text">
        <BaseSpinner size="sm" />
        A IA está lendo os seus dados e montando o painel — costuma levar de 15 a 40 segundos.
      </div>

      <div class="mt-5 flex flex-wrap items-center justify-end gap-2">
        <BaseButton variant="ghost" :disabled="montando" @click="criarEmBranco">Começar em branco</BaseButton>
        <BaseButton variant="accent" icon-left="heroicons:sparkles" :loading="montando" :disabled="!pedido.trim()" @click="montar">
          Montar com IA
        </BaseButton>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { definicaoVazia, FONTES_RELATORIO, normalizarFontes, type FonteId } from '#shared/utils/relatorios'

definePageMeta({ layout: 'dashboard', title: 'Novo relatório', backTo: '/relatorios' })

const SUGESTOES = [
  {
    titulo: 'Visão geral de vendas',
    texto:
      'Visão geral das vendas: total vendido, quantidade de pedidos e ticket médio em destaque; evolução do total por mês; total por fábrica; e uma tabela com os pedidos.'
  },
  {
    titulo: 'Produtos mais vendidos',
    texto:
      'Quero ver os 10 produtos que mais venderam em valor, os 10 que mais venderam em quantidade, a participação de cada marca e uma tabela com produto, quantidade e total.'
  },
  {
    titulo: 'Situação dos pedidos',
    texto:
      'Acompanhar a situação dos pedidos: quantos pedidos em cada situação, valor por situação, evolução mensal separada por situação e a lista de pedidos em aprovação.'
  },
  {
    titulo: 'Por fábrica e vendedor',
    texto: 'Comparar fábricas e vendedores: total vendido por fábrica, total por vendedor, ticket médio por vendedor e evolução mensal por fábrica.'
  }
]

const { criar, montarComIA } = useRelatorios()
const toast = useToast()
/** Resumo/avisos da IA, pro editor mostrar logo depois de abrir o relatório recém-criado. */
const recado = useState<{ id: string; resumo: string; avisos: string[] } | null>('relatorios:recado', () => null)

const marcadas = ref<FonteId[]>(['pedidos', 'itens', 'clientes', 'produtos'])
const pedido = ref('')
const montando = ref(false)

function alternarFonte(id: FonteId) {
  const fonte = FONTES_RELATORIO.find((f) => f.id === id)!
  if (fonte.obrigatoria) return
  let novas = marcadas.value.includes(id) ? marcadas.value.filter((f) => f !== id) : [...marcadas.value, id]
  // tirar uma fonte leva junto quem depende dela (Produtos só existe pelos Itens)
  if (!novas.includes(id)) novas = novas.filter((f) => FONTES_RELATORIO.find((x) => x.id === f)?.depende !== id)
  marcadas.value = normalizarFontes(novas)
}

async function montar() {
  if (!pedido.value.trim() || montando.value) return
  montando.value = true
  try {
    const fontes = normalizarFontes(marcadas.value)
    const resposta = await montarComIA(fontes, pedido.value)
    if (!resposta.definicao.blocos.length) {
      toast.warning(resposta.resumo || 'A IA não conseguiu montar blocos com esse pedido — tente descrever de outro jeito.', { duration: 8000 })
      return
    }
    const relatorio = await criar({
      nome: resposta.nome || 'Novo relatório',
      descricao: pedido.value.trim().slice(0, 300),
      definicao: resposta.definicao
    })
    recado.value = { id: relatorio.id, resumo: resposta.resumo, avisos: resposta.avisos }
    await navigateTo(`/relatorios/${relatorio.id}`)
  } catch (e: any) {
    toast.error(e?.data?.statusMessage || e?.statusMessage || e?.message || 'Não foi possível montar o relatório', { duration: 8000 })
  } finally {
    montando.value = false
  }
}

async function criarEmBranco() {
  try {
    const relatorio = await criar({ nome: 'Novo relatório', definicao: definicaoVazia(marcadas.value) })
    await navigateTo(`/relatorios/${relatorio.id}`)
  } catch (e: any) {
    toast.error(e?.message || 'Não foi possível criar o relatório')
  }
}
</script>
