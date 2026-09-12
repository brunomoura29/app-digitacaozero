import { serverSupabaseClient, serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

/**
 * Cria o login (perfis.papel='vendedor') de um vendedor já cadastrado.
 * Precisa da service role key (auth.admin.createUser) — não dá pra fazer isso
 * com `signUp` no client, porque trocaria a sessão do admin logado pela do vendedor novo.
 */
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Não autenticado' })

  const client = await serverSupabaseClient(event)

  const { data: perfil, error: erroPerfil } = await client
    .from('perfis')
    .select('empresa_id, papel')
    .eq('id', user.sub)
    .maybeSingle()
  if (erroPerfil) throw createError({ statusCode: 500, statusMessage: erroPerfil.message })
  if (!perfil || perfil.papel !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Apenas administradores podem criar acessos.' })
  }

  const body = await readBody<{ vendedorId: string; email: string; senha: string; funcaoId: string | null }>(event)
  if (!body?.vendedorId || !body?.email || !body?.senha) {
    throw createError({ statusCode: 400, statusMessage: 'Dados incompletos.' })
  }

  const { data: vendedor, error: erroVendedor } = await client
    .from('vendedores')
    .select('id, nome, empresa_id')
    .eq('id', body.vendedorId)
    .maybeSingle()
  if (erroVendedor) throw createError({ statusCode: 500, statusMessage: erroVendedor.message })
  if (!vendedor) throw createError({ statusCode: 404, statusMessage: 'Vendedor não encontrado.' })

  if (body.funcaoId) {
    const { data: funcao, error: erroFuncao } = await client
      .from('funcoes')
      .select('id')
      .eq('id', body.funcaoId)
      .maybeSingle()
    if (erroFuncao) throw createError({ statusCode: 500, statusMessage: erroFuncao.message })
    if (!funcao) throw createError({ statusCode: 400, statusMessage: 'Função inválida.' })
  }

  const admin = serverSupabaseServiceRole(event)
  const { data: novoUsuario, error: erroCriar } = await admin.auth.admin.createUser({
    email: body.email.trim(),
    password: body.senha,
    email_confirm: true,
    user_metadata: {
      full_name: vendedor.nome,
      invite_empresa_id: perfil.empresa_id,
      invite_papel: 'vendedor',
      invite_vendedor_id: vendedor.id,
      invite_funcao_id: body.funcaoId
    }
  })

  if (erroCriar) {
    const mensagem = erroCriar.message.includes('already been registered')
      ? 'Este e-mail já está em uso.'
      : erroCriar.message
    throw createError({ statusCode: 409, statusMessage: mensagem })
  }

  return { id: novoUsuario.user.id }
})
