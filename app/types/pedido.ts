import type { CampoSchema } from '~/types/modelo'

export type StatusPedido = 'rascunho' | 'em_validacao' | 'em_aprovacao' | 'aprovado' | 'rejeitado' | 'enviado' | 'cancelado'
export type StatusMatchItem = 'correspondido' | 'nao_correspondido' | 'manual'

export interface PedidoItem {
  id: string
  pedido_id: string
  produto_id: string | null
  descricao_original: string | null
  sku: string | null
  descricao: string | null
  quantidade: number
  preco_unitario: number
  total_linha: number
  status_match: StatusMatchItem
  posicao: number
}

export interface Pedido {
  id: string
  empresa_id: string
  extracao_id: string | null
  cliente_id: string
  numero: string
  status: StatusPedido
  data_emissao: string
  condicao_pagamento: string | null
  prazo_entrega: string | null
  observacoes: string | null
  dados_extras: Record<string, unknown>
  desconto_valor: number
  frete_valor: number
  subtotal: number
  total: number
  pdf_url: string | null
  criado_em: string
  atualizado_em: string
  clientes: { nome: string } | null
}

export interface PedidoItemInput {
  produto_id: string | null
  descricao_original: string | null
  sku: string | null
  descricao: string | null
  quantidade: number
  preco_unitario: number
  status_match: StatusMatchItem
}

/** Payload pra RPC `criar_pedido` — cabeçalho + itens numa tacada só (atômico). */
export interface PedidoInput {
  cliente_id: string
  extracao_id: string | null
  campos: Record<string, unknown>
  itens: PedidoItemInput[]
}

export interface PedidoFiltros {
  q: string
}

const SINONIMOS: Record<'sku' | 'descricao' | 'quantidade' | 'preco_unitario', string[]> = {
  sku: ['sku', 'codigo', 'código', 'cod'],
  descricao: ['descricao', 'descrição', 'produto', 'item', 'nome'],
  quantidade: ['quantidade', 'qtd', 'qtde', 'quant'],
  preco_unitario: ['preco', 'preço', 'valor', 'unitario', 'unitário']
}

function normalizar(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]/g, '')
}

function encontrarCampo(item: Record<string, unknown>, papeis: string[]): unknown {
  for (const [chave, valor] of Object.entries(item)) {
    const chaveNorm = normalizar(chave)
    if (papeis.some((p) => chaveNorm.includes(normalizar(p)))) return valor
  }
  return undefined
}

/**
 * Converte os itens crus que a extração devolveu (campos livres, definidos pelo
 * template) nas colunas fixas de `pedidos_itens`, tentando casar por nome do campo.
 * O que não bate fica vazio — a tabela editável é a rede de segurança pro usuário
 * completar/corrigir antes de salvar.
 *
 * A extração devolve cada item com chaves = `campo.id` (o JSON schema é montado por id,
 * não por nome — ver `montarJsonSchema`), então precisamos traduzir id → nome antes de
 * tentar casar pelos sinônimos, senão a busca compara sinônimos contra UUIDs e nunca bate.
 */
export function mapearItensExtraidos(
  itensExtraidos: Record<string, unknown>[],
  camposItem: CampoSchema[]
): PedidoItemInput[] {
  const nomePorId = new Map(camposItem.map((c) => [c.id, c.nome]))

  return itensExtraidos.map((itemBruto) => {
    const item: Record<string, unknown> = {}
    for (const [chave, valor] of Object.entries(itemBruto)) {
      item[nomePorId.get(chave) ?? chave] = valor
    }

    const sku = encontrarCampo(item, SINONIMOS.sku)
    const descricao = encontrarCampo(item, SINONIMOS.descricao)
    const quantidade = encontrarCampo(item, SINONIMOS.quantidade)
    const preco = encontrarCampo(item, SINONIMOS.preco_unitario)
    const resumo = Object.entries(item)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')

    return {
      produto_id: null,
      descricao_original: resumo || null,
      sku: sku != null ? String(sku) : null,
      descricao: descricao != null ? String(descricao) : null,
      quantidade: typeof quantidade === 'number' ? quantidade : Number(quantidade) || 0,
      preco_unitario: typeof preco === 'number' ? preco : Number(preco) || 0,
      status_match: 'manual'
    }
  })
}
