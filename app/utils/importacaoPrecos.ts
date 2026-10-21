/**
 * Importação de preços por planilha — regras puras (sem banco): títulos do modelo, leitura da
 * competência e dos valores, e decisão do que fazer com cada preço. Quem lê o banco e grava é
 * `useImportarPrecos`.
 *
 * Regras combinadas com o usuário:
 * - modelo: SKU | Descrição | Fábrica | Data competência | uma coluna por tabela (referência), com
 *   o nome da tabela no título; Descrição é só pra leitura;
 * - cada célula de preço preenchida = um preço (SKU + fábrica + tabela + mês); célula vazia não mexe;
 * - já existe preço no mesmo mês → substitui o valor; meses diferentes ficam como histórico;
 * - valor igual ao preço atual → não grava de novo (o modelo já sai com o preço atual);
 * - coluna com nome de tabela que não existe é avisada e ignorada (não cria tabela sozinha);
 * - SKU e fábrica precisam existir no cadastro.
 */

import { chaveNome, normalizarTitulo, textoParaNumero, type ItemApoio } from '~/utils/importacaoProdutos'

export const TITULOS_MODELO_PRECOS = {
  sku: 'SKU',
  descricao: 'Descrição',
  fabrica: 'Fábrica',
  competencia: 'Data competência'
} as const

type CampoFixo = keyof typeof TITULOS_MODELO_PRECOS

/** Títulos aceitos pra cada coluna fixa (já normalizados com `normalizarTitulo`). */
const APELIDOS: Record<CampoFixo, string[]> = {
  sku: ['sku', 'codigo', 'codigointerno'],
  descricao: ['descricao', 'descricaodoproduto', 'produto'],
  fabrica: ['fabrica', 'fornecedor'],
  competencia: ['datacompetencia', 'datadecompetencia', 'competencia', 'mescompetencia', 'mesdecompetencia', 'mes', 'data']
}

const CAMPO_POR_TITULO = new Map<string, CampoFixo>()
for (const [campo, apelidos] of Object.entries(APELIDOS) as [CampoFixo, string[]][]) {
  for (const a of apelidos) CAMPO_POR_TITULO.set(a, campo)
}

const MESES: Record<string, number> = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12
}

function montarCompetencia(ano: number, mes: number): string | null {
  if (!Number.isInteger(ano) || !Number.isInteger(mes) || mes < 1 || mes > 12 || ano < 2000 || ano > 2100) return null
  return `${ano}-${String(mes).padStart(2, '0')}-01`
}

/** Número de série de data do Excel (dias desde 30/12/1899) pro dia em UTC. */
export function serialExcelParaData(serial: number): Date {
  return new Date(Math.round((serial - 25569) * 86400000))
}

/** Dia 1 do mês "YYYY-MM" como número de série de data do Excel. */
export function competenciaParaSerialExcel(competenciaMes: string): number {
  const [ano, mes] = competenciaMes.split('-').map(Number)
  return Date.UTC(ano!, mes! - 1, 1) / 86400000 + 25569
}

/**
 * Data da célula → primeiro dia do mês de competência ("YYYY-MM-01"), ou null se não der pra ler.
 * Aceita data do Excel (número de série ou Date), "15/11/2026", "11/2026", "2026-11", "nov/2026".
 */
export function lerCompetencia(valor: unknown): string | null {
  if (valor === null || valor === undefined || valor === '') return null
  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime()) ? null : montarCompetencia(valor.getFullYear(), valor.getMonth() + 1)
  }
  if (typeof valor === 'number') {
    if (valor < 1 || valor > 2958465) return null
    const d = serialExcelParaData(valor)
    return montarCompetencia(d.getUTCFullYear(), d.getUTCMonth() + 1)
  }
  const t = String(valor).trim().toLowerCase()
  let m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t)
  if (m) return montarCompetencia(Number(m[3]), Number(m[2]))
  m = /^(\d{1,2})[/.-](\d{4})$/.exec(t)
  if (m) return montarCompetencia(Number(m[2]), Number(m[1]))
  m = /^(\d{4})-(\d{1,2})(-\d{1,2})?/.exec(t)
  if (m) return montarCompetencia(Number(m[1]), Number(m[2]))
  m = /^([a-zç]{3})[a-zç]*[/.\s-]*(\d{4})$/.exec(t)
  if (m && MESES[m[1]!]) return montarCompetencia(Number(m[2]), MESES[m[1]!]!)
  return null
}

/** "2026-11-01" → "11/2026". */
export function formatarCompetencia(competencia: string): string {
  return `${competencia.slice(5, 7)}/${competencia.slice(0, 4)}`
}

/** Valor da célula de preço: número, "1.234,50", "R$ 10,00"; vazio → null; inválido → NaN. */
export function lerValorPreco(valor: unknown): number | null {
  if (valor === null || valor === undefined) return null
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : NaN
  const texto = String(valor).replace(/r\$/i, '').trim()
  return textoParaNumero(texto)
}

const mesmoValor = (a: number, b: number) => Math.abs(a - b) < 0.005

export interface ProdutoDoCadastro {
  id: string
  sku: string | null
  descricao: string
}

/** Preço já gravado — a lista chega ordenada da competência mais nova pra mais velha. */
export interface PrecoExistente {
  produto_id: string
  fabrica_id: string
  referencia_id: string | null
  competencia: string
  valor: number
}

export type AcaoPreco = 'criar' | 'substituir' | 'nada'

export interface PrecoDaLinha {
  referenciaId: string
  tabela: string
  valor: number
  acao: AcaoPreco
  /** Valor que está no banco pro mesmo mês (substituir) ou o preço atual (nada). */
  valorAnterior: number | null
}

export interface LinhaImportacaoPreco {
  /** Número da linha no Excel (o título é a linha 1). */
  numero: number
  sku: string | null
  descricao: string | null
  fabrica: string | null
  competencia: string | null
  produtoId: string | null
  fabricaId: string | null
  erros: string[]
  precos: PrecoDaLinha[]
}

export interface PlanoImportacaoPrecos {
  /** Títulos do arquivo que foram usados, já com o nome oficial. */
  colunasReconhecidas: string[]
  /** Títulos que não são coluna do modelo nem tabela cadastrada (ignorados). */
  colunasIgnoradas: string[]
  /** Colunas obrigatórias que não vieram no arquivo. */
  colunasFaltando: string[]
  linhas: LinhaImportacaoPreco[]
  /** Contagem de PREÇOS por ação; `erro` conta LINHAS. */
  totais: { criar: number; substituir: number; nada: number; erro: number }
}

export interface ContextoImportacaoPrecos {
  produtos: ProdutoDoCadastro[]
  fabricas: ItemApoio[]
  referencias: ItemApoio[]
  precos: PrecoExistente[]
}

export interface PermissoesImportacaoPrecos {
  incluir: boolean
  editar: boolean
}

interface ColunasDoArquivo {
  fixas: Partial<Record<CampoFixo, string>>
  tabelas: { titulo: string; referencia: ItemApoio }[]
  reconhecidas: string[]
  ignoradas: string[]
  faltando: string[]
}

/** Separa os títulos do arquivo em colunas fixas do modelo, tabelas cadastradas e ignoradas. */
export function lerColunasPrecos(titulos: string[], referencias: ItemApoio[]): ColunasDoArquivo {
  const refPorTitulo = new Map(referencias.map((r) => [normalizarTitulo(r.nome), r]))
  const resultado: ColunasDoArquivo = { fixas: {}, tabelas: [], reconhecidas: [], ignoradas: [], faltando: [] }
  const refsVistas = new Set<string>()

  for (const titulo of titulos) {
    const chave = normalizarTitulo(titulo)
    const campo = CAMPO_POR_TITULO.get(chave)
    // coluna repetida no arquivo: vale a primeira
    if (campo && !resultado.fixas[campo]) {
      resultado.fixas[campo] = titulo
      resultado.reconhecidas.push(TITULOS_MODELO_PRECOS[campo])
      continue
    }
    const ref = campo ? undefined : refPorTitulo.get(chave)
    if (ref && !refsVistas.has(ref.id)) {
      refsVistas.add(ref.id)
      resultado.tabelas.push({ titulo, referencia: ref })
      resultado.reconhecidas.push(ref.nome)
      continue
    }
    if (titulo.trim() && !titulo.startsWith('__EMPTY')) resultado.ignoradas.push(titulo)
  }

  for (const campo of ['sku', 'fabrica', 'competencia'] as const) {
    if (!resultado.fixas[campo]) resultado.faltando.push(TITULOS_MODELO_PRECOS[campo])
  }
  if (!resultado.tabelas.length) resultado.faltando.push('ao menos uma coluna de tabela de preço')
  return resultado
}

function celulaTexto(valor: unknown): string {
  if (valor === null || valor === undefined) return ''
  return String(valor).trim()
}

/** Ids das fábricas citadas na planilha — pra buscar só os preços que importam. */
export function fabricasDaPlanilha(titulos: string[], linhas: Record<string, unknown>[], fabricas: ItemApoio[]): string[] {
  const coluna = lerColunasPrecos(titulos, []).fixas.fabrica
  if (!coluna) return []
  const porNome = new Map(fabricas.map((f) => [chaveNome(f.nome), f.id]))
  const ids = new Set<string>()
  for (const l of linhas) {
    const id = porNome.get(chaveNome(celulaTexto(l[coluna])))
    if (id) ids.add(id)
  }
  return [...ids]
}

/**
 * Lê as linhas da planilha e decide o que fazer com cada preço. Não grava nada — é a prévia
 * que o usuário confere antes de importar.
 */
export function planejarImportacaoPrecos(
  titulos: string[],
  linhasPlanilha: Record<string, unknown>[],
  contexto: ContextoImportacaoPrecos,
  permissoes: PermissoesImportacaoPrecos
): PlanoImportacaoPrecos {
  const colunas = lerColunasPrecos(titulos, contexto.referencias)
  const plano: PlanoImportacaoPrecos = {
    colunasReconhecidas: colunas.reconhecidas,
    colunasIgnoradas: colunas.ignoradas,
    colunasFaltando: colunas.faltando,
    linhas: [],
    totais: { criar: 0, substituir: 0, nada: 0, erro: 0 }
  }
  if (colunas.faltando.length) return plano

  const porSku = new Map<string, ProdutoDoCadastro[]>()
  for (const p of contexto.produtos) {
    if (!p.sku?.trim()) continue
    const k = chaveNome(p.sku)
    porSku.set(k, [...(porSku.get(k) ?? []), p])
  }
  const fabricaPorNome = new Map(contexto.fabricas.map((f) => [chaveNome(f.nome), f]))

  // produto|fábrica|referência → preços do mais novo pro mais velho
  const historico = new Map<string, PrecoExistente[]>()
  for (const p of contexto.precos) {
    const k = `${p.produto_id}|${p.fabrica_id}|${p.referencia_id ?? ''}`
    const lista = historico.get(k)
    if (lista) lista.push(p)
    else historico.set(k, [p])
  }

  const { fixas } = colunas
  const chaveNaPlanilha = new Map<string, number>()

  linhasPlanilha.forEach((bruta, i) => {
    const numero = i + 2
    const erros: string[] = []
    const sku = celulaTexto(bruta[fixas.sku!]) || null
    const descricao = fixas.descricao ? celulaTexto(bruta[fixas.descricao]) || null : null
    const fabricaTexto = celulaTexto(bruta[fixas.fabrica!]) || null
    const competenciaBruta = bruta[fixas.competencia!]

    const valores: { referencia: ItemApoio; valor: number }[] = []
    for (const { titulo, referencia } of colunas.tabelas) {
      const valor = lerValorPreco(bruta[titulo])
      if (valor === null) continue
      if (Number.isNaN(valor) || valor < 0) erros.push(`${referencia.nome}: "${celulaTexto(bruta[titulo])}" não é um preço válido`)
      else valores.push({ referencia, valor })
    }

    // sem nenhum preço preenchido: nada a fazer com a linha (o modelo traz o catálogo inteiro)
    if (!valores.length && !erros.length) return

    const linha: LinhaImportacaoPreco = {
      numero,
      sku,
      descricao,
      fabrica: fabricaTexto,
      competencia: lerCompetencia(competenciaBruta),
      produtoId: null,
      fabricaId: null,
      erros,
      precos: []
    }

    if (!sku) erros.push('SKU vazio')
    else {
      const achados = porSku.get(chaveNome(sku)) ?? []
      if (!achados.length) erros.push('SKU não cadastrado')
      else if (achados.length > 1) erros.push(`Há ${achados.length} produtos com esse SKU no cadastro`)
      else {
        linha.produtoId = achados[0]!.id
        linha.descricao ??= achados[0]!.descricao
      }
    }

    if (!fabricaTexto) erros.push('Fábrica vazia')
    else {
      const fabrica = fabricaPorNome.get(chaveNome(fabricaTexto))
      if (fabrica) linha.fabricaId = fabrica.id
      else erros.push(`Fábrica "${fabricaTexto}" não cadastrada`)
    }

    if (!linha.competencia) {
      erros.push(celulaTexto(competenciaBruta) ? `Data competência: "${celulaTexto(competenciaBruta)}" não é uma data válida` : 'Data competência vazia')
    }

    if (linha.produtoId && linha.fabricaId && linha.competencia) {
      const chave = `${linha.produtoId}|${linha.fabricaId}|${linha.competencia}`
      const anterior = chaveNaPlanilha.get(chave)
      if (anterior) erros.push(`SKU repetido na planilha pra mesma fábrica e mês (já está na linha ${anterior})`)
      else chaveNaPlanilha.set(chave, numero)
    }

    if (!erros.length) {
      for (const { referencia, valor } of valores) {
        const lista = historico.get(`${linha.produtoId}|${linha.fabricaId}|${referencia.id}`) ?? []
        const doMes = lista.find((p) => p.competencia === linha.competencia)
        let acao: AcaoPreco
        let valorAnterior: number | null = null
        if (doMes) {
          valorAnterior = Number(doMes.valor)
          acao = mesmoValor(valorAnterior, valor) ? 'nada' : 'substituir'
        } else {
          // o preço que vale hoje pra esse mês = o mais novo de antes dele
          const atual = lista.find((p) => p.competencia < linha.competencia!)
          valorAnterior = atual ? Number(atual.valor) : null
          acao = valorAnterior !== null && mesmoValor(valorAnterior, valor) ? 'nada' : 'criar'
        }
        linha.precos.push({ referenciaId: referencia.id, tabela: referencia.nome, valor, acao, valorAnterior })
      }
      if (!permissoes.incluir && linha.precos.some((p) => p.acao === 'criar')) erros.push('Você não tem permissão para incluir preços')
      if (!permissoes.editar && linha.precos.some((p) => p.acao === 'substituir')) erros.push('Você não tem permissão para editar preços')
    }

    if (erros.length) {
      linha.precos = []
      plano.totais.erro++
    } else {
      for (const p of linha.precos) plano.totais[p.acao]++
    }
    plano.linhas.push(linha)
  })

  return plano
}
