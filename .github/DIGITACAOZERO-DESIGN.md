# DigitacaoZero - Design & Telas

**Framework:** Nuxt 4 + Vue 3 + TypeScript  
**Styling:** TailwindCSS 3.x  
**UI Components:** HeadlessUI + Radix UI  
**Icons:** Heroicons v2  

---

## 1. Design System

### Paleta de Cores (Shift3)

```js
// tailwind.config.js - Shift3 Brand Colors
export default {
  theme: {
    extend: {
      colors: {
        // Cores Primárias Shift3
        'shift3-dark': '#191E24',        // Azul muito escuro - Brand Shift3
        'shift3-teal': '#2D5F4F',        // Teal/Verde-azulado
        'shift3-green': '#7FD7AB',       // Verde-lima vibrante (Accent Principal)
        
        // Backgrounds
        'shift3-bg-light': '#F5F7FA',    // Off-white
        'shift3-bg-card': '#FFFFFF',     // Branco puro
        'shift3-border': '#E8E8E8',      // Cinza claro
        
        // Texto
        'shift3-text': '#1A1A1A',        // Cinza escuro - texto principal
        'shift3-text-secondary': '#666666', // Cinza médio
        'shift3-text-muted': '#999999',  // Cinza médio-claro
        'shift3-text-light': '#A8B5C4',  // Cinza muito claro (sidebar inactive)
        
        // Status
        success: '#7FD7AB',              // Verde (mesmo da accent)
        warning: '#FFC107',              // Amarelo alerta
        danger: '#FF6B6B',               // Coral/Vermelho
        
        // Aliases para compatibilidade
        primary: '#191E24',
        secondary: '#2D5F4F',
        accent: '#7FD7AB'
      },
      spacing: {
        'xs': '0.25rem',   // 4px
        'sm': '0.5rem',    // 8px
        'md': '0.75rem',   // 12px
        'lg': '1rem',      // 16px
        'xl': '1.5rem',    // 24px
        '2xl': '2rem',     // 32px
      },
      borderRadius: {
        'small': '0.25rem',   // 4px
        'default': '0.375rem', // 6px
        'medium': '0.75rem',   // 12px
        'large': '1rem',       // 16px
        'pill': '999px'
      }
    }
  }
}
```

### Referência de Cores Shift3

| Nome | Hex | RGB | Uso |
|------|-----|-----|-----|
| **shift3-dark** | #191E24 | rgb(25, 30, 36) | Sidebar, navegação, backgrounds escuros |
| **shift3-teal** | #2D5F4F | rgb(45, 95, 79) | Elementos secundários, hover states |
| **shift3-green** | #7FD7AB | rgb(127, 215, 171) | Accent principal, highlights, CTAs |
| **shift3-bg-light** | #F5F7FA | rgb(245, 247, 250) | Background páginas, containers |
| **shift3-bg-card** | #FFFFFF | rgb(255, 255, 255) | Cards, panels, superfícies elevadas |
| **shift3-text** | #1A1A1A | rgb(26, 26, 26) | Headings, texto principal |
| **shift3-text-secondary** | #666666 | rgb(102, 102, 102) | Supporting text, descriptions |
| **warning** | #FFC107 | rgb(255, 193, 7) | Atenção, cautela |
| **danger** | #FF6B6B | rgb(255, 107, 107) | Erro, perda |

### Tipografia Shift3

```css
/* Configuração de Fonte */
body {
  font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Roboto', sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: #1A1A1A;
}

/* Títulos */
h1 {
  @apply text-[28px] font-semibold text-shift3-text;
  line-height: 1.2;
}

h2 {
  @apply text-[18px] font-semibold text-shift3-dark;
  line-height: 1.3;
}

h3 {
  @apply text-lg font-semibold text-shift3-text;
  line-height: 1.3;
}

h4 {
  @apply text-base font-semibold text-shift3-text;
}

/* Body Text */
body, p {
  @apply text-sm font-normal text-shift3-text leading-relaxed;
}

label {
  @apply text-sm font-medium text-shift3-text;
}

small, caption {
  @apply text-xs font-normal text-shift3-text-muted;
  line-height: 1.4;
}

/* Text Variants */
.text-secondary {
  @apply text-shift3-text-secondary;
}

.text-muted {
  @apply text-shift3-text-muted;
}

.text-light {
  @apply text-shift3-text-light;
}
```

### Componentes Base

**Button**
```vue
<!-- Primary Button (shift3-dark) -->
<button class="px-4 py-2 bg-shift3-dark text-white rounded-default hover:bg-shift3-teal transition">
  Ação Principal
</button>

<!-- Secondary Button (light background) -->
<button class="px-4 py-2 bg-shift3-bg-light text-shift3-dark border border-shift3-border rounded-default hover:bg-shift3-border transition">
  Ação Secundária
</button>

<!-- Accent Button (green - CTA) -->
<button class="px-4 py-2 bg-shift3-green text-shift3-dark rounded-default hover:bg-shift3-teal transition">
  Compartilhar / Enviar
</button>
```

**Card**
```vue
<div class="bg-shift3-bg-card border border-shift3-border rounded-medium shadow-sm hover:shadow-md transition">
  <div class="p-lg">
    <h3 class="text-shift3-dark font-semibold mb-2">Título do Card</h3>
    <p class="text-shift3-text-secondary">Conteúdo do card</p>
  </div>
</div>
```

**Input**
```vue
<input
  type="text"
  placeholder="Placeholder"
  class="px-3 py-2 border border-shift3-border rounded-default focus:border-shift3-green focus:ring-2 focus:ring-shift3-green focus:ring-opacity-20 outline-none transition"
/>
```

**Badge (Status)**
```vue
<!-- Pending (warning) -->
<span class="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 rounded-pill text-xs font-medium">
  ⏳ Pendente
</span>

<!-- Approved (success) -->
<span class="inline-block px-2 py-1 bg-green-100 text-green-800 rounded-pill text-xs font-medium">
  ✅ Aprovada
</span>

<!-- Rejected (danger) -->
<span class="inline-block px-2 py-1 bg-red-100 text-red-800 rounded-pill text-xs font-medium">
  ❌ Rejeitada
</span>
```

**Sidebar/Navigation**
```vue
<aside class="bg-shift3-dark text-shift3-text-light w-64 h-screen">
  <nav class="p-lg space-y-2">
    <a href="#" class="block px-3 py-2 rounded-default text-shift3-text-light hover:bg-shift3-green hover:text-shift3-dark transition">
      Menu Item
    </a>
    <a href="#" class="block px-3 py-2 rounded-default text-shift3-green bg-shift3-teal bg-opacity-20">
      Menu Item Ativo
    </a>
  </nav>
</aside>
```

**Modal/Dialog**
```vue
<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
  <div class="bg-shift3-bg-card rounded-medium shadow-xl max-w-md w-full p-lg">
    <h2 class="text-shift3-dark font-semibold mb-4">Título do Modal</h2>
    <p class="text-shift3-text-secondary mb-6">Conteúdo do modal</p>
    <div class="flex gap-2 justify-end">
      <button class="px-4 py-2 bg-shift3-bg-light text-shift3-dark rounded-default hover:bg-shift3-border">
        Cancelar
      </button>
      <button class="px-4 py-2 bg-shift3-green text-shift3-dark rounded-default hover:bg-shift3-teal">
        Confirmar
      </button>
    </div>
  </div>
</div>
```

---

## 2. Telas Principais

### 2.1. Tela de Login

**Path:** `/pages/auth/login.vue`

```
┌─────────────────────────────────────────┐
│                                         │
│     DigitacaoZero                          │
│     Extração Inteligente de Dados       │
│                                         │
│     ┌───────────────────────────────┐   │
│     │ Email                         │   │
│     │ [_____________________]       │   │
│     │                               │   │
│     │ Senha                         │   │
│     │ [_____________________]       │   │
│     │                               │   │
│     │ [Entrar]                      │   │
│     │                               │   │
│     │ Não tem conta? Criar aqui →   │   │
│     └───────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘

Componentes:
- Form com email + senha
- Validação em tempo real
- Link para signup
- Link para reset de senha
- Loading state no botão
- Toast com mensagens de erro
```

**Código:**
```vue
<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
    <div class="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
      <h1 class="text-3xl font-bold text-center mb-2">DigitacaoZero</h1>
      <p class="text-center text-gray-600 mb-8">Extração Inteligente de Dados</p>
      
      <form @submit.prevent="handleLogin" class="space-y-6">
        <!-- Email Input -->
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            required
            class="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            placeholder="seu@email.com"
          />
          <span v-if="errors.email" class="text-red-500 text-sm mt-1">{{ errors.email }}</span>
        </div>

        <!-- Password Input -->
        <div>
          <label for="password" class="block text-sm font-medium text-gray-700">
            Senha
          </label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            required
            class="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            placeholder="••••••••"
          />
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          :disabled="isLoading"
          class="w-full bg-blue-500 text-white py-2 rounded-lg font-semibold hover:bg-blue-600 transition disabled:opacity-50"
        >
          {{ isLoading ? 'Entrando...' : 'Entrar' }}
        </button>
      </form>

      <!-- Links -->
      <div class="mt-6 flex justify-between text-sm">
        <NuxtLink to="/auth/signup" class="text-blue-500 hover:underline">
          Criar conta
        </NuxtLink>
        <NuxtLink to="/auth/forgot" class="text-blue-500 hover:underline">
          Esqueci minha senha
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const form = ref({ email: '', password: '' })
const errors = ref<Record<string, string>>({})
const isLoading = ref(false)

const handleLogin = async () => {
  isLoading.value = true
  try {
    // Chamar API de login
    // Guardar token
    // Redirecionar para dashboard
    await router.push('/dashboard')
  } catch (error) {
    errors.value.email = 'Email ou senha inválidos'
  } finally {
    isLoading.value = false
  }
}
</script>
```

---

### 2.2. Dashboard Principal

**Path:** `/pages/dashboard.vue`

```
┌────────────────────────────────────────────────────────────┐
│ DigitacaoZero                          [👤] [⚙️] [Sair]       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Bem-vindo, João!                                         │
│                                                            │
│  ┌──────────────────────┐  ┌──────────────────────┐      │
│  │ 📊 Extrações Hoje    │  │ ✅ Aprovadas Mês    │      │
│  │ 12                   │  │ 156                  │      │
│  └──────────────────────┘  └──────────────────────┘      │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ + Upload Arquivo                                    │ │
│  │ [Clique ou arraste arquivo aqui]                    │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  Extrações Recentes                                       │
│  ┌───────────────────────────────────────────────────────┐│
│  │ Arquivo         │ Data      │ Status    │ Ações     ││
│  ├───────────────────────────────────────────────────────┤│
│  │ balancete.xlsx  │ 02/09/26  │ ✅ Aprovada │ [...]   ││
│  │ pedidos.pdf     │ 01/09/26  │ ⏳ Pendente  │ [...]   ││
│  │ despesas.xlsx   │ 31/08/26  │ ❌ Rejeitada │ [...]   ││
│  └───────────────────────────────────────────────────────┘│
│                                                            │
└────────────────────────────────────────────────────────────┘

Stats Cards:
- Extrações Hoje
- Aprovadas Este Mês
- Taxa de Sucesso
- Horas Economizadas

Upload Area (Drag & Drop):
- Aceita: XLSX, PDF, imagens
- Max size: 50MB
- Indica tipo de arquivo

Recent Extractions Table:
- Arquivo, Data, Status, Ações
- Filtro por status
- Busca por nome
- Paginação
```

**Código:**
```vue
<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <h1 class="text-2xl font-bold text-gray-900">DigitacaoZero</h1>
        <div class="flex items-center gap-4">
          <span class="text-gray-600">{{ user.name }}</span>
          <button class="text-gray-500 hover:text-gray-700">⚙️</button>
          <button @click="logout" class="text-gray-500 hover:text-gray-700">Sair</button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-6 py-8">
      <!-- Welcome Section -->
      <div class="mb-8">
        <h2 class="text-3xl font-bold text-gray-900">Bem-vindo, {{ user.name }}!</h2>
        <p class="text-gray-600 mt-1">Gerencie seus templates e extrações</p>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Extrações Hoje" value="12" icon="📊" color="blue" />
        <StatCard title="Aprovadas Mês" value="156" icon="✅" color="green" />
        <StatCard title="Taxa de Sucesso" value="94%" icon="📈" color="emerald" />
        <StatCard title="Horas Economizadas" value="24" icon="⏱️" color="purple" />
      </div>

      <!-- Upload Section -->
      <div class="mb-8">
        <UploadArea @file-selected="handleFileUpload" />
      </div>

      <!-- Recent Extractions -->
      <div class="bg-white rounded-lg shadow">
        <div class="p-6 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">Extrações Recentes</h3>
        </div>
        <ExtractionTable :extractions="recentExtractions" />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import StatCard from '@/components/StatCard.vue'
import UploadArea from '@/components/UploadArea.vue'
import ExtractionTable from '@/components/ExtractionTable.vue'

const user = ref({ name: 'João Silva' })
const recentExtractions = ref([])

onMounted(async () => {
  // Buscar extrações recentes
})

const handleFileUpload = async (file: File) => {
  // Chamar API de upload
}

const logout = async () => {
  // Fazer logout
}
</script>
```

---

### 2.3. Tela de Validação (Contabilidade)

**Path:** `/pages/extraction/[id]/validate.vue`

```
┌────────────────────────────────────────────────────────────┐
│ DigitacaoZero > Validação                  [← Voltar]         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ Balancete - A B PACHECO ME                                │
│ CNPJ: 11.687.691/0001-60                                  │
│ Período: 01/08/2022 - 31/08/2022                          │
│                                                            │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ Dados do Arquivo                                     │  │
│ │ Empresa:   A B PACHECO ME                           │  │
│ │ CNPJ:      11.687.691/0001-60                       │  │
│ │ Período:   01/08/2022 - 31/08/2022                 │  │
│ │ Abas:      JAN | FEV | MAR                          │  │
│ │ Total:     225 registros extraídos                  │  │
│ └──────────────────────────────────────────────────────┘  │
│                                                            │
│ Tabela de Dados (Aba: JAN)                                │
│ ┌───────────────────────────────────────────────────────┐ │
│ │ Código | Descrição       | Saldo Ant  | Débito | ... │ │
│ ├───────────────────────────────────────────────────────┤ │
│ │ 1      | ATIVO           | 936627.52  | 300419 | ... │ │
│ │ 2      | ATIVO CIRCULANTE| 734137.34  | 292919 | ... │ │
│ │ 3      | DISPONÍVEL      | 231226.31  | 216886 | ... │ │
│ │ ...    | ...             | ...        | ...    | ... │ │
│ └───────────────────────────────────────────────────────┘ │
│                                                            │
│ Ações:                                                     │
│ [Aprovar] [Rejeitar] [Editar] [Exportar]                 │
│                                                            │
└────────────────────────────────────────────────────────────┘

Componentes:
- Metadata do arquivo (empresa, CNPJ, período)
- Abas de navegação (JAN, FEV, MAR, etc)
- Tabela de dados com scroll horizontal
- Edição inline de células
- Botões de ação (Aprovar, Rejeitar, Exportar)
```

**Código:**
```vue
<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-6 py-4">
        <div class="flex items-center gap-2 mb-4">
          <NuxtLink to="/dashboard" class="text-blue-500 hover:underline">← Voltar</NuxtLink>
        </div>
        <h1 class="text-2xl font-bold text-gray-900">{{ extraction.name }}</h1>
        <p class="text-gray-600 text-sm">{{ extraction.company }} | CNPJ: {{ extraction.cnpj }}</p>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-6 py-8">
      <!-- Metadata Card -->
      <div class="bg-white rounded-lg shadow p-6 mb-8">
        <h3 class="text-lg font-semibold mb-4">Dados do Arquivo</h3>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-sm text-gray-600">Empresa</label>
            <p class="font-medium">{{ extraction.company }}</p>
          </div>
          <div>
            <label class="text-sm text-gray-600">CNPJ</label>
            <p class="font-medium">{{ extraction.cnpj }}</p>
          </div>
          <div>
            <label class="text-sm text-gray-600">Período</label>
            <p class="font-medium">{{ extraction.period }}</p>
          </div>
          <div>
            <label class="text-sm text-gray-600">Abas</label>
            <p class="font-medium">{{ extraction.tabs.join(', ') }}</p>
          </div>
        </div>
      </div>

      <!-- Tabs Navigation -->
      <div class="flex gap-2 mb-6 border-b border-gray-200">
        <button
          v-for="tab in extraction.tabs"
          :key="tab"
          @click="selectedTab = tab"
          :class="[
            'px-4 py-2 font-medium border-b-2 transition',
            selectedTab === tab
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          ]"
        >
          {{ tab }}
        </button>
      </div>

      <!-- Data Table -->
      <div class="bg-white rounded-lg shadow overflow-hidden mb-8">
        <div class="overflow-x-auto">
          <table class="min-w-full">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-200">
                <th v-for="col in columns" :key="col" class="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  {{ col }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in tableData" :key="idx" class="border-b border-gray-200 hover:bg-gray-50">
                <td v-for="col in columns" :key="col" class="px-6 py-3 text-sm text-gray-700">
                  {{ row[col] }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="px-6 py-4 bg-gray-50 text-sm text-gray-600">
          Mostrando 1-20 de {{ totalRows }} registros
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-4">
        <button
          @click="approve"
          class="px-6 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition"
        >
          ✓ Aprovar
        </button>
        <button
          @click="reject"
          class="px-6 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition"
        >
          ✕ Rejeitar
        </button>
        <button
          @click="exportData"
          class="px-6 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition"
        >
          📥 Exportar
        </button>
        <button
          @click="editData"
          class="px-6 py-2 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition"
        >
          ✎ Editar
        </button>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const selectedTab = ref('jan')
const extraction = ref({
  name: 'Balancete',
  company: 'A B PACHECO ME',
  cnpj: '11.687.691/0001-60',
  period: '01/08/2022 - 31/08/2022',
  tabs: ['jan', 'fev', 'mar']
})
const columns = ref(['Código', 'Descrição', 'Saldo Anterior', 'Débito', 'Crédito', 'Saldo Atual'])
const tableData = ref([])
const totalRows = ref(0)

onMounted(async () => {
  // Buscar dados da extração
})

const approve = async () => {
  // Chamar API para aprovar
}

const reject = async () => {
  // Chamar API para rejeitar
}

const exportData = async () => {
  // Exportar para XLSX/CSV/PDF
}

const editData = () => {
  // Abrir modo edição
}
</script>
```

---

### 2.4. Tela de Geração de PDF (Representante)

**Path:** `/pages/extraction/[id]/generate-pdf.vue`

```
┌────────────────────────────────────────────────────────────┐
│ DigitacaoZero > Gerar PDF                  [← Voltar]         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ Pedido Validado - Gerar Ordem de Compra                  │
│                                                            │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ Dados do Cliente                                     │  │
│ │ Nome: Loja XYZ                                      │  │
│ │ CNPJ: 12.345.678/0001-99                           │  │
│ │ Endereço: Rua A, 123, São Paulo - SP               │  │
│ │ Contato: (11) 98765-4321                           │  │
│ │ Email: contato@lojaxyz.com                         │  │
│ └──────────────────────────────────────────────────────┘  │
│                                                            │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ Itens do Pedido                                      │  │
│ │ ┌────────────────────────────────────────────────────┤  │
│ │ │ Código  │ Descrição      │ Qtd │ Preço  │ Total  │  │
│ │ ├────────────────────────────────────────────────────┤  │
│ │ │ SKU001  │ Produto A      │ 10  │ 100.00 │1000.00│  │
│ │ │ SKU002  │ Produto B      │  5  │  50.00 │ 250.00│  │
│ │ │ SKU003  │ Produto C      │  2  │ 200.00 │ 400.00│  │
│ │ └────────────────────────────────────────────────────┤  │
│ │                              Subtotal: R$ 1.650,00  │  │
│ │                              Desconto:   R$ 0,00    │  │
│ │                              Frete:      R$ 150,00  │  │
│ │                              TOTAL:    R$ 1.800,00  │  │
│ └──────────────────────────────────────────────────────┘  │
│                                                            │
│ Preview do PDF:                                            │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ [PDF Preview aqui]                                  │  │
│ │                                                      │  │
│ └──────────────────────────────────────────────────────┘  │
│                                                            │
│ [Gerar PDF] [Enviar WhatsApp] [Enviar Email]             │
│                                                            │
└────────────────────────────────────────────────────────────┘

Componentes:
- Card de dados do cliente (editável)
- Tabela de itens do pedido
- Cálculos (subtotal, desconto, frete, total)
- Preview do PDF gerado
- Botões de ação (Gerar, Enviar, etc)
```

**Código:**
```vue
<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-6 py-4">
        <div class="flex items-center gap-2 mb-4">
          <NuxtLink to="/dashboard" class="text-blue-500 hover:underline">← Voltar</NuxtLink>
        </div>
        <h1 class="text-2xl font-bold text-gray-900">Gerar Ordem de Compra</h1>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-6 py-8">
      <div class="grid grid-cols-3 gap-8">
        <!-- Left: Form -->
        <div class="col-span-2 space-y-8">
          <!-- Client Data -->
          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-lg font-semibold mb-4">Dados do Cliente</h3>
            <div class="grid grid-cols-2 gap-4">
              <input
                v-model="order.client.name"
                type="text"
                placeholder="Nome do cliente"
                class="col-span-2 px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                v-model="order.client.cnpj"
                type="text"
                placeholder="CNPJ"
                class="px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                v-model="order.client.phone"
                type="tel"
                placeholder="Telefone"
                class="px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                v-model="order.client.address"
                type="text"
                placeholder="Endereço"
                class="col-span-2 px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                v-model="order.client.email"
                type="email"
                placeholder="Email"
                class="col-span-2 px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <!-- Items Table -->
          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-lg font-semibold mb-4">Itens do Pedido</h3>
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b border-gray-200">
                    <th class="text-left py-2 px-2 font-semibold">Código</th>
                    <th class="text-left py-2 px-2 font-semibold">Descrição</th>
                    <th class="text-right py-2 px-2 font-semibold">Qtd</th>
                    <th class="text-right py-2 px-2 font-semibold">Preço</th>
                    <th class="text-right py-2 px-2 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, idx) in order.items" :key="idx" class="border-b border-gray-100">
                    <td class="py-2 px-2">{{ item.code }}</td>
                    <td class="py-2 px-2">{{ item.description }}</td>
                    <td class="py-2 px-2 text-right">{{ item.quantity }}</td>
                    <td class="py-2 px-2 text-right">R$ {{ item.price.toFixed(2) }}</td>
                    <td class="py-2 px-2 text-right font-medium">
                      R$ {{ (item.quantity * item.price).toFixed(2) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Totals -->
          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex justify-end">
              <div class="w-64 space-y-2">
                <div class="flex justify-between">
                  <span>Subtotal:</span>
                  <span>R$ {{ subtotal.toFixed(2) }}</span>
                </div>
                <div class="flex justify-between">
                  <input
                    v-model.number="order.discount"
                    type="number"
                    placeholder="Desconto"
                    class="w-24 px-2 py-1 border border-gray-300 rounded"
                  />
                  <span>R$ {{ order.discount.toFixed(2) }}</span>
                </div>
                <div class="flex justify-between">
                  <input
                    v-model.number="order.shipping"
                    type="number"
                    placeholder="Frete"
                    class="w-24 px-2 py-1 border border-gray-300 rounded"
                  />
                  <span>R$ {{ order.shipping.toFixed(2) }}</span>
                </div>
                <div class="border-t pt-2 flex justify-between font-bold text-lg">
                  <span>TOTAL:</span>
                  <span>R$ {{ total.toFixed(2) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: PDF Preview & Actions -->
        <div class="col-span-1">
          <!-- PDF Preview -->
          <div class="bg-white rounded-lg shadow p-6 mb-6">
            <h3 class="text-lg font-semibold mb-4">Preview PDF</h3>
            <div class="bg-gray-100 rounded h-96 flex items-center justify-center">
              <div v-if="pdfPreviewUrl" class="w-full h-full">
                <iframe :src="pdfPreviewUrl" class="w-full h-full rounded" />
              </div>
              <span v-else class="text-gray-500">PDF Preview aqui</span>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="space-y-3">
            <button
              @click="generatePDF"
              class="w-full px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition"
            >
              📄 Gerar PDF
            </button>
            <button
              @click="sendWhatsApp"
              class="w-full px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition"
            >
              💬 Enviar WhatsApp
            </button>
            <button
              @click="sendEmail"
              class="w-full px-4 py-2 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 transition"
            >
              📧 Enviar Email
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const pdfPreviewUrl = ref<string | null>(null)

const order = ref({
  client: {
    name: 'Loja XYZ',
    cnpj: '12.345.678/0001-99',
    address: 'Rua A, 123',
    phone: '(11) 98765-4321',
    email: 'contato@lojaxyz.com'
  },
  items: [
    { code: 'SKU001', description: 'Produto A', quantity: 10, price: 100.00 },
    { code: 'SKU002', description: 'Produto B', quantity: 5, price: 50.00 },
    { code: 'SKU003', description: 'Produto C', quantity: 2, price: 200.00 }
  ],
  discount: 0,
  shipping: 150.00
})

const subtotal = computed(() => {
  return order.value.items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
})

const total = computed(() => {
  return subtotal.value - order.value.discount + order.value.shipping
})

const generatePDF = async () => {
  // Chamar API para gerar PDF
  // Atualizar pdfPreviewUrl
}

const sendWhatsApp = async () => {
  // Pedir número do cliente
  // Chamar API para enviar WhatsApp
}

const sendEmail = async () => {
  // Pedir email
  // Chamar API para enviar Email
}

onMounted(async () => {
  // Buscar dados da extração
})
</script>
```

---

### 2.5. Tela de Templates

**Path:** `/pages/templates.vue`

```
┌────────────────────────────────────────────────────────────┐
│ DigitacaoZero > Templates                                    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ Meus Templates                 [+ Novo Template]          │
│                                                            │
│ ┌───────────────────────────────────────────────────────┐ │
│ │ Nome                │ Tipo      │ Campos │ Ações     │ │
│ ├───────────────────────────────────────────────────────┤ │
│ │ Balancete Contábil  │ XLSX      │ 6      │ [✎] [🗑] │ │
│ │ Pedidos Fábrica     │ Mixed     │ 4      │ [✎] [🗑] │ │
│ │ Notas Fiscais       │ PDF       │ 8      │ [✎] [🗑] │ │
│ │ Despesas            │ XLSX      │ 5      │ [✎] [🗑] │ │
│ └───────────────────────────────────────────────────────┘ │
│                                                            │
└────────────────────────────────────────────────────────────┘

Componentes:
- Botão para criar novo template
- Tabela de templates
- Ações: editar, deletar
```

---

## 3. Componentes Vue Reutilizáveis

### Button Component

```vue
<!-- @/components/Button.vue -->
<template>
  <button
    :type="type"
    :class="[
      'px-4 py-2 rounded-lg font-semibold transition',
      sizeClasses,
      variantClasses,
      disabled && 'opacity-50 cursor-not-allowed'
    ]"
    :disabled="disabled"
  >
    {{ label }}
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  label: string
  variant?: 'primary' | 'secondary' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  type: 'button',
  disabled: false
})

const sizeClasses = computed(() => {
  return {
    'sm': 'px-3 py-1 text-sm',
    'md': 'px-4 py-2 text-base',
    'lg': 'px-6 py-3 text-lg'
  }[props.size]
})

const variantClasses = computed(() => {
  return {
    'primary': 'bg-blue-500 text-white hover:bg-blue-600',
    'secondary': 'bg-gray-500 text-white hover:bg-gray-600',
    'danger': 'bg-red-500 text-white hover:bg-red-600',
    'success': 'bg-green-500 text-white hover:bg-green-600'
  }[props.variant]
})
</script>
```

### Card Component

```vue
<!-- @/components/Card.vue -->
<template>
  <div class="bg-white rounded-lg shadow p-6">
    <h3 v-if="title" class="text-lg font-semibold mb-4">{{ title }}</h3>
    <slot />
  </div>
</template>

<script setup lang="ts">
interface Props {
  title?: string
}

defineProps<Props>()
</script>
```

### Input Component

```vue
<!-- @/components/Input.vue -->
<template>
  <div>
    <label v-if="label" class="block text-sm font-medium text-gray-700 mb-1">
      {{ label }}
    </label>
    <input
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      @input="emit('update:modelValue', $event.target.value)"
      class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
    />
    <span v-if="error" class="text-red-500 text-sm mt-1">{{ error }}</span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: string
  label?: string
  placeholder?: string
  type?: string
  error?: string
}

defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>
```

### Badge Component

```vue
<!-- @/components/Badge.vue -->
<template>
  <span
    :class="[
      'px-3 py-1 rounded-full text-sm font-medium',
      statusClasses
    ]"
  >
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  label: string
  status?: 'pending' | 'approved' | 'rejected' | 'processing'
}

const props = withDefaults(defineProps<Props>(), {
  status: 'pending'
})

const statusClasses = computed(() => {
  return {
    'pending': 'bg-yellow-100 text-yellow-800',
    'approved': 'bg-green-100 text-green-800',
    'rejected': 'bg-red-100 text-red-800',
    'processing': 'bg-blue-100 text-blue-800'
  }[props.status]
})
</script>
```

---

## 4. Estrutura de Navegação

```
/
├── /auth/
│   ├── /login
│   ├── /signup
│   └── /forgot-password
├── /dashboard
├── /extraction/
│   └── /[id]/
│       ├── /validate (contabilidade)
│       └── /generate-pdf (representante)
├── /templates/
│   ├── / (lista)
│   └── /[id] (editar)
└── /settings/
    ├── /profile
    ├── /company
    └── /integrations
```

---

## 5. Responsividade

```css
/* Mobile First */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }

/* Exemplo: Grid Cards */
<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
```

---

## 6. Animações & Transições

```css
/* Fade in */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* Slide */
.slide-enter-active, .slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from {
  transform: translateX(-100%);
}

.slide-leave-to {
  transform: translateX(100%);
}
```

---

Pronto! Com este documento, você tem toda a estrutura visual e componentes para buildar a interface do DigitacaoZero.
