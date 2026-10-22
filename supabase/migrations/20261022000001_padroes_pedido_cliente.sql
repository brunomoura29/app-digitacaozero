-- Padrões do pedido no cadastro do cliente: o template que a loja usa e, por fábrica de quem o
-- cliente compra, a tabela de preço (referência) — uma fábrica marcada como principal. Na
-- importação do pedido, escolher o cliente já preenche template, fábrica e tabela (editáveis).
-- A condição de pagamento continua sendo escolhida no pedido (decisão do usuário).

alter table public.clientes
  add column if not exists modelo_padrao_id uuid references public.modelos(id) on delete set null;

create table if not exists public.clientes_fabricas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_do_usuario() references public.empresas(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  fabrica_id uuid not null references public.fabricas(id) on delete cascade,
  referencia_id uuid references public.referencias_tabela(id) on delete set null,
  principal boolean not null default false,
  criado_em timestamptz not null default now(),
  constraint clientes_fabricas_unica unique (cliente_id, fabrica_id)
);

-- no máximo uma principal por cliente
create unique index if not exists clientes_fabricas_principal_uidx
  on public.clientes_fabricas (cliente_id) where principal;

alter table public.clientes_fabricas enable row level security;

-- igual às políticas comerciais: lê quem é da empresa (o pedido precisa); grava quem pode editar cliente
drop policy if exists clientes_fabricas_select on public.clientes_fabricas;
create policy clientes_fabricas_select on public.clientes_fabricas
  for select to authenticated
  using (empresa_id = public.empresa_do_usuario());

drop policy if exists clientes_fabricas_insert on public.clientes_fabricas;
create policy clientes_fabricas_insert on public.clientes_fabricas
  for insert to authenticated
  with check (empresa_id = public.empresa_do_usuario() and public.tem_permissao('clientes', 'editar'));

drop policy if exists clientes_fabricas_update on public.clientes_fabricas;
create policy clientes_fabricas_update on public.clientes_fabricas
  for update to authenticated
  using (empresa_id = public.empresa_do_usuario() and public.tem_permissao('clientes', 'editar'))
  with check (empresa_id = public.empresa_do_usuario() and public.tem_permissao('clientes', 'editar'));

drop policy if exists clientes_fabricas_delete on public.clientes_fabricas;
create policy clientes_fabricas_delete on public.clientes_fabricas
  for delete to authenticated
  using (empresa_id = public.empresa_do_usuario() and public.tem_permissao('clientes', 'editar'));

revoke all on public.clientes_fabricas from anon;
grant select, insert, update, delete on public.clientes_fabricas to authenticated;
