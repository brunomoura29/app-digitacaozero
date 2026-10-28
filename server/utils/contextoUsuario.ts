import type { H3Event } from 'h3'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

/**
 * Empresa e papel EFETIVOS de quem chama — o que as funções do banco devolvem, não o que está
 * gravado em perfis. Com o master dentro de uma empresa (suporte), vale a empresa escolhida e
 * papel 'admin'; empresa com assinatura bloqueada devolve empresa nula → 403.
 */
export async function contextoDoUsuario(event: H3Event) {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Não autenticado' })

  const client = await serverSupabaseClient(event)
  const { data, error } = await client.rpc('meu_contexto')
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  const contexto = data as { empresa_id: string | null; papel: string | null } | null
  if (!contexto?.papel) throw createError({ statusCode: 403, statusMessage: 'Perfil não encontrado' })
  if (!contexto.empresa_id) {
    throw createError({ statusCode: 403, statusMessage: 'Assinatura suspensa — fale com o suporte.' })
  }
  return { client, user, empresaId: contexto.empresa_id, papel: contexto.papel }
}
