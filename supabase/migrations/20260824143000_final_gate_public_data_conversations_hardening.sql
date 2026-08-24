begin;

revoke insert, update, delete on table public.public_user_profiles from anon, authenticated;
grant select on table public.public_user_profiles to anon, authenticated;

drop policy if exists "public can read comments for visible opportunities" on public.comments;
create policy "public can read comments for visible opportunities"
on public.comments for select to public
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.opportunities o
    where o.id = comments.opportunity_id
      and o.lifecycle_status = 'active'
      and o.expires_at > now()
      and coalesce(o.is_hidden, false) = false
  )
);

drop policy if exists "read verifications for visible opportunities" on public.opportunity_confirmations;
create policy "read verifications for visible opportunities"
on public.opportunity_confirmations for select to public
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.opportunities o
    where o.id = opportunity_confirmations.opportunity_id
      and o.lifecycle_status = 'active'
      and o.expires_at > now()
      and coalesce(o.is_hidden, false) = false
  )
);

drop policy if exists "participants can update conversations" on public.conversations;
revoke update on table public.conversations from anon, authenticated;

commit;
