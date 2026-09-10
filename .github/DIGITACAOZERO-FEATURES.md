# DigitacaoZero - Features & Funcionalidades

**Versão:** MVP 1.0  
**Status:** Especificação de Features  

---

## 1. Autenticação & Onboarding

### 1.1. Login
- [x] Email + Senha
- [x] Validação de email (formato)
- [x] Recuperação de senha
- [x] Login com Google (OAuth) - opcional
- [x] Lembrar login
- [x] Tentativas limitadas (5 tentativas = bloqueio 15min)
- [x] Toast com mensagens de erro

**Fluxo:**
```
Email inválido → Erro inline
Senha incorreta → Toast "Email ou senha inválidos"
Conta não existe → Link para signup
Conta bloqueada → Toast "Tente novamente em X minutos"
Login sucesso → Redirecionar dashboard
```

### 1.2. Sign Up
- [x] Nome + Email + Empresa + Senha
- [x] Validação de email único
- [x] Força de senha (mínimo 8 caracteres)
- [x] Confirmação de email (link enviado)
- [x] Criação automática de workspace
- [x] Template padrão criado (vazio)

**Validações:**
```
Email já existe → "Email já registrado"
Empresa vazia → "Informe nome da empresa"
Senha < 8 chars → "Senha deve ter mínimo 8 caracteres"
Email inválido → "Email inválido"
```

### 1.3. Recuperação de Senha
- [x] Campo de email
- [x] Email com link de reset
- [x] Link válido por 1 hora
- [x] Nova senha com força validada
- [x] Confirmação de sucesso

---

## 2. Dashboard

### 2.1. Overview
- [x] Boas-vindas com nome do usuário
- [x] Cards de stats:
  - Extrações hoje
  - Aprovadas este mês
  - Taxa de sucesso (%)
  - Horas economizadas
- [x] Gráfico de extrações por dia (últimos 7 dias)
- [x] Gráfico de status (aprovadas vs rejeitadas)

### 2.2. Upload Area
- [x] Drag & drop
- [x] Click para selecionar arquivo
- [x] Aceita: XLSX, PDF, imagens (JPG, PNG, GIF)
- [x] Max size: 50MB
- [x] Preview de imagem antes de upload
- [x] Validação de formato
- [x] Progress bar durante upload
- [x] Cancelar upload
- [x] Histórico de uploads da sessão

**Validações:**
```
Arquivo vazio → "Arquivo inválido"
Tamanho > 50MB → "Arquivo muito grande (máx 50MB)"
Formato não suportado → "Formato não suportado. Use: XLSX, PDF, ou imagens"
```

### 2.3. Recent Extractions Table
- [x] Colunas: Arquivo, Data, Status, Ações
- [x] Filtro por status (Aprovada, Pendente, Rejeitada)
- [x] Busca por nome de arquivo
- [x] Ordenação por data
- [x] Paginação (20 por página)
- [x] Ações:
  - Ver detalhes
  - Download
  - Deletar
  - Sincronizar (Power BI)
  - Enviar (WhatsApp/Email)

---

## 3. Extração de Dados

### 3.1. Detecção de Formato
```
Sistema detecta:
├─ XLSX → Parser SheetJS
├─ PDF → Claude Vision API
├─ JPG/PNG/GIF → Claude Vision API
└─ Misto → Escolher parser
```

### 3.2. Parser XLSX (SheetJS)
- [x] Lê múltiplas abas
- [x] Extrai headers
- [x] Detecção de tipo de dado (texto, número, data)
- [x] Trata células vazias
- [x] Ignora linhas em branco
- [x] Performance: processar até 10k linhas em < 5seg

**Features:**
```
- Ler abas por nome
- Ignorar abas específicas
- Mesclar dados de múltiplas abas
- Filtrar colunas
- Validar tipos de dados
```

### 3.3. Parser Claude Vision (Imagens/PDFs)
- [x] Chamar Claude Vision API
- [x] Extrair conforme template definido
- [x] Structured output (JSON)
- [x] Retry automático (3 tentativas)
- [x] Timeout: 30seg por imagem
- [x] Compressão de imagem antes de enviar

**Prompt Estruturado:**
```
"Extraia os seguintes dados do documento:
- Campo1: [tipo]
- Campo2: [tipo]
...

Retorne APENAS um JSON válido com os dados extraídos.
Não inclua explicações."
```

### 3.4. Hash & Duplicação
- [x] Calcular SHA-256 do arquivo
- [x] Verificar se arquivo já foi processado
- [x] Aviso: "Este arquivo já foi processado em XX/XX"
- [x] Opções: Processar mesmo assim vs Cancelar
- [x] Validação adicional: comparar extracted_data
  - Se mesmos dados → "Mesmo arquivo"
  - Se dados diferentes → "Possível cópia"

---

## 4. Validação & Dashboard

### 4.1. Validação Table
- [x] Mostrar dados extraídos em tabela
- [x] Preview de primeiras 20 linhas
- [x] Paginação
- [x] Expandir linha para ver completa
- [x] Edição inline de células
  - Clicar célula → editar → salvar
  - Histórico de edições

### 4.2. Metadata Display
- [x] Empresa/Cliente
- [x] CNPJ/ID
- [x] Período/Data
- [x] Número de registros
- [x] Data do processamento
- [x] Taxa de extração (% sucesso)

### 4.3. Validação States
```
[Pendente] ⏳
- Usuário não validou ainda
- Botões: Aprovar, Rejeitar, Editar

[Aprovada] ✅
- Status final
- Botões: Editar, Exportar, Sincronizar, Deletar

[Rejeitada] ❌
- Motivo da rejeição (obrigatório)
- Botões: Reprocessar, Deletar

[Em Processamento] 🔄
- Aguardando IA
- Botão: Cancelar
```

### 4.4. Feedback & Erros
- [x] Validação de campos obrigatórios
- [x] Aviso de campos inválidos (vermelho)
- [x] Explanação de erros
- [x] Sugestões de correção

---

## 5. Templates (Customização)

### 5.1. Criar Template
- [x] Nome do template
- [x] Descrição
- [x] Tipo (XLSX, Imagem, Misto)
- [x] Selecionar campos:
  - Nome do campo
  - Tipo (texto, número, data, decimal)
  - Obrigatório (sim/não)
  - Regex para validação (opcional)
- [x] Upload de exemplo (opcional)
- [x] Salvar template

**Exemplo:**
```json
{
  "name": "Balancete Contábil",
  "type": "xlsx",
  "fields": [
    {
      "id": "codigo",
      "name": "Código Conta",
      "type": "text",
      "required": true,
      "regex": "^[0-9]+$"
    },
    {
      "id": "valor",
      "name": "Valor",
      "type": "decimal",
      "required": true
    }
  ]
}
```

### 5.2. Editar Template
- [x] Modificar campos
- [x] Adicionar/remover campos
- [x] Salvar como versão (v1.0, v1.1, etc)
- [x] Histórico de versões

### 5.3. Deletar Template
- [x] Confirmação
- [x] Aviso: "X extrações usam este template"
- [x] Opção: Manter dados vs deletar dados

---

## 6. Contabilidade Específico

### 6.1. Processar Balancete XLSX
- [x] Ler 12 abas (JAN-DEZ)
- [x] Extrair cabeçalho:
  - Empresa
  - CNPJ
  - Período
- [x] Extrair tabela por aba:
  - Código, Descrição, Saldo Anterior, Débito, Crédito, Saldo Atual
- [x] Validar somas (débito + crédito = diferença de saldo)
- [x] Consolidar tudo em uma única extração

### 6.2. Validação Contábil
- [x] Verificar se débito + crédito bateu com saldo
- [x] Alertar saldos negativos (sem justificativa)
- [x] Mostrar resumo por aba (total débito, total crédito)

### 6.3. Power BI Integration
- [x] Botão "Sincronizar Power BI"
- [x] Chamar Power BI Service API
- [x] Disparar refresh do dataset
- [x] Mostrar status: "Sincronizando...", "Pronto!", "Erro"
- [x] Toast com feedback

**Fluxo:**
```
1. Usuário clica [Sincronizar Power BI]
2. Sistema:
   ├─ Lê credenciais Power BI do Supabase
   ├─ Chama API: POST /datasets/{id}/refreshes
   ├─ Aguarda resposta (até 30seg)
   └─ Marca extraction.powerbi_synced = true
3. Toast: "✅ Sincronizado com Power BI"
```

### 6.4. Exportação
- [x] Exportar XLSX (estrutura original)
- [x] Exportar CSV (para Excel abrir)
- [x] Exportar PDF (relatório formatado)

---

## 7. Representante Comercial Específico

### 7.1. Processar Pedido (Multi-formato)
- [x] Upload foto de pedido
- [x] Upload PDF do pedido
- [x] Upload XLSX do pedido
- [x] Claude Vision extrai:
  - Itens (código, descrição, quantidade, preço)
  - Cliente (nome, CNPJ, endereço, telefone)
  - Observações
- [x] Estruturar dados conforme template

### 7.2. Validação de Pedido
- [x] Verificar se cliente existe
- [x] Validar itens (código existe?)
- [x] Calcular totais (qtd × preço)
- [x] Avisar se falta dados críticos

### 7.3. Gerar PDF - Ordem de Compra
- [x] Template de OC com:
  - Cabeçalho: Logo empresa, nº OC, data
  - Cliente: Nome, CNPJ, endereço, contato
  - Tabela itens: Código, Descrição, Qtd, Preço Unit., Total
  - Rodapé: Subtotal, Desconto, Frete, TOTAL
- [x] Campos editáveis (antes de gerar):
  - Desconto (%)
  - Frete (R$)
  - Condições de pagamento
  - Prazo de entrega
- [x] Gerar PDF com Puppeteer ou PDFKit
- [x] Download do PDF
- [x] Preview antes de salvar

**PDF Estrutura:**
```
┌─────────────────────────────────┐
│ Logo        ORDEM DE COMPRA #OC │
│ Empresa      Data: 04/09/2026   │
├─────────────────────────────────┤
│ CLIENTE                         │
│ Loja XYZ - CNPJ 12.345/0001-99 │
│ Endereço: Rua A, 123           │
├─────────────────────────────────┤
│ Cod │ Descrição │ Qtd │ Preço  │
│ 001 │ Produto A │ 10  │ 100.00 │
│ 002 │ Produto B │  5  │  50.00 │
├─────────────────────────────────┤
│                    Subtotal 1650 │
│                    Desconto    0 │
│                    Frete     150 │
│                    TOTAL    1800 │
└─────────────────────────────────┘
```

### 7.4. Enviar WhatsApp
- [x] Botão "Enviar WhatsApp"
- [x] Input: número do cliente (ou pré-preenchido)
- [x] Mensagem customizável (template)
- [x] Anexar PDF gerado
- [x] Chamar Meta WhatsApp API
- [x] Mostrar status: "Enviando...", "Enviado!", "Erro"
- [x] Log do message_id
- [x] Retry automático se falhar

**Fluxo:**
```
1. Usuário clica [Enviar WhatsApp]
2. Modal com campo: "Telefone do cliente"
3. Usuário confirma
4. Sistema:
   ├─ Lê credenciais WhatsApp
   ├─ POST https://graph.instagram.com/v18.0/{phone_id}/messages
   ├─ Payload: 
   │   {
   │     "to": "5511987654321",
   │     "type": "document",
   │     "document": {
   │       "link": "pdf-url",
   │       "caption": "Sua OC #123456"
   │     }
   │   }
   └─ Aguarda resposta
5. Toast: "✅ Enviado para WhatsApp"
6. Marca extraction.whatsapp_sent = true
```

### 7.5. Enviar Email (Fallback)
- [x] Botão "Enviar Email"
- [x] Pré-preencher: Email do cliente
- [x] Assunto customizável
- [x] Corpo da mensagem (template)
- [x] Anexar PDF
- [x] Enviar via SMTP/SendGrid
- [x] Status e feedback

---

## 8. Settings & Configurações

### 8.1. Perfil do Usuário
- [x] Nome
- [x] Email (não editável, mostrar)
- [x] Foto de perfil
- [x] Telefone (opcional)
- [x] Salvar mudanças

### 8.2. Dados da Empresa
- [x] Nome da empresa
- [x] CNPJ/CPF
- [x] Logo (upload)
- [x] Endereço
- [x] Telefone
- [x] Email
- [x] Moeda (BRL, USD, etc)

### 8.3. Integrações
- [x] Power BI:
  - Status da conexão
  - Workspace ID
  - Dataset ID
  - Botão: Desconectar
  - Botão: Reconectar (OAuth)
- [x] WhatsApp:
  - Status da conexão
  - Número da conta
  - Botão: Desconectar
  - Botão: Reconectar

### 8.4. Segurança
- [x] Alterar senha
- [x] Autenticação de dois fatores (opcional)
- [x] Log de atividades (últimos 30 dias)
- [x] Sessões ativas (logout remoto)
- [x] Deletar conta (com confirmação)

---

## 9. Export & Download

### 9.1. Formatos Suportados
- [x] XLSX (Excel)
- [x] CSV (para dados tabulares)
- [x] PDF (relatório formatado)

### 9.2. Bulk Export
- [x] Selecionar múltiplas extrações
- [x] Exportar tudo em ZIP
- [x] Filtro por data, status
- [x] Agendamento de export (enviar email)

---

## 10. Busca & Filtros

### 10.1. Dashboard Search
- [x] Busca por nome de arquivo
- [x] Busca por empresa/cliente
- [x] Filtro por data (range)
- [x] Filtro por status (multi-select)
- [x] Filtro por template
- [x] Ordenar por data, nome, status

### 10.2. Salvar Filtros
- [x] Salvar busca como "filtro favorito"
- [x] Nomear filtro
- [x] Editar/deletar filtros salvos
- [x] Aplicar filtro com 1 clique

---

## 11. Notificações & Alerts

### 11.1. Notificações In-App
- [x] Toast (sucesso, erro, aviso)
- [x] Modal alerts (confirmações)
- [x] Badges com contador (notificações não lidas)

### 11.2. Email Notifications
- [ ] Extraction completada
- [ ] Extraction rejeitada (com motivo)
- [ ] WhatsApp enviado com sucesso
- [ ] Sincronização Power BI falhou
- [ ] Relatório agendado pronto

### 11.3. Customização de Notificações
- [ ] Ativar/desativar por tipo
- [ ] Frequência (real-time, resumo diário)

---

## 12. Performance & Otimizações

### 12.1. Frontend
- [x] Code splitting (lazy load pages)
- [x] Imagem compression
- [x] Caching de templates
- [x] Virtual scrolling em tabelas grandes

### 12.2. Backend
- [x] Rate limiting (100 req/min por usuário)
- [x] Query optimization (índices em company_id, status)
- [x] Pagination (20 itens por página default)
- [x] Background jobs (async processing)

### 12.3. API
- [x] Timeout: 30seg para Vision, 5seg para SheetJS
- [x] Retry automático: 3 tentativas com backoff
- [x] Error handling: informativo e actionable

---

## 13. Analytics & Logging

### 13.1. Event Tracking
- [ ] Usuário criado
- [ ] File uploaded
- [ ] Extraction approved/rejected
- [ ] PDF generated
- [ ] WhatsApp sent
- [ ] Power BI synced
- [ ] Export downloaded

### 13.2. Dashboard Analytics
- [ ] Total extrações (dia, semana, mês)
- [ ] Taxa de sucesso (%)
- [ ] Horas economizadas
- [ ] Clientes ativos
- [ ] Formatos mais usados

---

## 14. Segurança & Compliance

### 14.1. Autenticação
- [x] JWT tokens
- [x] Refresh tokens
- [x] Session timeout (24h)
- [x] HTTPS obrigatório

### 14.2. Autorização
- [x] RLS no Supabase (usuário só vê seus dados)
- [x] Role-based access (admin, user)
- [x] API key scopes

### 14.3. Data Protection
- [x] Encryptação em repouso (Supabase)
- [x] Encriptação em trânsito (HTTPS)
- [x] Credentials criptografadas (Power BI token, WhatsApp token)
- [x] Sanitização de input (SQL injection, XSS)

### 14.4. Compliance
- [x] LGPD ready (consentimento, direito ao esquecimento)
- [x] Auditoria de dados (audit_log table)
- [x] Política de privacidade
- [x] Termos de serviço

---

## 15. Roadmap (v1.1 e depois)

### v1.1 (3-4 semanas após MVP)
- [ ] Agendamento de sincronização (diário, semanal)
- [ ] Webhooks (quando extraction finalizada, enviar para URL)
- [ ] Integração n8n (criar automações custom)
- [ ] Suporte a mais formatos (TXT, JSON)

### v1.2 (próximas semanas)
- [ ] Mobile app (React Native)
- [ ] OCR melhorado (Tesseract)
- [ ] Planilha de comparação (antes vs depois)
- [ ] API pública para integrações

### v2.0 (próximos meses)
- [ ] AI-powered suggestions (automática preencher campos)
- [ ] Integração com ERP (SAP, TOTVS)
- [ ] Machine learning (detectar anomalias)
- [ ] Marketplace de templates

---

## 16. Requisitos Não-Funcionais

### Disponibilidade
- Uptime: 99.5%
- RTO: 1 hora
- RPO: 15 minutos

### Performance
- Carregamento página: < 3seg
- Upload arquivo: < 30seg (para 50MB)
- Extração de dados: < 30seg (por arquivo)
- Query response: < 1seg

### Escalabilidade
- Suportar 1000 usuários simultâneos
- Processar 100 arquivos/hora
- 1GB storage por usuário

### Confiabilidade
- Taxa de extração sucesso: > 90%
- Taxa de uptime: 99.5%
- Recuperação de erros: automática (3 retry)

---

Pronto! Este é o documento completo de features do DigitacaoZero. Use como guia de desenvolvimento! 🚀
