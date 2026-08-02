create extension if not exists "pg_net" with schema "extensions";

select cron.schedule(
  'send-watering-reminders',
  '0 9 * * *',
  $$
  select
    net.http_post(
      url := 'https://bjhubejmjmwrwusrpruk.supabase.co/functions/v1/send-watering-reminders',
      headers := jsonb_build_object(
        'Authorization', 'Bearer sb_publishable_9IpVQmIcx1vcsyub_0kGNQ_oFM831Mh',
        'Content-Type', 'application/json'
      ),
      body := '{}'
    );
  $$
);
