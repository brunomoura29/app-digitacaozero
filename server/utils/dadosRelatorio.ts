import type { H3Event } from 'h3'
import { serverSupabaseClient, serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import {
  camposDasFontes,
  type CampoRelatorio,
  type DadosRelatorio,
  type FonteId,
  type LinhaRelatorio
} from '#shared/utils/relatorios'

/**
 * Linhas que alimentam os relatórios: os pedidos (e itens) já com os cadastros escolhidos
 * colados em cada linha. Sempre filtra pela empresa e, no link público, pelo cliente do acesso.
 */

type Admin = ReturnType<typeof serverSupabaseServiceRole>

/** Confere que quem chama é admin e devolve a empresa dele + o cliente service role. */
export async function adminDaSessao(event: H3Event) {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Não autenticado' })

  const client = await serverSupabaseClient(event)
  const { data: perfil, error } = await client.from('perfis').select('empresa_id, papel').eq('id', user.sub).maybeSingle()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  const dados = perfil as { empresa_id: string; papel: string } | null
  if (!dados || dados.papel !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Só o administrador pode montar relatórios.' })
  }
  return { admin: serverSupabaseServiceRole(event), empresaId: dados.empresa_id }
}

function soCampos(linha: LinhaRelatorio, campos: CampoRelatorio[]): LinhaRelatorio {
  const saida: LinhaRelatorio = { _pid: linha._pid ?? null }
  for (const c of campos) saida[c.id] = linha[c.id] ?? null
  return saida
}

/** Tamanho do lote de ids num `.in()` — acima disso a URL da consulta estoura. */
const LOTE_IDS = 150

export async function montarDadosRelatorio(
  admin: Admin,
  empresaId: string,
  opcoes: { fontes: FonteId[]; clienteId?: string | null; campos?: string[] }
): Promise<DadosRelatorio> {
  const { fontes, clienteId } = opcoes
  let campos = camposDasFontes(fontes)
  if (opcoes.campos) campos = campos.filter((c) => opcoes.campos!.includes(c.id))
  // sem campo de item em uso, não há por que ler (nem enviar) os itens
  const precisaItens = fontes.includes('itens') && campos.some((c) => c.base === 'item')
  const camposPedido = campos.filter((c) => c.base === 'pedido')

  // o corte por cliente acontece aqui, no servidor — é ele que garante o "só os dados dele" do link público
  let pedidosBrutos = await buscarPedidosDados(admin, empresaId)
  if (clienteId) pedidosBrutos = pedidosBrutos.filter((p) => p.clienteId === clienteId)

  const completas = new Map<string, LinhaRelatorio>()
  for (const p of pedidosBrutos) {
    completas.set(p.id, {
      _pid: p.id,
      'pedido.numero': p.numero,
      'pedido.situacao': p.situacao,
      'pedido.emissao': p.emissao,
      'pedido.fabrica': p.fabrica,
      'pedido.referencia': p.referencia,
      'pedido.condicao_pagamento': p.condicaoPagamento,
      'pedido.prazo_entrega': p.prazoEntrega,
      'pedido.subtotal': p.subtotal,
      'pedido.frete': p.frete,
      'pedido.desconto': p.desconto,
      'pedido.total': p.total,
      'pedido.decidido_por': p.decididoPor,
      'pedido.decidido_em': p.decididoEm,
      'cliente.nome': p.cliente,
      'cliente.documento': p.clienteDocumento,
      'cliente.cidade': p.cidade,
      'cliente.uf': p.uf,
      'vendedor.nome': p.vendedor
    })
  }
  const pedidos = [...completas.values()].map((l) => soCampos(l, camposPedido))

  if (!precisaItens || !completas.size) return { pedidos, itens: [] }

  const produtos = new Map<string, LinhaRelatorio>()
  if (fontes.includes('produtos')) {
    const lista = await buscarTudoDaEmpresa(
      admin,
      'produtos',
      'id, sku, descricao, unidade, ncm, modelo, marcas(nome), fabricantes(nome)',
      empresaId,
      'criado_em'
    )
    for (const p of lista) {
      produtos.set(p.id, {
        'produto.sku': p.sku,
        'produto.descricao': p.descricao,
        'produto.marca': p.marcas?.nome ?? null,
        'produto.fabricante': p.fabricantes?.nome ?? null,
        'produto.unidade': p.unidade,
        'produto.ncm': p.ncm,
        'produto.modelo': p.modelo
      })
    }
  }

  const COLUNAS_ITEM = 'id, pedido_id, produto_id, posicao, sku, descricao, descricao_original, quantidade, preco_unitario, total_linha'
  const itensBrutos: any[] = []
  if (clienteId) {
    const ids = [...completas.keys()]
    for (let i = 0; i < ids.length; i += LOTE_IDS) {
      const lote = ids.slice(i, i + LOTE_IDS)
      for (let inicio = 0; ; inicio += PAGINA_DADOS) {
        const { data, error } = await admin
          .from('pedidos_itens')
          .select(COLUNAS_ITEM)
          .eq('empresa_id', empresaId)
          .in('pedido_id', lote)
          .order('pedido_id', { ascending: true })
          .order('id', { ascending: true })
          .range(inicio, inicio + PAGINA_DADOS - 1)
        if (error) throw createError({ statusCode: 500, statusMessage: error.message })
        itensBrutos.push(...(data ?? []))
        if (!data || data.length < PAGINA_DADOS) break
      }
    }
  } else {
    itensBrutos.push(...(await buscarTudoDaEmpresa(admin, 'pedidos_itens', COLUNAS_ITEM, empresaId, 'pedido_id')))
  }

  const itens: LinhaRelatorio[] = []
  for (const item of itensBrutos) {
    const pedido = completas.get(item.pedido_id)
    if (!pedido) continue
    itens.push(
      soCampos(
        {
          ...pedido,
          ...(produtos.get(item.produto_id) ?? {}),
          'item.codigo': item.sku,
          'item.descricao': item.descricao || item.descricao_original,
          'item.quantidade': Number(item.quantidade) || 0,
          'item.preco_unitario': Number(item.preco_unitario) || 0,
          'item.total': Number(item.total_linha) || 0
        },
        campos
      )
    )
  }

  return { pedidos, itens }
}

/** Resumo dos dados pra IA: os valores que existem em cada campo (ela não recebe as linhas). */
export function resumoParaIA(dados: DadosRelatorio, fontes: FonteId[]): string {
  const linhas: string[] = []
  for (const campo of camposDasFontes(fontes)) {
    const origem = campo.base === 'item' ? dados.itens : dados.pedidos
    const valores = origem.map((l) => l[campo.id]).filter((v) => v != null && v !== '')
    let detalhe = 'sem dados'
    if (valores.length) {
      if (campo.tipo === 'numero' || campo.tipo === 'moeda') {
        const nums = valores.map(Number).filter(Number.isFinite)
        const menor = nums.reduce((a, b) => (b < a ? b : a), Infinity)
        const maior = nums.reduce((a, b) => (b > a ? b : a), -Infinity)
        detalhe = `de ${menor} a ${maior}`
      } else if (campo.tipo === 'data') {
        const datas = valores.map((v) => String(v).slice(0, 10)).sort()
        detalhe = `de ${datas[0]} a ${datas[datas.length - 1]}`
      } else {
        const distintos = [...new Set(valores.map(String))]
        const amostra = distintos.slice(0, 8).map((v) => `"${v.slice(0, 40)}"`).join(', ')
        detalhe = `${distintos.length} valor(es) diferente(s): ${amostra}${distintos.length > 8 ? ', …' : ''}`
      }
    }
    linhas.push(`- id "${campo.id}": ${campo.nome} (${campo.tipo}; linha de ${campo.base}) — ${detalhe}`)
  }
  return `${dados.pedidos.length} pedido(s) e ${dados.itens.length} item(ns) no total.\n${linhas.join('\n')}`
}
