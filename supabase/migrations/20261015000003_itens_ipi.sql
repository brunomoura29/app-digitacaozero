-- % IPI na Ordem de Compra: cada item do pedido guarda o % IPI do produto na hora em que o
-- produto foi escolhido (mudar o cadastro depois não mexe em pedido já feito). Só informativo:
-- não entra no total. Recria as três funções que leem/gravam os itens com a coluna nova.
-- Depende de 20261015000001 e 20261015000002.

alter table public.pedidos_itens
  add column if not exists ipi numeric(5, 2);

-- Edição de pedido (20261015000001) + ipi.
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
      preco_tabela, politica_id, politica_percentual, ipi
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
      nullif(v_item->>'politica_percentual', '')::numeric,
      nullif(v_item->>'ipi', '')::numeric
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

-- Anotação dos itens logo depois do `criar_pedido` (20261015000001) + ipi.
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
      politica_percentual = nullif(e.item->>'politica_percentual', '')::numeric,
      ipi = nullif(e.item->>'ipi', '')::numeric
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

-- Itens do link público (20261015000002) + ipi. Mudou o retorno: recria.
drop function if exists public.buscar_itens_por_token(text);

create function public.buscar_itens_por_token(p_token text)
returns table(
  id uuid, pedido_id uuid, produto_id uuid, descricao_original text, sku text, descricao text,
  quantidade numeric, preco_unitario numeric, total_linha numeric, status_match text, posicao integer,
  preco_tabela numeric, politica_percentual numeric, ipi numeric
)
language plpgsql
stable security definer
set search_path to 'public'
as $function$
begin
  return query
  select
    pi.id, pi.pedido_id, pi.produto_id, pi.descricao_original, pi.sku, pi.descricao,
    pi.quantidade, pi.preco_unitario, pi.total_linha, pi.status_match, pi.posicao,
    pi.preco_tabela, pi.politica_percentual, pi.ipi
  from pedidos_itens pi
  join pedidos p on p.id = pi.pedido_id
  where p.status not in ('rascunho', 'em_validacao')
    and exists (
      select 1 from compartilhamentos c
      where c.pedido_id = pi.pedido_id
        and c.token = p_token
        and (c.expirado_em is null or c.expirado_em > now())
    )
  order by pi.posicao asc;
end;
$function$;

revoke execute on function public.buscar_itens_por_token(text) from public;
grant execute on function public.buscar_itens_por_token(text) to anon, authenticated;
