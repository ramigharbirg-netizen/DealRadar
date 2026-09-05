create index if not exists opportunities_active_location_gist_idx
on public.opportunities
using gist (location)
where
  lifecycle_status = 'active'
  and coalesce(is_hidden, false) = false
  and latitude is not null
  and longitude is not null
  and location is not null;
