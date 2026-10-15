-- Índices das consultas mais usadas de produto, preço e itens de pedido. Tudo `if not exists`:
-- se o índice (com esse nome) já existe, não faz nada.

-- Busca por trecho da descrição (ilike '%texto%' na tela de Produtos): índice de trigramas.
create extension if not exists pg_trgm with schema extensions;
create index if not exists produtos_descricao_trgm_idx
  on public.produtos using gin (descricao extensions.gin_trgm_ops);

-- Lista paginada e catálogo: filtra pela empresa (RLS) e ordena por descrição + id.
create index if not exists produtos_empresa_descricao_idx on public.produtos (empresa_id, descricao, id);

-- Achar produto pelo código (importação de planilha, vínculo de itens do pedido).
create index if not exists produtos_empresa_sku_idx on public.produtos (empresa_id, sku);

-- Preço atual do item no pedido: produto + fábrica + tabela, o mês mais recente primeiro.
create index if not exists precos_produto_fabrica_idx
  on public.precos (produto_id, fabrica_id, referencia_id, competencia desc, criado_em desc);

-- Itens de um pedido em ordem (chave estrangeira não ganha índice sozinha no Postgres).
create index if not exists pedidos_itens_pedido_idx on public.pedidos_itens (pedido_id, posicao);
