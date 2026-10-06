/**
 * Leitura de planilha "de relatório" (ex: balancete exportado do sistema contábil): os títulos
 * das colunas não estão na linha 1, há dados da empresa no topo, rodapé no fim e uma mesma
 * coluna (a descrição) vem recuada em várias colunas do Excel, uma por nível.
 *
 * Aqui só tem lógica pura sobre a grade de células — quem abre o arquivo é
 * `lerGradesPlanilha` (composables/useImportarPlanilha.ts). Planilha simples (títulos na
 * linha 1, um dado por coluna) passa por aqui sem mudar nada.
 *
 * Sem opções, tudo é detectado por regra. As `OpcoesLeitura` existem pra quando alguém já
 * sabe como o arquivo é — a IA que leu o layout ou o que ficou guardado da importação
 * anterior do mesmo cliente (ver utils/layoutPlanilha.ts).
 */

export type Celula = string | number | boolean | Date | null

/** Uma aba como está no arquivo: células cruas a partir de A1. */
export interface GradePlanilha {
  nome: string
  linhas: Celula[][]
  /** Células mescladas na horizontal: a linha, a coluna onde começam e a coluna onde terminam. */
  mescladas: { linha: number; de: number; ate: number }[]
}

export interface OpcoesLeitura {
  /** Linha dos títulos (0 = primeira linha da planilha). Sem ela, detecta. */
  linhaCabecalho?: number
  /** O título de cada coluna está partido em duas linhas (ex: "Saldo" em cima, "Débito"/"Crédito" embaixo). */
  titulosEmDuasLinhas?: boolean
  /** Linhas a deixar de fora (subtotal, total geral): as que têm esse texto nessa coluna. */
  ignorar?: { coluna: number; contem: string }[]
  /**
   * Coluna onde aparecem os títulos de grupo — linha com uma célula só (ex: "Filial 01"), que
   * vale pras linhas de baixo. Vira a coluna "Grupo" em cada linha.
   */
  colunaGrupo?: number | null
}

/** Par "rótulo: valor" achado acima dos títulos (ex: Empresa, CNPJ, Período). */
export interface InformacaoPlanilha {
  rotulo: string
  valor: Celula
}

/** De onde sai cada coluna lida — pra casar com as letras de coluna do Excel. */
export interface OrigemColuna {
  /**
   * `coluna` vem direto das células; `nivel`, `tipo_linha`, `ancestral` e `grupo` saem da
   * estrutura da planilha; `calculada` é criada por uma etapa de tratamento (utils/tratamentoPlanilha.ts).
   */
  tipo: 'coluna' | 'nivel' | 'tipo_linha' | 'ancestral' | 'grupo' | 'calculada'
  /** Colunas do Excel (0 = A) ligadas a ela: a do título e as que têm os dados. */
  colunas: number[]
  /** Só em `ancestral`: de que nível é a linha-mãe repetida (1 = o mais alto). */
  nivel?: number
  /** Só em `calculada`: o nome que a etapa deu à coluna. */
  etapa?: string
}

export interface AbaLida {
  nome: string
  colunas: string[]
  linhas: Record<string, unknown>[]
  /** Linha onde estão os títulos das colunas (0 = primeira linha da planilha). */
  linhaCabecalho: number
  informacoes: InformacaoPlanilha[]
  /** Colunas que vêm recuadas em níveis — cada uma ganha "Nível (…)", "Tipo de linha (…)" e "… de nível N". */
  hierarquias: string[]
  /** Linhas ignoradas depois dos títulos: rodapé, faixa de título, título repetido e as das regras de `ignorar`. */
  descartadas: number
  origens: Record<string, OrigemColuna>
  /** Os títulos e onde estão — muda quando o layout do arquivo muda (ver `assinaturaDosTitulos`). */
  assinatura: string
}

/** Só procura os títulos no começo da planilha, e confere as linhas logo abaixo de cada candidata. */
const LIMITE_BUSCA_CABECALHO = 50
const JANELA_CABECALHO = 20

export const TIPO_TOTAL = 'Total'
export const TIPO_DETALHE = 'Detalhe'
export const COLUNA_GRUPO = 'Grupo'

export function colunaNivel(coluna: string) {
  return `Nível (${coluna})`
}
export function colunaTipo(coluna: string) {
  return `Tipo de linha (${coluna})`
}
/** A linha-mãe de nível `nivel` repetida em cada linha de baixo (ex: "ATIVO" em todas as contas do ativo). */
export function colunaAncestral(coluna: string, nivel: number) {
  return `${coluna} de nível ${nivel}`
}

function vazia(valor: Celula | undefined): boolean {
  return valor == null || (typeof valor === 'string' && valor.trim() === '')
}

function preenchidas(linha: Celula[] | undefined): number[] {
  const colunas: number[] = []
  linha?.forEach((valor, c) => {
    if (!vazia(valor)) colunas.push(c)
  })
  return colunas
}

/** Minúsculo, sem acento e sem pontuação — pra comparar texto de célula. */
function simplificar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]/g, '')
}

/** Índice do título que "manda" na coluna `c`: o último título à esquerda dela (-1 = nenhum). */
function grupoDe(colunasTitulo: number[], c: number): number {
  let grupo = -1
  for (let i = 0; i < colunasTitulo.length && colunasTitulo[i]! <= c; i++) grupo = i
  return grupo
}

/** 0 → "A", 26 → "AA". */
export function letraDaColuna(c: number): string {
  let letra = ''
  for (let n = c + 1; n > 0; n = Math.floor((n - 1) / 26)) letra = String.fromCharCode(65 + ((n - 1) % 26)) + letra
  return letra
}

/** "A" → 0, "AA" → 26; `null` se não for letra de coluna. */
export function indiceDaColuna(letra: string): number | null {
  const limpa = letra.trim().toUpperCase()
  if (!/^[A-Z]{1,3}$/.test(limpa)) return null
  let n = 0
  for (const ch of limpa) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

/**
 * Acha a linha dos títulos: é uma linha só de texto, com pelo menos 2 células, seguida de
 * linhas que preenchem as mesmas colunas. Ganha a que tem mais colunas acompanhadas por mais
 * linhas; no empate, a primeira (planilha simples = linha 1). É um palpite — a tela deixa trocar.
 */
export function detectarLinhaCabecalho(linhas: Celula[][]): number {
  let melhor = 0
  let melhorPontos = 0
  for (let i = 0; i < Math.min(linhas.length, LIMITE_BUSCA_CABECALHO); i++) {
    const titulos = preenchidas(linhas[i])
    if (titulos.length < 2 || titulos.some((c) => typeof linhas[i]![c] !== 'string')) continue

    let acompanham = 0
    for (let j = i + 1; j < Math.min(linhas.length, i + 1 + JANELA_CABECALHO); j++) {
      const grupos = new Set(preenchidas(linhas[j]).map((c) => grupoDe(titulos, c)))
      grupos.delete(-1)
      if (grupos.size >= 2 && grupos.size * 2 >= titulos.length) acompanham++
    }
    const pontos = acompanham * titulos.length
    if (pontos > melhorPontos) {
      melhor = i
      melhorPontos = pontos
    }
  }
  return melhor
}

/**
 * Título de cada coluna do Excel (`null` = sem título). Em duas linhas, junta o de cima com o
 * de baixo ("Saldo" + "Débito" = "Saldo Débito"); o de cima vale pra todas as colunas da
 * célula mesclada dele, mas só onde há título embaixo.
 */
function titulosDasColunas(grade: GradePlanilha, linha: number, emDuasLinhas: boolean): (string | null)[] {
  const baixo = grade.linhas[linha] ?? []
  const cima = emDuasLinhas && linha > 0 ? (grade.linhas[linha - 1] ?? []) : []
  const texto = (valor: Celula | undefined) => (vazia(valor) ? '' : String(valor).trim())

  const largura = Math.max(baixo.length, cima.length)
  const titulos: (string | null)[] = []
  for (let c = 0; c < largura; c++) {
    const deBaixo = texto(baixo[c])
    let deCima = texto(cima[c])
    if (!deCima && deBaixo && cima.length) {
      const mescla = grade.mescladas.find((m) => m.linha === linha - 1 && m.de <= c && c <= m.ate)
      if (mescla) deCima = texto(cima[mescla.de])
    }
    titulos.push([deCima, deBaixo].filter(Boolean).join(' ') || null)
  }
  return titulos
}

function assinar(titulos: (string | null)[]): string {
  return titulos
    .map((titulo, c) => (titulo ? `${letraDaColuna(c)}:${simplificar(titulo)}` : null))
    .filter(Boolean)
    .join('|')
}

/**
 * "Impressão digital" do layout: os títulos e em que coluna do Excel cada um está. Dois
 * arquivos do mesmo sistema têm a mesma; se o cliente mudar o formato, ela muda.
 */
export function assinaturaDosTitulos(grade: GradePlanilha, linha: number, emDuasLinhas = false): string {
  return assinar(titulosDasColunas(grade, linha, emDuasLinhas))
}

/** Procura no começo da planilha a linha cujos títulos batem com `assinatura` (`null` = o layout mudou). */
export function localizarCabecalho(grade: GradePlanilha, assinatura: string, emDuasLinhas = false): number | null {
  if (!assinatura) return null
  for (let i = 0; i < Math.min(grade.linhas.length, LIMITE_BUSCA_CABECALHO); i++) {
    if (assinaturaDosTitulos(grade, i, emDuasLinhas) === assinatura) return i
  }
  return null
}

function nomesSemRepetir(nomes: string[]): string[] {
  const usados = new Map<string, number>()
  return nomes.map((nome) => {
    const vezes = (usados.get(nome) ?? 0) + 1
    usados.set(nome, vezes)
    return vezes === 1 ? nome : `${nome} (${vezes})`
  })
}

/**
 * Transforma a grade em colunas + linhas.
 *
 * Cada título é dono das colunas do Excel entre ele e o próximo título. Quando os dados
 * debaixo de um título nunca ocupam duas dessas colunas na mesma linha, elas são a mesma
 * coluna recuada em níveis: viram uma só, mais "Nível" (1 = mais à esquerda), "Tipo de linha"
 * (Total quando a linha seguinte é de nível mais fundo, Detalhe quando não) e uma coluna por
 * nível acima do último com a linha-mãe daquele nível repetida pra baixo (pra filtrar "tudo
 * que está dentro de X"). Se ocupam, são colunas diferentes sem título e saem separadas como
 * "Coluna X".
 */
export function montarAba(grade: GradePlanilha, opcoes: OpcoesLeitura = {}): AbaLida {
  const indiceCabecalho = opcoes.linhaCabecalho ?? detectarLinhaCabecalho(grade.linhas)
  const titulos = titulosDasColunas(grade, indiceCabecalho, !!opcoes.titulosEmDuasLinhas)
  const colunasTitulo = titulos.flatMap((titulo, c) => (titulo ? [c] : []))
  const aba: AbaLida = {
    nome: grade.nome,
    colunas: [],
    linhas: [],
    linhaCabecalho: indiceCabecalho,
    informacoes: [],
    hierarquias: [],
    descartadas: 0,
    origens: {},
    assinatura: assinar(titulos)
  }
  if (!colunasTitulo.length) return aba

  // "Rótulo: valor" acima dos títulos
  const primeiraLinhaTitulo = indiceCabecalho - (opcoes.titulosEmDuasLinhas ? 1 : 0)
  for (const linha of grade.linhas.slice(0, Math.max(primeiraLinhaTitulo, 0))) {
    const [primeira, segunda] = preenchidas(linha)
    const rotulo = primeira == null ? null : linha[primeira]
    if (typeof rotulo !== 'string' || segunda == null) continue
    aba.informacoes.push({ rotulo: rotulo.trim().replace(/\s*:$/, ''), valor: linha[segunda] ?? null })
  }

  const regrasIgnorar = (opcoes.ignorar ?? [])
    .map((regra) => ({ coluna: regra.coluna, contem: simplificar(regra.contem) }))
    .filter((regra) => regra.contem)
  const colunaGrupo = opcoes.colunaGrupo ?? null
  const linhaDosTitulos = grade.linhas[indiceCabecalho] ?? []
  const colunasDaLinhaDosTitulos = preenchidas(linhaDosTitulos)

  // linhas de dado: tira as vazias, o título repetido (quebra de página), as faixas de texto
  // mescladas por cima de várias colunas (rodapé, título de seção) e as das regras de ignorar;
  // o título de grupo não é dado, mas fica valendo pras linhas de baixo
  const dados: Celula[][] = []
  const grupoDaLinha: (string | null)[] = []
  let grupoAtual: string | null = null
  for (let r = indiceCabecalho + 1; r < grade.linhas.length; r++) {
    const linha = grade.linhas[r]!
    const cheias = preenchidas(linha)
    if (!cheias.length) continue

    if (colunaGrupo != null && cheias.length === 1 && cheias[0] === colunaGrupo) {
      grupoAtual = String(linha[colunaGrupo]).trim()
      continue
    }

    const repeteTitulos =
      colunasDaLinhaDosTitulos.length >= 2 &&
      colunasDaLinhaDosTitulos.every((c) => String(linha[c] ?? '').trim() === String(linhaDosTitulos[c]).trim())
    const faixa =
      cheias.length === 1 &&
      grade.mescladas.some(
        (m) => m.linha === r && m.de === cheias[0] && grupoDe(colunasTitulo, m.ate) !== grupoDe(colunasTitulo, m.de)
      )
    const ignorada = regrasIgnorar.some((regra) => simplificar(String(linha[regra.coluna] ?? '')).includes(regra.contem))

    if (repeteTitulos || faixa || ignorada) aba.descartadas++
    else {
      dados.push(linha)
      grupoDaLinha.push(grupoAtual)
    }
  }

  // colunas do Excel que têm dado, agrupadas pelo título que manda nelas
  const comDado = new Set<number>()
  for (const linha of dados) for (const c of preenchidas(linha)) comDado.add(c)
  const grupos = new Map<number, number[]>()
  for (const c of [...comDado].sort((a, b) => a - b)) {
    const grupo = grupoDe(colunasTitulo, c)
    grupos.set(grupo, [...(grupos.get(grupo) ?? []), c])
  }

  interface ColunaSaida {
    nome: string
    tipo: OrigemColuna['tipo']
    /** Colunas do Excel de onde o valor sai (a primeira preenchida). */
    origem: number[]
    /** Coluna do título, quando não é a mesma dos dados. */
    titulo?: number
    /** Só em `ancestral`. */
    nivel?: number
  }
  const saida: ColunaSaida[] = []
  const semTitulo = (c: number): ColunaSaida => ({ nome: `Coluna ${letraDaColuna(c)}`, tipo: 'coluna', origem: [c] })

  for (const c of grupos.get(-1) ?? []) saida.push(semTitulo(c))
  colunasTitulo.forEach((colunaTitulo, grupo) => {
    const nome = titulos[colunaTitulo]!
    const usadas = grupos.get(grupo) ?? []
    const umaPorLinha = dados.every((linha) => usadas.filter((c) => !vazia(linha[c])).length <= 1)

    if (!umaPorLinha) {
      saida.push({ nome, tipo: 'coluna', origem: [colunaTitulo] })
      for (const c of usadas) if (c !== colunaTitulo) saida.push(semTitulo(c))
      return
    }
    saida.push({ nome, tipo: 'coluna', origem: usadas, titulo: colunaTitulo })
    if (usadas.length > 1) {
      aba.hierarquias.push(nome)
      saida.push({ nome: colunaNivel(nome), tipo: 'nivel', origem: usadas, titulo: colunaTitulo })
      saida.push({ nome: colunaTipo(nome), tipo: 'tipo_linha', origem: usadas, titulo: colunaTitulo })
      // o último nível não entra: nele a "linha-mãe" seria sempre a própria linha
      for (let nivel = 1; nivel < usadas.length; nivel++) {
        saida.push({ nome: colunaAncestral(nome, nivel), tipo: 'ancestral', origem: usadas, titulo: colunaTitulo, nivel })
      }
    }
  })
  if (colunaGrupo != null && grupoDaLinha.some(Boolean)) {
    saida.push({ nome: COLUNA_GRUPO, tipo: 'grupo', origem: [colunaGrupo] })
  }

  aba.colunas = nomesSemRepetir(saida.map((s) => s.nome))
  saida.forEach((coluna, k) => {
    const colunas = coluna.titulo == null ? coluna.origem : [...new Set([coluna.titulo, ...coluna.origem])]
    aba.origens[aba.colunas[k]!] = { tipo: coluna.tipo, colunas, ...(coluna.nivel ? { nivel: coluna.nivel } : {}) }
  })

  /** Nível da linha numa coluna recuada: posição (1, 2, 3…) da coluna do Excel onde o valor está. */
  const nivelDe = (linha: Celula[] | undefined, origem: number[]): number | null => {
    const posicao = linha ? origem.findIndex((c) => !vazia(linha[c])) : -1
    return posicao < 0 ? null : posicao + 1
  }

  // caminho de cada linha numa coluna recuada: a linha-mãe de cada nível, do 1 até o dela
  // (chave = as colunas do Excel da coluna recuada)
  const caminhos = new Map<string, Celula[][]>()
  for (const coluna of saida) {
    const chave = coluna.origem.join(',')
    if (coluna.tipo !== 'ancestral' || caminhos.has(chave)) continue
    let atual: Celula[] = []
    caminhos.set(
      chave,
      dados.map((linha) => {
        const nivel = nivelDe(linha, coluna.origem)
        if (nivel == null) return []
        const novo = atual.slice(0, nivel - 1)
        // nível pulado (uma linha de nível 3 logo abaixo de uma de nível 1) fica sem mãe naquele nível
        while (novo.length < nivel - 1) novo.push(null)
        novo.push(linha[coluna.origem[nivel - 1]!] ?? null)
        atual = novo
        return novo
      })
    )
  }

  aba.linhas = dados.map((linha, i) => {
    const registro: Record<string, unknown> = {}
    saida.forEach((coluna, k) => {
      const nome = aba.colunas[k]!
      if (coluna.tipo === 'grupo') {
        registro[nome] = grupoDaLinha[i]
      } else if (coluna.tipo === 'ancestral') {
        registro[nome] = caminhos.get(coluna.origem.join(','))?.[i]?.[coluna.nivel! - 1] ?? null
      } else if (coluna.tipo === 'nivel' || coluna.tipo === 'tipo_linha') {
        const nivel = nivelDe(linha, coluna.origem)
        if (coluna.tipo === 'nivel' || nivel == null) registro[nome] = nivel
        else registro[nome] = (nivelDe(dados[i + 1], coluna.origem) ?? 0) > nivel ? TIPO_TOTAL : TIPO_DETALHE
      } else {
        const c = coluna.origem.find((col) => !vazia(linha[col]))
        registro[nome] = c == null ? null : linha[c]
      }
    })
    return registro
  })

  return aba
}
