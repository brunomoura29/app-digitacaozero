/**
 * Guarda de rota.
 * - Não logado + rota privada  → /login
 * - Logado + página de auth      → / (dashboard)
 *
 * A raiz "/" é o dashboard (privado).
 */
const ROTAS_PUBLICAS = ['/login', '/cadastro', '/recuperar-senha', '/redefinir-senha', '/design']
const APENAS_DESLOGADO = ['/login', '/cadastro', '/recuperar-senha']

function ehPublica(path: string) {
  return ROTAS_PUBLICAS.includes(path) || path.startsWith('/public/')
}

export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()

  if (!user.value && !ehPublica(to.path)) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }

  if (user.value && APENAS_DESLOGADO.includes(to.path)) {
    return navigateTo('/')
  }
})
