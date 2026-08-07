-- ============================================================
-- DealRadar
-- Remove unused Bounty system
-- ============================================================

begin;

-- Safety check:
-- interrompe tutto se nel frattempo sono comparsi dati Bounty.
do $$
begin
  if exists (select 1 from public.bounties limit 1) then
    raise exception 'Abort: public.bounties contains data';
  end if;

  if exists (select 1 from public.bounty_matches limit 1) then
    raise exception 'Abort: public.bounty_matches contains data';
  end if;

  if exists (select 1 from public.bounty_submissions limit 1) then
    raise exception 'Abort: public.bounty_submissions contains data';
  end if;
end
$$;

-- Tabelle dipendenti prima della tabella principale.
drop table if exists public.bounty_matches;
drop table if exists public.bounty_submissions;
drop table if exists public.bounties;

-- Residuo del vecchio sistema nel profilo utente.
alter table public.user_profiles
  drop column if exists total_bounties;

commit;