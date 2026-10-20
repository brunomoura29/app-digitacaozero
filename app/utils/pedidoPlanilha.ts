/**
 * Pedido que a loja manda em planilha "do jeito dela" — muitas vezes o catálogo inteiro da
 * fábrica com uma coluna de quantidade. A receita (da IA ou guardada do cliente) diz a aba, a
 * linha dos títulos, que coluna é cada campo e onde está o cabeçalho; aqui só tem lógica pura
 * que aplica a receita no arquivo inteiro. Quem abre o arquivo é `lerGradesPlanilha`.
 */
import type { CampoSchema, ReceitaLayout } from '~/types/modelo'
import { localizarCabecalho, montarAba } from '~/utils/gradePlanilha'
import type { AbaLida, Celula, GradePlanilha } from '~/utils/gradePlanilha'
import { gradeDaReceita, opcoesDaReceita, valorDoCabecalho } from '~/utils/layoutPlanilha'
import { aplicarEtapas } from '~/utils/tratamentoPlanilha'

export interface PedidoLido {
  grade: GradePlanilha
  aba: AbaLida
  /** Etapas do tratamento que não puderam ser aplicadas (fórmula inválida etc.). */
  erros: string[]
  /** Linhas que os filtros das etapas tiraram. */
  removidas: number
}

/**
 * Lê a aba do pedido seguindo a receita (ou, sem receita, as regras do leitor na primeira aba).
 * `linhaCabecalho` (0 = primeira) troca a linha dos títulos — escolhida à mão ou achada pela
 * assinatura do layout guardado. `null` = não deu pra ler (aba sem dado).
 */
export function lerPedido(grades: GradePlanilha[], receita: ReceitaLayout | null, linhaCabecalho?: number): PedidoLido | null {
  const grade = gradeDaReceita(grades, receita)
  if (!grade) return null
  const lida = montarAba(grade, receita ? opcoesDaReceita(receita, linhaCabecalho) : { linhaCabecalho })
  const tratada = aplicarEtapas(lida, receita?.etapas ?? [])
  if (!tratada.aba.linhas.length) return null
  return { grade, aba: tratada.aba, erros: tratada.erros, removidas: tratada.removidas }
}

/**
 * Lê com o layout guardado do cliente, se o arquivo ainda tiver os mesmos títulos (em qualquer
 * linha — a loja pode ter acrescentado linhas no topo). `null` = o formato mudou.
 */
export function lerPedidoComLayoutGuardado(
  grades: GradePlanilha[],
  receita: ReceitaLayout,
  assinatura: string
): PedidoLido | null {
  const grade = gradeDaReceita(grades, receita)
  if (!grade) return null
  const linha = localizarCabecalho(grade, assinatura, receita.titulos_em_duas_linhas)
  return linha == null ? null : lerPedido(grades, receita, linha)
}

/** Valor da planilha no formato que o campo do cabeçalho espera na tela (data = AAAA-MM-DD). */
function valorDoCampo(valor: Celula, campo: CampoSchema): unknown {
  if (valor == null) return ''
  // data numa célula sem formato de data chega como o número de série do Excel (dias desde 30/12/1899)
  if (campo.tipo === 'data' && typeof valor === 'number' && valor > 20_000 && valor < 80_000) {
    return new Date(Date.UTC(1899, 11, 30) + Math.round(valor) * 86_400_000).toISOString().slice(0, 10)
  }
  if (valor instanceof Date) {
    if (campo.tipo !== 'data') return valor.toLocaleDateString('pt-BR')
    const ano = valor.getFullYear()
    const mes = String(valor.getMonth() + 1).padStart(2, '0')
    const dia = String(valor.getDate()).padStart(2, '0')
    return `${ano}-${mes}-${dia}`
  }
  if (campo.tipo === 'booleano') return valor === true || /^(sim|s|x|true|verdadeiro)$/i.test(String(valor).trim())
  return typeof valor === 'string' ? valor.trim() : valor
}

/**
 * Campos do cabeçalho do template preenchidos com o que está acima da linha dos títulos.
 * Pela receita, quando ela diz onde está cada um; o que ela não cobre, pelo rótulo de mesmo
 * nome ("Transportadora" = "TRANSPORTADORA:"). Campo que não está na planilha fica vazio.
 */
export function cabecalhoDoPedido(
  lido: PedidoLido,
  receita: ReceitaLayout | null,
  campos: CampoSchema[]
): Record<string, unknown> {
  const ateLinha = lido.aba.linhaCabecalho
  const resultado: Record<string, unknown> = {}
  for (const campo of campos) {
    const regra = receita?.cabecalho?.find((r) => r.campo_id === campo.id) ?? { campo_id: campo.id, rotulo: campo.nome, celula: '' }
    resultado[campo.id] = valorDoCampo(valorDoCabecalho(lido.grade, regra, ateLinha), campo)
  }
  return resultado
}
