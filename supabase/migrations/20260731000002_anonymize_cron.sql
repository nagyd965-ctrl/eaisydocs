-- Supabase cron job setup to call Edge Function every night at 2:00 AM
-- Note: Replace YOUR_PROJECT_REF and YOUR_ANON_KEY with your actual Supabase project reference and anon key.
-- Alternatively, you can set up the Cron Trigger via the Supabase Dashboard -> Edge Functions -> Cron Triggers.

-- 1. Enable pg_cron and pg_net extensions if not already enabled
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- 2. Schedule the anonymize-candidates function
select
  cron.schedule(
    'anonymize-candidates-nightly',
    '0 2 * * *', -- Minden nap hajnali 2:00-kor
    $$
    select
      net.http_post(
          url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/anonymize-candidates',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
      ) as request_id;
    $$
  );
