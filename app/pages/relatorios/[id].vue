<template>
  <div class="mx-auto max-w-[1400px] space-y-4 pb-8">
    <div v-if="carregando" class="flex items-center justify-center gap-2 py-14 text-sm text-shift3-text-muted">
      <BaseSpinner size="md" /> Carregando…
    </div>

    <BaseEmptyState v-else-if="!relatorio" icon="heroicons:exclamation-triangle" title="Relatório não encontrado">
      <BaseButton variant="secondary" to="/relatorios" class="mt-4">Voltar para Relatórios</BaseButton>
    </BaseEmptyState>

    <template v-else>
      <!-- ───── Cabeçalho: nome + ações ───── -->
      <div class="flex flex-wrap items-center gap-3">
        <input
          v-model="nome"
          type="text"
          maxlength="80"
          aria-label="Nome do relatório"
          class="min-w-0 flex-1 basis-64 rounded-default border border-transparent bg-transparent px-2 py-1 text-[22px] font-semibold text-shift3-text outline-none transition hover:border-shift3-border focus:border-shift3-green focus:bg-shift3-input"
        />

        <div class="flex items-center gap-2 rounded-default border border-shift3-input-border bg-shift3-input px-2.5 py-1.5" title="Confira o que cada cliente vai enxergar no link dele">
          <Icon name="heroicons:eye" class="h-4 w-4 text-shift3-text-muted" />
          <select v-model="verComo" class="max-w-[12rem] cursor-pointer bg-transparent text-sm text-shift3-text outline-none" aria-label="Ver como">
            <option value="" class="bg-shift3-bg-card">Todos os clientes</option>
            <option v-for="c in clientes" :key="c.id" :value="c.id" class="bg-shift3-bg-card">Ver como: {{ c.nome }}</option>
          </select>
        </div>

        <BaseButton variant="secondary" icon-left="heroicons:share" @click="abrirCompartilhar">Compartilhar</BaseButton>
        <BaseButton :variant="alterado ? 'accent' : 'secondary'" icon-left="heroicons:check" :loading="salvando" :disabled="!alterado" @click="salvar">
          {{ alterado ? 'Salvar' : 'Salvo' }}
        </BaseButton>
      </div>

      <!-- ───── Ajuste pela IA ───── -->
      <section class="rounded-medium border border-shift3-border bg-shift3-bg-card p-3 shadow-sm">
        <form class="flex flex-wrap items-center gap-2" @submit.prevent="pedirAjuste">
          <span class="grid h-9 w-9 shrink-0 place-items-center rounded-default bg-shift3-green/20 text-shift3-teal dark:text-shift3-green">
            <Icon name="heroicons:sparkles" class="h-5 w-5" />
          </span>
          <input
            v-model="pedido"
            type="text"
            maxlength="2000"
            :disabled="montando"
            :placeholder="
              definicao.blocos.length
                ? 'Peça um ajuste: “troque a rosca por barras”, “adicione o top 10 de produtos”, “mostre só pedidos aprovados”…'
                : 'Diga o que você quer ver: “total vendido por mês, por fábrica e os 10 produtos que mais vendem”…'
            "
            class="min-w-0 flex-1 basis-72 rounded-default border border-shift3-input-border bg-shift3-input px-3 py-2 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20 disabled:opacity-60"
          />
          <BaseButton type="submit" variant="primary" :loading="montando" :disabled="!pedido.trim()">
            {{ definicao.blocos.length ? 'Ajustar com IA' : 'Montar com IA' }}
          </BaseButton>
        </form>

        <div v-if="respostaIA" class="mt-3 flex items-start gap-3 rounded-default bg-shift3-green/10 px-3 py-2.5 text-sm">
          <Icon name="heroicons:chat-bubble-left-ellipsis" class="mt-0.5 h-4 w-4 shrink-0 text-shift3-teal dark:text-shift3-green" />
          <div class="min-w-0 flex-1">
            <p class="text-shift3-text">{{ respostaIA.resumo }}</p>
            <ul v-if="respostaIA.avisos.length" class="mt-1.5 space-y-1">
              <li v-for="aviso in respostaIA.avisos" :key="aviso" class="flex items-start gap-1.5 text-shift3-text-secondary">
                <Icon name="heroicons:exclamation-triangle" class="mt-0.5 h-3.5 w-3.5 shrink-0 text-yellow-600" />
                {{ aviso }}
              </li>
            </ul>
          </div>
          <button v-if="antesDaIA" type="button" class="shrink-0 text-xs font-semibold text-shift3-teal hover:underline dark:text-shift3-green" @click="desfazerIA">
            Desfazer
          </button>
          <button type="button" class="shrink-0 text-shift3-text-muted hover:text-shift3-text" aria-label="Fechar" @click="respostaIA = null">
            <Icon name="heroicons:x-mark" class="h-4 w-4" />
          </button>
        </div>
      </section>

      <!-- ───── Fontes + modo edição ───── -->
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-xs font-medium text-shift3-text-muted">Fontes:</span>
        <button
          v-for="f in FONTES_RELATORIO"
          :key="f.id"
          type="button"
          class="inline-flex items-center gap-1 rounded-pill border px-2.5 py-1 text-xs transition"
          :class="
            definicao.fontes.includes(f.id)
              ? 'border-shift3-teal/40 bg-shift3-green/15 font-semibold text-shift3-text'
              : 'border-shift3-border text-shift3-text-muted hover:text-shift3-text'
          "
          :title="f.descricao"
          @click="alternarFonte(f.id)"
        >
          <Icon :name="definicao.fontes.includes(f.id) ? 'heroicons:check' : 'heroicons:plus'" class="h-3 w-3" />
          {{ f.nome }}
        </button>

        <div class="ml-auto flex items-center gap-3">
          <div v-if="editando" class="flex items-center gap-1.5" title="Cor dos blocos que não têm cor própria">
            <span class="text-xs font-medium text-shift3-text-muted">Cor do painel:</span>
            <button
              type="button"
              class="grid h-5 w-5 place-items-center rounded-pill border-2 border-dashed text-shift3-text-muted"
              :class="definicao.cor === '' ? 'border-shift3-text' : 'border-shift3-input-border'"
              aria-label="Sem cor (neutro)"
              :aria-pressed="definicao.cor === ''"
              @click="definicao = { ...definicao, cor: '' }"
            />
            <button
              v-for="c in CORES_BLOCO"
              :key="c.id"
              type="button"
              class="h-5 w-5 rounded-pill ring-offset-2 ring-offset-shift3-bg-card transition hover:scale-110"
              :class="definicao.cor === c.id ? 'ring-2 ring-shift3-text' : ''"
              :style="{ background: colorMode.value === 'dark' ? c.escuro : c.claro }"
              :title="c.nome"
              :aria-label="c.nome"
              :aria-pressed="definicao.cor === c.id"
              @click="definicao = { ...definicao, cor: c.id }"
            />
          </div>
          <BaseSwitch v-model="editando" label="Modo edição" />
          <BaseButton v-if="editando" variant="secondary" size="sm" icon-left="heroicons:plus" @click="abrirEditor(null)">
            Adicionar bloco
          </BaseButton>
        </div>
      </div>

      <!-- filtros fixos do relatório (normalmente postos pela IA) — à vista, pra nenhum corte ficar escondido -->
      <div v-if="definicao.filtros.length" class="flex flex-wrap items-center gap-2">
        <span class="text-xs font-medium text-shift3-text-muted">Sempre filtrado por:</span>
        <button
          v-for="(f, i) in definicao.filtros"
          :key="i"
          type="button"
          class="inline-flex items-center gap-1 rounded-pill border border-shift3-border bg-shift3-bg-light px-2.5 py-1 text-xs text-shift3-text transition hover:border-danger hover:text-danger"
          title="Tirar este filtro do relatório"
          @click="definicao = { ...definicao, filtros: definicao.filtros.filter((_, j) => j !== i) }"
        >
          {{ campoRelatorio(f.campo)?.nome }} {{ f.op === 'igual' ? 'é' : 'não é' }} {{ f.valores.join(', ') }}
          <Icon name="heroicons:x-mark" class="h-3.5 w-3.5" />
        </button>
      </div>

      <!-- ───── Painel ───── -->
      <div v-if="carregandoDados && !dados" class="flex items-center justify-center gap-2 py-14 text-sm text-shift3-text-muted">
        <BaseSpinner size="md" /> Buscando os dados…
      </div>

      <BaseEmptyState
        v-else-if="!definicao.blocos.length"
        icon="heroicons:squares-plus"
        title="O painel está vazio"
        description="Peça à IA no campo acima ou adicione um bloco manualmente."
      >
        <BaseButton variant="secondary" icon-left="heroicons:plus" class="mt-4" @click="abrirEditor(null)">Adicionar bloco</BaseButton>
      </BaseEmptyState>

      <div v-else-if="dados" class="relative" :class="carregandoDados || montando ? 'pointer-events-none opacity-60' : ''">
        <p v-if="!dados.pedidos.length" class="mb-3 rounded-default bg-warning/15 px-3 py-2 text-sm text-shift3-text">
          {{ verComo ? 'Esse cliente ainda não tem pedidos — o painel dele abre vazio.' : 'Ainda não há pedidos cadastrados — os blocos aparecem vazios.' }}
        </p>
        <RelatoriosPainel v-model:definicao="definicao" :dados="dados" :editavel="editando" @editar="abrirEditor" />
      </div>
    </template>

    <RelatoriosBlocoEditor
      v-if="editorAberto && dados"
      :bloco="blocoEmEdicao"
      :fontes="definicao.fontes"
      :dados="dados"
      @fechar="editorAberto = false"
      @salvar="aplicarBloco"
    />
    <RelatoriosAcessos v-if="compartilhando && relatorio" :relatorio-id="relatorio.id" :nome-relatorio="nome" @fechar="compartilhando = false" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  CORES_BLOCO,
  FONTES_RELATORIO,
  campoRelatorio,
  definicaoVazia,
  normalizarDefinicao,
  normalizarFontes,
  type BlocoRelatorio,
  type DadosRelatorio,
  type DefinicaoRelatorio,
  type FonteId
} from '#shared/utils/relatorios'
import type { ClienteResumo, Relatorio } from '~/composables/useRelatorios'

definePageMeta({ layout: 'dashboard', title: 'Relatório', backTo: '/relatorios' })

const route = useRoute()
const { buscarUm, atualizar, buscarDados, montarComIA, listarClientes } = useRelatorios()
const toast = useToast()
const colorMode = useColorMode()
const recado = useState<{ id: string; resumo: string; avisos: string[] } | null>('relatorios:recado', () => null)

const carregando = ref(true)
const relatorio = ref<Relatorio | null>(null)
const nome = ref('')
const definicao = ref<DefinicaoRelatorio>(definicaoVazia())
const clientes = ref<ClienteResumo[]>([])

const dados = ref<DadosRelatorio | null>(null)
const carregandoDados = ref(false)
const verComo = ref('')
const editando = ref(false)

// ── salvar ──
const salvando = ref(false)
const retrato = (n: string, d: DefinicaoRelatorio) => JSON.stringify([n.trim(), d])
const salvo = ref('')
const alterado = computed(() => !!relatorio.value && retrato(nome.value, definicao.value) !== salvo.value)

async function salvar() {
  if (!relatorio.value || salvando.value) return
  if (!nome.value.trim()) return toast.warning('Dê um nome ao relatório')
  salvando.value = true
  try {
    relatorio.value = await atualizar(relatorio.value.id, {
      nome: nome.value.trim(),
      descricao: relatorio.value.descricao,
      definicao: definicao.value
    })
    salvo.value = retrato(nome.value, definicao.value)
    toast.success('Relatório salvo — os links dos clientes já mostram a versão nova')
  } catch (e: any) {
    toast.error(e?.message || 'Não foi possível salvar')
  } finally {
    salvando.value = false
  }
}

onBeforeRouteLeave(() => {
  if (alterado.value && !window.confirm('Há alterações não salvas neste relatório. Sair mesmo assim?')) return false
})

// ── dados ──
let pedidoDeDados = 0
async function carregarDados() {
  // só a resposta do pedido mais recente vale (trocar de cliente rápido não pode embaralhar)
  const meu = ++pedidoDeDados
  carregandoDados.value = true
  try {
    const resposta = await buscarDados(definicao.value.fontes, verComo.value || null)
    if (meu === pedidoDeDados) dados.value = resposta
  } catch (e: any) {
    if (meu === pedidoDeDados) toast.error(e?.data?.statusMessage || 'Não foi possível buscar os dados do relatório')
  } finally {
    if (meu === pedidoDeDados) carregandoDados.value = false
  }
}

watch(verComo, carregarDados)
watch(() => definicao.value.fontes.join(','), carregarDados)

onMounted(async () => {
  try {
    const [achado, todos] = await Promise.all([buscarUm(route.params.id as string), listarClientes()])
    clientes.value = todos
    relatorio.value = achado
    if (!achado) return
    nome.value = achado.nome
    definicao.value = achado.definicao
    salvo.value = retrato(achado.nome, achado.definicao)
    editando.value = !achado.definicao.blocos.length
    if (recado.value?.id === achado.id) respostaIA.value = { resumo: recado.value.resumo, avisos: recado.value.avisos }
    recado.value = null
    await carregarDados()
  } catch (e: any) {
    toast.error(e?.message || 'Não foi possível abrir o relatório')
  } finally {
    carregando.value = false
  }
})

function alternarFonte(id: FonteId) {
  const fonte = FONTES_RELATORIO.find((f) => f.id === id)!
  if (fonte.obrigatoria) return
  const atuais = definicao.value.fontes
  let novas = atuais.includes(id) ? atuais.filter((f) => f !== id) : [...atuais, id]
  if (!novas.includes(id)) novas = novas.filter((f) => FONTES_RELATORIO.find((x) => x.id === f)?.depende !== id)
  novas = normalizarFontes(novas)

  // tirar uma fonte derruba os blocos que dependem dos campos dela — avisar antes
  const nova = normalizarDefinicao(definicao.value, novas)
  const perdidos = definicao.value.blocos.length - nova.blocos.length
  if (perdidos > 0 && !window.confirm(`Sem "${fonte.nome}", ${perdidos} bloco(s) deixam de funcionar e serão removidos. Continuar?`)) return
  definicao.value = nova
}

// ── IA ──
const pedido = ref('')
const montando = ref(false)
const respostaIA = ref<{ resumo: string; avisos: string[] } | null>(null)
const antesDaIA = ref<DefinicaoRelatorio | null>(null)

async function pedirAjuste() {
  if (!pedido.value.trim() || montando.value) return
  montando.value = true
  try {
    const atual = definicao.value
    const resposta = await montarComIA(atual.fontes, pedido.value, atual.blocos.length ? atual : undefined)
    if (!resposta.definicao.blocos.length) {
      respostaIA.value = { resumo: resposta.resumo || 'A IA não conseguiu montar blocos com esse pedido.', avisos: resposta.avisos }
      return
    }
    antesDaIA.value = atual
    definicao.value = resposta.definicao
    respostaIA.value = { resumo: resposta.resumo, avisos: resposta.avisos }
    if (nome.value.trim() === 'Novo relatório' && resposta.nome) nome.value = resposta.nome
    pedido.value = ''
  } catch (e: any) {
    toast.error(e?.data?.statusMessage || e?.statusMessage || e?.message || 'Não foi possível falar com a IA', { duration: 8000 })
  } finally {
    montando.value = false
  }
}

function desfazerIA() {
  if (!antesDaIA.value) return
  definicao.value = antesDaIA.value
  antesDaIA.value = null
  respostaIA.value = null
  toast.info('Voltei o painel para como estava antes do ajuste')
}

// ── edição manual de bloco ──
const editorAberto = ref(false)
const blocoEmEdicao = ref<BlocoRelatorio | null>(null)

function abrirEditor(bloco: BlocoRelatorio | null) {
  blocoEmEdicao.value = bloco
  editorAberto.value = true
}

function aplicarBloco(bloco: BlocoRelatorio) {
  const blocos = [...definicao.value.blocos]
  const posicao = blocos.findIndex((b) => b.id === bloco.id)
  if (posicao >= 0) blocos[posicao] = bloco
  else blocos.push(bloco)
  definicao.value = { ...definicao.value, blocos }
  editorAberto.value = false
}

// ── compartilhar ──
const compartilhando = ref(false)

function abrirCompartilhar() {
  // o cliente vê o que está SALVO — compartilhar com alteração pendente confunde
  if (alterado.value) toast.info('Há alterações não salvas: os clientes veem a última versão salva')
  compartilhando.value = true
}
</script>
