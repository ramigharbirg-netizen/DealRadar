begin;

revoke select, insert, update, delete
on table public.push_notification_logs
from anon, authenticated;

commit;
