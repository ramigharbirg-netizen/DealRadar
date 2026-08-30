create index if not exists opportunities_owner_lifecycle_created_at_idx
on public.opportunities (
  user_id,
  lifecycle_status,
  created_at desc,
  id desc
)
where coalesce(is_hidden, false) = false;
