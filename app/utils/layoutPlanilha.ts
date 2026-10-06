/**
 * Ponte entre a "receita" de leitura (`ReceitaLayout`, que fala em letras de coluna do Excel) e
 * o leitor de planilha (`montarAba`, que devolve colunas com nome). Também monta a amostra da
 * planilha que vai pra IA ler o layout — a IA só vê a amostra e devolve a receita; os valores
 * saem sempre do arquivo, pelo código.
 */
import type { ReceitaLayout } from '~/types/modelo'
import { indiceDaColuna, letraDaColuna } from '~/utils/gradePlanilha'
import type { AbaLida, Celula, GradePlanilha, OpcoesLeitura } from '~/utils/gradePlanilha'

/** Quanto da planilha vai pra IA: o começo (onde estão os títulos), um pouco do meio e o fim (rodapé, totais). */
const AMOSTRA_INICIO = 45
const AMOSTRA_MEIO = 8
const AMOSTRA_MEIO_COM_INSTRUCOES = 40
const AMOSTRA_FIM = 8
const AMOSTRA_COLUNAS = 60
const AMOSTRA_TEXTO = 60
const AMOSTRA_CITADAS = 15

function textoSimples(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]/g, '')
}

function celulaDaAmostra(valor: Celula): string {
  if (valor instanceof Date) return JSON.stringify(valor.toLocaleDateString('pt-BR'))
  if (typeof valor === 'string') {
    const texto = valor.trim()
    return JSON.stringify(texto.length > AMOSTRA_TEXTO ? `${texto.slice(0, AMOSTRA_TEXTO)}…` : texto)
  }
  return String(valor)
}

/**
 * Texto com uma amostra da aba, célula a célula, com a letra da coluna e o número da linha —
 * é o que a IA lê pra entender o layout.
 */
export function amostraDaGrade(grade: GradePlanilha, outrasAbas: string[] = [], instrucoes = ''): string {
  const total = grade.linhas.length
  const indices = new Set<number>()
  for (let i = 0; i < Math.min(total, AMOSTRA_INICIO); i++) indices.add(i)
  for (let i = Math.max(0, total - AMOSTRA_FIM); i < total; i++) indices.add(i)
  const miolo = total - AMOSTRA_INICIO - AMOSTRA_FIM
  // com instruções a IA precisa conhecer melhor o conteúdo (nomes de grupos, tipos de linha), não só o layout
  const doMeio = instrucoes.trim() ? AMOSTRA_MEIO_COM_INSTRUCOES : AMOSTRA_MEIO
  for (let k = 1; k <= doMeio && miolo > doMeio; k++) {
    indices.add(AMOSTRA_INICIO + Math.floor((miolo * k) / (doMeio + 1)))
  }
  // linhas que o usuário citou nas instruções (ex: o nome de uma conta) entram na amostra,
  // senão a IA não teria como saber onde elas estão
  const pedido = textoSimples(instrucoes)
  if (pedido) {
    let citadas = 0
    for (let i = 0; i < total && citadas < AMOSTRA_CITADAS; i++) {
      const citada = (grade.linhas[i] ?? []).some((valor) => {
        const texto = typeof valor === 'string' ? textoSimples(valor) : ''
        return texto.length >= 8 && pedido.includes(texto)
      })
      if (citada && !indices.has(i)) {
        indices.add(i)
        citadas++
      }
    }
  }

  const largura = grade.linhas.reduce((maior, linha) => Math.max(maior, linha.length), 0)
  const partes: string[] = [
    `Aba "${grade.nome}": ${total} linhas, colunas A a ${letraDaColuna(Math.max(largura - 1, 0))}.` +
      (outrasAbas.length ? ` O arquivo tem outras abas (${outrasAbas.join(', ')}), em geral com o mesmo layout.` : ''),
    'Cada linha abaixo: número da linha | células preenchidas (letra da coluna = valor).',
    ''
  ]

  let anterior = -1
  for (const i of [...indices].sort((a, b) => a - b)) {
    if (i > anterior + 1) partes.push(`[... linhas ${anterior + 2} a ${i} omitidas ...]`)
    anterior = i

    const linha = grade.linhas[i] ?? []
    const celulas: string[] = []
    linha.slice(0, AMOSTRA_COLUNAS).forEach((valor, c) => {
      if (valor == null || (typeof valor === 'string' && !valor.trim())) return
      const mescla = grade.mescladas.find((m) => m.linha === i && m.de === c)
      celulas.push(`${letraDaColuna(c)}=${celulaDaAmostra(valor)}${mescla ? ` (mesclada até ${letraDaColuna(mescla.ate)})` : ''}`)
    })
    partes.push(`${i + 1} | ${celulas.length ? celulas.join(' | ') : '(vazia)'}`)
  }
  return partes.join('\n')
}

/** Opções do leitor a partir da receita. `linhaCabecalho` (0 = primeira) troca a linha dos títulos da receita. */
export function opcoesDaReceita(receita: ReceitaLayout, linhaCabecalho?: number): OpcoesLeitura {
  return {
    linhaCabecalho: linhaCabecalho ?? Math.max(receita.linha_titulos - 1, 0),
    titulosEmDuasLinhas: receita.titulos_em_duas_linhas,
    ignorar: receita.ignorar.flatMap((regra) => {
      const coluna = indiceDaColuna(regra.coluna)
      return coluna == null || !regra.contem.trim() ? [] : [{ coluna, contem: regra.contem }]
    }),
    colunaGrupo: receita.coluna_grupo ? indiceDaColuna(receita.coluna_grupo) : null
  }
}

/**
 * Mapeamento campo do template → coluna lida, a partir da receita: acha a coluna da aba que
 * sai das mesmas colunas do Excel (e do mesmo tipo: valor, nível, tipo de linha ou grupo).
 * Campo que a receita não cobre, ou cuja coluna não existe nesta aba, fica `null`.
 */
export function mapeamentoDaReceita(
  receita: ReceitaLayout,
  aba: AbaLida,
  camposIds: string[]
): Record<string, string | null> {
  const mapeamento: Record<string, string | null> = {}
  for (const id of camposIds) mapeamento[id] = null

  for (const campo of receita.campos) {
    if (!(campo.campo_id in mapeamento)) continue
    const colunas = campo.colunas.map(indiceDaColuna).filter((c): c is number => c != null)
    const achada = aba.colunas.find((nome) => {
      const origem = aba.origens[nome]
      if (!origem || origem.tipo !== campo.origem) return false
      if (campo.origem === 'calculada') return origem.etapa === campo.coluna_calculada?.trim()
      if (campo.origem === 'ancestral' && origem.nivel !== campo.nivel) return false
      // grupo é um só por aba; as outras casam pelas colunas do Excel
      return campo.origem === 'grupo' || origem.colunas.some((c) => colunas.includes(c))
    })
    mapeamento[campo.campo_id] = achada ?? null
  }
  return mapeamento
}

/**
 * A receita como ficou depois da conferência: a estrutura que foi usada na leitura + o
 * mapeamento que o usuário confirmou (com as correções dele) — é isso que fica guardado
 * pro próximo arquivo do mesmo cliente.
 */
export function receitaDoMapeamento(
  base: Omit<ReceitaLayout, 'campos' | 'linha_titulos'>,
  aba: AbaLida,
  mapeamento: Record<string, string | null>
): ReceitaLayout {
  const campos: ReceitaLayout['campos'] = []
  for (const [campoId, nome] of Object.entries(mapeamento)) {
    const origem = nome ? aba.origens[nome] : null
    if (!origem) continue
    campos.push({
      campo_id: campoId,
      origem: origem.tipo,
      colunas: origem.colunas.map(letraDaColuna),
      nivel: origem.nivel ?? 0,
      coluna_calculada: origem.etapa ?? ''
    })
  }
  return {
    linha_titulos: aba.linhaCabecalho + 1,
    titulos_em_duas_linhas: base.titulos_em_duas_linhas,
    campos,
    ignorar: base.ignorar,
    coluna_grupo: base.coluna_grupo,
    etapas: base.etapas ?? []
  }
}

export function receitaVazia(): Omit<ReceitaLayout, 'campos' | 'linha_titulos'> {
  return { titulos_em_duas_linhas: false, ignorar: [], coluna_grupo: '', etapas: [] }
}
