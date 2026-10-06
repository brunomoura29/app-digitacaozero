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
            ? 'No primeiro arquivo de cada cliente a IA analisa o layout — leva alguns segundos.'
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

          <div v-if="ehPlanilhaAtual">
            <label for="instrucoes-arquivo" class="mb-1 block text-sm font-medium text-shift3-text">
              Instruções para a IA <span class="font-normal text-shift3-text-muted">(opcional)</span>
            </label>
            <textarea
              id="instrucoes-arquivo"
              v-model="instrucoes"
              rows="3"
              maxlength="2000"
              :placeholder="EXEMPLO_INSTRUCOES"
              class="w-full rounded-default border border-shift3-input-border bg-shift3-input px-3 py-2 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20"
            />
            <p class="mt-1 text-xs text-shift3-text-muted">
              Diga, do seu jeito, como você trataria esse arquivo antes de analisar: o que manter, o que tirar, o
              que calcular ou classificar. A IA transforma em etapas e mostra na próxima tela. Fica guardado pra este
              cliente e é reaplicado nas próximas importações.
            </p>
          </div>
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

      <!-- como a planilha foi entendida (IA, memória do cliente ou regras) + ajuste da linha dos títulos -->
      <section v-if="abas.length" class="space-y-3">
        <div class="flex items-center gap-2 border-b border-shift3-border pb-2">
          <Icon name="heroicons:bars-3-bottom-left" class="h-5 w-5 text-shift3-teal" />
          <p class="text-base font-semibold text-shift3-text">Leitura da planilha</p>
        </div>

        <div class="flex flex-wrap items-start gap-3 rounded-medium border border-shift3-border bg-shift3-bg-card p-4">
          <span
            class="grid h-9 w-9 shrink-0 place-items-center rounded-default"
            :class="origemLayout === 'regras' ? 'bg-warning/20 text-yellow-600' : 'bg-success/20 text-shift3-teal dark:text-success'"
          >
            <Icon :name="ORIGENS_LAYOUT[origemLayout].icone" class="h-5 w-5" />
          </span>
          <div class="min-w-0 flex-1 basis-72 space-y-1">
            <p class="text-sm font-semibold text-shift3-text">{{ ORIGENS_LAYOUT[origemLayout].titulo }}</p>
            <p class="text-sm text-shift3-text-secondary">
              {{ origemLayout === 'ia' ? resumoIa : ORIGENS_LAYOUT[origemLayout].texto }}
            </p>
            <p v-if="origemLayout === 'ia' && confiancaIa !== 'alta'" class="text-xs font-medium text-yellow-600">
              A IA ficou em dúvida neste arquivo — confira o mapeamento abaixo com atenção.
            </p>
            <p v-if="falhaIa" class="text-xs text-danger">A IA não foi usada: {{ falhaIa }}</p>
          </div>
          <BaseButton
            variant="secondary"
            size="sm"
            icon-left="heroicons:sparkles"
            :loading="analisando"
            @click="analisarDeNovo"
          >
            {{ origemLayout === 'ia' ? 'Analisar de novo' : 'Analisar com IA' }}
          </BaseButton>

          <div class="w-full">
            <label for="instrucoes-leitura" class="mb-1 block text-xs font-medium text-shift3-text">
              Instruções para a IA <span class="font-normal text-shift3-text-muted">(opcional)</span>
            </label>
            <textarea
              id="instrucoes-leitura"
              v-model="instrucoes"
              rows="2"
              maxlength="2000"
              :placeholder="EXEMPLO_INSTRUCOES"
              class="w-full rounded-default border border-shift3-input-border bg-shift3-input px-3 py-2 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20"
            />
            <p v-if="instrucoesMudaram" class="mt-1 text-xs font-medium text-yellow-600">
              Você mudou as instruções — clique em “{{ origemLayout === 'ia' ? 'Analisar de novo' : 'Analisar com IA' }}”
              pra IA reler o arquivo com elas.
            </p>
          </div>

          <!-- o tratamento que saiu das instruções: o que cada etapa faz e a fórmula usada, pra conferir -->
          <div v-if="receitaEmUso?.etapas?.length" class="w-full space-y-2 border-t border-shift3-border pt-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-shift3-text-muted">
              Tratamento aplicado ao arquivo
              <span v-if="linhasFiltradas" class="font-normal normal-case tracking-normal">
                — {{ linhasFiltradas.toLocaleString('pt-BR') }} linha(s) ficaram de fora pelos filtros
              </span>
            </p>
            <ol class="space-y-2">
              <li v-for="(etapa, i) in receitaEmUso.etapas" :key="i" class="flex gap-2 text-sm">
                <span
                  class="grid h-5 w-5 shrink-0 place-items-center rounded-pill bg-shift3-dark text-[11px] font-semibold text-shift3-green"
                >
                  {{ i + 1 }}
                </span>
                <div class="min-w-0">
                  <p class="text-shift3-text">
                    <span class="font-medium">{{ ROTULO_ETAPA[etapa.tipo] }}{{ etapa.nome ? ` “${etapa.nome}”` : '' }}:</span>
                    {{ etapa.explicacao }}
                  </p>
                  <p class="break-all font-mono text-xs text-shift3-text-muted">
                    {{ etapa.formula }}{{ etapa.repetir_abaixo ? '  (repete pra baixo)' : '' }}
                  </p>
                </div>
              </li>
            </ol>
            <p v-for="erro in errosEtapas" :key="erro" class="text-xs text-danger">Etapa não aplicada — {{ erro }}</p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <p class="text-sm text-shift3-text-secondary">Os nomes das colunas foram lidos da linha</p>
          <input
            :value="linhaTitulos"
            type="number"
            min="1"
            aria-label="Linha dos títulos das colunas"
            class="w-20 rounded-default border border-shift3-input-border bg-shift3-input px-3 py-1.5 text-sm text-shift3-text outline-none transition focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20"
            @change="(e) => trocarLinhaTitulos((e.target as HTMLInputElement).value)"
          />
          <p class="text-xs text-shift3-text-muted">
            {{ linhaTitulosManual == null ? '' : 'Informada por você.' }}
            Se as colunas abaixo não fizerem sentido, digite o número da linha da planilha onde estão os títulos.
          </p>
        </div>
        <p v-if="linhasDescartadas" class="text-xs text-shift3-text-muted">
          {{ linhasDescartadas }} linha(s) de rodapé ou título repetido ficaram de fora.
        </p>
        <p
          v-for="coluna in colunasEmNiveis"
          :key="coluna"
          class="rounded-medium border border-shift3-border bg-shift3-bg-light px-3 py-2 text-xs text-shift3-text-secondary"
        >
          A coluna “{{ coluna }}” vem recuada em níveis na planilha. Ela foi juntada numa coluna só, e surgiram
          outras: “{{ colunaNivel(coluna) }}” (1 = nível mais alto), “{{ colunaTipo(coluna) }}” (Total ou Detalhe —
          some só as de Detalhe pra não contar em dobro) e “{{ colunaAncestral(coluna, 1) }}”, “… de nível 2” etc.
          (a linha-mãe de cada nível repetida pra baixo, pra filtrar tudo que está dentro dela). Pra levar qualquer
          uma ao Power BI, o template precisa de um campo pra ela.
        </p>
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
import { computed, onMounted, reactive, ref, shallowRef, watch } from 'vue'
import type { UploadFile } from '~/composables/useUpload'
import { lerGradesPlanilha } from '~/composables/useImportarPlanilha'
import { converterLinhas, converterValor, exibirValor, formatarPeriodo, problemaDaCelula } from '~/types/importacao'
import type { Importacao, LinhaImportacao } from '~/types/importacao'
import { destinoDoModelo } from '~/types/modelo'
import type { AnaliseLayout, ReceitaLayout } from '~/types/modelo'
import { aplicarMapeamento, normalizar, sugerirMapeamentoColunas } from '~/types/pedido'
import type { CampoAlvo } from '~/types/pedido'
import { colunaAncestral, colunaNivel, colunaTipo, localizarCabecalho, montarAba } from '~/utils/gradePlanilha'
import type { AbaLida, GradePlanilha } from '~/utils/gradePlanilha'
import {
  amostraDaGrade,
  mapeamentoDaReceita,
  opcoesDaReceita,
  receitaDoMapeamento,
  receitaVazia
} from '~/utils/layoutPlanilha'
import { aplicarEtapas } from '~/utils/tratamentoPlanilha'

definePageMeta({ layout: 'dashboard', title: 'Nova importação', backTo: '/importacoes' })

const POR_PAGINA = 50
const ETAPAS_LABEL = ['Arquivo', 'Mapeamento de colunas', 'Revisão']
const EXEMPLO_INSTRUCOES =
  'Ex: fique só com as contas dentro de RESULTADO LÍQUIDO DO PERÍODO, sem os totais. Inverta o sinal do saldo pra receita ficar positiva e classifique cada conta em Receita, Custo ou Despesa.'
const ROTULO_ETAPA = { coluna: 'Nova coluna', manter: 'Manter só as linhas', remover: 'Remover as linhas' }
const ORIGENS_LAYOUT = {
  ia: { icone: 'heroicons:sparkles', titulo: 'Layout lido pela IA', texto: '' },
  memoria: {
    icone: 'heroicons:bookmark',
    titulo: 'Layout já conhecido deste cliente',
    texto: 'O arquivo tem o mesmo formato da última importação deste cliente neste template — usei o que ficou guardado, sem chamar a IA.'
  },
  regras: {
    icone: 'heroicons:cog-6-tooth',
    titulo: 'Leitura automática, sem IA',
    texto: 'As colunas foram ligadas aos campos só pelo nome. Confira o mapeamento abaixo.'
  }
}

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
/** Planilha como veio do arquivo — guardada pra remontar as colunas se a linha dos títulos mudar. */
const grades = shallowRef<GradePlanilha[]>([])
const abas = ref<AbaLida[]>([])
const abasSelecionadas = ref<string[]>([])
/** Linha dos títulos escolhida à mão (1 = primeira linha); `null` = a que o sistema detectou. */
const linhaTitulosManual = ref<number | null>(null)
/**
 * Como o layout da planilha foi entendido: pela IA, pelo que ficou guardado da última
 * importação deste cliente (`memoria`) ou só pelas regras do leitor (sem receita).
 */
const origemLayout = ref<'ia' | 'memoria' | 'regras'>('regras')
const receitaEmUso = ref<ReceitaLayout | null>(null)
const resumoIa = ref('')
const confiancaIa = ref<AnaliseLayout['confianca']>('alta')
/** Por que a IA não foi usada quando deveria (fica na tela, não só num aviso que some). */
const falhaIa = ref('')
const analisando = ref(false)
/**
 * O que o usuário pede pra IA sobre o arquivo deste cliente (ex: "repita pra baixo a conta X").
 * Fica guardado com o layout do cliente e volta preenchido na próxima importação.
 */
const instrucoes = ref('')
/** Etapas do tratamento que não puderam ser aplicadas (fórmula inválida etc.) e quantas linhas os filtros tiraram. */
const errosEtapas = ref<string[]>([])
const linhasFiltradas = ref(0)
/** As instruções que valeram na leitura que está na tela — o que for digitado depois só vale ao analisar de novo. */
const instrucoesLidas = ref('')
const instrucoesMudaram = computed(() => instrucoes.value.trim() !== instrucoesLidas.value)
const layoutSalvo = computed(() => (clienteId.value ? modeloAtual.value?.schema.layouts?.[clienteId.value] : null) ?? null)
watch([modeloId, clienteId], () => {
  instrucoes.value = layoutSalvo.value?.instrucoes ?? ''
})
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

/** Linha dos títulos em uso (1 = primeira) — a da primeira aba marcada; as outras costumam ter o mesmo layout. */
const linhaTitulos = computed(() => ((abasAtivas.value[0] ?? abas.value[0])?.linhaCabecalho ?? 0) + 1)
const colunasEmNiveis = computed(() => [...new Set(abasAtivas.value.flatMap((a) => a.hierarquias))])
const linhasDescartadas = computed(() => abasAtivas.value.reduce((total, a) => total + a.descartadas, 0))

/**
 * Monta todas as abas do arquivo. A primeira manda: segue a receita (ou as regras do leitor)
 * e as outras procuram os mesmos títulos — abas de um mesmo arquivo costumam ter o mesmo
 * layout, só que nem sempre na mesma linha.
 */
function montarAbas(receita: ReceitaLayout | null, linhaTitulosDaPrimeira?: number): AbaLida[] {
  const [primeiraGrade, ...outras] = grades.value
  if (!primeiraGrade) return []
  const opcoes = (linha?: number) => (receita ? opcoesDaReceita(receita, linha) : { linhaCabecalho: linha })

  // o tratamento pedido pelo usuário entra depois da leitura, em cada aba
  const etapas = receita?.etapas ?? []
  const lida = montarAba(primeiraGrade, opcoes(linhaTitulosDaPrimeira))
  const primeira = aplicarEtapas(lida, etapas)
  errosEtapas.value = primeira.erros
  let removidas = primeira.removidas
  const demais = outras.map((grade) => {
    const linha = localizarCabecalho(grade, lida.assinatura, receita?.titulos_em_duas_linhas)
    const tratada = aplicarEtapas(montarAba(grade, opcoes(linha ?? lida.linhaCabecalho)), etapas)
    removidas += tratada.removidas
    return tratada.aba
  })
  linhasFiltradas.value = removidas
  return [primeira.aba, ...demais].filter((a) => a.linhas.length)
}

/** Põe as abas montadas na tela, com o mapeamento da receita (ou, sem receita, o palpite pelo nome das colunas). */
function usarAbas(montadas: AbaLida[], receita: ReceitaLayout | null) {
  abas.value = montadas
  abasSelecionadas.value = abasSelecionadas.value.filter((nome) => montadas.some((a) => a.nome === nome))
  if (!abasSelecionadas.value.length) abasSelecionadas.value = montadas.map((a) => a.nome)
  receitaEmUso.value = receita
  mapeamentoColunas.value = receita
    ? mapeamentoDaReceita(receita, montadas[0]!, campos.value.map((c) => c.id))
    : sugerirMapeamentoColunas(colunasArquivo.value, camposAlvo.value)
}

/**
 * Descobre como ler a planilha e monta as abas. Ordem: o que ficou guardado deste cliente
 * (se o arquivo ainda tem o mesmo layout) → IA → regras do leitor. `forcarIa` pula a memória.
 * Devolve `false` se não achou dado nenhum.
 */
async function entenderPlanilha(forcarIa = false): Promise<boolean> {
  const primeiraGrade = grades.value[0]
  if (!primeiraGrade || !modeloId.value) return false
  falhaIa.value = ''
  resumoIa.value = ''

  const pedido = instrucoes.value.trim()
  instrucoesLidas.value = pedido
  const salvo = layoutSalvo.value
  // instrução diferente da que gerou a receita guardada = o usuário quer outra leitura
  if (salvo && !forcarIa && (salvo.instrucoes ?? '') === pedido) {
    const linha = localizarCabecalho(primeiraGrade, salvo.assinatura, salvo.receita.titulos_em_duas_linhas)
    const montadas = linha == null ? [] : montarAbas(salvo.receita, linha)
    if (montadas.length) {
      origemLayout.value = 'memoria'
      usarAbas(montadas, salvo.receita)
      return true
    }
  }

  try {
    const analise = await $fetch<AnaliseLayout>('/api/importacoes/layout', {
      method: 'POST',
      body: {
        modeloId: modeloId.value,
        amostra: amostraDaGrade(primeiraGrade, grades.value.slice(1).map((g) => g.nome), pedido),
        instrucoes: pedido
      }
    })
    const montadas = montarAbas(analise)
    if (montadas.length) {
      origemLayout.value = 'ia'
      resumoIa.value = analise.resumo
      confiancaIa.value = analise.confianca
      usarAbas(montadas, analise)
      return true
    }
    falhaIa.value = 'A IA não achou uma tabela que sirva pra este template.'
  } catch (e) {
    const erro = e as any
    falhaIa.value = erro?.data?.statusMessage || erro?.message || 'Não foi possível analisar o layout com a IA.'
  }

  // sem IA, o que ficou guardado deste cliente ainda é melhor que ligar as colunas só pelo nome
  // (vale a leitura antiga: as instruções novas não entram, e a tela avisa)
  if (salvo) {
    const linha = localizarCabecalho(primeiraGrade, salvo.assinatura, salvo.receita.titulos_em_duas_linhas)
    const guardadas = linha == null ? [] : montarAbas(salvo.receita, linha)
    if (guardadas.length) {
      origemLayout.value = 'memoria'
      instrucoesLidas.value = salvo.instrucoes ?? ''
      usarAbas(guardadas, salvo.receita)
      return true
    }
  }

  const montadas = montarAbas(null)
  if (!montadas.length) return false
  origemLayout.value = 'regras'
  usarAbas(montadas, null)
  return true
}

async function analisarDeNovo() {
  analisando.value = true
  try {
    linhaTitulosManual.value = null
    await entenderPlanilha(true)
  } finally {
    analisando.value = false
  }
}

/** Remonta as colunas com os títulos na linha informada (vazio = volta pra linha detectada). */
function trocarLinhaTitulos(valor: string) {
  const linha = valor.trim() ? Number(valor) : null
  if (linha != null && (!Number.isInteger(linha) || linha < 1)) return
  const remontadas = montarAbas(receitaEmUso.value, linha == null ? undefined : linha - 1)
  if (!remontadas.length) {
    toast.error(`Não há dados abaixo da linha ${linha} — confira o número da linha dos títulos.`)
    return
  }
  linhaTitulosManual.value = linha
  usarAbas(remontadas, receitaEmUso.value)
  // noutra linha os títulos são outros: o que a receita não achar, tenta pelo nome
  const peloNome = sugerirMapeamentoColunas(colunasArquivo.value, camposAlvo.value)
  for (const [campoId, coluna] of Object.entries(mapeamentoColunas.value)) {
    if (!coluna) mapeamentoColunas.value[campoId] = peloNome[campoId] ?? null
  }
}

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
      grades.value = await lerGradesPlanilha(arquivo)
      linhaTitulosManual.value = null
      abasSelecionadas.value = []
      if (!(await entenderPlanilha())) {
        abas.value = []
        toast.error('Não encontrei dados nessa planilha — confira se ela tem uma linha com os títulos das colunas.')
        return
      }
      extracaoId.value = null
      // dados soltos no topo da planilha (Empresa, CNPJ…) preenchem os campos do cabeçalho de mesmo nome
      const informacoes = abas.value[0]!.informacoes
      for (const campo of modeloAtual.value?.schema.campos ?? []) {
        const nome = normalizar(campo.nome)
        const achada = informacoes.find((i) => normalizar(i.rotulo) === nome)
        if (achada) cabecalho[campo.id] = converterValor(achada.valor, campo.tipo)
      }
      etapa.value = 'mapeamento'
      return
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

/**
 * Guarda no template como ler a planilha deste cliente — a estrutura usada + o mapeamento
 * que foi conferido — pro próximo arquivo dele entrar sem IA. Se não der pra guardar, a
 * importação já está salva: só não fica lembrado.
 */
async function lembrarLayout() {
  const aba = abasAtivas.value[0]
  if (!aba || !modeloId.value || !clienteId.value) return
  try {
    await modelos.salvarLayout(modeloId.value, clienteId.value, {
      receita: receitaDoMapeamento(receitaEmUso.value ?? receitaVazia(), aba, mapeamentoColunas.value),
      assinatura: aba.assinatura,
      // as que geraram esta leitura — texto mudado sem analisar de novo não entra
      instrucoes: instrucoesLidas.value,
      salvo_em: new Date().toISOString()
    })
  } catch {
    toast.info('A importação foi salva, mas não consegui guardar o layout deste cliente pra próxima vez.')
  }
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
    await lembrarLayout()
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
