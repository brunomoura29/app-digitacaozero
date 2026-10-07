import { serverSupabaseServiceRole } from '#supabase/server'
import { camposUsados, normalizarDefinicao } from '#shared/utils/relatorios'

/** A senha é mostrada com traços e pode ser digitada sem eles, em minúsculas. */
function limparSenha(v: unknown): string {
  return String(v ?? '')
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase()
}

/**
 * POST /api/relatorios/publico — { token, senha }
 * Link público de um relatório: sem sessão. O `token` acha o acesso e a `senha` libera; o
 * servidor devolve a planta + só os dados do cliente daquele acesso, e só as colunas que o
 * relatório usa. Link errado e senha errada respondem igual, pra não confirmar que o link existe.
 */
export default defineEventHandler(async (event) => {
  const corpo = await readBody<{ token?: unknown; senha?: unknown }>(event)
  const token = typeof corpo?.token === 'string' ? corpo.token : ''
  const senha = limparSenha(corpo?.senha)
  const recusa = () => createError({ statusCode: 401, statusMessage: 'Link ou senha inválidos.' })
  if (!token || !senha) throw recusa()

  const admin = serverSupabaseServiceRole(event)
  const { data: acessoBruto } = await admin
    .from('relatorios_acessos')
    .select('id, relatorio_id, empresa_id, cliente_id, senha, ativo, visualizacoes')
    .eq('token', token)
    .maybeSingle()
  const acesso = acessoBruto as {
    id: string
    relatorio_id: string
    empresa_id: string
    cliente_id: string
    senha: string
    ativo: boolean
    visualizacoes: number
  } | null
  if (!acesso || !acesso.ativo || limparSenha(acesso.senha) !== senha) throw recusa()

  const [{ data: relatorio }, { data: empresa }, { data: cliente }] = await Promise.all([
    admin.from('relatorios').select('nome, descricao, definicao').eq('id', acesso.relatorio_id).maybeSingle(),
    admin.from('empresas').select('nome, logo_url').eq('id', acesso.empresa_id).maybeSingle(),
    admin.from('clientes').select('nome').eq('id', acesso.cliente_id).maybeSingle()
  ])
  if (!relatorio) throw recusa()

  const definicao = normalizarDefinicao((relatorio as any).definicao)
  const dados = await montarDadosRelatorio(admin, acesso.empresa_id, {
    fontes: definicao.fontes,
    clienteId: acesso.cliente_id,
    campos: camposUsados(definicao)
  })

  // contador de uso pro admin — se falhar, o relatório abre do mesmo jeito
  await admin
    .from('relatorios_acessos')
    .update({ visualizacoes: (acesso.visualizacoes ?? 0) + 1, ultimo_acesso_em: new Date().toISOString() })
    .eq('id', acesso.id)

  setHeader(event, 'Cache-Control', 'no-store')
  return {
    nome: (relatorio as any).nome as string,
    descricao: ((relatorio as any).descricao as string | null) ?? null,
    empresa: { nome: (empresa as any)?.nome ?? null, logo_url: (empresa as any)?.logo_url ?? null },
    cliente: (cliente as any)?.nome ?? null,
    definicao,
    dados
  }
})
