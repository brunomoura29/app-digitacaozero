-- Relatórios sobre os arquivos importados (`importacoes_linhas`).
-- Um arquivo tem dezenas de milhares de linhas, então a conta é feita aqui: a função devolve as
-- linhas já resumidas — uma por combinação das dimensões pedidas, com cada medida acumulada
-- (soma, quantidade, menor e maior). O navegador só junta esse resumo conforme os filtros.
--
-- Quem chama é o servidor (service role), depois de conferir quem está pedindo e de qual
-- cliente são os dados; por isso não há grant pra `authenticated` nem pra `anon`.
--
-- p_dimensoes / p_medidas = [{ "chave": "<id do campo no relatório>", "origem": "<de onde sai>" }]
--   origem: 'periodo' | 'cliente' | 'arquivo' | 'aba' | 'l:<coluna da linha>' | 'c:<campo do cabeçalho>'
--   (medida só aceita 'l:<coluna>', e só entram os valores gravados como número)

create or replace function public.relatorio_importacao_cubo(
  p_empresa_id uuid,
  p_modelo_id uuid,
  p_importacoes uuid[],
  p_cliente_id uuid,
  p_dimensoes jsonb,
  p_medidas jsonb,
  p_limite integer default 30000
)
returns jsonb
language plpgsql
stable
set search_path to 'public'
as $function$
declare
  v_item jsonb;
  v_origem text;
  v_chave text;
  v_expr text;
  v_n integer := 0;
  v_colunas text := '';
  v_grupos text := '';
  v_objeto text := 'jsonb_build_object(''_n'', count(*))';
  v_sql text;
  v_resultado jsonb;
begin
  for v_item in select * from jsonb_array_elements(coalesce(p_dimensoes, '[]'::jsonb)) loop
    v_origem := v_item->>'origem';
    v_chave := v_item->>'chave';
    v_n := v_n + 1;

    if v_origem = 'periodo' then
      -- 'AAAA' ou 'AAAA-MM' vira uma data (dia 1) pra agrupar por mês, trimestre ou ano
      v_expr := 'case when length(i.periodo) = 4 then i.periodo || ''-01-01'' else i.periodo || ''-01'' end';
    elsif v_origem = 'cliente' then
      v_expr := 'c.nome';
    elsif v_origem = 'arquivo' then
      v_expr := 'i.arquivo_nome';
    elsif v_origem = 'aba' then
      v_expr := 'l.aba';
    elsif v_origem like 'l:%' then
      v_expr := format(
        'case jsonb_typeof(l.dados->%1$L) when ''boolean'' then case when (l.dados->>%1$L) = ''true'' then ''Sim'' else ''Não'' end else l.dados->>%1$L end',
        substr(v_origem, 3)
      );
    elsif v_origem like 'c:%' then
      v_expr := format('i.cabecalho->>%L', substr(v_origem, 3));
    else
      raise exception 'Origem de dimensão desconhecida: %', v_origem;
    end if;

    v_colunas := v_colunas || format(', %s as d%s', v_expr, v_n);
    v_grupos := v_grupos || case when v_grupos = '' then '' else ', ' end || format('d%s', v_n);
    v_objeto := v_objeto || format(' || jsonb_build_object(%L, d%s)', v_chave, v_n);
  end loop;

  v_n := 0;
  for v_item in select * from jsonb_array_elements(coalesce(p_medidas, '[]'::jsonb)) loop
    v_origem := v_item->>'origem';
    v_chave := v_item->>'chave';
    v_n := v_n + 1;

    if v_origem not like 'l:%' then
      raise exception 'Origem de medida desconhecida: %', v_origem;
    end if;

    v_colunas := v_colunas || format(
      ', case when jsonb_typeof(l.dados->%1$L) = ''number'' then (l.dados->>%1$L)::numeric end as m%2$s',
      substr(v_origem, 3), v_n
    );
    v_objeto := v_objeto || format(
      ' || jsonb_build_object(%1$L, sum(m%5$s), %2$L, count(m%5$s), %3$L, min(m%5$s), %4$L, max(m%5$s))',
      v_chave || '#s', v_chave || '#n', v_chave || '#min', v_chave || '#max', v_n
    );
  end loop;

  v_sql :=
    'select coalesce(jsonb_agg(t.linha), ''[]''::jsonb) from ('
    || ' select ' || v_objeto || ' as linha'
    || ' from (select 1 as um' || v_colunas
    || '   from public.importacoes i'
    || '   join public.importacoes_linhas l on l.importacao_id = i.id'
    || '   left join public.clientes c on c.id = i.cliente_id'
    || '   where i.empresa_id = $1 and i.modelo_id = $2'
    || '     and ($3::uuid[] is null or i.id = any($3))'
    || '     and ($4::uuid is null or i.cliente_id = $4)) b'
    || case when v_grupos = '' then '' else ' group by ' || v_grupos end
    -- com o limite, ficam as combinações que juntam mais linhas
    || ' order by count(*) desc'
    || ' limit $5) t';

  execute v_sql into v_resultado using p_empresa_id, p_modelo_id, p_importacoes, p_cliente_id, greatest(coalesce(p_limite, 30000), 1);
  return v_resultado;
end;
$function$;

revoke execute on function public.relatorio_importacao_cubo(uuid, uuid, uuid[], uuid, jsonb, jsonb, integer) from public, anon, authenticated;
grant execute on function public.relatorio_importacao_cubo(uuid, uuid, uuid[], uuid, jsonb, jsonb, integer) to service_role;
