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