-- Vendedor passa a enxergar/mexer só nos pedidos dos SEUS clientes (clientes.vendedor_id),
-- como já acontece no cadastro de clientes. Antes as policies de pedidos/itens checavam só a
-- empresa — qualquer vendedor via todos os pedidos da empresa.
-- Admin não muda (policies *_admin_all).

-- true quando o cliente é da carteira do vendedor logado
create or replace function public.cliente_do_vendedor(p_cliente_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clientes c
    join public.perfis p on p.id = auth.uid()
    where c.id = p_cliente_id
      and p.vendedor_id is not null
      and c.vendedor_id = p.vendedor_id
  )
$$;

grant execute on function public.cliente_do_vendedor(uuid) to authenticated;

-- ───── pedidos ─────
drop policy if exists pedidos_vendedor_select on public.pedidos;
drop policy if exists pedidos_vendedor_insert on public.pedidos;
drop policy if exists pedidos_vendedor_update on public.pedidos;
drop policy if exists pedidos_vendedor_delete on public.pedidos;

create policy pedidos_vendedor_select on public.pedidos
  for select using (
    public.papel_do_usuario() = 'vendedor'
    and public.tem_permissao('pedidos', 'ver')
    and empresa_id = public.empresa_do_usuario()
    and public.cliente_do_vendedor(cliente_id)
  );

create policy pedidos_vendedor_insert on public.pedidos
  for insert with check (
    public.papel_do_usuario() = 'vendedor'
    and public.tem_permissao('pedidos', 'incluir')
    and empresa_id = public.empresa_do_usuario()
    and public.cliente_do_vendedor(cliente_id)
  );

create policy pedidos_vendedor_update on public.pedidos
  for update using (
    public.papel_do_usuario() = 'vendedor'
    and public.tem_permissao('pedidos', 'editar')
    and empresa_id = public.empresa_do_usuario()
    and public.cliente_do_vendedor(cliente_id)
  ) with check (
    public.papel_do_usuario() = 'vendedor'
    and public.tem_permissao('pedidos', 'editar')
    and empresa_id = public.empresa_do_usuario()
    and public.cliente_do_vendedor(cliente_id)
  );

create policy pedidos_vendedor_delete on public.pedidos
  for delete using (
    public.papel_do_usuario() = 'vendedor'
    and public.tem_permissao('pedidos', 'deletar')
    and empresa_id = public.empresa_do_usuario()
    and public.cliente_do_vendedor(cliente_id)
  );

-- ───── pedidos_itens: segue o pedido (o exists já passa pela RLS de pedidos acima) ─────
drop policy if exists pedidos_itens_vendedor_select on public.pedidos_itens;
drop policy if exists pedidos_itens_vendedor_insert on public.pedidos_itens;
drop policy if exists pedidos_itens_vendedor_update on public.pedidos_itens;
drop policy if exists pedidos_itens_vendedor_delete on public.pedidos_itens;

create policy pedidos_itens_vendedor_select on public.pedidos_itens
  for select using (
    public.papel_do_usuario() = 'vendedor'
    and public.tem_permissao('pedidos', 'ver')
    and empresa_id = public.empresa_do_usuario()
    and exists (select 1 from public.pedidos p where p.id = pedidos_itens.pedido_id)
  );

create policy pedidos_itens_vendedor_insert on public.pedidos_itens
  for insert with check (
    public.papel_do_usuario() = 'vendedor'
    and public.tem_permissao('pedidos', 'incluir')
    and empresa_id = public.empresa_do_usuario()
    and exists (select 1 from public.pedidos p where p.id = pedidos_itens.pedido_id)
  );

create policy pedidos_itens_vendedor_update on public.pedidos_itens
  for update using (
    public.papel_do_usuario() = 'vendedor'
    and public.tem_permissao('pedidos', 'editar')
    and empresa_id = public.empresa_do_usuario()
    and exists (select 1 from public.pedidos p where p.id = pedidos_itens.pedido_id)
  ) with check (
    public.papel_do_usuario() = 'vendedor'
    and public.tem_permissao('pedidos', 'editar')
    and empresa_id = public.empresa_do_usuario()
    and exists (select 1 from public.pedidos p where p.id = pedidos_itens.pedido_id)
  );

create policy pedidos_itens_vendedor_delete on public.pedidos_itens
  for delete using (
    public.papel_do_usuario() = 'vendedor'
    and public.tem_permissao('pedidos', 'deletar')
    and empresa_id = public.empresa_do_usuario()
    and exists (select 1 from public.pedidos p where p.id = pedidos_itens.pedido_id)
  );

-- ───── extracoes: vendedor vê só os arquivos que ele mesmo enviou ─────
drop policy if exists extracoes_vendedor_select on public.extracoes;

create policy extracoes_vendedor_select on public.extracoes
  for select using (
    public.papel_do_usuario() = 'vendedor'
    and public.tem_permissao('pedidos', 'ver')
    and empresa_id = public.empresa_do_usuario()
    and criado_por = auth.uid()
  );

-- ───── RPCs SECURITY DEFINER (ignoram RLS): mesma regra checada à mão ─────
create or replace function public.atualizar_pedido(p_pedido_id uuid, p_campos jsonb, p_itens jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
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
      total = v_subtotal + v_frete - v_desconto
  where id = p_pedido_id;
end;
$$;

create or replace function public.registrar_precos_itens(p_pedido_id uuid, p_itens jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa uuid;
  v_status text;
  v_cliente uuid;
begin
  select empresa_id, status, cliente_id into v_empresa, v_status, v_cliente
  from public.pedidos
  where id = p_pedido_id;

  if v_empresa is null or v_empresa is distinct from public.empresa_do_usuario() then
    raise exception 'Pedido não encontrado';
  end if;
  if public.papel_do_usuario() = 'vendedor' and not public.cliente_do_vendedor(v_cliente) then
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
$$;
