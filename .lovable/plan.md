

# Set Up Cron Job for `check-render-status`

## What This Does

Creates a scheduled job that calls the `check-render-status` edge function every minute. This is what closes the automation loop — after `render-promo` dispatches a job to Lambda, the cron job polls for completion and finalizes the video.

## Changes

### 1. Enable Required Extensions
Ensure `pg_cron` and `pg_net` extensions are enabled (pg_net is already used by the DB trigger).

### 2. Create Cron Schedule
Using `cron.schedule`, set up a per-minute invocation of `check-render-status`:

```sql
select cron.schedule(
  'check-render-status-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://wysikbsjalfvjwqzkihj.supabase.co/functions/v1/check-render-status',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5c2lrYnNqYWxmdmp3cXpraWhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5OTYyNjAsImV4cCI6MjA3NjU3MjI2MH0.TzgAEk17xlK_qAC4uRHFJTd9SoG5jRNInCUBIuEgA7A"}'::jsonb,
    body := concat('{"time": "', now(), '"}')::jsonb
  ) as request_id;
  $$
);
```

### 3. Add `check-render-status` to config.toml
Add `verify_jwt = false` so the cron job (which uses the anon key) can invoke it without a user JWT.

## Result

Every minute, the system automatically checks all `processing` jobs against Lambda, downloads completed videos, uploads to storage, and updates the DB. The full automation loop is: **Queue Render → trigger fires render-promo → Lambda starts → cron polls check-render-status → video finalized**.

