-- Cadastro de produto ampliado: classificação (grupo/subgrupo, montadora, OEM), aplicação,
-- medidas e embalagem, origem fiscal e % de IPI.
-- Grupos, subgrupos e montadoras são cadastros de apoio sem tela própria (busca-ou-cria no
-- formulário do produto, como Marca e Fabricante) e seguem a permissão do módulo Produtos.

create table if not exists public.grupos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_do_usuario() references public.empresas(id) on delete cascade,
  nome text not null check (btrim(nome) <> ''),
  criado_em timestamptz not null default now()
);

-- o subgrupo pertence a um grupo: o mesmo nome pode existir em grupos diferentes
create table if not exists public.subgrupos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_do_usuario() references public.empresas(id) on delete cascade,
  grupo_id uuid not null references public.grupos(id) on delete cascade,
  nome text not null check (btrim(nome) <> ''),
  criado_em timestamptz not null default now()
);

create table if not exists public.montadoras (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_do_usuario() references public.empresas(id) on delete cascade,
  nome text not null check (btrim(nome) <> ''),
  criado_em timestamptz not null default now()
);

create unique index if not exists grupos_empresa_nome_uidx on public.grupos (empresa_id, lower(nome));
create unique index if not exists subgrupos_grupo_nome_uidx on public.subgrupos (grupo_id, lower(nome));
create unique index if not exists montadoras_empresa_nome_uidx on public.montadoras (empresa_id, lower(nome));

alter table public.grupos enable row level security;
alter table public.subgrupos enable row level security;
alter table public.montadoras enable row level security;

-- Mesmas quatro policies nas três tabelas: todo mundo da empresa lê; grava quem pode
-- incluir/editar produto; apaga quem pode deletar produto.
do $$
declare
  t text;
begin
  foreach t in array array['grupos', 'subgrupos', 'montadoras'] loop
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (empresa_id = public.empresa_do_usuario())',
      t || '_select', t
    );

    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (
         empresa_id = public.empresa_do_usuario()
         and (public.tem_permissao(''produtos'', ''incluir'') or public.tem_permissao(''produtos'', ''editar''))
       )',
      t || '_insert', t
    );

    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format(
      'create policy %I on public.%I for update to authenticated
         using (empresa_id = public.empresa_do_usuario() and public.tem_permissao(''produtos'', ''editar''))
         with check (empresa_id = public.empresa_do_usuario() and public.tem_permissao(''produtos'', ''editar''))',
      t || '_update', t
    );

    execute format('drop policy if exists %I on public.%I', t || '_delete', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated
         using (empresa_id = public.empresa_do_usuario() and public.tem_permissao(''produtos'', ''deletar''))',
      t || '_delete', t
    );

    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

alter table public.produtos
  -- origem da mercadoria na nota fiscal (tabela A do CST): 0 a 8
  add column if not exists origem smallint check (origem between 0 and 8),
  add column if not exists montadora_id uuid references public.montadoras(id) on delete set null,
  add column if not exists oem text,
  add column if not exists grupo_id uuid references public.grupos(id) on delete set null,
  add column if not exists subgrupo_id uuid references public.subgrupos(id) on delete set null,
  add column if not exists aplicacao text,
  -- peso em kg; altura, largura e comprimento em cm
  add column if not exists peso numeric(12, 3) check (peso >= 0),
  add column if not exists altura numeric(12, 2) check (altura >= 0),
  add column if not exists largura numeric(12, 2) check (largura >= 0),
  add column if not exists comprimento numeric(12, 2) check (comprimento >= 0),
  -- quantas unidades vêm na caixa master
  add column if not exists caixa_master numeric(12, 3) check (caixa_master >= 0),
  add column if not exists qtd_minima_venda numeric(12, 3) check (qtd_minima_venda >= 0),
  add column if not exists ipi numeric(5, 2) check (ipi between 0 and 100);

create index if not exists produtos_grupo_idx on public.produtos (empresa_id, grupo_id);

-- o front embute grupos(nome), subgrupos(nome) e montadoras(nome) no select de produtos
notify pgrst, 'reload schema';
