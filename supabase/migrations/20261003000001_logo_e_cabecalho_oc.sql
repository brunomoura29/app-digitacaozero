-- Logomarca do representante + dados de cabeçalho da Ordem de Compra.

-- 1) Bucket das logos. Público de propósito: a logo aparece no link que o cliente abre sem
--    login (e no PDF), então precisa de URL estável sem assinatura. Só imagem, até 2 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Só o admin grava/apaga, e só dentro da pasta da própria empresa (<empresa_id>/arquivo).
-- Leitura pública não precisa de policy (bucket público serve pela URL pública).
drop policy if exists logos_storage_admin_all on storage.objects;
create policy logos_storage_admin_all on storage.objects
  for all to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = (empresa_do_usuario())::text
    and papel_do_usuario() = 'admin'
  )
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = (empresa_do_usuario())::text
    and papel_do_usuario() = 'admin'
  );

-- 2) Cabeçalho da OC pro link público: dados do representante (empresa), do cliente e a
--    fábrica. Mesma regra das outras RPCs por token — nada em rascunho/em validação, e só
--    com link válido. Devolve null quando o token não vale.
create or replace function public.buscar_cabecalho_oc_por_token(p_token text)
returns jsonb
language sql
stable security definer
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
    'fabrica', f.nome
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

grant execute on function public.buscar_cabecalho_oc_por_token(text) to anon, authenticated;
