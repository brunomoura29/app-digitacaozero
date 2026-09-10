# DigitacaoZero - Especificação Técnica Completa

**Status:** MVP v1.0 - Pronto para Build  
**Última atualização:** Set 2026  
**Clientes validados:** 2 (Representante Comercial C3 + Contabilidade)

---

## 1. Visão Geral

**DigitacaoZero** é um portal inteligente de extração e normalização de dados que elimina trabalho manual de processamento de documentos.

### Problema Resolvido
- **Contabilidade:** Contador recebe 10 planilhas de clientes → gasta 2h digitando dados → com DigitacaoZero: 15min validando dados automáticos
- **Representante Comercial:** Pedidos chegam em foto/email/PDF → manualmente transcreve → com DigitacaoZero: extrai + gera PDF de ordem de compra + envia via WhatsApp

### Diferencial
- Multi-tenant SaaS (cada empresa = login + templates customizados)
- Suporta múltiplos formatos de entrada (imagens via Claude Vision, XLSX estruturado via SheetJS)
- Integração automática com Power BI (contabilidade) ou WhatsApp API (representante)
- Dashboard de validação simples mas robusto
- Histórico completo em Supabase (auditoria)

---

## 2. Arquitetura & Stack

### Tecnologias
```
Frontend:
  - Nuxt 4 + Vue 3 + TypeScript
  - TailwindCSS para estilos
  - Supabase JS client

Backend:
  - Supabase (PostgreSQL + RLS)
  - Edge Functions (Deno) para lógica rápida
  - n8n (orquestração opcional para automações)

IA/Extração:
  - Claude Vision API (para imagens/PDFs caóticos)
  - SheetJS (para XLSX estruturado)

Integrações:
  - Power BI Service API (contabilidade)
  - Meta WhatsApp Cloud API (representante)

Hospedagem:
  - Vercel (Frontend)
  - Supabase (Database + Auth)
```

### Estrutura de Pastas
```
extracthub/
├── frontend/
│   ├── components/
│   │   ├── Upload.vue
│   │   ├── Dashboard.vue
│   │   ├── ValidationTable.vue
│   │   └── ExportModal.vue
│   ├── pages/
│   │   ├── index.vue (login)
│   │   ├── dashboard.vue (main)
│   │   └── settings.vue (templates)
│   └── composables/
│       ├── useExtraction.ts
│       └── useValidation.ts
│
├── backend/
│   ├── supabase/
│   │   ├── migrations/
│   │   │   └── 001_init_schema.sql
│   │   └── functions/
│   │       ├── extract-vision.ts
│   │       ├── extract-sheet.ts
│   │       ├── sync-powerbi.ts
│   │       └── send-whatsapp.ts
│   └── utils/
│       ├── file-parser.ts
│       └── pdf-generator.ts
│
├── docs/
│   └── API.md
└── tests/
    └── extraction.test.ts
```

---

## 3. Banco de Dados (Supabase PostgreSQL)

### Schema SQL

```sql
-- Empresas (multi-tenant)
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE,
  logo_url TEXT,
  owner_email TEXT NOT NULL,
  subscription_plan TEXT DEFAULT 'free', -- free, pro, enterprise
  powerbi_workspace_id TEXT,
  powerbi_dataset_id TEXT,
  powerbi_refresh_token TEXT, -- criptografado
  whatsapp_phone TEXT,
  whatsapp_token TEXT, -- criptografado
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Templates (customizáveis por empresa)
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- "Balancete Contábil", "Pedidos Fábrica"
  description TEXT,
  version INT DEFAULT 1,
  type TEXT NOT NULL, -- 'xlsx', 'image', 'mixed'
  schema JSONB NOT NULL, -- define os campos esperados
  example_file_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_id, name, version)
);

-- Extrações (histórico de processamentos)
CREATE TABLE extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  template_id UUID REFERENCES templates(id),
  template_version INT,
  file_name TEXT,
  file_hash TEXT, -- sha256 para detectar duplicatas
  file_size INT,
  file_url TEXT,
  source_type TEXT, -- 'image', 'xlsx', 'pdf'
  extracted_data JSONB NOT NULL, -- dados extraídos estruturados
  validation_status TEXT DEFAULT 'pending', -- pending, approved, rejected
  validation_feedback TEXT,
  validated_by UUID REFERENCES auth.users(id),
  validated_at TIMESTAMP,
  powerbi_synced BOOLEAN DEFAULT FALSE,
  powerbi_synced_at TIMESTAMP,
  whatsapp_sent BOOLEAN DEFAULT FALSE,
  whatsapp_sent_at TIMESTAMP,
  whatsapp_message_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Auditoria (quem fez o quê e quando)
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  user_id UUID REFERENCES auth.users(id),
  action TEXT, -- 'uploaded', 'validated', 'exported', 'synced'
  extraction_id UUID REFERENCES extractions(id),
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_extractions_company ON extractions(company_id);
CREATE INDEX idx_extractions_template ON extractions(template_id);
CREATE INDEX idx_extractions_status ON extractions(validation_status);
CREATE INDEX idx_extractions_hash ON extractions(file_hash);
CREATE INDEX idx_templates_company ON templates(company_id);
```

### Exemplo de Template (JSONB)
```json
{
  "name": "Balancete Contábil",
  "fields": [
    {
      "id": "codigo",
      "name": "Código da Conta",
      "type": "text",
      "required": true,
      "validation": "^[0-9]+$"
    },
    {
      "id": "descricao",
      "name": "Descrição da Conta",
      "type": "text",
      "required": true
    },
    {
      "id": "saldo_anterior",
      "name": "Saldo Anterior",
      "type": "number",
      "required": false
    },
    {
      "id": "debito",
      "name": "Débito",
      "type": "number",
      "required": false
    },
    {
      "id": "credito",
      "name": "Crédito",
      "type": "number",
      "required": false
    },
    {
      "id": "saldo_atual",
      "name": "Saldo Atual",
      "type": "number",
      "required": true
    }
  ],
  "metadata": {
    "empresa_field": "linha 1, coluna 7",
    "cnpj_field": "linha 2, coluna 7",
    "periodo_field": "linha 4, coluna 7"
  }
}
```

### Exemplo de Extração (JSONB)
```json
{
  "empresa": "A B PACHECO ME",
  "cnpj": "11.687.691/0001-60",
  "periodo": "01/08/2022 - 31/08/2022",
  "abas": {
    "jan": [
      {"codigo": "1", "descricao": "ATIVO", "saldo_anterior": 936627.52, "debito": 300419.02, "credito": 313994.78, "saldo_atual": 923051.76},
      {"codigo": "2", "descricao": "ATIVO CIRCULANTE", "saldo_anterior": 734137.34, "debito": 292919.02, "credito": 312841.41, "saldo_atual": 714214.95}
    ],
    "fev": [...],
    "mar": [...]
  }
}
```

---

## 4. Fluxo Contabilidade (Balancetes → Power BI)

### User Journey

```
1. Contador faz login no DigitacaoZero
   └─ Vê seus templates salvos

2. Faz upload de arquivo Excel (balancete.xlsx)
   └─ Arquivo tem 12 abas (jan-dez) com ~225 linhas cada

3. Sistema:
   ├─ Detecta: é XLSX estruturado
   ├─ Parser SheetJS lê todas as abas
   ├─ Extrai conforme template definido
   ├─ Calcula hash (detectar duplicatas)
   └─ Grava em Supabase (validation_status = 'pending')

4. Dashboard mostra:
   ├─ Tabela com dados extraídos (primeiras 20 linhas)
   ├─ Preview das 12 abas
   └─ Botões: [Aprovar] [Rejeitar] [Editar]

5. Contador clica [Aprovar]
   └─ Sistema atualiza: validation_status = 'approved'

6. Opcional: Contador clica [Sincronizar Power BI]
   └─ Sistema:
      ├─ Puxa credenciais PowerBI do Supabase
      ├─ Chama Power BI Service API
      ├─ Dispara refresh do dataset
      └─ Marca: powerbi_synced = true

7. Power BI atualiza automaticamente
   └─ Dashboard mostra novos dados em tempo real
```

### Endpoints/Funções Necessárias

```typescript
// 1. Upload & Extraction
POST /api/extract
  ├─ payload: { file: File, company_id: string, template_id: string }
  └─ response: { extraction_id: string, preview: object }

// 2. Validation
PATCH /api/extractions/{id}
  ├─ payload: { validation_status: 'approved'|'rejected', feedback?: string }
  └─ response: { updated_extraction }

// 3. Sync Power BI
POST /api/sync-powerbi/{extraction_id}
  ├─ ação: chama Power BI Service API
  └─ response: { status: 'synced', timestamp }

// 4. Export
GET /api/extractions/{id}/export?format=xlsx|pdf|csv
  ├─ gera arquivo no formato solicitado
  └─ response: download do arquivo
```

---

## 5. Fluxo Representante Comercial (Pedidos → PDF → WhatsApp)

### User Journey

```
1. Representante faz login no DigitacaoZero
   └─ Vê templates de pedidos

2. Faz upload do pedido (pode ser foto, PDF ou XLSX)
   └─ Imagem de pedido de cliente, email com screenshot, etc

3. Sistema:
   ├─ Detecta tipo (image, pdf, xlsx)
   ├─ Se imagem/PDF: Claude Vision extrai dados
   ├─ Se XLSX: SheetJS extrai
   ├─ Estrutura: código, descrição, qtd, valor, cliente
   └─ Grava em Supabase (validation_status = 'pending')

4. Dashboard mostra:
   ├─ Itens extraídos (código, descrição, qtd, valor)
   ├─ Dados do cliente (nome, CNPJ, endereço)
   └─ Botões: [Validar] [Editar] [Rejeitar]

5. Representante clica [Validar]
   └─ Sistema atualiza: validation_status = 'approved'

6. Sistema gera PDF de Ordem de Compra
   └─ Cabeçalho:
      ├─ Logo e dados da representante (empresa dele)
      ├─ Cliente (nome, CNPJ, endereço)
      └─ Número OC + Data
   └─ Corpo:
      ├─ Tabela com itens (código, descrição, qtd, valor unitário, total)
      ├─ Subtotal
      ├─ Desconto (se aplicável)
      ├─ Frete (se aplicável)
      └─ Total Geral
   └─ Rodapé:
      ├─ Condições de pagamento
      ├─ Prazos de entrega
      └─ Observações

7. Representante clica [Enviar WhatsApp]
   └─ Sistema:
      ├─ Pusha credenciais WhatsApp do Supabase
      ├─ Chama Meta WhatsApp Cloud API
      ├─ Envia mensagem: "Veja sua ordem de compra #OC-123456"
      ├─ Anexa PDF gerado
      └─ Marca: whatsapp_sent = true

8. Cliente recebe no WhatsApp
   └─ Mensagem com PDF pronto pra encaminhar/imprimir
```

### Endpoints/Funções Necessárias

```typescript
// 1. Upload & Extraction (mesmo que contabilidade)
POST /api/extract
  ├─ payload: { file: File, company_id: string, template_id: string }
  └─ response: { extraction_id: string, preview: object }

// 2. Validation (mesmo que contabilidade)
PATCH /api/extractions/{id}
  ├─ payload: { validation_status: 'approved'|'rejected' }
  └─ response: { updated_extraction }

// 3. Generate PDF (novo para representante)
POST /api/extractions/{id}/generate-pdf
  ├─ ação: gera PDF de ordem de compra
  ├─ template: busca dados da empresa (logo, endereço, etc)
  └─ response: { pdf_url: string }

// 4. Send WhatsApp
POST /api/extractions/{id}/send-whatsapp
  ├─ payload: { recipient_phone: string, message?: string }
  ├─ ação: chama Meta WhatsApp API com PDF anexado
  └─ response: { message_id: string, status: 'sent'|'failed' }

// 5. Send Email (fallback)
POST /api/extractions/{id}/send-email
  ├─ payload: { recipient_email: string, subject?: string }
  ├─ ação: envia SMTP com PDF anexado
  └─ response: { status: 'sent'|'failed' }
```

---

## 6. Integrações Externas

### Power BI Service API (Contabilidade)

**Setup Uma Vez (Cliente):**
1. Cliente vai Power BI Desktop
2. Get Data → PostgreSQL
3. Conecta: `host=supabase-url, database=postgres`
4. Query:
   ```sql
   SELECT 
     extracted_data->>'empresa' as empresa,
     extracted_data->>'cnpj' as cnpj,
     extracted_data->'abas'->>'jan' as dados_janeiro,
     extracted_data->'abas'->>'fev' as dados_fevereiro,
     created_at
   FROM extractions
   WHERE company_id = '{company_id}'
     AND validation_status = 'approved'
   ORDER BY created_at DESC
   ```
5. Publica dataset no Power BI Web Service
6. Cria dashboard com gráficos

**Automação (DigitacaoZero):**
```typescript
async function syncPowerBI(extractionId: string) {
  const extraction = await supabase
    .from('extractions')
    .select('*')
    .eq('id', extractionId)
    .single();

  const company = await supabase
    .from('companies')
    .select('powerbi_workspace_id, powerbi_dataset_id, powerbi_refresh_token')
    .eq('id', extraction.company_id)
    .single();

  // Dispara refresh do dataset
  await fetch(
    `https://api.powerbi.com/v1.0/myorg/workspaces/${company.powerbi_workspace_id}/datasets/${company.powerbi_dataset_id}/refreshes`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${company.powerbi_refresh_token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  // Marca como sincronizado
  await supabase
    .from('extractions')
    .update({ 
      powerbi_synced: true,
      powerbi_synced_at: new Date()
    })
    .eq('id', extractionId);
}
```

### Meta WhatsApp Cloud API (Representante)

**Setup Uma Vez (Representante):**
1. Cria Business Account no Meta for Business
2. Configura número WhatsApp Business
3. Gera API token
4. Salva em DigitacaoZero (criptografado)

**Automação (DigitacaoZero):**
```typescript
async function sendWhatsApp(
  extractionId: string,
  recipientPhone: string,
  pdfUrl: string
) {
  const company = await supabase
    .from('companies')
    .select('whatsapp_phone, whatsapp_token')
    .eq('id', extraction.company_id)
    .single();

  const response = await fetch(
    `https://graph.instagram.com/v18.0/${company.whatsapp_phone}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${company.whatsapp_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipientPhone,
        type: 'document',
        document: {
          link: pdfUrl,
          caption: 'Sua Ordem de Compra #OC-' + extractionId.slice(0, 8).toUpperCase()
        }
      })
    }
  );

  const data = await response.json();
  
  // Marca como enviado
  await supabase
    .from('extractions')
    .update({
      whatsapp_sent: true,
      whatsapp_sent_at: new Date(),
      whatsapp_message_id: data.messages[0].id
    })
    .eq('id', extractionId);
}
```

---

## 7. MVP v1.0 - Tarefas Priorizadas

### Phase 1: Setup & Auth (1 semana)
- [ ] Supabase setup (banco + RLS policies)
- [ ] Autenticação (login/signup de empresas)
- [ ] Página de dashboard básica
- [ ] Componente upload de arquivo

### Phase 2: Extração (1.5 semanas)
- [ ] Parser SheetJS (XLSX estruturado)
- [ ] Claude Vision integration (imagens/PDFs)
- [ ] Detecção de duplicatas (sha256 hash)
- [ ] Estruturação de dados no Supabase
- [ ] Testes com arquivo teste.xlsx

### Phase 3: Validação (1 semana)
- [ ] Dashboard de validação (tabela)
- [ ] Preview de dados extraídos
- [ ] Botões: Aprovar/Rejeitar/Editar
- [ ] Feedback de erros

### Phase 4: Exportação & Storage (5 dias)
- [ ] Export XLSX
- [ ] Export CSV
- [ ] Export PDF (simples, só tabela)
- [ ] Grava tudo em Supabase

### Phase 5: Power BI Integration (1 semana)
- [ ] Documentação: como conectar Power BI
- [ ] Teste de sincronização com cliente
- [ ] Botão "Sincronizar Power BI" no dashboard

### Phase 6: PDF Ordem de Compra (5 dias)
- [ ] Template de PDF (puppeteer ou pdfkit)
- [ ] Campos dinâmicos (empresa, cliente, itens)
- [ ] Preview antes de gerar

### Phase 7: WhatsApp Integration (5 dias)
- [ ] Setup Meta WhatsApp API
- [ ] Teste de envio de mensagem + PDF
- [ ] UI para inserir número do cliente
- [ ] Feedback de sucesso/erro

### Phase 8: Polish & Testing (1 semana)
- [ ] Tratamento de erros robusto
- [ ] Loading states
- [ ] Validação de input
- [ ] Testes e2e com 2 clientes reais

**Total: ~6 semanas para MVP funcional com 2 casos de uso**

---

## 8. Como Começar a Buildar

### Setup Local

```bash
# 1. Clonar repo (ou inicializar)
git clone <repo>
cd extracthub

# 2. Install dependencies
npm install

# 3. Setup Supabase local (opcional)
supabase start

# 4. Variáveis de ambiente
cp .env.example .env.local
# Preencher: SUPABASE_URL, SUPABASE_KEY, CLAUDE_API_KEY, etc

# 5. Rodar frontend dev
npm run dev

# 6. Rodar testes
npm run test
```

### Primeira Feature (Recomendado)

1. **Criar schema no Supabase** (`001_init_schema.sql`)
   - Rodar migrações
   - Verificar tabelas criadas

2. **Setup Auth**
   - Email/password auth do Supabase
   - Componente LoginForm.vue
   - Middleware de autenticação

3. **Componente Upload**
   - Input file + botão submit
   - Preview de arquivo
   - Enviar pra backend

4. **Backend: Extract (SheetJS)**
   - Edge Function que recebe arquivo
   - Parse com SheetJS
   - Retorna preview dos dados

5. **Dashboard Simples**
   - Tabela mostrando extraction preview
   - Botão [Aprovar]
   - Grava validation_status no DB

### Testes com Dados Reais

- Usar `teste.xlsx` (arquivo de teste que cliente passou)
- Validar:
  - ✅ Extrai 12 abas corretamente
  - ✅ Campos estruturados no JSONB
  - ✅ Hash detecta duplicatas
  - ✅ Dashboard mostra tabela limpa
  - ✅ Aprovação grava em DB

---

## 9. Checklist de Go-Live (Cliente Piloto)

### Contabilidade (Cliente Piloto 1)
- [ ] Upload e extração de balancete funcionando
- [ ] Dashboard de validação operacional
- [ ] Power BI conectado (query rodando)
- [ ] Sincronização manual com botão
- [ ] Relatório XLSX/CSV exportável
- [ ] Auditoria de dados (audit_log preenchido)
- [ ] Documentação de como usar

### Representante Comercial (Cliente Piloto 2)
- [ ] Upload de pedido (foto/PDF/XLSX)
- [ ] Extração com Claude Vision
- [ ] Dashboard de validação
- [ ] Geração de PDF de Ordem de Compra
- [ ] Envio via WhatsApp funcionando
- [ ] Histórico de pedidos em Supabase
- [ ] Documentação de como usar

---

## 10. Próximos Passos (v1.1+)

- [ ] Templates pré-prontos (Balancete, Nota Fiscal, Despesa, Pedido)
- [ ] Filtros avançados em dashboard
- [ ] Integração com n8n (automações customizadas)
- [ ] Pagamentos (Stripe/PagSeguro)
- [ ] Mobile app (React Native)
- [ ] Sync automático com ERP (API aberta)

---

## 11. Notas Importantes

### Segurança
- Toda credencial (Power BI token, WhatsApp token) deve ser criptografada em Supabase
- RLS policies: empresa só vê seus próprios dados
- Hash de arquivos pra detectar duplicatas

### Performance
- Índices em company_id, validation_status, file_hash
- Cache de templates (não muda frequente)
- Query Power BI otimizada (WHERE validation_status='approved')

### Custo
- Claude Vision: ~$0.003 por imagem (controlar rate limiting)
- Supabase: storage + database (free tier até 1GB)
- Meta WhatsApp: $0.002 por mensagem + $15/mês template
- Power BI: R$ ~200/mês por usuário

### Escalabilidade
- Começar com Supabase free (suficiente para pilotos)
- Queue system (Bull.js) se extrações forem heavy
- CDN para PDFs gerados

---

## 12. Contato & Dúvidas

**Desenvolvedor IA/Claude Code:**
- Use este arquivo como seu "briefing completo"
- Qualquer dúvida de arquitetura = consulte seção de Stack
- Qualquer dúvida de fluxo = consulte seções 4-5 (Contabilidade e Representante)
- Prioridade de build = seção 7 (Phase 1 → Phase 8)

**Cliente (Contabilidade):**
- Setup Power BI = seção 6 (Power BI Service API)
- Como usar DigitacaoZero = seção 5 (Fluxo)

**Cliente (Representante):**
- Setup WhatsApp = seção 6 (Meta WhatsApp Cloud API)
- Como usar DigitacaoZero = seção 4 (Fluxo)

---

**Pronto para buildar? Vamos lá!** 🚀
