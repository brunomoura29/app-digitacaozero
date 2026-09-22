import type { CampoSchema, PapelCampoItem } from '~/types/modelo'

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
  fabrica_id: string | null
  referencia_id: string | null
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
  decidido_por: string | null
  decidido_em: string | null
  criado_em: string
  atualizado_em: string
  clientes: { nome: string } | null
  fabricas: { nome: string } | null
  referencias_tabela: { nome: string } | null
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
  fabrica_id: string | null
  referencia_id: string | null
  campos: Record<string, unknown>
  itens: PedidoItemInput[]
}

export interface PedidoFiltros {
  q: string
}

const SINONIMOS: Record<PapelCampoItem, string[]> = {
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

/** Chuta qual coluna do arquivo corresponde a um papel, pelo nome — só um palpite inicial, o usuário confirma/ajusta no mapeamento. */
export function sugerirColuna(colunas: string[], papel: PapelCampoItem): string | null {
  const achada = colunas.find((c) => {
    const cNorm = normalizar(c)
    return SINONIMOS[papel].some((s) => cNorm.includes(normalizar(s)))
  })
  return achada ?? null
}

/**
 * Converte número vindo de arquivo: célula numérica do Excel já vem como `number` (usa
 * direto); texto solto pode estar em formato brasileiro ("1.234,56") — só troca vírgula por
 * ponto quando o padrão bate com decimal BR, senão limpa qualquer coisa que não seja dígito.
 */
function paraNumero(v: unknown): number {
  if (typeof v === 'number') return v
  if (v == null) return 0
  const s = String(v).trim()
  if (!s) return 0
  if (/,\d{1,2}$/.test(s)) return Number(s.replace(/\./g, '').replace(',', '.')) || 0
  return Number(s.replace(/[^\d.-]/g, '')) || 0
}

/** Campo alvo do mapeamento — ou um campo real do Template (extração por IA), ou um dos 4 papéis fixos (planilha, sem template). */
export interface CampoAlvo {
  id: string
  nome: string
  papel: PapelCampoItem | null
}

/**
 * Lista de campos-alvo padrão quando não há Template envolvido (fluxo de planilha) — os
 * 4 papéis fixos que viram coluna em `pedidos_itens`.
 */
export const CAMPOS_ALVO_PADRAO: CampoAlvo[] = [
  { id: 'sku', nome: 'SKU', papel: 'sku' },
  { id: 'descricao', nome: 'Descrição', papel: 'descricao' },
  { id: 'quantidade', nome: 'Quantidade', papel: 'quantidade' },
  { id: 'preco_unitario', nome: 'Preço unitário', papel: 'preco_unitario' }
]

/**
 * Campos-alvo do mapeamento a partir do Template selecionado. Quando um campo não tem
 * `papel` configurado explicitamente (ex: templates criados antes dessa opção existir),
 * tenta inferir pelo próprio nome do campo — assim um template simples (um campo por
 * papel) continua funcionando sem precisar de configuração manual. Templates com campos
 * ambíguos (ex: "SKU Fábrica" e "SKU Cliente") continuam precisando do `papel` explícito
 * pra desempatar — a inferência só pega o primeiro papel ainda livre por campo.
 */
export function camposAlvoDoTemplate(camposItem: CampoSchema[]): CampoAlvo[] {
  const papeisUsados = new Set(camposItem.map((c) => c.papel).filter(Boolean) as PapelCampoItem[])

  return camposItem.map((c) => {
    if (c.papel) return { id: c.id, nome: c.nome, papel: c.papel }

    const papelInferido = (Object.keys(SINONIMOS) as PapelCampoItem[]).find(
      (papel) => !papeisUsados.has(papel) && sugerirColuna([c.nome], papel)
    )
    if (papelInferido) papeisUsados.add(papelInferido)

    return { id: c.id, nome: c.nome, papel: papelInferido ?? null }
  })
}

/**
 * Mapeamento inicial pra tela de confirmação: tenta achar, pra cada campo-alvo, uma coluna
 * do arquivo com nome igual/parecido; se o campo tem `papel` definido, também tenta por
 * sinônimo daquele papel. O usuário sempre pode ajustar na tela — isso é só o palpite.
 */
export function sugerirMapeamentoColunas(
  colunasArquivo: string[],
  camposAlvo: CampoAlvo[]
): Record<string, string | null> {
  const resultado: Record<string, string | null> = {}
  for (const campo of camposAlvo) {
    const porNomeExato = colunasArquivo.find((c) => normalizar(c) === normalizar(campo.nome))
    const porNomeParecido =
      porNomeExato ??
      colunasArquivo.find((c) => {
        const cNorm = normalizar(c)
        const nomeNorm = normalizar(campo.nome)
        return nomeNorm.length > 2 && (cNorm.includes(nomeNorm) || nomeNorm.includes(cNorm))
      })
    resultado[campo.id] = porNomeParecido ?? (campo.papel ? sugerirColuna(colunasArquivo, campo.papel) : null)
  }
  return resultado
}

/**
 * Converte as linhas cruas do arquivo (colunas como impressas no documento/planilha) nas
 * linhas "id-keyed" (chave = id do campo-alvo), aplicando o mapeamento que o usuário
 * confirmou na tela.
 */
export function aplicarMapeamento(
  linhasArquivo: Record<string, unknown>[],
  mapeamento: Record<string, string | null>
): Record<string, unknown>[] {
  return linhasArquivo.map((linha) => {
    const resultado: Record<string, unknown> = {}
    for (const [campoId, coluna] of Object.entries(mapeamento)) {
      if (coluna) resultado[campoId] = linha[coluna]
    }
    return resultado
  })
}

/**
 * Última etapa: transforma linhas já mapeadas (chave = id do campo-alvo) nos itens fixos
 * de `pedidos_itens`, usando o `papel` de cada campo-alvo pra saber qual vira sku/descrição/
 * quantidade/preço. Campos sem papel (informativos, ex: SKU do cliente, IPI%) não viram
 * coluna fixa, mas ficam registrados no resumo (`descricao_original`) pra não perder a
 * informação.
 */
export function itensDoMapeamento(linhasMapeadas: Record<string, unknown>[], camposAlvo: CampoAlvo[]): PedidoItemInput[] {
  const nomePorId = new Map(camposAlvo.map((c) => [c.id, c.nome]))
  const idPorPapel = new Map<PapelCampoItem, string>()
  for (const c of camposAlvo) if (c.papel) idPorPapel.set(c.papel, c.id)

  return linhasMapeadas.map((linha) => {
    const porPapel = (papel: PapelCampoItem): unknown => {
      const id = idPorPapel.get(papel)
      return id ? linha[id] : undefined
    }

    const sku = porPapel('sku')
    const descricao = porPapel('descricao')
    const resumo = Object.entries(linha)
      .map(([id, v]) => `${nomePorId.get(id) ?? id}: ${v}`)
      .join(', ')

    return {
      produto_id: null,
      descricao_original: resumo || null,
      sku: sku != null ? String(sku) : null,
      descricao: descricao != null ? String(descricao) : null,
      quantidade: paraNumero(porPapel('quantidade')) || 1,
      preco_unitario: paraNumero(porPapel('preco_unitario')),
      status_match: 'manual'
    }
  })
}
