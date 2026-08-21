-- EMERGENCY STOP ONLY.
-- This does NOT roll back schema/data. It only stops automatic lifecycle execution.
do $$
declare
  v_job record;
begin
  for v_job in
    select jobid from cron.job
    where jobname in (
      'dealradar-opportunity-lifecycle-db',
      'dealradar-opportunity-lifecycle-worker'
    )
  loop
    perform cron.unschedule(v_job.jobid);
  end loop;
end
$$;

select jobid, jobname, active
from cron.job
where jobname in (
  'dealradar-opportunity-lifecycle-db',
  'dealradar-opportunity-lifecycle-worker'
);
