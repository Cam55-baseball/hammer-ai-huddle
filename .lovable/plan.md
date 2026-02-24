

# Schedule Nightly MPI Cron Job

The `pg_cron` and `pg_net` extensions are already enabled. The only remaining step is to insert the cron schedule.

## What will be done

Run the following SQL using the database insert tool (not migrations, since it contains project-specific credentials):

```text
select cron.schedule(
  'nightly-mpi-process',
  '0 5 * * *',
  $$
  select net.http_post(
    url:='https://wysikbsjalfvjwqzkihj.supabase.co/functions/v1/nightly-mpi-process',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer <anon_key>"}'::jsonb,
    body:=concat('{"time": "', now(), '"}')::jsonb
  ) as request_id;
  $$
);
```

This schedules the `nightly-mpi-process` edge function to run **every day at 05:00 UTC**.

## Files changed
None -- this is a database-only operation (one SQL insert into `cron.job`).

