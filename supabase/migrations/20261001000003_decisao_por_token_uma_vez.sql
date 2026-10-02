-- Aprovar/rejeitar pelo link público só vale enquanto o pedido está "em_aprovacao" — antes,
-- quem tinha o link podia decidir de novo (ex: rejeitar um pedido já aprovado).
-- A aprovação também deixa de gerar um número novo: o número da OC nasce na criação do
-- pedido (`criar_pedido`) e não muda mais.
create or replace function public.aprovar_pedido_por_token(p_token text, p_nome text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_pedido_id uuid;
  v_status text;
begin
  select c.pedido_id, p.status into v_pedido_id, v_status
  from compartilhamentos c
  join pedidos p on p.id = c.pedido_id
  where c.token = p_token
    and (c.expirado_em is null or c.expirado_em > now())
  limit 1;

  if v_pedido_id is null then
    raise exception 'Token inválido ou expirado';
  end if;

  if v_status <> 'em_aprovacao' then
    raise exception 'Este pedido não está aguardando aprovação';
  end if;

  if p_nome is null or trim(p_nome) = '' then
    raise exception 'Nome é obrigatório';
  end if;

  update pedidos
  set status = 'aprovado', decidido_por = trim(p_nome), decidido_em = now()
  where id = v_pedido_id and status = 'em_aprovacao';

  return true;
end;
$function$;

create or replace function public.rejeitar_pedido_por_token(p_token text, p_nome text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_pedido_id uuid;
  v_status text;
begin
  select c.pedido_id, p.status into v_pedido_id, v_status
  from compartilhamentos c
  join pedidos p on p.id = c.pedido_id
  where c.token = p_token
    and (c.expirado_em is null or c.expirado_em > now())
  limit 1;

  if v_pedido_id is null then
    raise exception 'Token inválido ou expirado';
  end if;

  if v_status <> 'em_aprovacao' then
    raise exception 'Este pedido não está aguardando aprovação';
  end if;

  if p_nome is null or trim(p_nome) = '' then
    raise exception 'Nome é obrigatório';
  end if;

  update pedidos
  set status = 'rejeitado', decidido_por = trim(p_nome), decidido_em = now()
  where id = v_pedido_id and status = 'em_aprovacao';

  return true;
end;
$function$;

-- Só era chamada pela aprovação por token. Ficava executável por anon com qualquer
-- empresa_id — dava pra queimar a sequência de números de outra empresa.
revoke execute on function public.proximo_numero_pedido_para_empresa(uuid) from public, anon, authenticated;
