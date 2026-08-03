-- DealRadar 2.0 - Fase A
-- Introduce la distinzione strutturale tra affari, vendite, lavoro e immobili.
-- Compatibile con le versioni precedenti dell'app: content_type resta nullable.

begin;

alter table public.opportunities
  add column if not exists content_type text,
  add column if not exists merchant_name text;

-- Valori ufficiali DealRadar 2.0. NULL resta temporaneamente consentito
-- per non interrompere le versioni Android/web precedenti.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'opportunities_content_type_check'
      and conrelid = 'public.opportunities'::regclass
  ) then
    alter table public.opportunities
      add constraint opportunities_content_type_check
      check (
        content_type is null
        or content_type in ('deal', 'sale', 'job', 'real_estate')
      );
  end if;
end
$$;

-- Se valorizzato, il nome del negozio deve essere significativo e contenuto.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'opportunities_merchant_name_length_check'
      and conrelid = 'public.opportunities'::regclass
  ) then
    alter table public.opportunities
      add constraint opportunities_merchant_name_length_check
      check (
        merchant_name is null
        or length(btrim(merchant_name)) between 2 and 120
      );
  end if;
end
$$;

-- Un affare fisico deve indicare il negozio.
-- Le versioni precedenti continuano a funzionare perché inviano content_type = NULL.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'opportunities_deal_merchant_required_check'
      and conrelid = 'public.opportunities'::regclass
  ) then
    alter table public.opportunities
      add constraint opportunities_deal_merchant_required_check
      check (
        content_type is distinct from 'deal'
        or (
          merchant_name is not null
          and length(btrim(merchant_name)) between 2 and 120
        )
      );
  end if;
end
$$;

-- Classificazione dei contenuti già presenti, verificati nell'audit come annunci storici.
-- Lavoro e immobili vengono riconosciuti dalla categoria; gli altri record correnti
-- vengono classificati come vendita. Non vengono mai classificati automaticamente come affari.
update public.opportunities
set content_type = case
  when category = 'job_offers' then 'job'
  when category = 'rental_homes' then 'real_estate'
  else 'sale'
end
where content_type is null;

-- Indici per feed, filtri e ordinamento cronologico.
create index if not exists opportunities_content_type_created_at_idx
  on public.opportunities (content_type, created_at desc);

create index if not exists opportunities_merchant_name_lower_idx
  on public.opportunities (lower(merchant_name))
  where merchant_name is not null;

comment on column public.opportunities.content_type is
  'Tipo principale DealRadar 2.0: deal, sale, job, real_estate. Temporaneamente nullable per retrocompatibilità.';

comment on column public.opportunities.merchant_name is
  'Nome del negozio fisico in cui è stato trovato un affare. Usato soltanto per content_type = deal nella versione 2.0 iniziale.';

commit;