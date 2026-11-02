-- OpenGym Coach schema. Every table is private to its owner via RLS.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.intakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  results jsonb not null,
  analysis jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan jsonb not null,
  status text not null default 'active' check (status in ('active', 'archived')),
  start_date date not null default current_date,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  program_id uuid not null references public.programs (id) on delete cascade,
  session_key text not null,
  status text not null check (status in ('done', 'skipped', 'partial')),
  performed_at timestamptz not null default now(),
  session_rpe int check (session_rpe between 1 and 10),
  notes text,
  entries jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (program_id, session_key)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'model', 'event')),
  content text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists intakes_user_idx on public.intakes (user_id, created_at desc);
create index if not exists assessments_user_idx on public.assessments (user_id, created_at desc);
create index if not exists programs_user_idx on public.programs (user_id, status, created_at desc);
create index if not exists workout_logs_user_idx on public.workout_logs (user_id, performed_at desc);
create index if not exists workout_logs_program_idx on public.workout_logs (program_id);
create index if not exists chat_messages_user_idx on public.chat_messages (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.intakes enable row level security;
alter table public.assessments enable row level security;
alter table public.programs enable row level security;
alter table public.workout_logs enable row level security;
alter table public.chat_messages enable row level security;

create policy "own profile" on public.profiles for all to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "own intakes" on public.intakes for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own assessments" on public.assessments for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own programs" on public.programs for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own logs" on public.workout_logs for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own chat" on public.chat_messages for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Create a profile row on sign-up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
