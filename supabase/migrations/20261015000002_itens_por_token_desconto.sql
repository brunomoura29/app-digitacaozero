-- Link público da Ordem de Compra: os itens passam a trazer o preço de tabela e o % da política,
-- pra OC mostrar Unitário | Desc. | Unit. líq. Mesma regra de acesso da versão anterior
-- (20261001000005). Mudou o formato do retorno, então precisa recriar a função (e as permissões).

drop function if exists public.buscar_itens_por_token(text);

create function public.buscar_itens_por_token(p_token text)
returns table(
  id uuid, pedido_id uuid, produto_id uuid, descricao_original text, sku text, descricao text,
  quantidade numeric, preco_unitario numeric, total_linha numeric, status_match text, posicao integer,
  preco_tabela numeric, politica_percentual numeric
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
    pi.preco_tabela, pi.politica_percentual
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
