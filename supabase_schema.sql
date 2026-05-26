-- ============================================================
-- Infinite Studio AI — Screenwriting Playbook
-- Run ONLY these statements in your Supabase SQL editor.
-- The `users` and `app_subscriptions` tables already exist.
-- ============================================================

-- 1. user_profiles
-- Stores studio-specific flags per user (trial status).
-- One row per auth user. Created on signup by the Studio app.
create table if not exists public.user_profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  email               text,
  created_at          timestamptz not null default now(),
  studio_trial_used   boolean not null default false
);

-- Enable RLS
alter table public.user_profiles enable row level security;

-- Drop any existing policies first (idempotent)
drop policy if exists "Users read own profile" on public.user_profiles;
drop policy if exists "Users update own profile" on public.user_profiles;
drop policy if exists "Users insert own profile" on public.user_profiles;
drop policy if exists "Service role full access on user_profiles" on public.user_profiles;

create policy "Users read own profile"
  on public.user_profiles for select
  using (auth.uid() = id);

create policy "Users insert own profile"
  on public.user_profiles for insert
  with check (auth.uid() = id);

create policy "Users update own profile"
  on public.user_profiles for update
  using (auth.uid() = id);

create policy "Service role full access on user_profiles"
  on public.user_profiles for all
  to service_role
  using (true)
  with check (true);


-- 2. studio_usage
-- Monthly generation counters per user.
-- One row per (user_id, month). month format: '2026-05'
create table if not exists public.studio_usage (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  month                   text not null,
  productions_used        int not null default 0,
  character_grids_used    int not null default 0,
  shot_generations_used   int not null default 0,
  video_promotions_used   int not null default 0,
  unique(user_id, month)
);

alter table public.studio_usage enable row level security;

drop policy if exists "Users read own usage" on public.studio_usage;
drop policy if exists "Users insert own usage" on public.studio_usage;
drop policy if exists "Users update own usage" on public.studio_usage;
drop policy if exists "Service role full access on studio_usage" on public.studio_usage;

create policy "Users read own usage"
  on public.studio_usage for select
  using (auth.uid() = user_id);

create policy "Users insert own usage"
  on public.studio_usage for insert
  with check (auth.uid() = user_id);

create policy "Users update own usage"
  on public.studio_usage for update
  using (auth.uid() = user_id);

create policy "Service role full access on studio_usage"
  on public.studio_usage for all
  to service_role
  using (true)
  with check (true);


-- ============================================================
-- NOTES on the existing schema:
--
-- Subscription lookup uses: public.users WHERE supabase_id = auth.uid()
--   Column: active_subscription_tier (text)
--   Values that map to Pro:   anything containing "inner" / "inner circle"
--   Values that map to Standard: any other non-null/non-empty value
--   Null / empty → no subscription → fall through to trial check
--
-- Fallback: public.app_subscriptions WHERE user_id = auth.uid() AND status = 'active'
--
-- Trial: public.user_profiles WHERE id = auth.uid() AND studio_trial_used = false
--   → granted automatically on Studio signup (1 production, then trial exhausted)
-- ============================================================
