---
name: digitacaozero-design
description: >-
  Design system do DigitacaoZero (Nuxt 4 + Vue 3 + TailwindCSS 3). Use sempre que
  for criar telas, estilizar UI, escolher cores/espaçamento/tipografia, ou montar
  componentes. Cobre a paleta Shift3, tokens do tailwind.config.js, regras de
  tipografia e a API dos componentes base (BaseButton, BaseInput, BasePesquisa,
  BaseDropdown) e do sistema de toast (useToast + BaseToaster). Para blueprints de
  telas completas (login, dashboard, validação, geração de PDF, templates) ver
  reference.md.
---

# DigitacaoZero — Design System

**Stack:** Nuxt 4 · Vue 3 · TypeScript · TailwindCSS 3.x · `@nuxt/icon` (Heroicons v2)

Fonte da verdade das cores: [`paleta-cores-shift3 (1).json`](../../../paleta-cores-shift3%20(1).json).
Blueprints de telas e componentes maiores: [`reference.md`](reference.md).

---

## 1. Paleta Shift3

Definida em `tailwind.config.js` como `theme.extend.colors`. Sempre usar os tokens,
nunca hex solto.

| Token Tailwind | Hex | Uso |
|---|---|---|
| `shift3-dark` / `primary` | `#191E24` | Sidebar, navegação, botão primário, headings escuros |
| `shift3-teal` / `secondary` | `#2D5F4F` | Hover de primário/accent, elementos secundários |
| `shift3-green` / `accent` / `success` | `#7FD7AB` | Accent principal, CTAs, status positivo |
| `shift3-bg-light` | `#F5F7FA` | Background de página |
| `shift3-bg-card` | `#FFFFFF` | Cards, panels, superfícies elevadas |
| `shift3-border` | `#E8E8E8` | Borders, dividers |
| `shift3-input` | `#FFFFFF` | Fundo de campos (input/select/textarea) — inset no dark |
| `shift3-input-border` | `#D1D5DB` | Borda de campos (mais forte que `shift3-border`) |
| `shift3-sidebar` | `#E8F2EA` | Fundo do sidebar (verde tênue) |
| `shift3-sidebar-active` | `#B8E2C1` | Pílula do item de menu ativo |
| `shift3-text` | `#1A1A1A` | Texto principal, headings |
| `shift3-text-secondary` | `#666666` | Texto de apoio, descrições |
| `shift3-text-muted` | `#999999` | Placeholders, hints, metadata |
| `shift3-text-light` | `#A8B5C4` | Texto inativo na sidebar |
| `warning` | `#FFC107` | Atenção / pendente |
| `danger` | `#FF6B6B` | Erro / rejeitado / destrutivo |

Combinações aprovadas (contraste WCAG AA+):

- **Botão primário:** bg `shift3-dark`, texto branco, hover `shift3-teal`
- **Botão secundário:** bg `shift3-bg-light`, texto `shift3-dark`, border `shift3-border`, hover `shift3-border`
- **Botão accent/CTA:** bg `shift3-green`, texto `shift3-dark`, hover `shift3-teal`
- **Card:** bg branco, border `shift3-border`, texto `shift3-text`
- **Sidebar:** bg `shift3-dark`, ativo `shift3-green`, inativo `shift3-text-light`, hover `bg-shift3-green/10`

## 2. Tokens de layout

```
spacing      xs 4px · sm 8px · md 12px · lg 16px · xl 24px · 2xl 32px
borderRadius small 4px · default 6px · medium 12px · large 16px · pill 999px
boxShadow    sm/md/lg/xl  (ver tailwind.config.js)
fontFamily   sans -> "Plus Jakarta Sans", sans-serif  (self-hosted via @nuxt/fonts, weights 400/500/600/700)
```

## 3. Tipografia

Base aplicada em `app/assets/css/tailwind.css` (`@layer base`):

- `body` — 14px, `leading-normal`, cor `shift3-text`, fonte `sans`
- `h1` — 28px / `font-semibold` / `text-shift3-text` / line-height 1.2
- `h2` — 18px / `font-semibold` / `text-shift3-dark` / line-height 1.3
- `h3` — `text-lg font-semibold text-shift3-text`
- `h4` — `text-base font-semibold text-shift3-text`
- `label` — `text-sm font-medium text-shift3-text`
- `small` — `text-xs text-shift3-text-muted`

Helpers: `.text-secondary`, `.text-muted`, `.text-light`.

## 4. Ícones

Módulo `@nuxt/icon` com `@iconify-json/heroicons` bundlado (funciona offline).

```vue
<Icon name="heroicons:magnifying-glass" class="w-5 h-5" />
<Icon name="heroicons:check-circle-solid" class="w-5 h-5 text-success" />
```

## 5. Componentes base (auto-importados de `app/components/`)

### BaseButton
```vue
<BaseButton variant="primary" size="md" :loading="false" icon-left="heroicons:paper-airplane">
  Enviar
</BaseButton>
```
- `variant`: `primary` (default) · `secondary` · `accent` · `danger` · `ghost`
- `size`: `sm` · `md` (default) · `lg`
- `loading` (mostra spinner e desabilita), `disabled`, `block` (w-full)
- `iconLeft` / `iconRight`: nome de ícone Heroicons
- `type`: `button` (default) · `submit` · `reset`
- Emite `click`.

### BaseInput
```vue
<BaseInput
  v-model="form.email"
  label="Email"
  type="email"
  placeholder="seu@email.com"
  icon="heroicons:envelope"
  :error="errors.email"
  hint="Usamos só para login"
/>
```
- `v-model` (string | number), `label`, `placeholder`, `type` (default `text`)
- `error` (string — pinta border danger + mostra mensagem), `hint`, `disabled`, `required`
- `icon`: ícone à esquerda · `revealable`: botão de olho (alterna password/text) · `autocomplete`
- `id` opcional (senão gera um).
- Emite `update:modelValue`, `blur`, `focus`.

### BasePesquisa
Campo de busca com ícone, botão limpar e debounce.
```vue
<BasePesquisa v-model="busca" placeholder="Buscar extrações..." :debounce="300" @search="onSearch" />
```
- `v-model` (string), `placeholder`, `debounce` ms (default 300)
- Emite `update:modelValue` (imediato), `search` (debounced, com o texto), `clear`.

### BaseDropdown
Menu acionado por clique, fecha em click-outside / Esc. Sem dependência externa.
```vue
<BaseDropdown :items="[
  { label: 'Editar', icon: 'heroicons:pencil-square', onClick: editar },
  { label: 'Exportar', icon: 'heroicons:arrow-down-tray', onClick: exportar },
  { divider: true },
  { label: 'Excluir', icon: 'heroicons:trash', danger: true, onClick: excluir },
]" align="right">
  <BaseButton variant="ghost" icon-left="heroicons:ellipsis-vertical">Ações</BaseButton>
</BaseDropdown>
```
- Slot default = trigger. `items`: `{ label, icon?, onClick?, to?, danger?, disabled?, divider? }`
- `align`: `left` (default) · `right`
- Emite `select` (item) e `open` / `close`.

### BaseUpload  (leitura / processamento / extração de arquivos)
Dropzone drag & drop + clique, valida tipo (`accept`) e tamanho (`maxSizeMb`),
renderiza lista com ícone por tipo, barra de progresso e estado por arquivo.
```vue
<BaseUpload
  v-model="arquivos"
  accept=".xlsx,.xls,.csv,.pdf,image/*"
  :max-size-mb="50"
  hint="XLSX, CSV, PDF ou imagem — até 50 MB"
  @add="processar"
  @reject="itens => itens.forEach(i => toast.error(`${i.file.name}: ${i.reason}`))"
/>
```
- `v-model`: `UploadFile[]` (tipo de `~/composables/useUpload`)
- `accept` (ext `.xlsx` ou mime `image/*`), `multiple` (default true), `maxSizeMb` (50),
  `disabled`, `hint`
- Emite `add` (só os aceitos), `reject` (`{file, reason}[]`), `remove`, `update:modelValue`
- **Processar:** o handler roda via `processUploads()` e muta cada item in-place —
  a UI reage (barra %, spinner, "processando…", "concluído", erro).

```ts
import type { UploadFile } from '~/composables/useUpload'
const arquivos = ref<UploadFile[]>([])

async function processar(novos: UploadFile[]) {
  await processUploads(novos, async (item, setProgress) => {
    const buf = await item.file.arrayBuffer()          // ler
    setProgress(40)
    const dados = await extrair(buf, p => setProgress(40 + p * 0.6)) // extrair
    resultados.value.push(dados)
  }, { concurrency: 2 })
}
```
`UploadFile = { id, file, name, size, progress, status, error }`
`status: 'queued' | 'uploading' | 'processing' | 'done' | 'error'`
Helpers auto-importados: `createUploadFile(file)`, `formatBytes(bytes)`, `processUploads(items, handler, {concurrency})`.

### BaseProgress / BaseSpinner
```vue
<BaseProgress :value="42" />                 <!-- 0..100 -->
<BaseProgress indeterminate variant="accent" />  <!-- accent | primary | danger, size sm|md -->
<BaseSpinner size="md" color-class="text-shift3-green" />  <!-- xs|sm|md|lg -->
```

### Toast — `useToast()` + `<BaseToaster />`
Montar `<BaseToaster />` uma vez no `app.vue`. Em qualquer componente:
```ts
const toast = useToast()
toast.success('Extração aprovada')
toast.error('Falha ao enviar', { title: 'Erro', duration: 6000 })
toast.info('...'); toast.warning('...')
toast.show({ type: 'success', message: '...', duration: 4000 })
toast.dismiss(id) // opcional
```
- Tipos: `success` (accent), `error` (danger), `warning`, `info` (dark).
- Estado compartilhado via `useState` (SSR-safe). Auto-dismiss em `duration` ms (default 4000; 0 = fixo).

## 6. Layout & Sidebar

`app/layouts/dashboard.vue` — página usa `definePageMeta({ layout: 'dashboard', title: 'X' })`.
Estrutura: `<AppSidebar>` fixo (sticky, `h-screen`) + área de conteúdo à direita.

`app/layouts/auth.vue` — telas de login/cadastro/recuperação. Split: painel de marca
(gradiente `shift3-dark → shift3-teal`, headline, 3 stats) à esquerda (some em `<lg`) +
área do formulário à direita com `<BaseThemeToggle>`. Formulários: `FormLogin`,
`FormCadastro`, `FormRecup` (auto-importados), cada um cuida da própria chamada
`useSupabaseClient().auth.*` e usa `useToast()` para erro.

**Junção côncava:** a área de conteúdo leva a classe `corner-concave` +
`rounded-tl-[1.5rem]`. O `::before` pinta `--s3-sidebar` num quadrado de `--concave`
(1.5rem) com `mask: radial-gradient(...)` recortando um quarto de círculo — dá o
canto arredondado "invertido" que abraça o painel vizinho. Cor via var → tema-aware.
`z-index: 20` pra ficar acima do header sticky.

### AppSidebar
```vue
<AppSidebar v-model:collapsed="collapsed" :items="nav" :user="{ name, email, avatar }" brand="DigitacaoZero" />
```
- **Cabeçalho:** marca (slot `#brand`) + botão recolher (chevron duplo).
- **Corpo:** `items: SidebarItem[]` = `{ label, icon, to, badge? }`. Ativo por rota
  (`route.path === to` ou começa com `to + '/'`) → pílula sólida
  `bg-shift3-sidebar-active` (#B8E2C1 claro / #273E2F dark), texto+ícone
  `text-shift3-text` `font-semibold`. Inativo `text-shift3-text-secondary`
  `font-medium`, hover `bg-shift3-sidebar-active/45`.
- **Rodapé:** avatar (ou ícone `heroicons:user`) + nome + e-mail. Colapsado = só o avatar.
- **Colapsar:** `v-model:collapsed` (bool). No layout é persistido em
  `useCookie('dz-sidebar-collapsed')` (estável no SSR). Largura anima 248px ⇄ 76px;
  colapsado esconde labels e usa `title=` como tooltip.
- Fundo `bg-shift3-sidebar` (verde tênue no claro, quase preto no dark).

## 7. Modo claro / escuro

Módulo `@nuxtjs/color-mode` (`classSuffix: ''` → `<html class="dark">` / `"light"`),
Tailwind `darkMode: 'class'`.

Os **tokens semânticos** (`shift3-bg-light`, `shift3-bg-card`, `shift3-border`,
`shift3-input`, `shift3-input-border`, `shift3-text*`) são CSS vars (`--s3-*`, canais
RGB) definidas em `app/assets/css/tailwind.css` — flipam sozinhas no `.dark`.
**Não precisa de `dark:`** nesses casos; basta usar os tokens. As cores de marca
(`shift3-dark/teal/green`) e de status (`success/warning/danger`) são fixas nos dois
temas — **nunca usar `text-shift3-dark` em texto** (some no dark); usar
`text-shift3-text`. Evitar `bg-white` — usar `bg-shift3-bg-card` (superfícies) ou
`bg-shift3-input` (campos). No dark o campo fica mais escuro que o card (efeito inset).

```ts
const { isDark, theme, toggle, set } = useTheme()
toggle()          // claro <-> escuro
set('system')     // segue o SO
theme.value       // 'light' | 'dark' | 'system' (preferência persistida)
```

Botão pronto: `<BaseThemeToggle />` (sol/lua, já usa `ClientOnly` p/ evitar
mismatch de hidratação).

## 8. Regras

- Mobile-first; grids `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-lg`.
- Transições: `transition` nos estados hover/focus; usar as transitions `fade` / `slide` para entrada de componentes.
- Foco visível sempre: inputs usam `focus:border-shift3-green focus:ring-2 focus:ring-shift3-green/20`.
- Não criar cor nova sem adicionar token no `tailwind.config.js` + registrar aqui.
- Página viva do design system: rota `/design`.
