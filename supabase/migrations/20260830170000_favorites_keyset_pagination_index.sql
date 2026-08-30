create index if not exists favorites_user_created_at_id_idx
on public.favorites (
  user_id,
  created_at desc,
  id desc
);
