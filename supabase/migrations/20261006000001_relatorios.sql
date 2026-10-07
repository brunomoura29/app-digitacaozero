-- Relatórios montados pelo usuário (com ajuda da IA) e o acesso público de cada cliente.
-- `relatorios.definicao` é a "planta" do painel (fontes, blocos, filtros) — o sistema calcula
-- os números na hora, a partir dos pedidos. Cada cliente recebe um link (`token`) + uma senha,
-- e o servidor só devolve os dados daquele cliente. Tudo admin-only, como Templates/Importações:
-- a leitura externa passa pelo servidor (service role), nunca direto pela tabela.

create table if not exists public.relatorios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_do_usuario() references public.empresas(id) on delete cascade,
  nome text not null,
  descricao text,
  definicao jsonb not null default '{}'::jsonb,
  criado_por uuid default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.relatorios_acessos (
  id uuid primary key default gen_random_uuid(),
  relatorio_id uuid not null references public.relatorios(id) on delete cascade,
  empresa_id uuid not null default public.empresa_do_usuario() references public.empresas(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  -- o link: /public/relatorio/<token>
  token text not null unique,
  -- gerada pelo sistema e visível pro admin (como a chave do Power BI) — não é senha de usuário
  senha text not null,
  ativo boolean not null default true,
  visualizacoes integer not null default 0,
  ultimo_acesso_em timestamptz,
  criado_em timestamptz not null default now(),
  -- um acesso por cliente em cada relatório
  unique (relatorio_id, cliente_id)
);

create index if not exists relatorios_empresa_idx on public.relatorios (empresa_id, criado_em desc);
create index if not exists relatorios_acessos_relatorio_idx on public.relatorios_acessos (relatorio_id);

alter table public.relatorios enable row level security;
alter table public.relatorios_acessos enable row level security;

drop policy if exists relatorios_admin_all on public.relatorios;
create policy relatorios_admin_all on public.relatorios
  for all to authenticated
  using (empresa_id = empresa_do_usuario() and papel_do_usuario() = 'admin')
  with check (empresa_id = empresa_do_usuario() and papel_do_usuario() = 'admin');

drop policy if exists relatorios_acessos_admin_all on public.relatorios_acessos;
create policy relatorios_acessos_admin_all on public.relatorios_acessos
  for all to authenticated
  using (empresa_id = empresa_do_usuario() and papel_do_usuario() = 'admin')
  with check (empresa_id = empresa_do_usuario() and papel_do_usuario() = 'admin');

revoke all on public.relatorios, public.relatorios_acessos from anon;

notify pgrst, 'reload schema';
