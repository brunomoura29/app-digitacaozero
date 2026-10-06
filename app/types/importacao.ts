import type { CampoSchema, TipoCampo } from '~/types/modelo'

/** Um arquivo importado pra um conjunto de dados (template com destino `dados`). */
export interface Importacao {
  id: string
  empresa_id: string
  modelo_id: string
  cliente_id: string
  /** 'AAAA-MM' (mensal) ou 'AAAA' (anual). */
  periodo: string
  arquivo_nome: string | null
  total_linhas: number
  criado_em: string
  modelos: { nome: string } | null
  clientes: { nome: string } | null
}

/** Linha do conjunto de dados — `dados` tem chave = id do campo de item do template. */
export interface LinhaImportacao {
  aba: string | null
  dados: Record<string, unknown>
}

export interface ImportacaoInput {
  modelo_id: string
  cliente_id: string
  periodo: string
  arquivo_nome: string | null
  extracao_id: string | null
  cabecalho: Record<string, unknown>
  linhas: LinhaImportacao[]
}

/** 'AAAA-MM' → 'MM/AAAA'; 'AAAA' fica como está. */
export function formatarPeriodo(periodo: string): string {
  const [ano, mes] = periodo.split('-')
  return mes ? `${mes}/${ano}` : (ano ?? '')
}

const VERDADEIROS = ['sim', 's', 'true', 'verdadeiro', '1', 'x', 'yes']
const FALSOS = ['nao', 'não', 'n', 'false', 'falso', '0', 'no']

function paraIso(d: Date): string {
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

/**
 * Converte o valor cru do arquivo pro tipo do campo, do jeito que vai ser gravado (e lido
 * pelo Power BI): número como `number`, data como 'AAAA-MM-DD', sim/não como boolean.
 * Vazio vira `null`. Quando não dá pra converter, devolve o texto original — a revisão
 * marca a célula como inválida (ver `problemaDaCelula`) em vez de perder o que veio.
 */
export function converterValor(valor: unknown, tipo: TipoCampo): unknown {
  if (valor == null) return null
  if (valor instanceof Date) return tipo === 'data' ? paraIso(valor) : valor.toLocaleDateString('pt-BR')
  const texto = String(valor).trim()
  if (!texto) return null

  switch (tipo) {
    case 'numero':
    case 'moeda': {
      if (typeof valor === 'number') return valor
      // contábil: "(1.234,56)" e "1.234,56-" são negativos; "1.234,56 C" (credor) também, e
      // "1.234,56 D" (devedor) é positivo — mesma convenção de quando o Excel só formata o sinal
      const natureza = texto.match(/\d\s*([dc])$/i)?.[1]?.toLowerCase()
      const negativo = /^\(.*\)$/.test(texto) || /-$/.test(texto) || natureza === 'c'
      let limpo = texto.replace(/[()\s]|R\$/g, '').replace(/-$/, '')
      if (natureza) limpo = limpo.slice(0, -1)
      // formato brasileiro: "." separa milhar e "," separa decimal
      if (limpo.includes(',')) limpo = limpo.replace(/\./g, '').replace(',', '.')
      // "1.234" / "1.234.567" sem vírgula: ponto é milhar, não decimal
      else if (/^-?\d{1,3}(\.\d{3})+$/.test(limpo)) limpo = limpo.replace(/\./g, '')
      if (!/^-?\d+(\.\d+)?$/.test(limpo)) return texto
      const numero = Number(limpo)
      return negativo ? -Math.abs(numero) : numero
    }
    case 'data': {
      if (/^\d{4}-\d{2}-\d{2}/.test(texto)) return texto.slice(0, 10)
      const br = texto.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/)
      if (!br) return texto
      const ano = br[3]!.length === 2 ? `20${br[3]}` : br[3]
      return `${ano}-${br[2]!.padStart(2, '0')}-${br[1]!.padStart(2, '0')}`
    }
    case 'booleano': {
      if (typeof valor === 'boolean') return valor
      const t = texto.toLowerCase()
      if (VERDADEIROS.includes(t)) return true
      if (FALSOS.includes(t)) return false
      return texto
    }
    default:
      return texto
  }
}

/** Motivo pelo qual a célula não pode ser gravada como está, ou `null` se está ok. */
export function problemaDaCelula(valor: unknown, campo: CampoSchema): string | null {
  if (valor == null || valor === '') return campo.obrigatorio ? 'Obrigatório' : null

  if ((campo.tipo === 'numero' || campo.tipo === 'moeda') && typeof valor !== 'number') return 'Não é um número'
  if (campo.tipo === 'data' && !/^\d{4}-\d{2}-\d{2}$/.test(String(valor))) return 'Não é uma data'
  if (campo.tipo === 'booleano' && typeof valor !== 'boolean') return 'Use Sim ou Não'

  if (campo.regex) {
    try {
      if (!new RegExp(campo.regex).test(String(valor))) return 'Fora do formato esperado'
    } catch {
      // regex inválida no template não pode travar a importação
    }
  }
  return null
}

/** Valor como aparece (e é editado) na tabela de revisão. */
export function exibirValor(valor: unknown): string {
  if (valor == null) return ''
  if (typeof valor === 'number') return valor.toLocaleString('pt-BR', { useGrouping: false, maximumFractionDigits: 6 })
  if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não'
  const texto = String(valor)
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return iso ? `${iso[3]}/${iso[2]}/${iso[1]}` : texto
}

/**
 * Linhas já mapeadas (chave = id do campo) → linhas tipadas do conjunto de dados. Linhas
 * totalmente vazias (comuns no fim de planilha) são descartadas.
 */
export function converterLinhas(
  linhasMapeadas: Record<string, unknown>[],
  abas: (string | null)[],
  campos: CampoSchema[]
): LinhaImportacao[] {
  const resultado: LinhaImportacao[] = []
  linhasMapeadas.forEach((linha, i) => {
    const dados: Record<string, unknown> = {}
    for (const campo of campos) dados[campo.id] = converterValor(linha[campo.id], campo.tipo)
    if (Object.values(dados).some((v) => v != null)) resultado.push({ aba: abas[i] ?? null, dados })
  })
  return resultado
}
