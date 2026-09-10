# DigitacaoZero - Dashboard Público Compartilhável

**Recurso:** Gerar links públicos para compartilhar dashboards sem necessidade de login  
**Use Case:** Contadores compartilham relatório com cliente. Representantes compartilham pedido com gerente de compras.

---

## 1. Conceito

### O Problema
- Power BI é complexo pra cliente usar
- Representante precisa enviar dados pro comprador
- Contador quer mostrar relatório sem dar acesso ao sistema

### A Solução
```
User clica [Compartilhar]
    ↓
Sistema gera URL: extracthub.com/public/share/{TOKEN}
    ↓
User copia e envia pro cliente (WhatsApp, email, etc)
    ↓
Cliente abre link → vê dados em tempo real
    ↓
Sem login, sem complicação
```

---

## 2. Arquitetura de Banco de Dados

### Tabelas Supabase

```sql
-- Configuração de compartilhamentos públicos
CREATE TABLE public_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  
  -- Configuração
  name TEXT NOT NULL, -- "Relatório Agosto", "Pedido #123"
  description TEXT,
  share_type TEXT NOT NULL, -- 'extraction', 'report', 'dashboard'
  
  -- O que compartilhar
  extraction_ids UUID[] DEFAULT ARRAY[]::UUID[], -- array de extraction IDs
  template_id UUID REFERENCES templates(id),
  filter_config JSONB, -- filtros aplicados (opcional)
  
  -- Token único
  share_token TEXT UNIQUE NOT NULL, -- hash de 32 caracteres
  
  -- Permissões
  is_active BOOLEAN DEFAULT TRUE,
  can_download BOOLEAN DEFAULT TRUE,
  can_export_pdf BOOLEAN DEFAULT TRUE,
  expiry_date TIMESTAMP, -- null = nunca expira
  max_views INT, -- null = ilimitado
  
  -- Tracking
  view_count INT DEFAULT 0,
  last_viewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Histórico de visualizações (para analytics)
CREATE TABLE public_share_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID REFERENCES public_shares(id) ON DELETE CASCADE,
  viewer_ip TEXT,
  viewer_user_agent TEXT,
  viewed_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_public_shares_token ON public_shares(share_token);
CREATE INDEX idx_public_shares_company ON public_shares(company_id);
CREATE INDEX idx_public_shares_active ON public_shares(is_active) WHERE is_active = TRUE;
```

---

## 3. API Endpoints

### POST /api/public-share/create

```typescript
export default defineEventHandler(async (event) => {
  // 1. Validar usuário autenticado
  const user = await requireAuth(event)

  // 2. Validar request
  const body = await readBody(event)
  if (!body.name || !body.extraction_ids?.length) {
    throw createError({ statusCode: 400, statusMessage: 'Missing fields' })
  }

  // 3. Verificar permissions
  const company = await verifyCompanyOwnership(event, user.id)

  // 4. Gerar token único
  const shareToken = generateToken(32)

  // 5. Calcular expiry_date
  const expiryDate = body.expiry_days
    ? new Date(Date.now() + body.expiry_days * 24 * 60 * 60 * 1000)
    : null

  // 6. Criar registro em Supabase
  const { data: share, error } = await supabase
    .from('public_shares')
    .insert({
      company_id: company.id,
      created_by: user.id,
      name: body.name,
      description: body.description,
      share_type: 'extraction',
      extraction_ids: body.extraction_ids,
      share_token: shareToken,
      can_download: body.can_download ?? true,
      can_export_pdf: body.can_export_pdf ?? true,
      expiry_date: expiryDate,
      max_views: body.max_views
    })
    .select()
    .single()

  if (error) throw error

  // 7. Gerar QR Code (opcional)
  const qrCodeUrl = await generateQRCode(
    `${process.env.NUXT_PUBLIC_APP_URL}/public/share/${shareToken}`
  )

  return {
    share_id: share.id,
    share_token: shareToken,
    share_url: `${process.env.NUXT_PUBLIC_APP_URL}/public/share/${shareToken}`,
    qr_code_url: qrCodeUrl
  }
})
```

### GET /public/share/[token]

```typescript
export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')

  if (!token) {
    throw createError({ statusCode: 400, statusMessage: 'Missing token' })
  }

  // 1. Buscar share by token
  const { data: share, error } = await supabase
    .from('public_shares')
    .select('*')
    .eq('share_token', token)
    .eq('is_active', true)
    .single()

  if (error || !share) {
    throw createError({ statusCode: 404, statusMessage: 'Share not found' })
  }

  // 2. Validar expiry
  if (share.expiry_date && new Date(share.expiry_date) < new Date()) {
    throw createError({ statusCode: 410, statusMessage: 'Share expired' })
  }

  // 3. Validar max_views
  if (share.max_views && share.view_count >= share.max_views) {
    throw createError({ statusCode: 410, statusMessage: 'Share limit reached' })
  }

  // 4. Buscar extractions
  const { data: extractions, error: extError } = await supabase
    .from('extractions')
    .select('*')
    .in('id', share.extraction_ids)
    .eq('validation_status', 'approved')

  if (extError) throw extError

  // 5. Incrementar view_count
  await supabase
    .from('public_shares')
    .update({
      view_count: share.view_count + 1,
      last_viewed_at: new Date()
    })
    .eq('id', share.id)

  // 6. Log de visualização
  await supabase.from('public_share_views').insert({
    share_id: share.id,
    viewer_ip: getClientIP(event),
    viewer_user_agent: getHeader(event, 'user-agent')
  })

  return {
    share: {
      id: share.id,
      name: share.name,
      description: share.description,
      created_at: share.created_at,
      can_download: share.can_download,
      can_export_pdf: share.can_export_pdf
    },
    extractions: extractions,
    company: await getCompanyInfo(share.company_id)
  }
})
```

### GET /api/public-share/list

```typescript
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const company = await verifyCompanyOwnership(event, user.id)

  const { data: shares } = await supabase
    .from('public_shares')
    .select('id, name, share_token, is_active, view_count, created_at')
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })

  return shares
})
```

### DELETE /api/public-share/[shareId]

```typescript
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const shareId = getRouterParam(event, 'shareId')

  // Verificar ownership
  const share = await supabase
    .from('public_shares')
    .select('company_id')
    .eq('id', shareId)
    .single()

  const company = await verifyCompanyOwnership(event, user.id)
  if (share.data.company_id !== company.id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  // Deletar
  await supabase
    .from('public_shares')
    .delete()
    .eq('id', shareId)

  return { success: true }
})
```

---

## 4. Componentes Vue

### ShareButton

```vue
<template>
  <div class="flex gap-2">
    <button
      @click="openShareModal"
      class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
    >
      🔗 Compartilhar
    </button>

    <ShareModal
      v-if="showModal"
      :extraction-ids="selectedExtractionIds"
      @close="showModal = false"
      @shared="handleShared"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const showModal = ref(false)
const selectedExtractionIds = ref<string[]>([])

const openShareModal = () => {
  showModal.value = true
}

const handleShared = (shareUrl: string) => {
  // Toast: "Link copiado!"
}
</script>
```

### ShareModal

```vue
<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 max-w-md w-full">
      <h3 class="text-2xl font-bold mb-4">Gerar Link de Compartilhamento</h3>

      <!-- Form -->
      <form @submit.prevent="handleCreate" class="space-y-4" v-if="!successShare">
        <div>
          <label class="block text-sm font-medium mb-1">Nome do Link</label>
          <input
            v-model="form.name"
            type="text"
            placeholder="Ex: Relatório Agosto"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg"
            required
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Descrição (opcional)</label>
          <textarea
            v-model="form.description"
            placeholder="Descrição para o receptor"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm h-20"
          />
        </div>

        <div class="space-y-2">
          <label class="flex items-center gap-2">
            <input v-model="form.can_download" type="checkbox" />
            <span>Permitir download</span>
          </label>
          <label class="flex items-center gap-2">
            <input v-model="form.can_export_pdf" type="checkbox" />
            <span>Permitir exportar PDF</span>
          </label>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Expiração</label>
          <select v-model="form.expiry_days" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
            <option :value="null">Nunca expira</option>
            <option :value="1">1 dia</option>
            <option :value="7">7 dias</option>
            <option :value="30">30 dias</option>
            <option :value="90">90 dias</option>
          </select>
        </div>

        <div class="flex gap-2 justify-end">
          <button
            type="button"
            @click="$emit('close')"
            class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="loading"
            class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {{ loading ? 'Criando...' : 'Gerar Link' }}
          </button>
        </div>
      </form>

      <!-- Success State -->
      <div v-else class="space-y-4">
        <p class="text-green-800 font-medium">✅ Link criado com sucesso!</p>

        <div>
          <label class="block text-sm font-medium mb-1">URL para compartilhar:</label>
          <div class="flex gap-2">
            <input
              :value="successShare.share_url"
              type="text"
              readonly
              class="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-sm"
            />
            <button
              @click="copyToClipboard(successShare.share_url)"
              class="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
            >
              Copiar
            </button>
          </div>
        </div>

        <div v-if="successShare.qr_code_url" class="text-center">
          <p class="text-sm font-medium mb-2">QR Code:</p>
          <img :src="successShare.qr_code_url" class="w-32 h-32 mx-auto" />
        </div>

        <div class="flex gap-2 justify-center">
          <button
            @click="shareViaWhatsApp"
            class="px-3 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
          >
            💬 WhatsApp
          </button>
          <button
            @click="shareViaEmail"
            class="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
          >
            📧 Email
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  extractionIds: string[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  shared: [url: string]
}>()

const form = ref({
  name: '',
  description: '',
  can_download: true,
  can_export_pdf: true,
  expiry_days: null as number | null,
  max_views: null as number | null
})

const loading = ref(false)
const successShare = ref<any>(null)

const handleCreate = async () => {
  loading.value = true
  try {
    const response = await $fetch('/api/public-share/create', {
      method: 'POST',
      body: {
        ...form.value,
        extraction_ids: props.extractionIds
      }
    })
    successShare.value = response
    emit('shared', response.share_url)
  } catch (error) {
    console.error('Error:', error)
  } finally {
    loading.value = false
  }
}

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text)
}

const shareViaWhatsApp = () => {
  const text = `${form.value.name}\n\n${successShare.value?.share_url}`
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`)
}

const shareViaEmail = () => {
  const subject = form.value.name
  const body = `${form.value.description}\n\n${successShare.value?.share_url}`
  window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
}
</script>
```

---

## 5. Tela Pública (/pages/public/share/[token].vue)

```vue
<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <div class="flex items-center gap-4">
          <img v-if="company?.logo_url" :src="company.logo_url" class="h-8" />
          <div>
            <p class="font-bold text-gray-900">{{ share?.name }}</p>
            <p class="text-sm text-gray-600">{{ company?.name }}</p>
          </div>
        </div>
        <div class="text-sm text-gray-600">Link público • Sem autenticação</div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-6 py-8">
      <div v-if="share?.description" class="mb-6 p-4 bg-blue-50 rounded-lg">
        <p class="text-gray-700">{{ share.description }}</p>
      </div>

      <div v-if="loading" class="text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
      </div>

      <div v-else-if="extractions.length" class="bg-white rounded-lg shadow overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-200">
                <th v-for="col in columns" :key="col" class="px-6 py-3 text-left text-sm font-semibold">
                  {{ col }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in tableData" :key="idx" class="border-b border-gray-200 hover:bg-gray-50">
                <td v-for="col in columns" :key="col" class="px-6 py-3 text-sm text-gray-700">
                  {{ formatCell(row[col]) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-else class="text-center py-12 text-gray-600">
        <p>Nenhum dado para exibir</p>
      </div>

      <div v-if="extractions.length" class="mt-8 flex gap-4">
        <button
          v-if="share?.can_download"
          @click="downloadExcel"
          class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          📥 Download Excel
        </button>
        <button
          v-if="share?.can_export_pdf"
          @click="exportPDF"
          class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
        >
          📄 Export PDF
        </button>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const token = route.params.token as string

const loading = ref(true)
const share = ref<any>(null)
const extractions = ref<any[]>([])
const company = ref<any>(null)

const columns = computed(() => {
  if (!extractions.value[0]) return []
  return Object.keys(extractions.value[0].extracted_data || {})
})

const tableData = computed(() => {
  return extractions.value.map(ext => ext.extracted_data)
})

onMounted(async () => {
  try {
    const response = await $fetch(`/api/public-share/${token}`)
    share.value = response.share
    extractions.value = response.extractions
    company.value = response.company
  } catch (error) {
    console.error('Error loading share:', error)
  } finally {
    loading.value = false
  }
})

const formatCell = (value: any) => {
  if (typeof value === 'object') return JSON.stringify(value)
  if (typeof value === 'number') return value.toLocaleString('pt-BR')
  return value
}

const downloadExcel = async () => {
  // Implementar com SheetJS
}

const exportPDF = async () => {
  // Implementar com PDFKit
}
</script>
```

---

## 6. RLS Policies

```sql
-- Qualquer pessoa pode ver public_shares ativas
CREATE POLICY "public_shares_select_public"
ON public_shares FOR SELECT
TO anon
USING (is_active = TRUE AND (expiry_date IS NULL OR expiry_date > NOW()) AND (max_views IS NULL OR view_count < max_views));

-- Apenas o criador pode gerenciar seu compartilhamento
CREATE POLICY "public_shares_manage_owner"
ON public_shares FOR ALL
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Público pode registrar visualizações
CREATE POLICY "public_share_views_insert_public"
ON public_share_views FOR INSERT
TO anon
WITH CHECK (TRUE);
```

---

## 7. Fluxo Completo

### Scenario: Contador Compartilha Relatório

```
1. Contador vai para extração de balancete
2. Clica [🔗 Compartilhar]
3. Modal abre com form:
   - Nome: "Balancete Agosto 2026"
   - Descrição: "Relatório para cliente ABC Ltda"
   - Pode download: ✓
   - Pode export PDF: ✓
   - Expira em: 30 dias
4. Clica [Gerar Link]
5. Sistema cria share_token
6. URL gerada: extracthub.com/public/share/a3k9x2m1b7c9
7. QR Code gerado
8. Contador clica [WhatsApp]
9. WhatsApp abre com mensagem:
   "Balancete Agosto 2026
   extracthub.com/public/share/a3k9x2m1b7c9"
10. Cliente recebe, clica link
11. Cliente vê tabela com dados (em tempo real)
12. Cliente clica [Download Excel] ou [Export PDF]
13. Arquivo baixa direto do navegador
```

---

## 8. Integração com Validação

No componente de validação (EXTRACTHUB-DESIGN.md seção 2.3), adicione:

```vue
<!-- Em ValidationTable.vue -->
<div class="flex gap-4">
  <button @click="approve" class="px-6 py-2 bg-green-500 text-white rounded-lg">
    ✓ Aprovar
  </button>
  <button @click="reject" class="px-6 py-2 bg-red-500 text-white rounded-lg">
    ✕ Rejeitar
  </button>
  <button @click="sharePublic" class="px-6 py-2 bg-blue-500 text-white rounded-lg">
    🔗 Compartilhar
  </button>
  <button @click="exportData" class="px-6 py-2 bg-gray-500 text-white rounded-lg">
    📥 Exportar
  </button>
</div>
```

---

Pronto! Esse é o recurso de Dashboard Público Compartilhável completo para o DigitacaoZero. 🚀
