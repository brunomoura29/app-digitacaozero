/**
 * Políticas comerciais do cliente — regras puras (sem banco): qual política vale pra um item
 * do pedido, quanto ela ajusta o preço e como descrevê-la na tela.
 *
 * Regras combinadas com o usuário:
 * - a política é de um cliente + uma fábrica; ajusta o preço que veio da tabela de preço;
 * - alcança todos os produtos, um grupo ou um produto — a mais específica vence
 *   (produto > grupo > todos), só uma vale por item;
 * - % fixo ou faixas por quantidade (vale a maior faixa que a quantidade alcança);
 * - sem prazo ou válida até uma data — conta a data do pedido.
 */
import type { AlcancePolitica, FaixaPolitica, PoliticaCliente } from '~/types/politica'

const PRIORIDADE: Record<AlcancePolitica, number> = { produto: 3, grupo: 2, todos: 1 }

/** Ativa e dentro do prazo na data (AAAA-MM-DD). */
export function politicaVigente(p: Pick<PoliticaCliente, 'ativo' | 'valida_ate'>, data: string): boolean {
  return p.ativo && (!p.valida_ate || p.valida_ate >= data)
}

/** Hoje em AAAA-MM-DD no fuso do navegador (não em UTC — à noite o UTC já é amanhã). */
export function hojeLocal(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Faixas em ordem crescente de quantidade. */
export function ordenarFaixas(faixas: FaixaPolitica[]): FaixaPolitica[] {
  return [...faixas].sort((a, b) => a.a_partir_de - b.a_partir_de)
}

/** % da política pra essa quantidade — null se a quantidade não alcança nenhuma faixa. */
export function percentualDaPolitica(p: Pick<PoliticaCliente, 'tipo' | 'percentual' | 'faixas'>, quantidade: number): number | null {
  if (p.tipo === 'percentual') return p.percentual
  let achado: number | null = null
  for (const f of ordenarFaixas(p.faixas)) {
    if (quantidade >= f.a_partir_de) achado = f.percentual
  }
  return achado
}

export interface PoliticaAplicada {
  politica: PoliticaCliente
  percentual: number
}

/**
 * A política que vale pro item: das vigentes na data, a mais específica que alcança o produto.
 * Faixa que a quantidade não alcança = sem ajuste (e não cai pra política mais geral — a
 * política específica existe, só não dá desconto nessa quantidade).
 */
export function resolverPolitica(
  politicas: PoliticaCliente[],
  produto: { id: string; grupo_id: string | null },
  quantidade: number,
  data: string
): PoliticaAplicada | null {
  const candidatas = politicas.filter(
    (p) =>
      politicaVigente(p, data) &&
      (p.alcance === 'todos' ||
        (p.alcance === 'grupo' && !!produto.grupo_id && p.grupo_id === produto.grupo_id) ||
        (p.alcance === 'produto' && p.produto_id === produto.id))
  )
  if (!candidatas.length) return null
  const escolhida = candidatas.reduce((a, b) => (PRIORIDADE[b.alcance] > PRIORIDADE[a.alcance] ? b : a))
  const percentual = percentualDaPolitica(escolhida, quantidade)
  return percentual === null ? null : { politica: escolhida, percentual }
}

/** Preço de tabela com o % aplicado, em centavos redondos. */
export function aplicarPercentual(valor: number, percentual: number): number {
  return Math.round(valor * (1 + percentual / 100) * 100) / 100
}

const fmtPct = (n: number) => `${Math.abs(n).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}%`

/** "−10%" / "+5%" */
export function rotuloPercentual(n: number): string {
  return `${n < 0 ? '−' : '+'}${fmtPct(n)}`
}

/** "Todos os produtos" / "Grupo Freios" / "Produto Pastilha X" */
export function rotuloAlcance(p: Pick<PoliticaCliente, 'alcance' | 'grupos' | 'produtos'>): string {
  if (p.alcance === 'grupo') return `Grupo ${p.grupos?.nome ?? '—'}`
  if (p.alcance === 'produto') return `Produto ${p.produtos?.descricao ?? '—'}`
  return 'Todos os produtos'
}

/** "Desconto de 10%" / "1+ un.: −5% · 10+ un.: −8%" */
export function rotuloRegra(p: Pick<PoliticaCliente, 'tipo' | 'percentual' | 'faixas'>): string {
  if (p.tipo === 'percentual') {
    const n = p.percentual ?? 0
    return `${n < 0 ? 'Desconto' : 'Acréscimo'} de ${fmtPct(n)}`
  }
  return ordenarFaixas(p.faixas)
    .map((f) => `${f.a_partir_de.toLocaleString('pt-BR')}+ un.: ${rotuloPercentual(f.percentual)}`)
    .join(' · ')
}

/**
 * Outra política ativa e vigente hoje com o mesmo cliente + fábrica + alvo — não pode ter duas
 * valendo ao mesmo tempo pro mesmo alvo (o pedido não saberia qual usar).
 */
export function politicaEmConflito(
  nova: Pick<PoliticaCliente, 'fabrica_id' | 'alcance' | 'grupo_id' | 'produto_id' | 'ativo' | 'valida_ate'> & { id?: string },
  existentes: PoliticaCliente[],
  hoje: string
): PoliticaCliente | null {
  if (!politicaVigente(nova, hoje)) return null
  return (
    existentes.find(
      (p) =>
        p.id !== nova.id &&
        p.fabrica_id === nova.fabrica_id &&
        p.alcance === nova.alcance &&
        (p.grupo_id ?? null) === (nova.grupo_id ?? null) &&
        (p.produto_id ?? null) === (nova.produto_id ?? null) &&
        politicaVigente(p, hoje)
    ) ?? null
  )
}
