-- DealRadar Account Deletion Hardening - PRE-FLIGHT (read only)

select
  count(*) filter (where table_name = 'opportunities' and column_name = 'user_id' and is_nullable = 'NO') as opportunities_user_id_not_null,
  count(*) filter (where table_name = 'pickup_requests' and column_name = 'requester_id' and is_nullable = 'NO') as pickup_requester_not_null,
  count(*) filter (where table_name = 'pickup_requests' and column_name = 'owner_id' and is_nullable = 'NO') as pickup_owner_not_null,
  count(*) filter (where table_name = 'conversations' and column_name = 'requester_id' and is_nullable = 'NO') as conversation_requester_not_null
from information_schema.columns
where table_schema = 'public';

select
  c.conname as constraint_name,
  c.conrelid::regclass as source_table,
  a.attname as source_column,
  c.confrelid::regclass as referenced_table,
  case c.confdeltype
    when 'a' then 'NO ACTION'
    when 'r' then 'RESTRICT'
    when 'c' then 'CASCADE'
    when 'n' then 'SET NULL'
    when 'd' then 'SET DEFAULT'
  end as delete_rule
from pg_constraint c
join lateral unnest(c.conkey) with ordinality ck(attnum, ord) on true
join pg_attribute a on a.attrelid = c.conrelid and a.attnum = ck.attnum
where c.contype = 'f'
  and c.conrelid in (
    'public.opportunities'::regclass,
    'public.conversations'::regclass,
    'public.conversation_messages'::regclass,
    'public.conversation_reads'::regclass
  )
order by c.conrelid::regclass::text, c.conname, ck.ord;
