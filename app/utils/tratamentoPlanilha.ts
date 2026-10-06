/**
 * Etapas de tratamento da planilha — o que o usuário pediu em texto livre ("inverta o sinal da
 * receita", "fique só com as contas de resultado", "calcule a margem"), traduzido pela IA em
 * passos que o código executa em TODAS as linhas, na ordem. É o equivalente das "etapas
 * aplicadas" do Power Query: criar coluna por fórmula, manter/remover linhas por condição.
 *
 * As fórmulas são uma linguagem pequena no estilo do Excel, interpretada aqui — nunca é
 * executado código vindo da IA.
 *
 *   referências   [M]            valor da coluna M do Excel na linha
 *                 [#nivel]       nível da linha na coluna recuada (1, 2, 3…)
 *                 [#tipo]        "Total" ou "Detalhe"
 *                 [#mae1]        linha-mãe de nível 1 (idem [#mae2]…)
 *                 [#grupo]       título de grupo que vale pra linha
 *                 [@Nome]        coluna criada por uma etapa anterior
 *                 [!Período]     informação solta acima dos títulos, pelo rótulo (igual em todas as linhas)
 *   valores       123.45  "texto"  VERDADEIRO  FALSO
 *   operadores    + - * /   & (junta texto)   = <> < > <= >=
 *   funções       ver FUNCOES — argumentos separados por ";"
 */
import type { EtapaTratamento } from '~/types/modelo'
import type { AbaLida } from '~/utils/gradePlanilha'

type Valor = string | number | boolean | Date | null

type No =
  | { t: 'valor'; v: Valor }
  | { t: 'ref'; nome: string }
  | { t: 'un'; a: No }
  | { t: 'bin'; op: string; a: No; b: No }
  | { t: 'fn'; nome: string; args: No[] }

class ErroFormula extends Error {}

// ───────── leitura da fórmula ─────────

type Token = { t: 'num' | 'str' | 'ref' | 'id' | 'op'; v: string }

function tokens(formula: string): Token[] {
  const lista: Token[] = []
  let i = 0
  while (i < formula.length) {
    const c = formula[i]!
    if (/\s/.test(c)) {
      i++
    } else if (/\d/.test(c) || (c === '.' && /\d/.test(formula[i + 1] ?? ''))) {
      const m = formula.slice(i).match(/^\d*\.?\d+/)![0]
      lista.push({ t: 'num', v: m })
      i += m.length
    } else if (c === '"') {
      let texto = ''
      i++
      for (; ; i++) {
        if (i >= formula.length) throw new ErroFormula('texto sem aspas de fechamento')
        if (formula[i] === '"') {
          if (formula[i + 1] === '"') {
            texto += '"'
            i++
          } else break
        } else texto += formula[i]
      }
      i++
      lista.push({ t: 'str', v: texto })
    } else if (c === '[') {
      const fim = formula.indexOf(']', i)
      if (fim < 0) throw new ErroFormula('referência sem "]"')
      lista.push({ t: 'ref', v: formula.slice(i + 1, fim).trim() })
      i = fim + 1
    } else if (/[\p{L}_]/u.test(c)) {
      const m = formula.slice(i).match(/^[\p{L}_][\p{L}\d_]*/u)![0]
      lista.push({ t: 'id', v: m })
      i += m.length
    } else {
      const dois = formula.slice(i, i + 2)
      const op = ['<>', '<=', '>='].includes(dois) ? dois : c
      if (!'+-*/&=<>();'.includes(op[0]!)) throw new ErroFormula(`símbolo inesperado "${c}"`)
      lista.push({ t: 'op', v: op })
      i += op.length
    }
  }
  return lista
}

function semAcento(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

function analisar(formula: string): No {
  const ts = tokens(formula)
  let p = 0
  const olha = (v?: string) => (ts[p] && (v == null || (ts[p]!.t === 'op' && ts[p]!.v === v)) ? ts[p]! : null)
  const exige = (v: string) => {
    if (!olha(v)) throw new ErroFormula(`faltou "${v}"`)
    p++
  }

  function primario(): No {
    const tk = ts[p]
    if (!tk) throw new ErroFormula('fórmula incompleta')
    p++
    if (tk.t === 'num') return { t: 'valor', v: Number(tk.v) }
    if (tk.t === 'str') return { t: 'valor', v: tk.v }
    if (tk.t === 'ref') return { t: 'ref', nome: tk.v }
    if (tk.t === 'op' && tk.v === '(') {
      const dentro = comparacao()
      exige(')')
      return dentro
    }
    if (tk.t === 'op' && tk.v === '-') return { t: 'un', a: primario() }
    if (tk.t === 'id') {
      const nome = semAcento(tk.v).toUpperCase()
      if (nome === 'VERDADEIRO') return { t: 'valor', v: true }
      if (nome === 'FALSO') return { t: 'valor', v: false }
      if (!Object.hasOwn(FUNCOES, nome)) throw new ErroFormula(`função desconhecida "${tk.v}"`)
      exige('(')
      const args: No[] = []
      if (!olha(')')) {
        do args.push(comparacao())
        while (olha(';') && ++p)
      }
      exige(')')
      return { t: 'fn', nome, args }
    }
    throw new ErroFormula(`"${tk.v}" fora de lugar`)
  }
  function binario(proximo: () => No, ops: string[]): No {
    let no = proximo()
    for (let tk = ts[p]; tk && tk.t === 'op' && ops.includes(tk.v); tk = ts[p]) {
      p++
      no = { t: 'bin', op: tk.v, a: no, b: proximo() }
    }
    return no
  }
  const produto = () => binario(primario, ['*', '/'])
  const soma = () => binario(produto, ['+', '-', '&'])
  function comparacao(): No {
    const a = soma()
    const tk = ts[p]
    if (tk && tk.t === 'op' && ['=', '<>', '<', '>', '<=', '>='].includes(tk.v)) {
      p++
      return { t: 'bin', op: tk.v, a, b: soma() }
    }
    return a
  }

  const raiz = comparacao()
  if (p < ts.length) throw new ErroFormula(`"${ts[p]!.v}" sobrando no fim`)
  return raiz
}

// ───────── cálculo ─────────

function vazio(v: Valor): boolean {
  return v == null || (typeof v === 'string' && v.trim() === '')
}

/** Número de um valor da planilha: aceita "1.234,56", "(10,5)", "12-" e "905,91 C" (credor = negativo). */
function numero(v: Valor): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'boolean') return v ? 1 : 0
  if (typeof v !== 'string' || !v.trim()) return null
  const texto = v.trim()
  const natureza = texto.match(/\d\s*([dc])$/i)?.[1]?.toLowerCase()
  const negativo = /^\(.*\)$/.test(texto) || /-$/.test(texto) || /^-/.test(texto) || natureza === 'c'
  let limpo = texto.replace(/[()\s]|R\$|%/g, '').replace(/^-|-$/g, '')
  if (natureza) limpo = limpo.slice(0, -1)
  if (limpo.includes(',')) limpo = limpo.replace(/\./g, '').replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(limpo)) limpo = limpo.replace(/\./g, '')
  if (!/^\d+(\.\d+)?$/.test(limpo)) return null
  return negativo ? -Number(limpo) : Number(limpo)
}

function texto(v: Valor): string {
  if (v == null) return ''
  if (v instanceof Date) return v.toLocaleDateString('pt-BR')
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não'
  // número dentro de texto sai com vírgula decimal, como o usuário lê
  if (typeof v === 'number') return String(v).replace('.', ',')
  return String(v)
}

/** Comparar texto como o Excel: sem diferenciar maiúscula, acento nem espaço nas pontas. */
function chave(v: Valor): string {
  return semAcento(texto(v)).trim()
}

function verdade(v: Valor): boolean {
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  return !vazio(v)
}

function comparar(a: Valor, b: Valor): number {
  const na = vazio(a) ? null : numero(a)
  const nb = vazio(b) ? null : numero(b)
  if (na != null && nb != null) return na - nb
  return chave(a).localeCompare(chave(b))
}

const arredondar = (n: number, casas: number) => Math.round(n * 10 ** casas) / 10 ** casas

type Funcao = { min: number; max: number; f: (args: Valor[]) => Valor }

const FUNCOES: Record<string, Funcao> = {
  // SE só calcula o lado escolhido — é tratada à parte em `calcular`
  SE: { min: 2, max: 3, f: () => null },
  E: { min: 1, max: 20, f: (a) => a.every(verdade) },
  OU: { min: 1, max: 20, f: (a) => a.some(verdade) },
  NAO: { min: 1, max: 1, f: ([a]) => !verdade(a!) },
  VAZIO: { min: 1, max: 1, f: ([a]) => vazio(a!) },
  CONTEM: { min: 2, max: 2, f: ([a, b]) => chave(b!) !== '' && chave(a!).includes(chave(b!)) },
  COMECA: { min: 2, max: 2, f: ([a, b]) => chave(b!) !== '' && chave(a!).startsWith(chave(b!)) },
  TERMINA: { min: 2, max: 2, f: ([a, b]) => chave(b!) !== '' && chave(a!).endsWith(chave(b!)) },
  MAIUSCULA: { min: 1, max: 1, f: ([a]) => texto(a!).toUpperCase() },
  MINUSCULA: { min: 1, max: 1, f: ([a]) => texto(a!).toLowerCase() },
  ARRUMAR: { min: 1, max: 1, f: ([a]) => texto(a!).trim().replace(/\s+/g, ' ') },
  TAMANHO: { min: 1, max: 1, f: ([a]) => texto(a!).length },
  ESQUERDA: { min: 2, max: 2, f: ([a, n]) => texto(a!).slice(0, Math.max(numero(n!) ?? 0, 0)) },
  DIREITA: {
    min: 2,
    max: 2,
    f: ([a, n]) => {
      const quantos = Math.max(numero(n!) ?? 0, 0)
      return quantos ? texto(a!).slice(-quantos) : ''
    }
  },
  TROCAR: { min: 3, max: 3, f: ([a, de, para]) => (texto(de!) ? texto(a!).split(texto(de!)).join(texto(para!)) : texto(a!)) },
  TEXTO: { min: 1, max: 1, f: ([a]) => texto(a!) },
  NUMERO: { min: 1, max: 1, f: ([a]) => numero(a!) },
  ABS: {
    min: 1,
    max: 1,
    f: ([a]) => {
      const n = numero(a!)
      return n == null ? null : Math.abs(n)
    }
  },
  ARREDONDAR: {
    min: 1,
    max: 2,
    f: ([a, casas]) => {
      const n = numero(a!)
      return n == null ? null : arredondar(n, numero(casas ?? 0) ?? 0)
    }
  }
}

function calcular(no: No, ref: (nome: string) => Valor): Valor {
  switch (no.t) {
    case 'valor':
      return no.v
    case 'ref':
      return ref(no.nome)
    case 'un': {
      const n = numero(calcular(no.a, ref))
      return n == null ? null : -n
    }
    case 'fn': {
      const funcao = FUNCOES[no.nome]!
      if (no.args.length < funcao.min || no.args.length > funcao.max) {
        throw new ErroFormula(`${no.nome} recebeu ${no.args.length} argumento(s)`)
      }
      if (no.nome === 'SE') {
        const escolhido = verdade(calcular(no.args[0]!, ref)) ? no.args[1] : no.args[2]
        return escolhido ? calcular(escolhido, ref) : null
      }
      return funcao.f(no.args.map((arg) => calcular(arg, ref)))
    }
    case 'bin': {
      const a = calcular(no.a, ref)
      const b = calcular(no.b, ref)
      switch (no.op) {
        case '&':
          return texto(a) + texto(b)
        case '=':
          return comparar(a, b) === 0
        case '<>':
          return comparar(a, b) !== 0
        case '<':
          return comparar(a, b) < 0
        case '>':
          return comparar(a, b) > 0
        case '<=':
          return comparar(a, b) <= 0
        case '>=':
          return comparar(a, b) >= 0
      }
      // conta com célula vazia ou texto dá vazio, não zero — pra não inventar número
      const na = numero(a)
      const nb = numero(b)
      if (na == null || nb == null) return null
      if (no.op === '+') return na + nb
      if (no.op === '-') return na - nb
      if (no.op === '*') return na * nb
      return nb === 0 ? null : na / nb
    }
  }
}

// ───────── aplicação na aba ─────────

/** De onde sai o valor de uma referência: de uma coluna da aba, ou um valor fixo (o mesmo em todas as linhas). */
type Fonte = { coluna: string } | { fixo: Valor }

const soLetras = (t: string) => semAcento(t).replace(/[^a-z0-9]/g, '')

function resolverReferencia(aba: AbaLida, criadas: Map<string, string>, nome: string): Fonte {
  if (nome.startsWith('@')) {
    const coluna = criadas.get(semAcento(nome.slice(1)).trim())
    if (!coluna) throw new ErroFormula(`não existe coluna criada chamada "${nome.slice(1)}"`)
    return { coluna }
  }
  if (nome.startsWith('!')) {
    // informação solta acima dos títulos ("Período: 01/09/2023 - 30/09/2023") — vale pra todas as linhas
    const rotulo = soLetras(nome.slice(1))
    const info = aba.informacoes.find((i) => soLetras(i.rotulo) === rotulo)
    if (!info) throw new ErroFormula(`não há "${nome.slice(1)}" acima dos títulos da planilha`)
    return { fixo: info.valor }
  }
  const achar = (serve: (origem: AbaLida['origens'][string]) => boolean, oQue: string): Fonte => {
    const coluna = aba.colunas.find((c) => aba.origens[c] && serve(aba.origens[c]!))
    if (!coluna) throw new ErroFormula(`a planilha não tem ${oQue}`)
    return { coluna }
  }
  if (nome.startsWith('#')) {
    const chaveRef = semAcento(nome.slice(1)).trim()
    if (chaveRef === 'nivel') return achar((o) => o.tipo === 'nivel', 'coluna recuada em níveis')
    if (chaveRef === 'tipo') return achar((o) => o.tipo === 'tipo_linha', 'coluna recuada em níveis')
    if (chaveRef === 'grupo') return achar((o) => o.tipo === 'grupo', 'títulos de grupo')
    const mae = chaveRef.match(/^mae(\d+)$/)
    if (mae) return achar((o) => o.tipo === 'ancestral' && o.nivel === Number(mae[1]), `linha-mãe de nível ${mae[1]}`)
    throw new ErroFormula(`referência desconhecida "[${nome}]"`)
  }
  const letra = nome.toUpperCase()
  if (!/^[A-Z]{1,3}$/.test(letra)) throw new ErroFormula(`referência desconhecida "[${nome}]"`)
  let indice = 0
  for (const ch of letra) indice = indice * 26 + (ch.charCodeAt(0) - 64)
  return achar((o) => o.tipo === 'coluna' && o.colunas.includes(indice - 1), `dados na coluna ${letra}`)
}

export interface ResultadoTratamento {
  aba: AbaLida
  /** Uma mensagem por etapa que não pôde ser aplicada (a etapa é pulada, as outras seguem). */
  erros: string[]
  /** Quantas linhas os filtros tiraram. */
  removidas: number
}

/**
 * Aplica as etapas na aba, na ordem. Etapa com fórmula inválida ou que aponta pra algo que não
 * existe é pulada e relatada — o resto do tratamento continua.
 */
export function aplicarEtapas(aba: AbaLida, etapas: EtapaTratamento[]): ResultadoTratamento {
  const saida: AbaLida = { ...aba, colunas: [...aba.colunas], origens: { ...aba.origens }, linhas: aba.linhas }
  const erros: string[] = []
  const criadas = new Map<string, string>()
  const totalInicial = aba.linhas.length

  for (const etapa of etapas) {
    const rotulo = etapa.tipo === 'coluna' ? `Coluna “${etapa.nome}”` : etapa.explicacao || 'Filtro de linhas'
    try {
      const arvore = analisar(etapa.formula)
      // resolve as referências uma vez, antes de percorrer as linhas
      const fontes = new Map<string, Fonte>()
      const visitar = (no: No) => {
        if (no.t === 'ref') fontes.set(no.nome, resolverReferencia(saida, criadas, no.nome))
        else if (no.t === 'un') visitar(no.a)
        else if (no.t === 'bin') (visitar(no.a), visitar(no.b))
        else if (no.t === 'fn') no.args.forEach(visitar)
      }
      visitar(arvore)
      const valorDa = (linha: Record<string, unknown>) =>
        calcular(arvore, (nome) => {
          const fonte = fontes.get(nome)!
          return 'fixo' in fonte ? fonte.fixo : ((linha[fonte.coluna] ?? null) as Valor)
        })

      if (etapa.tipo === 'coluna') {
        const nomeBase = etapa.nome.trim()
        if (!nomeBase) throw new ErroFormula('a coluna nova está sem nome')
        let nome = nomeBase
        for (let n = 2; saida.colunas.includes(nome); n++) nome = `${nomeBase} (${n})`

        let ultimo: Valor = null
        saida.linhas = saida.linhas.map((linha) => {
          let valor = valorDa(linha)
          if (etapa.repetir_abaixo) {
            if (vazio(valor)) valor = ultimo
            else ultimo = valor
          }
          return { ...linha, [nome]: valor }
        })
        saida.colunas.push(nome)
        saida.origens[nome] = { tipo: 'calculada', colunas: [], etapa: nomeBase }
        criadas.set(semAcento(nomeBase).trim(), nome)
      } else {
        const manter = etapa.tipo === 'manter'
        saida.linhas = saida.linhas.filter((linha) => verdade(valorDa(linha)) === manter)
      }
    } catch (e) {
      if (!(e instanceof ErroFormula)) throw e
      erros.push(`${rotulo}: ${e.message} — fórmula ${etapa.formula}`)
    }
  }

  return { aba: saida, erros, removidas: totalInicial - saida.linhas.length }
}
