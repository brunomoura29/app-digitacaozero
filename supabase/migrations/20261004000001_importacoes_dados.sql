-- Importação genérica de dados para análise (Power BI).
-- Um template com `schema.destino = 'dados'` define as colunas de um conjunto de dados; cada
-- arquivo importado vira uma linha em `importacoes` + N linhas em `importacoes_linhas`.
-- Por ora é tudo admin-only (como Templates): a leitura externa é pelo link com chave.

create table if not exists public.importacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  modelo_id uuid not null references public.modelos(id) on delete restrict,
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  -- 'AAAA-MM' (mensal) ou 'AAAA' (anual)
  periodo text not null check (periodo ~ '^\d{4}(-\d{2})?$'),
  arquivo_nome text,
  extracao_id uuid references public.extracoes(id) on delete set null,
  -- campos do cabeçalho do template (chave = id do campo)
  cabecalho jsonb not null default '{}'::jsonb,
  total_linhas integer not null default 0,
  criado_por uuid default auth.uid(),
  criado_em timestamptz not null default now(),
  -- reimportar o mesmo cliente + período do mesmo template SUBSTITUI (ver salvar_importacao)
  unique (empresa_id, modelo_id, cliente_id, periodo)
);

create table if not exists public.importacoes_linhas (
  id bigint generated always as identity primary key,
  importacao_id uuid not null references public.importacoes(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  -- aba da planilha de onde a linha veio (null pra foto/PDF/CSV)
  aba text,
  posicao integer not null,
  -- valores da linha (chave = id do campo de item do template)
  dados jsonb not null
);

create index if not exists importacoes_linhas_importacao_idx on public.importacoes_linhas (importacao_id, posicao);
create index if not exists importacoes_modelo_idx on public.importacoes (empresa_id, modelo_id);

alter table public.importacoes enable row level security;
alter table public.importacoes_linhas enable row level security;

-- Leitura e exclusão direto pela tabela; a gravação só passa pela RPC (sem policy de
-- insert/update). As linhas saem junto com a importação (FK on delete cascade).
drop policy if exists importacoes_admin_select on public.importacoes;
create policy importacoes_admin_select on public.importacoes
  for select to authenticated
  using (empresa_id = empresa_do_usuario() and papel_do_usuario() = 'admin');

drop policy if exists importacoes_admin_delete on public.importacoes;
create policy importacoes_admin_delete on public.importacoes
  for delete to authenticated
  using (empresa_id = empresa_do_usuario() and papel_do_usuario() = 'admin');

drop policy if exists importacoes_linhas_admin_select on public.importacoes_linhas;
create policy importacoes_linhas_admin_select on public.importacoes_linhas
  for select to authenticated
  using (empresa_id = empresa_do_usuario() and papel_do_usuario() = 'admin');

revoke all on public.importacoes, public.importacoes_linhas from anon;

-- Grava a importação + linhas numa transação só. `p_linhas` = [{ "aba": text|null, "dados": {...} }].
-- Se já existe importação do mesmo template + cliente + período, ela é substituída inteira —
-- senão o Power BI somaria os mesmos dados em dobro.
create or replace function public.salvar_importacao(
  p_modelo_id uuid,
  p_cliente_id uuid,
  p_periodo text,
  p_arquivo_nome text,
  p_extracao_id uuid,
  p_cabecalho jsonb,
  p_linhas jsonb
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_empresa uuid := public.empresa_do_usuario();
  v_id uuid;
  v_total integer;
begin
  if v_empresa is null or public.papel_do_usuario() <> 'admin' then
    raise exception 'Só o administrador pode importar dados';
  end if;
  if not exists (select 1 from public.modelos where id = p_modelo_id and empresa_id = v_empresa) then
    raise exception 'Template não encontrado';
  end if;
  if not exists (select 1 from public.clientes where id = p_cliente_id and empresa_id = v_empresa) then
    raise exception 'Cliente não encontrado';
  end if;
  if jsonb_typeof(p_linhas) is distinct from 'array' or jsonb_array_length(p_linhas) = 0 then
    raise exception 'A importação precisa ter pelo menos 1 linha';
  end if;

  delete from public.importacoes
  where empresa_id = v_empresa and modelo_id = p_modelo_id and cliente_id = p_cliente_id and periodo = p_periodo;

  insert into public.importacoes (empresa_id, modelo_id, cliente_id, periodo, arquivo_nome, extracao_id, cabecalho)
  values (v_empresa, p_modelo_id, p_cliente_id, p_periodo, p_arquivo_nome, p_extracao_id, coalesce(p_cabecalho, '{}'::jsonb))
  returning id into v_id;

  insert into public.importacoes_linhas (importacao_id, empresa_id, aba, posicao, dados)
  select v_id, v_empresa, nullif(l.item->>'aba', ''), l.pos::integer, coalesce(l.item->'dados', '{}'::jsonb)
  from jsonb_array_elements(p_linhas) with ordinality as l(item, pos);

  get diagnostics v_total = row_count;
  update public.importacoes set total_linhas = v_total where id = v_id;

  return v_id;
end;
$function$;

revoke execute on function public.salvar_importacao(uuid, uuid, text, text, uuid, jsonb, jsonb) from public, anon;
grant execute on function public.salvar_importacao(uuid, uuid, text, text, uuid, jsonb, jsonb) to authenticated;

-- Chave do link de dados (Power BI): uma por empresa, é a única credencial do link — o
-- servidor confere a chave e devolve só os dados da empresa dona dela. Só o admin vê/troca.
create table if not exists public.chaves_dados (
  empresa_id uuid primary key references public.empresas(id) on delete cascade,
  chave text not null unique,
  criado_em timestamptz not null default now()
);

alter table public.chaves_dados enable row level security;

drop policy if exists chaves_dados_admin_all on public.chaves_dados;
create policy chaves_dados_admin_all on public.chaves_dados
  for all to authenticated
  using (empresa_id = empresa_do_usuario() and papel_do_usuario() = 'admin')
  with check (empresa_id = empresa_do_usuario() and papel_do_usuario() = 'admin');

revoke all on public.chaves_dados from anon;
