import { computed } from 'vue'

export type ThemePreference = 'light' | 'dark' | 'system'

/**
 * Modo claro / escuro.
 * Wrapper em cima do `useColorMode()` (@nuxtjs/color-mode) com API enxuta.
 *
 *  const { isDark, theme, toggle, set } = useTheme()
 *  toggle()            // alterna claro <-> escuro
 *  set('system')       // segue o SO
 *  theme.value         // 'light' | 'dark' | 'system' (preferência salva)
 *  isDark.value        // boolean do estado efetivo
 */
export function useTheme() {
  const colorMode = useColorMode()

  /** Estado efetivo aplicado no <html> ('light' | 'dark'). */
  const isDark = computed(() => colorMode.value === 'dark')

  /** Preferência escolhida pelo usuário (persistida). */
  const theme = computed<ThemePreference>({
    get: () => colorMode.preference as ThemePreference,
    set: (value) => {
      colorMode.preference = value
    }
  })

  /** Alterna entre claro e escuro (fixa a preferência). */
  function toggle() {
    colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
  }

  /** Define explicitamente: 'light' | 'dark' | 'system'. */
  function set(value: ThemePreference) {
    colorMode.preference = value
  }

  return { colorMode, isDark, theme, toggle, set }
}
