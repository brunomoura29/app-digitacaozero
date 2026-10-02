-- O link público só mostra o pedido depois que ele foi enviado pra aprovação: com o pedido
-- em rascunho ou em validação (ex: voltou pra edição), as RPCs não devolvem nada e a página
-- mostra "Link inválido ou expirado" — o cliente não vê uma versão que está sendo alterada.
create or replace function public.buscar_pedido_por_token(p_token text)
returns table(id uuid, empresa_id uuid, cliente_id uuid, numero text, status text, data_emissao date, condicao_pagamento text, prazo_entrega text, observacoes text, desconto_valor numeric, frete_valor numeric, subtotal numeric, total numeric, cliente_nome text, decidido_por text, decidido_em timestamp with time zone)
language plpgsql
stable security definer
set search_path to 'public'
as $function$
begin
  return query
  select
    p.id, p.empresa_id, p.cliente_id, p.numero, p.status, p.data_emissao,
    p.condicao_pagamento, p.prazo_entrega, p.observacoes, p.desconto_valor,
    p.frete_valor, p.subtotal, p.total, c.nome, p.decidido_por, p.decidido_em
  from pedidos p
  left join clientes c on p.cliente_id = c.id
  where p.status not in ('rascunho', 'em_validacao')
    and exists (
      select 1 from compartilhamentos
      where pedido_id = p.id
        and token = p_token
        and (expirado_em is null or expirado_em > now())
    );
end;
$function$;

create or replace function public.buscar_itens_por_token(p_token text)
returns table(id uuid, pedido_id uuid, produto_id uuid, descricao_original text, sku text, descricao text, quantidade numeric, preco_unitario numeric, total_linha numeric, status_match text, posicao integer)
language plpgsql
stable security definer
set search_path to 'public'
as $function$
begin
  return query
  select
    pi.id, pi.pedido_id, pi.produto_id, pi.descricao_original, pi.sku, pi.descricao,
    pi.quantidade, pi.preco_unitario, pi.total_linha, pi.status_match, pi.posicao
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
