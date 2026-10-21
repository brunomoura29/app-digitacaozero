-- Um preço por produto + fábrica + referência (tabela) + mês de competência.
-- A importação por planilha substitui o valor do mesmo mês (upsert nessa chave); meses
-- diferentes continuam como histórico. Referência vazia conta como uma referência só
-- (nulls not distinct). Conferido em 2026-10-21: nenhum duplicado na base.

create unique index if not exists precos_produto_fabrica_ref_mes_uidx
  on public.precos (empresa_id, produto_id, fabrica_id, referencia_id, competencia)
  nulls not distinct;
