alter table public.opportunities
  add column if not exists thumbnail_url text;


create or replace function public.capture_opportunity_purge_before_delete()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_reason text;
  v_image_urls jsonb;
begin
  v_reason := nullif(
    current_setting('dealradar.purge_reason', true),
    ''
  );

  v_image_urls :=
    coalesce(old.images, '[]'::jsonb)
    ||
    case
      when nullif(btrim(old.thumbnail_url), '') is not null
        then jsonb_build_array(old.thumbnail_url)
      else '[]'::jsonb
    end;

  insert into public.opportunity_purge_queue (
    opportunity_id,
    owner_user_id,
    image_urls,
    reason
  ) values (
    old.id,
    old.user_id,
    v_image_urls,
    coalesce(v_reason, 'direct_delete')
  )
  on conflict (opportunity_id) do nothing;

  return old;
end;
$$;

revoke all on function public.capture_opportunity_purge_before_delete()
  from public, anon, authenticated;

grant execute on function public.capture_opportunity_purge_before_delete()
  to service_role;


drop function if exists public.get_map_opportunities(
  text,
  text,
  double precision,
  double precision,
  double precision,
  double precision,
  integer,
  integer
);

drop function if exists public.get_smart_feed_page(
  text,
  text,
  integer,
  integer,
  timestamptz,
  uuid
);

drop function if exists public.get_map_card_page(
  text,
  text,
  text,
  boolean,
  double precision,
  double precision,
  double precision,
  integer,
  timestamptz,
  double precision,
  boolean,
  double precision,
  boolean,
  uuid
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
  thumbnail_url text,
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
    o.thumbnail_url,
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



create or replace function public.get_smart_feed_page(
  p_content_type text default 'all',
  p_category text default 'all',
  p_limit integer default 25,
  p_cursor_score integer default null,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null
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
  thumbnail_url text,
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
  with ranked as (
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
      o.thumbnail_url,
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
      (
        case when coalesce(o.is_verified, false) then 30 else 0 end
        - (o.reports * 15)
        + case
            when o.created_at >= now() - interval '24 hours'
            then 15
            else 0
          end
      )::integer as smart_score
    from public.opportunities o
    where
      o.lifecycle_status = 'active'
      and o.expires_at > now()
      and coalesce(o.is_hidden, false) = false
      and (
        p_content_type is null
        or p_content_type = 'all'
        or case
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
      and o.latitude is not null
      and o.longitude is not null
  )
  select
    r.id,
    r.created_at,
    r.title,
    r.description,
    r.category,
    r.subcategory,
    r.content_type,
    r.latitude,
    r.longitude,
    r.address,
    r.estimated_price,
    r.estimated_resale_value,
    r.contact_phone,
    r.contact_email,
    r.contact_link,
    r.images,
    r.thumbnail_url,
    r.user_name,
    r.user_id,
    r.confirmations,
    r.reports,
    r.verified_count,
    r.is_verified,
    r.attributes,
    r.merchant_name,
    r.expires_at,
    r.lifecycle_status,
    pup.avatar_url,
    coalesce(pup.is_premium, false) as is_premium,
    r.smart_score
  from ranked r
  left join public.public_user_profiles pup
    on pup.user_id = r.user_id
  where
    p_cursor_score is null
    or p_cursor_created_at is null
    or p_cursor_id is null
    or (
      r.smart_score,
      r.created_at,
      r.id
    ) < (
      p_cursor_score,
      p_cursor_created_at,
      p_cursor_id
    )
  order by
    r.smart_score desc,
    r.created_at desc,
    r.id desc
  limit least(greatest(coalesce(p_limit, 25), 1), 100);
$$;



create or replace function public.get_map_card_page(
  p_content_type text default 'all',
  p_category text default 'all',
  p_sort text default 'recent',
  p_only_verified boolean default false,
  p_max_price double precision default null,
  p_user_lat double precision default null,
  p_user_lng double precision default null,
  p_limit integer default 25,
  p_cursor_created_at timestamptz default null,
  p_cursor_price double precision default null,
  p_cursor_price_is_null boolean default null,
  p_cursor_distance double precision default null,
  p_cursor_distance_is_null boolean default null,
  p_cursor_id uuid default null
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
  thumbnail_url text,
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
  distance_km double precision
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with prepared as (
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
      o.thumbnail_url,
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
      case
        when
          o.location is not null
          and p_user_lat is not null
          and p_user_lng is not null
          and p_user_lat between -90 and 90
          and p_user_lng between -180 and 180
        then
          ST_Distance(
            o.location,
            ST_SetSRID(
              ST_MakePoint(p_user_lng, p_user_lat),
              4326
            )::geography
          ) / 1000.0
        else null
      end::double precision as distance_km
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
        or case
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
      and (
        coalesce(p_only_verified, false) = false
        or o.is_verified = true
      )
      and (
        p_max_price is null
        or (
          o.estimated_price is not null
          and o.estimated_price <= p_max_price
        )
      )
  )
  select
    p.id,
    p.created_at,
    p.title,
    p.description,
    p.category,
    p.subcategory,
    p.content_type,
    p.latitude,
    p.longitude,
    p.address,
    p.estimated_price,
    p.estimated_resale_value,
    p.contact_phone,
    p.contact_email,
    p.contact_link,
    p.images,
    p.thumbnail_url,
    p.user_name,
    p.user_id,
    p.confirmations,
    p.reports,
    p.verified_count,
    p.is_verified,
    p.attributes,
    p.merchant_name,
    p.expires_at,
    p.lifecycle_status,
    p.avatar_url,
    p.is_premium,
    p.distance_km
  from prepared p
  where
    case
      when coalesce(p_sort, 'recent') = 'price_low' then
        p_cursor_id is null
        or p_cursor_price_is_null is null
        or (
          p_cursor_price_is_null = false
          and (
            p.estimated_price is null
            or (
              p.estimated_price is not null
              and (
                p.estimated_price > p_cursor_price
                or (
                  p.estimated_price = p_cursor_price
                  and p.id > p_cursor_id
                )
              )
            )
          )
        )
        or (
          p_cursor_price_is_null = true
          and p.estimated_price is null
          and p.id > p_cursor_id
        )

      when coalesce(p_sort, 'recent') = 'distance' then
        p_cursor_id is null
        or p_cursor_distance_is_null is null
        or (
          p_cursor_distance_is_null = false
          and (
            p.distance_km is null
            or (
              p.distance_km is not null
              and (
                p.distance_km > p_cursor_distance
                or (
                  p.distance_km = p_cursor_distance
                  and p.id > p_cursor_id
                )
              )
            )
          )
        )
        or (
          p_cursor_distance_is_null = true
          and p.distance_km is null
          and p.id > p_cursor_id
        )

      else
        p_cursor_created_at is null
        or p_cursor_id is null
        or (
          p.created_at,
          p.id
        ) < (
          p_cursor_created_at,
          p_cursor_id
        )
    end
  order by
    case
      when coalesce(p_sort, 'recent') = 'price_low'
      then p.estimated_price is null
    end asc,
    case
      when coalesce(p_sort, 'recent') = 'price_low'
      then p.estimated_price
    end asc nulls last,
    case
      when coalesce(p_sort, 'recent') = 'price_low'
      then p.id
    end asc,
    case
      when coalesce(p_sort, 'recent') = 'distance'
      then p.distance_km is null
    end asc,
    case
      when coalesce(p_sort, 'recent') = 'distance'
      then p.distance_km
    end asc nulls last,
    case
      when coalesce(p_sort, 'recent') = 'distance'
      then p.id
    end asc,
    case
      when coalesce(p_sort, 'recent') not in ('price_low', 'distance')
      then p.created_at
    end desc,
    case
      when coalesce(p_sort, 'recent') not in ('price_low', 'distance')
      then p.id
    end desc
  limit least(
    greatest(coalesce(p_limit, 25), 1),
    100
  );
$$;



grant execute on function public.get_map_opportunities(
  text,
  text,
  double precision,
  double precision,
  double precision,
  double precision,
  integer,
  integer
) to public, anon, authenticated, service_role;

grant execute on function public.get_smart_feed_page(
  text,
  text,
  integer,
  integer,
  timestamptz,
  uuid
) to public, anon, authenticated, service_role;

grant execute on function public.get_map_card_page(
  text,
  text,
  text,
  boolean,
  double precision,
  double precision,
  double precision,
  integer,
  timestamptz,
  double precision,
  boolean,
  double precision,
  boolean,
  uuid
) to public, anon, authenticated, service_role;
