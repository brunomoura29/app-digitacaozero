-- Condições de pagamento por fábrica (Cadastros → Condições de pagamento). Cada uma tem um % que
-- vale pra ordem de compra inteira: negativo = desconto (ex: à vista −5%), positivo = acréscimo
-- (ex: prazo longo +3%). Aplicado sobre o subtotal dos itens, que já sai com as políticas
-- comerciais do cliente; frete e desconto manual continuam separados.
-- O pedido guarda o nome e o % da condição escolhida (foto do momento): mudar o cadastro depois
-- não mexe em pedido já feito.

create table if not exists public.condicoes_pagamento (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_do_usuario() references public.empresas(id) on delete cascade,
  fabrica_id uuid not null references public.fabricas(id) on delete cascade,
  nome text not null check (btrim(nome) <> ''),
  percentual numeric(7, 3) not null default 0 check (percentual >= -100),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- mesma fábrica não tem duas condições com o mesmo nome
create unique index if not exists condicoes_pagamento_nome_idx
  on public.condicoes_pagamento (fabrica_id, lower(btrim(nome)));

alter table public.condicoes_pagamento enable row level security;

-- lê quem é da empresa (o pedido precisa listar); grava quem tem a permissão do módulo
drop policy if exists condicoes_pagamento_select on public.condicoes_pagamento;
create policy condicoes_pagamento_select on public.condicoes_pagamento
  for select to authenticated
  using (empresa_id = public.empresa_do_usuario());

drop policy if exists condicoes_pagamento_insert on public.condicoes_pagamento;
create policy condicoes_pagamento_insert on public.condicoes_pagamento
  for insert to authenticated
  with check (empresa_id = public.empresa_do_usuario() and public.tem_permissao('condicoes_pagamento', 'incluir'));

drop policy if exists condicoes_pagamento_update on public.condicoes_pagamento;
create policy condicoes_pagamento_update on public.condicoes_pagamento
  for update to authenticated
  using (empresa_id = public.empresa_do_usuario() and public.tem_permissao('condicoes_pagamento', 'editar'))
  with check (empresa_id = public.empresa_do_usuario() and public.tem_permissao('condicoes_pagamento', 'editar'));

drop policy if exists condicoes_pagamento_delete on public.condicoes_pagamento;
create policy condicoes_pagamento_delete on public.condicoes_pagamento
  for delete to authenticated
  using (empresa_id = public.empresa_do_usuario() and public.tem_permissao('condicoes_pagamento', 'deletar'));

revoke all on public.condicoes_pagamento from anon;
grant select, insert, update, delete on public.condicoes_pagamento to authenticated;

-- Pedido: qual condição (o nome continua em condicao_pagamento, como texto), o % e o valor do ajuste.
-- Pedidos antigos ficam com o texto digitado, sem condição e sem ajuste.
alter table public.pedidos
  add column if not exists condicao_pagamento_id uuid references public.condicoes_pagamento(id) on delete set null,
  add column if not exists condicao_percentual numeric(7, 3) not null default 0,
  add column if not exists condicao_valor numeric(14, 2) not null default 0;

-- Edição de pedido: igual à anterior (20261019000001) + condição de pagamento.
-- Com a chave `condicao_pagamento_id` em p_campos:
--   vazia      → sem condição cadastrada (fica o texto de `condicao_pagamento`, ex: pedido antigo), sem ajuste;
--   a mesma    → mantém o nome e o % guardados no pedido (o cadastro pode ter mudado depois);
--   outra      → busca no cadastro: precisa ser da empresa, ativa e da fábrica do pedido.
-- Sem a chave (tela antiga), condição e % ficam como estão.
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
  v_fabrica uuid := nullif(p_campos->>'fabrica_id', '')::uuid;
  v_item jsonb;
  v_pos int := 0;
  v_qtd numeric(14,3);
  v_preco numeric(14,2);
  v_cond_atual uuid;
  v_cond_id uuid;
  v_cond_nome text;
  v_cond_pct numeric(7,3);
  v_cond_valor numeric(14,2);
begin
  select empresa_id, status, cliente_id, condicao_pagamento_id, condicao_pagamento, condicao_percentual
    into v_empresa, v_status, v_cliente, v_cond_atual, v_cond_nome, v_cond_pct
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

  -- condição de pagamento (ver comentário acima); sem a chave, fica a atual
  v_cond_id := v_cond_atual;
  if p_campos ? 'condicao_pagamento_id' then
    v_cond_id := nullif(p_campos->>'condicao_pagamento_id', '')::uuid;
    if v_cond_id is null then
      v_cond_nome := nullif(p_campos->>'condicao_pagamento', '');
      v_cond_pct := 0;
    elsif v_cond_id is distinct from v_cond_atual then
      select c.nome, c.percentual into v_cond_nome, v_cond_pct
      from public.condicoes_pagamento c
      where c.id = v_cond_id and c.empresa_id = v_empresa and c.ativo and c.fabrica_id = v_fabrica;
      if not found then
        raise exception 'Condição de pagamento não encontrada para a fábrica do pedido';
      end if;
    end if;
  else
    v_cond_nome := nullif(p_campos->>'condicao_pagamento', '');
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

  v_cond_valor := round(v_subtotal * coalesce(v_cond_pct, 0) / 100, 2);

  update public.pedidos
  set condicao_pagamento = v_cond_nome,
      condicao_pagamento_id = v_cond_id,
      condicao_percentual = coalesce(v_cond_pct, 0),
      condicao_valor = v_cond_valor,
      prazo_entrega = nullif(p_campos->>'prazo_entrega', ''),
      observacoes = nullif(p_campos->>'observacoes', ''),
      fabrica_id = v_fabrica,
      referencia_id = nullif(p_campos->>'referencia_id', '')::uuid,
      desconto_valor = v_desconto,
      frete_valor = v_frete,
      subtotal = v_subtotal,
      total = v_subtotal + v_cond_valor + v_frete - v_desconto,
      dados_extras = case
        when jsonb_typeof(p_campos->'informacoes') = 'array'
          then coalesce(dados_extras, '{}'::jsonb) || jsonb_build_object('informacoes', p_campos->'informacoes')
        else dados_extras
      end
  where id = p_pedido_id;
end;
$function$;

-- Link público: igual à anterior (20261019000001) + o % e o valor da condição, pra linha dos totais.
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
    end,
    'condicao', jsonb_build_object('percentual', p.condicao_percentual, 'valor', p.condicao_valor)
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
