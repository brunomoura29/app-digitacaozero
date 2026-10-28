import { serverSupabaseServiceRole } from '#supabase/server'
import { contextoDoUsuario } from '../../utils/contextoUsuario'

/** Remove o login de um vendedor (perfis é apagado em cascata junto com o auth.users). */
export default defineEventHandler(async (event) => {
  const { client, empresaId, papel } = await contextoDoUsuario(event)
  const perfilAdmin = { empresa_id: empresaId, papel }
  if (perfilAdmin.papel !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Apenas administradores podem remover acessos.' })
  }

  const body = await readBody<{ perfilId: string }>(event)
  if (!body?.perfilId) throw createError({ statusCode: 400, statusMessage: 'Dados incompletos.' })

  const { data: perfilAlvo, error: erroPerfilAlvo } = await client
    .from('perfis')
    .select('id, papel, empresa_id')
    .eq('id', body.perfilId)
    .maybeSingle()
  if (erroPerfilAlvo) throw createError({ statusCode: 500, statusMessage: erroPerfilAlvo.message })
  if (!perfilAlvo || perfilAlvo.papel !== 'vendedor' || perfilAlvo.empresa_id !== perfilAdmin.empresa_id) {
    throw createError({ statusCode: 404, statusMessage: 'Acesso não encontrado.' })
  }

  const admin = serverSupabaseServiceRole(event)
  const { error: erroRemover } = await admin.auth.admin.deleteUser(body.perfilId)
  if (erroRemover) throw createError({ statusCode: 500, statusMessage: erroRemover.message })

  return { ok: true }
})
