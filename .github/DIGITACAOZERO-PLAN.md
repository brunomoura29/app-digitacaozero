# DigitacaoZero — Plano de Implementação (MVP)

**Versão:** 1.1 · **Data:** 2026-09-09
**Base:** README-DIGITACAOZERO · DIGITACAOZERO-SPEC · DIGITACAOZERO-FEATURES · DIGITACAOZERO-SETUP · DIGITACAOZERO-DESIGN · DIGITACAOZERO-PUBLIC-SHARE

> Design system e paleta (Shift3) **já implementados** — ver skill `digitacaozero-design`.
> Este documento planeja **como o produto funciona** e a ordem de build.

---

## Decisões (travadas)

| # | Decisão |
|---|---|
| 1 | **Fluxo Representante Comercial primeiro.** Contabilidade / Power BI → v1.1 |
| 2 | **Backend: Supabase** (Postgres + Auth + Storage + RLS). A instalar. |
| 3 | **Multi-tenant desde já** (`empresa_id` + RLS em tudo) |
| 4 | **Pinia** com *setup stores* (sintaxe composition, sem boilerplate) |
| 5 | **Extração real** (SheetJS + Claude Vision) |
| 6 | Campos de Clientes/Produtos/Tabela de preço definidos (seção 2). Templates (`modelos`) **editáveis pela UI desde o MVP** |
| 7 | Nome oficial: **DigitacaoZero**. Tabelas e rotas de API em **pt-BR** |
| 8 | **2 papéis:** `admin` (equipe da empresa, acesso total) e `cliente` (usuário do cliente da empresa — **só importa** seus dados; quem valida e gera a OC é o `admin`) |
| 9 | E-mail sai do **SMTP da própria empresa** (configurável em `/configuracoes/integracoes`) |

---

## 1. Arquitetura

```
Nuxt 4 (SSR)
├─ UI: Base* components + AppSidebar + layout dashboard + dark mode  [feito]
├─ Estado: Pinia (setup stores)
├─ Auth/DB client: @nuxtjs/supabase (cookies SSR)
└─ server/api/**  → tudo que precisa de segredo (Claude key, WhatsApp token, PDF, SMTP)

Supabase
├─ Auth (email/senha)
├─ Postgres + RLS (isolamento por empresa_id + papel do usuário)
└─ Storage (arquivos enviados + PDFs gerados)

Externos
├─ Claude Vision  (extração de imagem/PDF)   → server/api/extrair
├─ Meta WhatsApp Cloud API  (envio da OC)     → server/api/pedidos/[id]/enviar-whatsapp
└─ SMTP da empresa  (e-mail da OC)            → server/api/pedidos/[id]/enviar-email
```

### Módulos / libs a instalar

| Pacote | Uso |
|---|---|
| `@nuxtjs/supabase` | client + auth + middleware SSR |
| `pinia` `@pinia/nuxt` | estado |
| `xlsx` (SheetJS) | parser de planilha |
| `@anthropic-ai/sdk` | Claude Vision (server) |
| `pdfkit` `@types/pdfkit` | gerar PDF da Ordem de Compra (sem chromium — ok no Vercel) |
| `nodemailer` | envio SMTP (e-mail da empresa) |
| `zod` | validação de forms e payloads de API + schema de modelo |

### Variáveis de ambiente (`runtimeConfig`)

```
SUPABASE_URL=
SUPABASE_KEY=                # anon
SUPABASE_SERVICE_KEY=        # server only
NUXT_ANTHROPIC_API_KEY=      # server only
NUXT_ENCRYPTION_KEY=         # 32 bytes base64 — cifra credenciais por empresa
```
Credenciais de **WhatsApp** e **SMTP** por empresa ficam **no banco, cifradas**
(AES-256-GCM em `server/utils/crypto.ts`), nunca em env nem no client.

---

## 2. Modelo de dados (Supabase) — nomes em pt-BR

Multi-tenant: **toda** tabela de negócio tem `empresa_id`. Helpers SQL:
```sql
create function empresa_do_usuario() returns uuid language sql stable as $$
  select empresa_id from perfis where id = auth.uid()
$$;
create function papel_do_usuario() returns text language sql stable as $$
  select papel from perfis where id = auth.uid()
$$;
create function cliente_do_usuario() returns uuid language sql stable as $$
  select cliente_id from perfis where id = auth.uid()
$$;
```

**Padrão de RLS por tabela:**
- `admin` → tudo da empresa: `empresa_id = empresa_do_usuario()`
- `cliente` → acesso mínimo, só ao próprio cadastro. Permissões:
  | Tabela | `cliente` pode |
  |---|---|
  | `extracoes` | **INSERT** (importar) + **SELECT** das próprias (`criado_por = auth.uid()`) |
  | `pedidos` / `pedidos_itens` | **SELECT** dos próprios (`cliente_id = cliente_do_usuario()`) — read-only |
  | `produtos` | **SELECT** (catálogo) |
  | `clientes` | **SELECT** só a própria linha (`id = cliente_do_usuario()`) |
  | resto | nada |

  Ex. policy de `pedidos`:
  ```sql
  using (
    empresa_id = empresa_do_usuario()
    and ( papel_do_usuario() = 'admin' or cliente_id = cliente_do_usuario() )
  )
  -- sem policy de INSERT/UPDATE para 'cliente': só admin cria/edita pedido
  ```
  **Fluxo:** o `cliente` faz upload → cria uma `extracao` (status `concluido`, sem pedido).
  O `admin` vê a fila de importações pendentes, revisa e **converte em `pedido`**.

### Tabelas (~15)

**`empresas`** — tenant
`id, nome, documento_legal (CNPJ/CPF), logo_url, endereco jsonb, telefone, email, moeda default 'BRL',
whatsapp_phone_id, whatsapp_token_cifrado, smtp_config_cifrado, criado_em, atualizado_em`

**`perfis`** — 1:1 com `auth.users`
`id (fk auth.users), empresa_id, nome_completo, papel ('admin'|'cliente'), cliente_id (nullable → clientes.id),
avatar_url, criado_em`
Trigger no signup cria `empresas` + `perfis(papel='admin')` de forma atômica.
Usuário `cliente` é criado por um `admin` (convite) e já nasce com `cliente_id` preenchido.

**`vendedores`** (representantes/vendedores da empresa — sem login próprio)
`id, empresa_id, nome, email, telefone, ativo default true, criado_em, atualizado_em`

**`clientes`**
`id, empresa_id, nome, documento (CNPJ/CPF), inscricao_estadual, email, telefone,
endereco jsonb {logradouro,numero,complemento,bairro,cidade,uf,cep},
vendedor_id (nullable → vendedores.id), observacoes, ativo default true, criado_em, atualizado_em`
Índices: `(empresa_id)`, `(empresa_id, nome)`, `(vendedor_id)`; unique parcial `(empresa_id, documento) where documento is not null`.

**`produtos`**
`id, empresa_id, sku, codigo_barras (EAN/GTIN), descricao, fabricante, modelo, numero_serie,
unidade ('un'|'cx'|'kg'|'m'|'l'...), ncm, ativo default true, criado_em, atualizado_em`
Unique `(empresa_id, sku)`; índice `(empresa_id, codigo_barras)`.
`descricao` é o rótulo principal do produto. `unidade` é usada em pedido/preço; `ncm` opcional.

**`tabelas_preco`** (cabeçalho)
`id, empresa_id, nome, moeda default 'BRL',
competencia date (mês de referência, ex. 2026-09-01),
vigencia_inicio date, vigencia_fim date,
padrao bool, ativo bool, criado_em, atualizado_em`
`competencia` = período contábil da tabela; `vigencia_*` opcional para janelas específicas.

**`tabelas_preco_itens`**
`id, tabela_preco_id, produto_id, preco numeric(14,2),
variacao text (ex. "110V", "Azul", "cabo 5m"),
marca text, fabricante text,   -- overrides opcionais; se null herda de produtos
qtd_minima numeric default 1, desconto_percentual numeric default 0, observacoes`
Unique `(tabela_preco_id, produto_id, coalesce(variacao,''))`.

**`modelos`** (schema de extração — o que a tela "Templates" edita)
`id, empresa_id, nome, descricao, versao int default 1, tipo ('imagem'|'pdf'|'xlsx'|'misto'),
schema jsonb, arquivo_exemplo_url, ativo, criado_em, atualizado_em`
`schema` = `{ campos: [{id,nome,tipo,obrigatorio,regex?}], campos_item: [...], dicas: {...} }`

**`extracoes`** (registro bruto do upload + parse)
`id, empresa_id, modelo_id, modelo_versao, arquivo_nome, arquivo_hash (sha256), arquivo_tamanho,
arquivo_url (Storage), tipo_origem ('imagem'|'pdf'|'xlsx'), dados_extraidos jsonb,
status ('processando'|'concluido'|'erro'), erro, criado_por, criado_em`
Índices: `(empresa_id)`, `(arquivo_hash)`.

**`pedidos`** (Ordem de Compra — objeto de negócio)
`id, empresa_id, extracao_id (nullable), cliente_id, tabela_preco_id (nullable),
numero text (OC-000123), status ('rascunho'|'aprovado'|'enviado'|'cancelado'),
data_emissao date, condicao_pagamento, prazo_entrega, observacoes,
desconto_valor numeric default 0, frete_valor numeric default 0, subtotal numeric, total numeric,
pdf_url, whatsapp_enviado_em, whatsapp_message_id, email_enviado_em,
criado_por, criado_em, atualizado_em`
`numero` via função `proximo_numero_pedido(empresa_id)` (tabela `empresa_sequencias` + lock).

**`pedidos_itens`**
`id, pedido_id, produto_id (nullable), descricao_original (o que a IA leu), sku, descricao,
quantidade numeric, preco_unitario numeric(14,2), total_linha numeric,
status_match ('correspondido'|'nao_correspondido'|'manual'), posicao int`

**`log_auditoria`**
`id, empresa_id, usuario_id, acao ('upload'|'validacao'|'aprovacao'|'pdf_gerado'|'whatsapp_enviado'|'email_enviado'|'exportacao'|'compartilhamento'),
pedido_id, extracao_id, detalhes jsonb, criado_em`

**`empresa_sequencias`**
`empresa_id (pk), seq_pedido int default 0`

**`compartilhamentos`** (links públicos — fase 5)
`id, empresa_id, criado_por, nome, descricao, tipo ('pedido'|'relatorio'),
pedido_ids uuid[], filtro_config jsonb, token text unique,
ativo bool default true, permite_download bool default true, permite_exportar_pdf bool default true,
expira_em timestamp, max_visualizacoes int, total_visualizacoes int default 0,
ultima_visualizacao_em timestamp, criado_em, atualizado_em`

**`compartilhamentos_visualizacoes`**
`id, compartilhamento_id, visitante_ip, visitante_user_agent, visualizado_em`

---

## 3. Pinia — setup stores (funcional e rápido)

Sintaxe composition, sem `mapState/mapActions`, tree-shakeable, SSR-safe com `@pinia/nuxt`:

```ts
export const useClientes = defineStore('clientes', () => {
  const itens = ref<Cliente[]>([])
  const carregando = ref(false)
  const filtros = reactive({ q: '', ativo: 'todos' as 'todos'|'ativos'|'inativos' })

  const carregar = async () => {
    carregando.value = true
    itens.value = await $fetch('/api/clientes', { query: filtros })
    carregando.value = false
  }
  const porId = (id: string) => itens.value.find(c => c.id === id)
  const salvar = async (dados: ClienteInput) => { /* upsert + recarrega */ }
  const remover = async (id: string) => { /* delete + recarrega */ }

  return { itens, carregando, filtros, carregar, porId, salvar, remover }
})
```

**Stores:** `auth`, `clientes`, `produtos`, `tabelasPreco`, `pedidos`
(rascunho + itens + totais computados + `montarDeExtracao/gerarPdf/enviarWhatsapp`), `ui`
(sidebar collapsed — migra o cookie pra cá).

Custo de performance: só o proxy reativo do Vue — irrelevante.

---

## 4. Server API (rotas em pt-BR)

```
server/
├─ api/
│  ├─ clientes/         index.get  index.post  [id].get  [id].patch  [id].delete
│  ├─ produtos/         (idem)
│  ├─ tabelas-preco/    (idem) + [id]/itens.*
│  ├─ extrair.post.ts           # multipart → detecta → SheetJS|Vision → hash/dedupe → grava extracao + Storage
│  ├─ pedidos/
│  │  ├─ index.get  index.post  [id].get  [id].patch
│  │  ├─ [id]/pdf.post.ts               # pdfkit → Storage → pedidos.pdf_url
│  │  ├─ [id]/enviar-whatsapp.post.ts   # Meta Cloud API (graph.facebook.com/v21.0/{phone_id}/messages)
│  │  └─ [id]/enviar-email.post.ts      # nodemailer com SMTP da empresa
│  ├─ convites/         index.post   # admin convida usuário 'cliente'
│  └─ compartilhamentos/  create.post.ts   [token].get.ts   list.get.ts   [id].delete.ts
├─ utils/
│  ├─ supabaseAdmin.ts   # service-role client
│  ├─ crypto.ts          # AES-256-GCM encrypt/decrypt
│  ├─ hash.ts            # sha256(buffer)
│  ├─ sheet.ts           # SheetJS: abas → linhas → schema
│  ├─ claude.ts          # Anthropic Vision: prompt guiado pelo schema, JSON estruturado, retry 3x, timeout 30s
│  └─ pdf.ts             # template da Ordem de Compra
└─ (auth middleware via @nuxtjs/supabase redirectOptions)
```

Toda rota valida payload com `zod`, resolve `empresa_id` + `papel` do usuário logado
(nunca confia no client) e aplica a regra de papel.

---

## 5. Rotas / páginas

```
/                         DASHBOARD (raiz privada) — KPIs: pedidos no mês, ticket médio, pendentes, últimos 10   [layout dashboard]
/login  /cadastro  /recuperar-senha   layout 'auth' (logado → redireciona p/ /)
/pedidos                  (admin) lista de OCs + fila de importações pendentes    [no menu ✓]
/pedidos/novo             (admin) BaseUpload OU "converter importação" → validação → cria rascunho
/pedidos/[id]             (admin) OC: cliente, itens (ValidationTable), desconto/frete, condições,
                          [Aprovar] [Gerar PDF] [WhatsApp] [E-mail] [Compartilhar]
/importar                 (cliente) BaseUpload → cria `extracao` → "enviado para análise"
/clientes                 DataTable + busca + filtro ativo
/clientes/novo  /clientes/[id]
/produtos  /produtos/novo  /produtos/[id]
/tabela-preco             lista de tabelas
/tabela-preco/[id]        editor de itens (produto × preço × qtd mínima × desconto)
/templates  /templates/[id]   editor do schema de extração (tabela `modelos`)
/relatorios              página de filtros (período, cliente, status) + KPIs + export xlsx/csv/pdf
/configuracoes/perfil  /empresa  /vendedores  /integracoes (WhatsApp + SMTP)  /usuarios (convidar 'cliente')  /seguranca
/public/share/[token]    layout 'public' (sem sidebar), OC read-only + download   [fase 5]
```

**Menu do sidebar:** Dashboard · Pedidos · Clientes · Produtos · Tabela de preço · Templates · Relatórios · Configurações  ✓ (aplicado)

**Visão do usuário `cliente`:** menu reduzido → **Importar** (`/importar`) · **Meus Pedidos** (`/pedidos`, read-only) · **Produtos** (catálogo, read-only).
Sem `/pedidos/novo`, Clientes, Tabela de preço, Templates, Configurações.

---

## 6. Componentes novos (além dos Base já feitos)

`DataTable` (colunas, sort, paginação, slot ações, empty state) · `PageHeader` (título + ações) ·
`ConfirmDialog` · `EmptyState` · `StatCard` · `ProductPicker` (autocomplete) · `ClientPicker` · `VendedorPicker` ·
`ValidationTable` (edição inline de célula, linha inválida, casar produto, aplicar tabela de preço) ·
`AppTopbarUser` (menu do usuário no header) · `ShareModal` · `IntegrationCard`.

---

## 7. Fases de build

### Fase 0 — Fundação (~2–3 dias)
- [x] Instalar `@nuxtjs/supabase`, `pinia`+`@pinia/nuxt` · _(falta `xlsx`, `@anthropic-ai/sdk`, `pdfkit`, `nodemailer`, `zod` — instalar quando cada fase pedir)_
- [x] Projeto Supabase `jneknfpyequflqgoanyk` + `.env` (`SUPABASE_URL` / `SUPABASE_KEY`)
- [x] Migration `001_init`: `empresas`, `perfis`, helpers (`empresa_do_usuario`, `papel_do_usuario`, `cliente_do_usuario`), trigger `on_auth_user_created` (cria empresa + perfil `admin`), RLS + `001b` hardening (search_path, revoke execute)
- [x] `stores/auth.ts` (`entrar`, `cadastrar`, `sair`, `carregarPerfil`, `isAdmin`) + `middleware/auth.global.ts` (redireciona não-logado → `/login?redirect=`, logado em auth → `/dashboard`)
- [x] Layout `auth.vue`; páginas `/login /cadastro /recuperar-senha` com Base components
- [x] `layout dashboard`: usuário real (perfil via `callOnce`), logout no `AppTopbarUser`
- [ ] `server/utils/supabaseAdmin.ts` + `crypto.ts` (quando houver rota de servidor — Fase 2)
- [ ] Menu condicionado ao papel (`cliente` vê versão reduzida — Fase 6)
- [ ] **Config Supabase Dashboard:** "Confirm email" está **ON** → após cadastro o usuário precisa confirmar o e-mail antes de logar. Desligar em Auth → Email se quiser testar sem isso.

### Fase 1 — Cadastros (~1 semana)
- [ ] Migration `002_cadastros`: `vendedores`, `clientes`, `produtos`, `tabelas_preco`, `tabelas_preco_itens`, `empresa_sequencias`, RLS + índices
- [ ] `DataTable`, `PageHeader`, `ConfirmDialog`, `EmptyState`
- [ ] `stores/vendedores|clientes|produtos|tabelasPreco` + rotas `server/api/vendedores|clientes|produtos|tabelas-preco/*`
- [ ] Telas `/clientes*`, `/produtos*`, `/tabela-preco*`, `/configuracoes/vendedores` (form + validação zod)
- [ ] Seed de exemplo

### Fase 2 — Extração real (~1,5 semana)
- [ ] Migration `003_modelos_extracoes_pedidos`
- [ ] `server/utils/sheet.ts` (SheetJS) e `claude.ts` (Vision, prompt pelo `modelo.schema`)
- [ ] `server/api/extrair.post.ts`: multipart → detecção → parse → sha256 → dedupe (aviso) → `extracoes` + Storage
- [ ] `stores/pedidos.ts`: `montarDeExtracao()` — itens extraídos → `pedidos_itens`, casa por `sku` / `codigo_barras` / descrição com `produtos`
- [ ] Editor de `modelos` (`/templates`) — CRUD do `schema` (campos do pedido)
- [ ] `/importar` (papel `cliente`): `BaseUpload` → `/api/extrair` → confirmação "enviado para análise"
- [ ] `admin`: fila de **importações pendentes** (extrações sem pedido) → botão "Converter em pedido"
- [ ] `/pedidos/novo`: `BaseUpload` + `processUploads` → `/api/extrair` → preview

### Fase 3 — Validação + OC (~1 semana)
- [ ] `ValidationTable` (edição inline, recalcular totais, casar produto, aplicar tabela de preço)
- [ ] `/pedidos/[id]`: `ClientPicker` (busca/cadastra inline), itens, desconto/frete, condições, subtotal/total
- [ ] Status `rascunho → aprovado`; `proximo_numero_pedido()`; `log_auditoria`

### Fase 4 — PDF + envio (~1 semana)
- [ ] `server/utils/pdf.ts` + `server/api/pedidos/[id]/pdf.post.ts` → Storage → `pedidos.pdf_url`
- [ ] Preview do PDF (`<iframe>`) na tela da OC
- [ ] `enviar-whatsapp.post.ts` (Meta Cloud API, credenciais da empresa decifradas)
- [ ] `enviar-email.post.ts` (`nodemailer` + SMTP da empresa)
- [ ] `/configuracoes/integracoes`: salvar `whatsapp_phone_id` + token + `smtp_config` (cifra no server) + `IntegrationCard`

### Fase 5 — Relatórios + Compartilhamento público (~1 semana)
- [ ] `/relatorios`: filtros período/cliente/status sobre `pedidos` + KPIs + export xlsx/csv (SheetJS client) + pdf
- [ ] Migration `004_compartilhamentos` + RLS anon
- [ ] `server/api/compartilhamentos/create.post.ts` + `[token].get.ts` + `list` + `delete`
- [ ] `ShareModal` + `/public/share/[token].vue` (layout `public`, design system, OC read-only + download)

### Fase 6 — Polish (~1 semana)
- [ ] Convite de usuário `cliente` (`/configuracoes/usuarios` + `server/api/convites`)
- [ ] Erro global (toast) + loading states + `zod` em todos os forms/payloads
- [ ] `get_advisors` do Supabase (security + performance) e revisão de RLS (admin vs cliente)
- [ ] Seed realista + E2E: foto de pedido → validar → OC → WhatsApp
- [ ] Backlog v1.1: fluxo Contabilidade + Power BI sync

**Total estimado:** ~6–7 semanas.

---

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| PDF em serverless (Vercel) | `pdfkit` (sem chromium). Layout mais rico depois → HTML→PDF dedicado |
| Custo/latência Claude Vision | não reprocessa mesmo `arquivo_hash`; rate-limit por empresa; comprimir imagem <1MB; timeout 30s + retry 3x |
| Cadastro multi-tenant | trigger atômico cria `empresas` + `perfis(admin)` |
| Credenciais WhatsApp/SMTP | AES-256-GCM app-level, só no server |
| `pedidos.numero` concorrente | função Postgres com lock por empresa |
| RLS papel `cliente` frouxa | policies explícitas por tabela + teste E2E com usuário cliente + `get_advisors` |
| SSR + Pinia + Supabase | `@nuxtjs/supabase` cuida de cookies/SSR; stores hidratam do server |
| Itens do pedido sem match | `status_match='nao_correspondido'` + casar manual na `ValidationTable` |

---

## 9. Revisão — resolvido

1. ✅ **Produtos:** `sku`, `codigo_barras`, `descricao`, `fabricante`, `modelo`, `numero_serie` (+ `unidade`, `ncm` opcional, `ativo`).
2. ✅ **E-mail:** SMTP por empresa (host, porta, usuário, senha, remetente) em `/configuracoes/integracoes`, cifrado. `nodemailer`.
3. ✅ **Usuário `cliente`:** só **importa** (cria `extracao`). O `admin` recebe na fila, revisa e **converte em pedido**. Cliente nunca cria/edita `pedido`.
4. ✅ **Templates (`modelos`):** editáveis pela UI desde o MVP (`/templates`).

5. ✅ **Clientes:** + `inscricao_estadual` + `vendedor_id` (nova tabela `vendedores`, sem login).
6. ✅ **Tabela de preço:** cabeçalho com `competencia` (mês de referência); itens com `produto_id`, `preco`, `variacao`, `marca`, `fabricante` (overrides), `qtd_minima`, `desconto_percentual`.

Nada aberto — pronto para Fase 0.
