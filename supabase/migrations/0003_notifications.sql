-- v3: notification settings, push devices, send log, and the 15-minute scheduler.

alter table public.profiles add column if not exists notify jsonb;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('workout', 'question', 'missed', 'recap')),
  day date not null,
  created_at timestamptz not null default now(),
  unique (user_id, kind, day)
);

alter table public.push_subscriptions enable row level security;
alter table public.notification_log enable row level security;
drop policy if exists "own push subscriptions" on public.push_subscriptions;
create policy "own push subscriptions" on public.push_subscriptions for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "own notification log" on public.notification_log;
create policy "own notification log" on public.notification_log for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Scheduler: every 15 minutes, ask the app whether a notification is due.
-- Replace <CRON_SECRET> with the same value as the CRON_SECRET env var in Vercel (never commit it).
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule('srishti-notify') where exists (select 1 from cron.job where jobname = 'srishti-notify');
select cron.schedule('srishti-notify', '*/15 * * * *', $$
  select net.http_post(
    url := 'https://projectamazon-phi.vercel.app/api/cron/notify',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', '<CRON_SECRET>'),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
$$);
