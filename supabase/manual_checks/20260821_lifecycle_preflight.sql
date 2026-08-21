-- DealRadar lifecycle preflight - READ ONLY
select name, default_version, installed_version
from pg_available_extensions
where name = 'pg_cron';

select extname, extversion
from pg_extension
where extname in ('pg_cron', 'pg_net', 'pgcrypto', 'uuid-ossp')
order by extname;

select
  count(*) as opportunities,
  count(*) filter (where content_type = 'deal') as deals,
  count(*) filter (where content_type = 'sale') as sales,
  count(*) filter (where content_type = 'job') as jobs,
  count(*) filter (where content_type = 'real_estate') as real_estate
from public.opportunities;

select
  count(*) as profiles,
  coalesce(sum(points), 0) as points_total,
  coalesce(sum(trust_score), 0) as trust_total,
  coalesce(sum(total_opportunities), 0) as lifetime_opportunities_total,
  coalesce(sum(verified_deals), 0) as verified_total,
  coalesce(sum(hidden_deals), 0) as hidden_total
from public.user_profiles;

select decrypted_secret is not null as internal_secret_present
from vault.decrypted_secrets
where name = 'dealradar_internal_secret';
