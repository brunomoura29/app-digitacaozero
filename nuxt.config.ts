// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxt/icon',
    '@nuxt/fonts',
    '@nuxtjs/color-mode',
    '@vueuse/nuxt',
    '@nuxtjs/supabase',
    '@pinia/nuxt'
  ],

  colorMode: {
    classSuffix: '', // classe no <html> vira "dark" / "light" (não "dark-mode")
    preference: 'system',
    fallback: 'light',
    storageKey: 'digitacaozero-theme'
  },

  css: ['~/assets/css/tailwind.css'],

  tailwindcss: {
    cssPath: '~/assets/css/tailwind.css'
  },

  fonts: {
    // baixa e auto-hospeda (self-hosted) a fonte do Google Fonts
    families: [
      { name: 'Plus Jakarta Sans', provider: 'google', weights: [400, 500, 600, 700] }
    ]
  },

  icon: {
    // usa @iconify-json/heroicons bundlado (offline)
    serverBundle: 'local'
  },

  supabase: {
    // guarda de rota completa entra numa fase posterior; por ora sem redirect automático
    redirect: false,
    // tipos gerados do banco entram quando o schema existir (Fase 0)
    types: false
  }
})