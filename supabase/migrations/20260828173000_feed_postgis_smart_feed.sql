-- DealRadar
-- PostGIS opportunity location infrastructure + scalable Smart Feed
-- 2026-08-28


-- ============================================================
-- 1. POSTGIS
-- ============================================================

create extension if not exists postgis;


-- ============================================================
-- 2. DERIVED GEOGRAPHY COLUMN
-- ============================================================

alter table public.opportunities
add column if not exists location geography(Point, 4326);


-- ============================================================
-- 3. BACKFILL EXISTING VALID COORDINATES
-- ============================================================

update public.opportunities
set location = ST_SetSRID(
  ST_MakePoint(longitude, latitude),
  4326
)::geography
where latitude is not null
  and longitude is not null
  and latitude between -90 and 90
  and longitude between -180 and 180
  and location is null;


-- ============================================================
-- 4. SPATIAL INDEX
-- ============================================================

create index if not exists opportunities_location_gist_idx
on public.opportunities
using gist (location);


-- ============================================================
-- 5. KEEP LOCATION SYNCHRONIZED WITH LATITUDE / LONGITUDE
-- ============================================================

create or replace function public.sync_opportunity_location()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.latitude is not null
     and new.longitude is not null
     and new.latitude between -90 and 90
     and new.longitude between -180 and 180 then

    new.location :=
      ST_SetSRID(
        ST_MakePoint(new.longitude, new.latitude),
        4326
      )::geography;

  else
    new.location := null;
  end if;

  return new;
end;
$$;


drop trigger if exists trg_sync_opportunity_location
on public.opportunities;

create trigger trg_sync_opportunity_location
before insert or update of latitude, longitude, location
on public.opportunities
for each row
execute function public.sync_opportunity_location();


-- ============================================================
-- 6. SMART FEED
--
-- SECURITY INVOKER:
-- the function does not bypass opportunities RLS.
--
-- Filtering and Smart ranking happen before LIMIT so the Feed
-- does not rank only a preselected set of recent rows.
-- ============================================================

create or replace function public.get_smart_feed(
  p_content_type text default 'all',
  p_category text default 'all',
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  created_at timestamptz,
  title text,
  description text,
  category text,
  subcategory text,
  content_type text,
  latitude double precision,
  longitude double precision,
  address text,
  estimated_price double precision,
  estimated_resale_value double precision,
  contact_phone text,
  contact_email text,
  contact_link text,
  images jsonb,
  user_name text,
  user_id uuid,
  confirmations integer,
  reports integer,
  verified_count bigint,
  is_verified boolean,
  attributes jsonb,
  merchant_name text,
  expires_at timestamptz,
  lifecycle_status text,
  avatar_url text,
  is_premium boolean,
  smart_score integer
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    o.id,
    o.created_at,
    o.title,
    o.description,
    o.category,
    o.subcategory,
    o.content_type,
    o.latitude,
    o.longitude,
    o.address,
    o.estimated_price,
    o.estimated_resale_value,
    o.contact_phone,
    o.contact_email,
    o.contact_link,
    o.images,
    o.user_name,
    o.user_id,
    o.confirmations,
    o.reports,
    o.verified_count,
    o.is_verified,
    o.attributes,
    o.merchant_name,
    o.expires_at,
    o.lifecycle_status,
    pup.avatar_url,
    coalesce(pup.is_premium, false) as is_premium,

    (
      case
        when coalesce(o.is_verified, false) then 30
        else 0
      end
      - (o.reports * 15)
      + case
          when o.created_at >= now() - interval '24 hours' then 15
          else 0
        end
    )::integer as smart_score

  from public.opportunities o

  left join public.public_user_profiles pup
    on pup.user_id = o.user_id

  where
    o.lifecycle_status = 'active'
    and o.expires_at > now()
    and coalesce(o.is_hidden, false) = false

    and (
      p_content_type is null
      or p_content_type = 'all'
      or
      case
        when o.content_type in ('deal', 'sale', 'job', 'real_estate')
          then o.content_type
        when o.category = 'job_offers'
          then 'job'
        when o.category = 'rental_homes'
          then 'real_estate'
        when o.category = 'user_reported'
          then 'deal'
        else 'sale'
      end = p_content_type
    )

    and (
      p_category is null
      or p_category = 'all'
      or o.category = p_category
    )

    -- Preserve current Feed behavior:
    -- opportunities without usable coordinates are excluded.
    and o.latitude is not null
    and o.longitude is not null

  order by
    (
      case
        when coalesce(o.is_verified, false) then 30
        else 0
      end
      - (o.reports * 15)
      + case
          when o.created_at >= now() - interval '24 hours' then 15
          else 0
        end
    ) desc,
    o.created_at desc,
    o.id desc

  limit least(greatest(coalesce(p_limit, 50), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;
