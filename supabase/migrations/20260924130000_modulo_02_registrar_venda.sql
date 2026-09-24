-- Uma chamada RPC é uma transação: qualquer erro desfaz venda e itens.
create or replace function public.registrar_venda(p_forma_pagamento_id smallint, p_itens jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_usuario uuid := auth.uid();
  v_venda uuid;
  v_total numeric(12,2);
  v_quantidade integer;
begin
  if v_usuario is null then
    raise exception 'Entre na sua conta para registrar a venda';
  end if;
  if not exists (select 1 from public.formas_pagamento where id = p_forma_pagamento_id and ativo) then
    raise exception 'Escolha uma forma de pagamento válida';
  end if;
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 or jsonb_array_length(p_itens) > 100 then
    raise exception 'Adicione produtos à venda';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_itens) e
    where jsonb_typeof(e) <> 'object'
       or (e->>'produto_id') is null
       or (e->>'quantidade') !~ '^[1-9][0-9]{0,3}$'
  ) then
    raise exception 'Confira os produtos e as quantidades';
  end if;
  -- IDs inválidos também falham e revertem a chamada inteira.
  select sum(p.preco * x.quantidade), count(*)
    into v_total, v_quantidade
    from (select (e->>'produto_id')::uuid as id, sum((e->>'quantidade')::integer) as quantidade
          from jsonb_array_elements(p_itens) e group by 1) x
    join public.produtos p on p.id = x.id and p.usuario_id = v_usuario and p.ativo;
  if v_quantidade <> (select count(distinct e->>'produto_id') from jsonb_array_elements(p_itens) e)
     or v_total is null or v_total <= 0 then
    raise exception 'Atualize os produtos antes de finalizar';
  end if;
  insert into public.vendas (forma_pagamento_id, total)
  values (p_forma_pagamento_id, v_total) returning id into v_venda;
  insert into public.itens_venda (venda_id, produto_id, produto_nome, quantidade, preco_unitario)
  select v_venda, p.id, p.nome, x.quantidade, p.preco
    from (select (e->>'produto_id')::uuid as id, sum((e->>'quantidade')::integer) as quantidade
          from jsonb_array_elements(p_itens) e group by 1) x
    join public.produtos p on p.id = x.id and p.usuario_id = v_usuario and p.ativo;
  return v_venda;
end;
$$;

revoke all on function public.registrar_venda(smallint, jsonb) from public, anon;
grant execute on function public.registrar_venda(smallint, jsonb) to authenticated;
