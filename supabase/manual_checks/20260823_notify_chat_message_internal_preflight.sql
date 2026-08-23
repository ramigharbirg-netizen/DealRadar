select
  role_name,
  has_table_privilege(role_name, 'public.push_notification_logs', 'SELECT') as can_select,
  has_table_privilege(role_name, 'public.push_notification_logs', 'INSERT') as can_insert,
  has_table_privilege(role_name, 'public.push_notification_logs', 'UPDATE') as can_update,
  has_table_privilege(role_name, 'public.push_notification_logs', 'DELETE') as can_delete
from (values ('anon'), ('authenticated'), ('service_role')) r(role_name)
order by role_name;
