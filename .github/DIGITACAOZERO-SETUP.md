# DigitacaoZero - Setup & Instalação Completa

**Ambiente:** Node.js 18+ | npm 8+ | PostgreSQL (via Supabase)  
**Sistema:** Linux/Mac/Windows (com WSL2)

---

## 1. Setup Inicial do Projeto

### 1.1. Clonar & Inicializar

```bash
# Criar novo projeto Nuxt 4
npx nuxi init extracthub
cd extracthub

# Ou se clonar de um repo:
git clone <seu-repo>
cd extracthub
```

### 1.2. Estrutura de Pastas

```bash
mkdir -p {src,server,utils,composables,stores,types,tests}

extracthub/
├── .env.local (não versionado)
├── .env.example
├── .gitignore
├── nuxt.config.ts
├── tailwind.config.js
├── tsconfig.json
├── package.json
├── README.md
│
├── app.vue
├── app.config.ts
│
├── components/
│   ├── Button.vue
│   ├── Card.vue
│   ├── Input.vue
│   ├── Badge.vue
│   ├── Modal.vue
│   ├── UploadArea.vue
│   ├── ExtractionTable.vue
│   ├── ValidationTable.vue
│   ├── StatCard.vue
│   └── navigation/
│       └── Header.vue
│
├── pages/
│   ├── index.vue (home)
│   ├── auth/
│   │   ├── login.vue
│   │   ├── signup.vue
│   │   └── forgot-password.vue
│   ├── dashboard.vue
│   ├── extraction/
│   │   └── [id]/
│   │       ├── validate.vue
│   │       └── generate-pdf.vue
│   ├── templates/
│   │   ├── index.vue
│   │   └── [id].vue
│   └── settings/
│       ├── profile.vue
│       ├── company.vue
│       └── integrations.vue
│
├── composables/
│   ├── useAuth.ts
│   ├── useExtraction.ts
│   ├── useValidation.ts
│   ├── usePowerBI.ts
│   └── useWhatsApp.ts
│
├── stores/
│   ├── auth.ts
│   ├── extraction.ts
│   └── ui.ts
│
├── server/
│   ├── api/
│   │   ├── auth/
│   │   ├── extract/
│   │   ├── validate/
│   │   ├── export/
│   │   ├── powerbi/
│   │   └── whatsapp/
│   └── middleware/
│       └── auth.ts
│
├── types/
│   ├── index.ts
│   ├── extraction.ts
│   └── company.ts
│
├── utils/
│   ├── api.ts
│   ├── validation.ts
│   ├── file-parser.ts
│   └── pdf-generator.ts
│
├── layouts/
│   ├── default.vue
│   └── auth.vue
│
├── tests/
│   ├── unit/
│   └── e2e/
│
└── public/
    └── logo.svg
```

---

## 2. Dependências (package.json)

```json
{
  "name": "extracthub",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "nuxi dev",
    "build": "nuxi build",
    "preview": "nuxi preview",
    "generate": "nuxi generate",
    "lint": "eslint . --ext .ts,.vue",
    "type-check": "nuxi typecheck",
    "test": "vitest",
    "test:ui": "vitest --ui"
  },
  "dependencies": {
    "nuxt": "^4.0.0",
    "vue": "^3.3.0",
    "@nuxtjs/tailwindcss": "^6.10.0",
    "@headlessui/vue": "^1.7.0",
    "@heroicons/vue": "^2.0.0",
    "pinia": "^2.1.0",
    "@pinia/nuxt": "^0.4.0",
    "@supabase/supabase-js": "^2.38.0",
    "xlsx": "^0.18.0",
    "sharp": "^0.32.0",
    "pdfkit": "^0.13.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@nuxt/devtools": "^1.0.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^3.3.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^8.40.0",
    "@nuxtjs/eslint-config-typescript": "^12.0.0",
    "vitest": "^0.34.0",
    "@vitest/ui": "^0.34.0",
    "playwright": "^1.40.0"
  }
}
```

### Instalar dependências:

```bash
npm install
```

---

## 3. Configuração Nuxt (nuxt.config.ts)

```typescript
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  
  // Módulos
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
  ],

  // SSR
  ssr: true,
  
  // Head
  app: {
    head: {
      title: 'DigitacaoZero - Extração Inteligente de Dados',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { hid: 'description', name: 'description', content: 'Portal de extração e normalização de dados' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ]
    }
  },

  // Runtime Config (variáveis de ambiente)
  runtimeConfig: {
    // Private keys (só backend)
    supabaseKey: '',
    supabaseServiceRole: '',
    claudeApiKey: '',
    stripeSecret: '',
    
    // Public keys (frontend pode acessar)
    public: {
      supabaseUrl: '',
      supabaseAnonKey: '',
      apiBaseUrl: '',
      environment: 'development'
    }
  },

  // CSS Global
  css: ['~/assets/css/global.css'],

  // Compatibilidade
  compatibilityDate: '2026-09-04'
})
```

---

## 4. Configuração Tailwind (tailwind.config.js)

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './components/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './app.vue',
    './error.vue',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        secondary: '#8B5CF6',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
      },
      spacing: {
        'xs': '0.5rem',
        'sm': '1rem',
        'md': '1.5rem',
        'lg': '2rem',
        'xl': '3rem',
      },
      borderRadius: {
        'none': '0',
        'sm': '0.25rem',
        'base': '0.375rem',
        'md': '0.5rem',
        'lg': '0.75rem',
        'full': '9999px',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
```

---

## 5. Variáveis de Ambiente (.env.example)

```bash
# Supabase
NUXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
NUXT_SUPABASE_SERVICE_ROLE=eyJhbGc...

# Claude API
NUXT_CLAUDE_API_KEY=sk-ant-...

# Meta WhatsApp
NUXT_WHATSAPP_BUSINESS_ACCOUNT_ID=your-account-id
NUXT_WHATSAPP_PHONE_ID=your-phone-id
NUXT_WHATSAPP_API_TOKEN=your-token

# Power BI
NUXT_POWERBI_TENANT_ID=your-tenant-id
NUXT_POWERBI_CLIENT_ID=your-client-id
NUXT_POWERBI_CLIENT_SECRET=your-secret

# Stripe (opcional para pagamentos)
NUXT_PUBLIC_STRIPE_KEY=pk_test_...
NUXT_STRIPE_SECRET=sk_test_...

# App Config
NUXT_PUBLIC_API_BASE_URL=http://localhost:3000
NUXT_PUBLIC_ENVIRONMENT=development
```

**Copiar exemplo:**
```bash
cp .env.example .env.local
# Editar .env.local com suas credenciais
```

---

## 6. TypeScript (tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "jsxImportSource": "vue",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "~": ["."],
      "~/*": ["./*"],
      "@/*": ["./*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", "**/*.vue"]
}
```

---

## 7. Setup Supabase

### 7.1. Criar Projeto Supabase

1. Ir para https://supabase.com
2. Criar novo projeto
3. Copiar URL e chaves para .env.local

### 7.2. Executar Migrações

```bash
# Login no Supabase CLI
npx supabase login

# Inicializar Supabase localmente (opcional)
npx supabase init

# Executar migrações
npx supabase db push
```

### 7.3. Criar Schema (migrations/001_init_schema.sql)

Copiar o schema SQL de `EXTRACTHUB-SPEC.md` seção 3 e executar no Supabase.

---

## 8. Setup Pinia (State Management)

### stores/auth.ts

```typescript
import { defineStore } from 'pinia'

interface AuthState {
  user: any | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null
  }),

  getters: {
    isLoggedIn: (state) => state.isAuthenticated
  },

  actions: {
    async login(email: string, password: string) {
      this.loading = true
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        })
        if (error) throw error
        this.user = data.user
        this.isAuthenticated = true
      } catch (err: any) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    async logout() {
      await supabase.auth.signOut()
      this.user = null
      this.isAuthenticated = false
    }
  }
})
```

---

## 9. Composables

### composables/useAuth.ts

```typescript
import { useAuthStore } from '@/stores/auth'

export function useAuth() {
  const authStore = useAuthStore()

  const login = async (email: string, password: string) => {
    await authStore.login(email, password)
  }

  const logout = async () => {
    await authStore.logout()
  }

  return {
    user: computed(() => authStore.user),
    isAuthenticated: computed(() => authStore.isAuthenticated),
    login,
    logout
  }
}
```

### composables/useExtraction.ts

```typescript
import { ref } from 'vue'

export function useExtraction() {
  const extraction = ref(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const uploadFile = async (file: File, templateId: string) => {
    loading.value = true
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('template_id', templateId)

      const response = await $fetch('/api/extract', {
        method: 'POST',
        body: formData
      })

      extraction.value = response
      return response
    } catch (err: any) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  return {
    extraction,
    loading,
    error,
    uploadFile
  }
}
```

---

## 10. API Endpoints (server/api)

### server/api/extract.post.ts

```typescript
export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event)
  
  if (!formData) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No form data provided'
    })
  }

  const file = formData.find(f => f.name === 'file')?.data
  const templateId = formData.find(f => f.name === 'template_id')?.data.toString()

  if (!file || !templateId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'File and template_id are required'
    })
  }

  try {
    // Processar arquivo
    // Extrair dados
    // Gravar em Supabase
    
    return {
      success: true,
      extractionId: 'ext_123',
      preview: { /* dados extraídos */ }
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error processing file'
    })
  }
})
```

---

## 11. Executar Aplicação

### Desenvolvimento

```bash
npm run dev
# Acessa em http://localhost:3000
```

### Build para Produção

```bash
npm run build
npm run preview
```

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

---

## 12. Deploy (Vercel)

```bash
# Instalar CLI
npm i -g vercel

# Deploy
vercel

# Configurar variáveis de ambiente em Vercel Dashboard
```

---

## 13. Testes

### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'happy-dom'
  }
})
```

### Rodar testes

```bash
npm run test
npm run test:ui
```

---

## 14. Checklist de Setup

- [ ] Projeto Nuxt criado
- [ ] Dependências instaladas
- [ ] Supabase projeto criado
- [ ] Variáveis de ambiente configuradas
- [ ] Schema SQL criado em Supabase
- [ ] Estrutura de pastas criada
- [ ] Primeiros componentes criados
- [ ] Autenticação funcionando
- [ ] Upload de arquivo funcionando
- [ ] Extração básica funcionando

---

Pronto! Com este guia você está 100% pronto para começar a desenvolver! 🚀
