-- Edição de pedido (cabeçalho + itens) numa transação só — par do `criar_pedido`.
-- Substitui todos os itens e recalcula subtotal/total no servidor.
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
      quantidade, preco_unitario, total_linha, status_match, posicao
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
      v_pos
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
