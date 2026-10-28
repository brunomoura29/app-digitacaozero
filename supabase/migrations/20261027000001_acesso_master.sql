-- Acesso master: lista de empresas, assinatura com controle manual e "entrar na empresa" pra dar suporte.
--
-- Como o "entrar" funciona: quase toda RLS (e o default de empresa_id nas tabelas) usa
-- empresa_do_usuario(). Quando o master escolhe uma empresa, essa função passa a devolver a empresa
-- escolhida e papel_do_usuario() devolve 'admin' — as telas e regras existentes funcionam sem mudança.
-- Bloqueio: pra usuário comum de empresa bloqueada, empresa_do_usuario() devolve null, então o banco
-- não mostra nem grava nada (o master nunca é bloqueado).
-- Decisões do usuário: cobrança manual, sem limites por plano, 14 dias de teste pra empresa nova,
-- 5 dias de tolerância depois do vencimento, registro de entrada/saída do suporte.

-- ── planos ─────────────────────────────────────────────────────────────────────────
create table if not exists public.planos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  valor numeric(12, 2) not null default 0,
  ciclo text not null default 'mensal' check (ciclo in ('mensal', 'anual')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- ── assinatura na empresa ──────────────────────────────────────────────────────────
alter table public.empresas
  add column if not exists plano_id uuid references public.planos(id) on delete set null,
  add column if not exists assinatura_status text not null default 'teste'
    check (assinatura_status in ('teste', 'ativa', 'suspensa', 'cancelada')),
  add column if not exists assinatura_vence_em date default (current_date + 14),
  add column if not exists assinatura_obs text;

-- as empresas que já existem ficam ativas, sem vencimento (o master ajusta depois)
update public.empresas
   set assinatura_status = 'ativa', assinatura_vence_em = null
 where assinatura_status = 'teste' and criado_em < now() - interval '1 minute';

create table if not exists public.assinatura_pagamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  valor numeric(12, 2) not null,
  pago_em date not null default current_date,
  referencia text,
  vencimento_novo date,
  registrado_por uuid default auth.uid() references auth.users(id) on delete set null,
  criado_em timestamptz not null default now()
);
create index if not exists assinatura_pagamentos_empresa_idx on public.assinatura_pagamentos (empresa_id, pago_em desc);

-- ── masters e registro do suporte ──────────────────────────────────────────────────
create table if not exists public.masters (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  empresa_suporte_id uuid references public.empresas(id) on delete set null,
  criado_em timestamptz not null default now()
);

create table if not exists public.acessos_suporte (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  entrou_em timestamptz not null default now(),
  saiu_em timestamptz
);
create index if not exists acessos_suporte_empresa_idx on public.acessos_suporte (empresa_id, entrou_em desc);
create index if not exists acessos_suporte_aberto_idx on public.acessos_suporte (usuario_id) where saiu_em is null;

-- ── funções base ───────────────────────────────────────────────────────────────────
create or replace function public.eh_master()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.masters where usuario_id = auth.uid())
$$;

-- 'teste' | 'ativa' | 'vencida' (dentro dos 5 dias de tolerância) | 'bloqueada'
create or replace function public.situacao_assinatura(p_status text, p_vence_em date)
returns text
language sql stable
as $$
  select case
    when p_status in ('suspensa', 'cancelada') then 'bloqueada'
    when p_vence_em is null or p_vence_em >= current_date then p_status
    when p_vence_em + 5 >= current_date then 'vencida'
    else 'bloqueada'
  end
$$;

create or replace function public.empresa_do_usuario()
returns uuid
language sql stable security definer set search_path = public
as $$
  select case
    when m.empresa_suporte_id is not null then m.empresa_suporte_id
    when m.usuario_id is not null then p.empresa_id
    when public.situacao_assinatura(e.assinatura_status, e.assinatura_vence_em) = 'bloqueada' then null
    else p.empresa_id
  end
  from public.perfis p
  join public.empresas e on e.id = p.empresa_id
  left join public.masters m on m.usuario_id = p.id
  where p.id = auth.uid()
$$;

create or replace function public.papel_do_usuario()
returns text
language sql stable security definer set search_path = public
as $$
  select case
    when exists (select 1 from public.masters where usuario_id = auth.uid() and empresa_suporte_id is not null)
      then 'admin'
    else (select papel from public.perfis where id = auth.uid())
  end
$$;

-- O que o front precisa saber do usuário logado: empresa e papel efetivos, se é master, se está
-- em suporte, e a situação da assinatura (pra mostrar aviso ou a tela de bloqueio).
create or replace function public.meu_contexto()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'empresa_id', public.empresa_do_usuario(),
    'papel', public.papel_do_usuario(),
    'eh_master', m.usuario_id is not null,
    'em_suporte', m.empresa_suporte_id is not null,
    'empresa_nome', e.nome,
    'situacao', public.situacao_assinatura(e.assinatura_status, e.assinatura_vence_em),
    'vence_em', e.assinatura_vence_em
  )
  from public.perfis p
  left join public.masters m on m.usuario_id = p.id
  join public.empresas e on e.id = coalesce(m.empresa_suporte_id, p.empresa_id)
  where p.id = auth.uid()
$$;

-- ── travas ─────────────────────────────────────────────────────────────────────────
-- perfis_update_self deixava o usuário mudar o próprio papel/empresa (virar admin ou ir pra outra
-- empresa). Agora: empresa_id nunca muda pelo app; papel/função/vínculos só o admin da empresa muda.
-- auth.uid() nulo = service role / SQL do painel → liberado.
create or replace function public.perfis_trava_campos()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.id <> old.id or new.empresa_id is distinct from old.empresa_id then
    raise exception 'Não é permitido mudar a empresa do usuário';
  end if;
  if (new.papel is distinct from old.papel
      or new.funcao_id is distinct from old.funcao_id
      or new.vendedor_id is distinct from old.vendedor_id
      or new.cliente_id is distinct from old.cliente_id)
     and not (public.papel_do_usuario() = 'admin' and old.empresa_id = public.empresa_do_usuario()) then
    raise exception 'Só o administrador da empresa pode mudar papel e acesso';
  end if;
  return new;
end;
$$;

drop trigger if exists perfis_trava_campos on public.perfis;
create trigger perfis_trava_campos
  before update on public.perfis
  for each row execute function public.perfis_trava_campos();

-- o admin edita os dados da própria empresa, mas a assinatura só o master muda
create or replace function public.empresas_trava_assinatura()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or public.eh_master() then
    return new;
  end if;
  if new.plano_id is distinct from old.plano_id
     or new.assinatura_status is distinct from old.assinatura_status
     or new.assinatura_vence_em is distinct from old.assinatura_vence_em
     or new.assinatura_obs is distinct from old.assinatura_obs then
    raise exception 'A assinatura só pode ser alterada pelo suporte';
  end if;
  return new;
end;
$$;

drop trigger if exists empresas_trava_assinatura on public.empresas;
create trigger empresas_trava_assinatura
  before update on public.empresas
  for each row execute function public.empresas_trava_assinatura();

-- ── RLS ────────────────────────────────────────────────────────────────────────────
alter table public.planos enable row level security;
alter table public.assinatura_pagamentos enable row level security;
alter table public.masters enable row level security;
alter table public.acessos_suporte enable row level security;

drop policy if exists planos_master on public.planos;
create policy planos_master on public.planos
  for all to authenticated using (public.eh_master()) with check (public.eh_master());

drop policy if exists assinatura_pagamentos_master on public.assinatura_pagamentos;
create policy assinatura_pagamentos_master on public.assinatura_pagamentos
  for all to authenticated using (public.eh_master()) with check (public.eh_master());

drop policy if exists acessos_suporte_master on public.acessos_suporte;
create policy acessos_suporte_master on public.acessos_suporte
  for select to authenticated using (public.eh_master());
-- masters: sem policy — só as funções abaixo (security definer) mexem

revoke all on public.planos, public.assinatura_pagamentos, public.masters, public.acessos_suporte from anon;
grant select, insert, update, delete on public.planos, public.assinatura_pagamentos to authenticated;
grant select on public.acessos_suporte to authenticated;

-- ── funções do master ──────────────────────────────────────────────────────────────
create or replace function public.master_empresas()
returns table (
  id uuid,
  nome text,
  email text,
  telefone text,
  criado_em timestamptz,
  plano_id uuid,
  plano_nome text,
  assinatura_status text,
  assinatura_vence_em date,
  assinatura_obs text,
  situacao text,
  admin_email text,
  usuarios bigint,
  pedidos bigint,
  ultimo_pedido_em timestamptz,
  ultimo_login_em timestamptz
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.eh_master() then
    raise exception 'Acesso restrito ao master';
  end if;
  return query
  select e.id, e.nome, e.email, e.telefone, e.criado_em,
         e.plano_id, pl.nome, e.assinatura_status, e.assinatura_vence_em, e.assinatura_obs,
         public.situacao_assinatura(e.assinatura_status, e.assinatura_vence_em),
         (select u.email::text from public.perfis p join auth.users u on u.id = p.id
           where p.empresa_id = e.id and p.papel = 'admin' order by p.criado_em limit 1),
         (select count(*) from public.perfis p where p.empresa_id = e.id),
         (select count(*) from public.pedidos pe where pe.empresa_id = e.id),
         (select max(pe.criado_em) from public.pedidos pe where pe.empresa_id = e.id),
         (select max(u.last_sign_in_at) from public.perfis p join auth.users u on u.id = p.id
           where p.empresa_id = e.id)
  from public.empresas e
  left join public.planos pl on pl.id = e.plano_id
  order by e.criado_em desc;
end;
$$;

create or replace function public.master_salvar_assinatura(
  p_empresa uuid, p_plano uuid, p_status text, p_vence_em date, p_obs text
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.eh_master() then
    raise exception 'Acesso restrito ao master';
  end if;
  update public.empresas
     set plano_id = p_plano,
         assinatura_status = p_status,
         assinatura_vence_em = p_vence_em,
         assinatura_obs = nullif(trim(coalesce(p_obs, '')), '')
   where id = p_empresa;
end;
$$;

-- registra o pagamento e, junto, ativa a assinatura e empurra o vencimento
create or replace function public.master_registrar_pagamento(
  p_empresa uuid, p_valor numeric, p_pago_em date, p_referencia text, p_vencimento_novo date
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.eh_master() then
    raise exception 'Acesso restrito ao master';
  end if;
  insert into public.assinatura_pagamentos (empresa_id, valor, pago_em, referencia, vencimento_novo)
  values (p_empresa, p_valor, coalesce(p_pago_em, current_date), nullif(trim(coalesce(p_referencia, '')), ''), p_vencimento_novo);

  update public.empresas
     set assinatura_status = 'ativa',
         assinatura_vence_em = coalesce(p_vencimento_novo, assinatura_vence_em)
   where id = p_empresa;
end;
$$;

create or replace function public.master_sair_empresa()
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.eh_master() then
    raise exception 'Acesso restrito ao master';
  end if;
  update public.acessos_suporte set saiu_em = now() where usuario_id = auth.uid() and saiu_em is null;
  update public.masters set empresa_suporte_id = null where usuario_id = auth.uid();
end;
$$;

create or replace function public.master_entrar_empresa(p_empresa uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.eh_master() then
    raise exception 'Acesso restrito ao master';
  end if;
  if not exists (select 1 from public.empresas where id = p_empresa) then
    raise exception 'Empresa não encontrada';
  end if;
  perform public.master_sair_empresa();
  update public.masters set empresa_suporte_id = p_empresa where usuario_id = auth.uid();
  insert into public.acessos_suporte (usuario_id, empresa_id) values (auth.uid(), p_empresa);
end;
$$;

revoke execute on function
  public.eh_master(), public.meu_contexto(), public.master_empresas(),
  public.master_salvar_assinatura(uuid, uuid, text, date, text),
  public.master_registrar_pagamento(uuid, numeric, date, text, date),
  public.master_sair_empresa(), public.master_entrar_empresa(uuid)
from public, anon;
grant execute on function
  public.eh_master(), public.meu_contexto(), public.master_empresas(),
  public.master_salvar_assinatura(uuid, uuid, text, date, text),
  public.master_registrar_pagamento(uuid, numeric, date, text, date),
  public.master_sair_empresa(), public.master_entrar_empresa(uuid)
to authenticated;

-- ── o master ───────────────────────────────────────────────────────────────────────
insert into public.masters (usuario_id)
select id from auth.users where email = 'bbrunomoura29@gmail.com'
on conflict do nothing;
