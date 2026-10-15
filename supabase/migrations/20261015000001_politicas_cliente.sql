-- Políticas comerciais do cliente: ajuste de preço por fábrica sobre o preço de tabela.
-- Cada política vale pra um cliente + uma fábrica e alcança todos os produtos, um grupo ou um
-- produto (no pedido, a mais específica vence: produto > grupo > todos). O ajuste é um % fixo
-- ou faixas por quantidade. `percentual` e as faixas guardam o % com sinal: negativo =
-- desconto, positivo = acréscimo.

create table if not exists public.politicas_cliente (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_do_usuario() references public.empresas(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  fabrica_id uuid not null references public.fabricas(id) on delete cascade,
  alcance text not null check (alcance in ('todos', 'grupo', 'produto')),
  grupo_id uuid references public.grupos(id) on delete cascade,
  produto_id uuid references public.produtos(id) on delete cascade,
  tipo text not null check (tipo in ('percentual', 'quantidade')),
  percentual numeric(7, 3) check (percentual >= -100),
  -- [{ "a_partir_de": 10, "percentual": -8 }, …] — vale a maior faixa que a quantidade alcança
  faixas jsonb not null default '[]'::jsonb,
  -- null = sem prazo; senão vale até esse dia (inclusive), pela data do pedido
  valida_ate date,
  ativo boolean not null default true,
  observacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint politicas_cliente_alvo check (
    (alcance = 'todos' and grupo_id is null and produto_id is null)
    or (alcance = 'grupo' and grupo_id is not null and produto_id is null)
    or (alcance = 'produto' and produto_id is not null and grupo_id is null)
  ),
  constraint politicas_cliente_regra check (
    (tipo = 'percentual' and percentual is not null)
    or (tipo = 'quantidade' and jsonb_typeof(faixas) = 'array' and jsonb_array_length(faixas) > 0)
  )
);

create index if not exists politicas_cliente_cliente_idx on public.politicas_cliente (cliente_id, fabrica_id);

alter table public.politicas_cliente enable row level security;

-- lê quem é da empresa (o pedido precisa); grava quem pode editar cliente
drop policy if exists politicas_cliente_select on public.politicas_cliente;
create policy politicas_cliente_select on public.politicas_cliente
  for select to authenticated
  using (empresa_id = public.empresa_do_usuario());

drop policy if exists politicas_cliente_insert on public.politicas_cliente;
create policy politicas_cliente_insert on public.politicas_cliente
  for insert to authenticated
  with check (empresa_id = public.empresa_do_usuario() and public.tem_permissao('clientes', 'editar'));

drop policy if exists politicas_cliente_update on public.politicas_cliente;
create policy politicas_cliente_update on public.politicas_cliente
  for update to authenticated
  using (empresa_id = public.empresa_do_usuario() and public.tem_permissao('clientes', 'editar'))
  with check (empresa_id = public.empresa_do_usuario() and public.tem_permissao('clientes', 'editar'));

drop policy if exists politicas_cliente_delete on public.politicas_cliente;
create policy politicas_cliente_delete on public.politicas_cliente
  for delete to authenticated
  using (empresa_id = public.empresa_do_usuario() and public.tem_permissao('clientes', 'editar'));

revoke all on public.politicas_cliente from anon;
grant select, insert, update, delete on public.politicas_cliente to authenticated;

-- Itens do pedido guardam de onde saiu o preço: preço de tabela, % aplicado e qual política.
-- Mudar a política depois não mexe em pedido já feito.
alter table public.pedidos_itens
  add column if not exists preco_tabela numeric(14, 2),
  add column if not exists politica_id uuid references public.politicas_cliente(id) on delete set null,
  add column if not exists politica_percentual numeric(7, 3);

-- Edição de pedido: igual à anterior (20261001000002) + as três colunas novas dos itens.
create or replace function public.atualizar_pedido(p_pedido_id uuid, p_campos jsonb, p_itens jsonb)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_empresa uuid;
  v_status text;
  v_subtotal numeric(14,2) := 0;
  v_desconto numeric(14,2) := coalesce((p_campos->>'desconto_valor')::numeric, 0);
  v_frete numeric(14,2) := coalesce((p_campos->>'frete_valor')::numeric, 0);
  v_item jsonb;
  v_pos int := 0;
  v_qtd numeric(14,3);
  v_preco numeric(14,2);
begin
  select empresa_id, status into v_empresa, v_status
  from public.pedidos
  where id = p_pedido_id
  for update;

  if v_empresa is null or v_empresa is distinct from public.empresa_do_usuario() then
    raise exception 'Pedido não encontrado';
  end if;
  if not public.tem_permissao('pedidos', 'editar') then
    raise exception 'Sem permissão para editar pedidos';
  end if;
  if v_status not in ('rascunho', 'rejeitado') then
    raise exception 'Pedido com status "%" não pode ser editado', v_status;
  end if;

  delete from public.pedidos_itens where pedido_id = p_pedido_id;

  for v_item in select * from jsonb_array_elements(coalesce(p_itens, '[]'::jsonb))
  loop
    v_pos := v_pos + 1;
    v_qtd := coalesce((v_item->>'quantidade')::numeric, 0);
    v_preco := coalesce((v_item->>'preco_unitario')::numeric, 0);

    insert into public.pedidos_itens (
      empresa_id, pedido_id, produto_id, descricao_original, sku, descricao,
      quantidade, preco_unitario, total_linha, status_match, posicao,
      preco_tabela, politica_id, politica_percentual
    ) values (
      v_empresa,
      p_pedido_id,
      nullif(v_item->>'produto_id', '')::uuid,
      v_item->>'descricao_original',
      v_item->>'sku',
      v_item->>'descricao',
      v_qtd,
      v_preco,
      v_qtd * v_preco,
      coalesce(v_item->>'status_match', 'manual'),
      v_pos,
      nullif(v_item->>'preco_tabela', '')::numeric,
      nullif(v_item->>'politica_id', '')::uuid,
      nullif(v_item->>'politica_percentual', '')::numeric
    );
    v_subtotal := v_subtotal + (v_qtd * v_preco);
  end loop;

  update public.pedidos
  set condicao_pagamento = nullif(p_campos->>'condicao_pagamento', ''),
      prazo_entrega = nullif(p_campos->>'prazo_entrega', ''),
      observacoes = nullif(p_campos->>'observacoes', ''),
      fabrica_id = nullif(p_campos->>'fabrica_id', '')::uuid,
      referencia_id = nullif(p_campos->>'referencia_id', '')::uuid,
      desconto_valor = v_desconto,
      frete_valor = v_frete,
      subtotal = v_subtotal,
      total = v_subtotal + v_frete - v_desconto
  where id = p_pedido_id;
end;
$function$;

revoke execute on function public.atualizar_pedido(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.atualizar_pedido(uuid, jsonb, jsonb) to authenticated;

-- Pedido novo: o `criar_pedido` grava os itens sem essas colunas; logo depois o app chama esta
-- função com os mesmos itens, na mesma ordem, pra anotar preço de tabela e política em cada um.
-- Casa pela ordem dos itens (posicao), não pelo valor da posição.
create or replace function public.registrar_precos_itens(p_pedido_id uuid, p_itens jsonb)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_empresa uuid;
  v_status text;
begin
  select empresa_id, status into v_empresa, v_status
  from public.pedidos
  where id = p_pedido_id;

  if v_empresa is null or v_empresa is distinct from public.empresa_do_usuario() then
    raise exception 'Pedido não encontrado';
  end if;
  if not (public.tem_permissao('pedidos', 'incluir') or public.tem_permissao('pedidos', 'editar')) then
    raise exception 'Sem permissão para alterar pedidos';
  end if;
  if v_status not in ('rascunho', 'rejeitado') then
    raise exception 'Pedido com status "%" não pode ser editado', v_status;
  end if;

  update public.pedidos_itens i
  set preco_tabela = nullif(e.item->>'preco_tabela', '')::numeric,
      politica_id = nullif(e.item->>'politica_id', '')::uuid,
      politica_percentual = nullif(e.item->>'politica_percentual', '')::numeric
  from (
    select id, row_number() over (order by posicao, id) as ordem
    from public.pedidos_itens
    where pedido_id = p_pedido_id
  ) o
  join jsonb_array_elements(coalesce(p_itens, '[]'::jsonb)) with ordinality as e(item, ordem)
    on e.ordem = o.ordem
  where i.id = o.id;
end;
$function$;

revoke execute on function public.registrar_precos_itens(uuid, jsonb) from public, anon;
grant execute on function public.registrar_precos_itens(uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';
