select
  role_name,
  has_table_privilege(role_name, 'public.push_notification_logs', 'SELECT') as can_select,
  has_table_privilege(role_name, 'public.push_notification_logs', 'INSERT') as can_insert,
  has_table_privilege(role_name, 'public.push_notification_logs', 'UPDATE') as can_update,
  has_table_privilege(role_name, 'public.push_notification_logs', 'DELETE') as can_delete
from (values ('anon'), ('authenticated'), ('service_role')) r(role_name)
order by role_name;


select
  count(*) as duplicate_log_groups,
  coalesce(sum(rows_per_group - 1), 0) as redundant_log_rows
from (
  select message_id, token_id, count(*) as rows_per_group
  from public.push_notification_logs
  group by message_id, token_id
  having count(*) > 1
) d;
