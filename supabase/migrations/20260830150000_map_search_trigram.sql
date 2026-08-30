create extension if not exists pg_trgm with schema extensions;

create index if not exists opportunities_search_trgm_idx
on public.opportunities
using gin (
  lower(
    coalesce(title, '') || ' ' ||
    coalesce(description, '') || ' ' ||
    coalesce(category, '')
  ) extensions.gin_trgm_ops
)
where
  lifecycle_status = 'active'
  and coalesce(is_hidden, false) = false;

create or replace function public.search_map_opportunities(
  p_query text,
  p_limit integer default 5
)
returns table (
  id uuid,
  user_id uuid,
  title text,
  description text,
  category text,
  subcategory text,
  price numeric,
  estimated_price numeric,
  estimated_resale_value numeric,
  address text,
  latitude double precision,
  longitude double precision,
  images text[],
  content_type text,
  is_verified boolean,
  reports integer,
  created_at timestamptz,
  expires_at timestamptz,
  lifecycle_status text,
  user_name text,
  avatar_url text,
  is_premium boolean
)
language sql
stable
security invoker
set search_path = public, extensions, pg_temp
as $$
  with searchable as (
    select
      o.id,
      o.user_id,
      o.title,
      o.description,
      o.category,
      o.subcategory,
      o.price,
      o.estimated_price,
      o.estimated_resale_value,
      o.address,
      o.latitude,
      o.longitude,
      o.images,
      o.content_type,
      o.is_verified,
      o.reports,
      o.created_at,
      o.expires_at,
      o.lifecycle_status,
      o.user_name,
      p.avatar_url,
      coalesce(p.is_premium, false) as is_premium,
      lower(
        coalesce(o.title, '') || ' ' ||
        coalesce(o.description, '') || ' ' ||
        coalesce(o.category, '')
      ) as search_text
    from public.opportunities o
    left join public.public_user_profiles p
      on p.user_id = o.user_id
    where
      o.lifecycle_status = 'active'
      and o.expires_at > now()
      and coalesce(o.is_hidden, false) = false
  )
  select
    s.id,
    s.user_id,
    s.title,
    s.description,
    s.category,
    s.subcategory,
    s.price,
    s.estimated_price,
    s.estimated_resale_value,
    s.address,
    s.latitude,
    s.longitude,
    s.images,
    s.content_type,
    s.is_verified,
    s.reports,
    s.created_at,
    s.expires_at,
    s.lifecycle_status,
    s.user_name,
    s.avatar_url,
    s.is_premium
  from searchable s
  where
    length(trim(coalesce(p_query, ''))) >= 2
    and s.search_text ilike '%' || lower(trim(p_query)) || '%'
  order by
    similarity(s.search_text, lower(trim(p_query))) desc,
    s.created_at desc,
    s.id desc
  limit least(greatest(coalesce(p_limit, 5), 1), 20);
$$;
