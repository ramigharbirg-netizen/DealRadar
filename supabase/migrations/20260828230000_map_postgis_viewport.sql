drop function if exists public.get_map_opportunities(
  text,
  text,
  integer,
  integer
);

create or replace function public.get_map_opportunities(
  p_content_type text default 'all',
  p_category text default 'all',
  p_north double precision default null,
  p_south double precision default null,
  p_east double precision default null,
  p_west double precision default null,
  p_limit integer default 500,
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
  trust_score integer,
  verified_deals integer,
  points integer,
  total_opportunities integer,
  avatar_url text,
  is_premium boolean
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
    coalesce(pup.trust_score, 0),
    coalesce(pup.verified_deals, 0),
    coalesce(pup.points, 0),
    coalesce(pup.total_opportunities, 0),
    pup.avatar_url,
    coalesce(pup.is_premium, false)
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

    and o.location is not null
    and o.latitude is not null
    and o.longitude is not null

    and (
      p_north is null
      or p_south is null
      or p_east is null
      or p_west is null
      or ST_Intersects(
        o.location,
        ST_MakeEnvelope(
          p_west,
          p_south,
          p_east,
          p_north,
          4326
        )::geography
      )
    )

  order by o.created_at desc, o.id desc
  limit least(greatest(coalesce(p_limit, 500), 1), 500)
  offset greatest(coalesce(p_offset, 0), 0);
$$;