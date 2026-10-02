-- Fecha a tabela de tokens de compartilhamento: o acesso público passa só pelas RPCs
-- SECURITY DEFINER (*_por_token); leitura/escrita direta fica restrita a quem enxerga o
-- pedido na própria empresa.
alter table public.compartilhamentos enable row level security;

drop policy if exists compartilhamentos_public_select on public.compartilhamentos;

revoke all on public.compartilhamentos from anon;

create policy compartilhamentos_select on public.compartilhamentos
  for select to authenticated
  using (
    exists (
      select 1 from public.pedidos p
      where p.id = compartilhamentos.pedido_id
        and p.empresa_id = public.empresa_do_usuario()
    )
  );

create policy compartilhamentos_insert on public.compartilhamentos
  for insert to authenticated
  with check (
    public.tem_permissao('pedidos', 'editar')
    and exists (
      select 1 from public.pedidos p
      where p.id = compartilhamentos.pedido_id
        and p.empresa_id = public.empresa_do_usuario()
    )
  );

create policy compartilhamentos_delete on public.compartilhamentos
  for delete to authenticated
  using (
    public.tem_permissao('pedidos', 'editar')
    and exists (
      select 1 from public.pedidos p
      where p.id = compartilhamentos.pedido_id
        and p.empresa_id = public.empresa_do_usuario()
    )
  );
