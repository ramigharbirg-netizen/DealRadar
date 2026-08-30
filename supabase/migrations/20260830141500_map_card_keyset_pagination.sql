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
