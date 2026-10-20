-- "Informações do pedido": os campos do cabeçalho do template (Transportadora, Prazo, Vendedor…)
-- ficam em pedidos.dados_extras->'informacoes' como [{ id, nome, tipo, valor }] — com o nome, pra OC
-- antiga continuar certa se o template mudar. Aqui: a edição no detalhe do pedido passa a gravá-las
-- e o link público passa a recebê-las junto com o cabeçalho da OC.

-- 1) atualizar_pedido: igual à versão atual + grava p_campos->'informacoes' quando vier
--    (sem a chave, dados_extras fica como está).
create or replace function public.atualizar_pedido(p_pedido_id uuid, p_campos jsonb, p_itens jsonb)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_empresa uuid;
  v_status text;
  v_cliente uuid;
  v_subtotal numeric(14,2) := 0;
  v_desconto numeric(14,2) := coalesce((p_campos->>'desconto_valor')::numeric, 0);
  v_frete numeric(14,2) := coalesce((p_campos->>'frete_valor')::numeric, 0);
  v_item jsonb;
  v_pos int := 0;
  v_qtd numeric(14,3);
  v_preco numeric(14,2);
begin
  select empresa_id, status, cliente_id into v_empresa, v_status, v_cliente
  from public.pedidos
  where id = p_pedido_id
  for update;

  if v_empresa is null or v_empresa is distinct from public.empresa_do_usuario() then
    raise exception 'Pedido não encontrado';
  end if;
  if public.papel_do_usuario() = 'vendedor' and not public.cliente_do_vendedor(v_cliente) then
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
      total = v_subtotal + v_frete - v_desconto,
      dados_extras = case
        when jsonb_typeof(p_campos->'informacoes') = 'array'
          then coalesce(dados_extras, '{}'::jsonb) || jsonb_build_object('informacoes', p_campos->'informacoes')
        else dados_extras
      end
  where id = p_pedido_id;
end;
$function$;

-- 2) buscar_cabecalho_oc_por_token: igual à versão atual + 'informacoes' (lista vazia quando não há).
create or replace function public.buscar_cabecalho_oc_por_token(p_token text)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
  select jsonb_build_object(
    'empresa', jsonb_build_object(
      'nome', e.nome,
      'documento_legal', e.documento_legal,
      'logo_url', e.logo_url,
      'endereco', coalesce(e.endereco, '{}'::jsonb),
      'telefone', e.telefone,
      'email', e.email
    ),
    'cliente', jsonb_build_object(
      'nome', c.nome,
      'documento', c.documento,
      'inscricao_estadual', c.inscricao_estadual,
      'email', c.email,
      'telefone', c.telefone,
      'endereco', coalesce(c.endereco, '{}'::jsonb)
    ),
    'fabrica', f.nome,
    'informacoes', case
      when jsonb_typeof(p.dados_extras->'informacoes') = 'array' then p.dados_extras->'informacoes'
      else '[]'::jsonb
    end
  )
  from pedidos p
  join empresas e on e.id = p.empresa_id
  left join clientes c on c.id = p.cliente_id
  left join fabricas f on f.id = p.fabrica_id
  where p.status not in ('rascunho', 'em_validacao')
    and exists (
      select 1 from compartilhamentos s
      where s.pedido_id = p.id
        and s.token = p_token
        and (s.expirado_em is null or s.expirado_em > now())
    )
  limit 1;
$function$;
