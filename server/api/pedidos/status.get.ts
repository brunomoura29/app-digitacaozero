import { serverSupabaseServiceRole } from '#supabase/server'

/**
 * Situação de uma Ordem de Compra pra sistemas de fora (ex.: agente de atendimento com IA):
 * GET /api/pedidos/status?numero=<número da OC>
 *
 * Sem sessão de usuário — a credencial é a mesma chave dos links do Power BI, enviada no
 * cabeçalho `Authorization` (com ou sem "Bearer ") ou em `?chave=`. Sempre filtra pela
 * empresa dona da chave.
 */

const SITUACOES: Record<string, string> = {
  rascunho: 'Rascunho',
  em_validacao: 'Em Validação',
  em_aprovacao: 'Em Aprovação',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
  enviado: 'Enviado',
  cancelado: 'Cancelado'
}

/**
 * O número é salvo como "OC-000016", mas quem pergunta costuma dizer "16", "000016" ou "oc 16"
 * — todos viram o formato salvo. O texto original também entra, pra numeração fora do padrão.
 */
function variacoesDoNumero(numero: string): string[] {
  const digitos = numero.replace(/\D/g, '')
  if (!digitos) return [numero]
  return [numero, `OC-${String(Number(digitos)).padStart(6, '0')}`]
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const cabecalho = getHeader(event, 'authorization') ?? ''
  const chave = cabecalho.replace(/^Bearer\s+/i, '').trim() || (typeof query.chave === 'string' ? query.chave : '')
  if (!chave) throw createError({ statusCode: 401, statusMessage: 'Chave de acesso não enviada' })

  const numero = typeof query.numero === 'string' ? query.numero.trim() : ''
  if (!numero) throw createError({ statusCode: 400, statusMessage: 'Informe o número do pedido em ?numero=' })

  const admin = serverSupabaseServiceRole(event)
  const { data: dono } = await admin.from('chaves_dados').select('empresa_id').eq('chave', chave).maybeSingle()
  if (!dono) throw createError({ statusCode: 401, statusMessage: 'Chave inválida' })

  const { data, error } = await admin
    .from('pedidos')
    .select('numero, status, data_emissao, prazo_entrega, total, decidido_em, clientes(nome), fabricas(nome)')
    .eq('empresa_id', (dono as { empresa_id: string }).empresa_id)
    .in('numero', variacoesDoNumero(numero))
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  setHeader(event, 'Cache-Control', 'no-store')
  if (!data?.length) {
    return { encontrado: false, mensagem: `Nenhum pedido com o número ${numero}.` }
  }

  return {
    encontrado: true,
    pedidos: (data as any[]).map((p) => ({
      numero: p.numero,
      situacao: SITUACOES[p.status] ?? p.status,
      cliente: p.clientes?.nome ?? null,
      fabrica: p.fabricas?.nome ?? null,
      emissao: p.data_emissao,
      prazoEntrega: p.prazo_entrega,
      total: p.total,
      decididoEm: p.decidido_em
    }))
  }
})
