-- Grava explicitamente o `papel` dos campos de item do "Template 01" (criado antes dessa
-- opção existir) — até aqui o papel era inferido pelo nome do campo, o que dependia da ordem
-- ("Valor total" antes de "Preço" viraria preço unitário). Só mexe se nenhum campo do
-- template tiver papel configurado ainda.
update public.modelos m
set schema = jsonb_set(
  m.schema,
  '{campos_item}',
  (
    select jsonb_agg(
      case c->>'nome'
        when 'Codigo' then c || '{"papel": "sku"}'::jsonb
        when 'Nome do produto' then c || '{"papel": "descricao"}'::jsonb
        when 'Quantidade' then c || '{"papel": "quantidade"}'::jsonb
        when 'Preço' then c || '{"papel": "preco_unitario"}'::jsonb
        else c
      end
      order by ord
    )
    from jsonb_array_elements(m.schema->'campos_item') with ordinality as t(c, ord)
  )
)
where m.nome = 'Template 01'
  and not exists (
    select 1
    from jsonb_array_elements(m.schema->'campos_item') c
    where c->>'papel' is not null
  );
