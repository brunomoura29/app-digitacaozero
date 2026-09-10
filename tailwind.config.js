/** @type {import('tailwindcss').Config} */
const withVar = (name) => `rgb(var(${name}) / <alpha-value>)`

export default {
  darkMode: 'class',
  content: [
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './app/**/*.{vue,js,ts}',
    './app.vue',
    './error.vue'
  ],
  theme: {
    extend: {
      // ── Paleta Shift3 (fonte: paleta-cores-shift3 (1).json) ──────────────
      colors: {
        // Cores de marca fixas (não mudam entre temas)
        'shift3-dark': '#191E24',
        'shift3-teal': '#2D5F4F',
        'shift3-green': '#7FD7AB',

        // Tokens semânticos — flipam entre claro/escuro via CSS vars (.dark)
        // valores definidos em app/assets/css/tailwind.css
        'shift3-bg-light': withVar('--s3-bg'),
        'shift3-bg-card': withVar('--s3-card'),
        'shift3-border': withVar('--s3-border'),
        'shift3-input': withVar('--s3-input'),
        'shift3-input-border': withVar('--s3-input-border'),
        'shift3-sidebar': withVar('--s3-sidebar'),
        'shift3-sidebar-active': withVar('--s3-sidebar-active'),
        'shift3-text': withVar('--s3-text'),
        'shift3-text-secondary': withVar('--s3-text-secondary'),
        'shift3-text-muted': withVar('--s3-text-muted'),
        'shift3-text-light': withVar('--s3-text-light'),

        success: '#7FD7AB',
        warning: '#FFC107',
        danger: '#FF6B6B',

        // aliases de compatibilidade
        primary: '#191E24',
        secondary: '#2D5F4F',
        accent: '#7FD7AB'
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif']
      },
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
        '2xl': '2rem'
      },
      borderRadius: {
        small: '0.25rem',
        DEFAULT: '0.375rem',
        default: '0.375rem',
        medium: '0.75rem',
        large: '1rem',
        pill: '999px'
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
        DEFAULT: '0 2px 4px rgba(0, 0, 0, 0.1)',
        md: '0 2px 4px rgba(0, 0, 0, 0.1)',
        lg: '0 4px 8px rgba(0, 0, 0, 0.15)',
        xl: '0 8px 16px rgba(0, 0, 0, 0.2)'
      }
    }
  },
  plugins: []
}
