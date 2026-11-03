-- v2: coach-led onboarding, plan history (undo) and coach proposals.

alter table public.profiles
  add column if not exists onboarding jsonb not null default '{}'::jsonb,       -- answers, trials, step (resumable)
  add column if not exists onboarding_completed_at timestamptz;

alter table public.programs
  add column if not exists parent_id uuid references public.programs (id) on delete set null,
  add column if not exists changes jsonb;                                         -- readable diff vs parent

create table if not exists public.coach_proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  program_id uuid references public.programs (id) on delete cascade,
  action text not null,
  params jsonb not null default '{}'::jsonb,
  summary text not null,
  diff jsonb not null default '[]'::jsonb,
  plan jsonb not null,                       -- the proposed plan, applied as-is on accept
  start_date date not null,
  intake jsonb,                              -- set when the change also updates her profile
  status text not null default 'pending' check (status in ('pending', 'applied', 'dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists coach_proposals_user_idx on public.coach_proposals (user_id, created_at desc);
alter table public.coach_proposals enable row level security;
drop policy if exists "own proposals" on public.coach_proposals;
create policy "own proposals" on public.coach_proposals for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
