create index if not exists conversations_owner_activity_id_idx
on public.conversations (
  owner_id,
  (coalesce(last_message_at, created_at)) desc,
  id desc
);

create index if not exists conversations_requester_activity_id_idx
on public.conversations (
  requester_id,
  (coalesce(last_message_at, created_at)) desc,
  id desc
);

create or replace function public.get_my_conversations_page(
  p_limit integer default 25,
  p_cursor_activity_at timestamptz default null,
  p_cursor_id uuid default null
)
returns table (
  id uuid,
  opportunity_id uuid,
  owner_id uuid,
  requester_id uuid,
  created_at timestamptz,
  last_message text,
  last_message_at timestamptz,
  last_message_sender_id uuid,
  activity_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    c.id,
    c.opportunity_id,
    c.owner_id,
    c.requester_id,
    c.created_at,
    c.last_message,
    c.last_message_at,
    c.last_message_sender_id,
    coalesce(c.last_message_at, c.created_at) as activity_at
  from public.conversations c
  where
    (c.owner_id = auth.uid() or c.requester_id = auth.uid())
    and (
      p_cursor_activity_at is null
      or coalesce(c.last_message_at, c.created_at) < p_cursor_activity_at
      or (
        coalesce(c.last_message_at, c.created_at) = p_cursor_activity_at
        and c.id < p_cursor_id
      )
    )
  order by
    coalesce(c.last_message_at, c.created_at) desc,
    c.id desc
  limit least(greatest(coalesce(p_limit, 25), 1), 100);
$$;

revoke all on function public.get_my_conversations_page(integer, timestamptz, uuid)
from public;

grant execute on function public.get_my_conversations_page(integer, timestamptz, uuid)
to authenticated;
