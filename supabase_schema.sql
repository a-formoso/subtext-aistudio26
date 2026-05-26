-- ============================================================
-- Infinite Studio AI — Screenwriting Playbook Database Schema
-- Run these statements in your Supabase SQL editor
-- (Project: infinitestudioai.com)
-- ============================================================

-- 1. user_profiles
-- Stores per-user flags like trial usage. One row per auth.users entry.
create table if not exists public.user_profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  created_at    timestamptz not null default now(),
  studio_trial_used boolean not null default false
);

-- RLS
alter table public.user_profiles enable row level security;
create policy "Users can read own profile"
  on public.user_profiles for select
  using (auth.uid() = id);
create policy "Users can update own profile"
  on public.user_profiles for update
  using (auth.uid() = id);
create policy "Service role full access on user_profiles"
  on public.user_profiles for all
  using (true)
  with check (true);

-- Auto-insert profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.user_profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. studio_usage
-- Monthly usage counters per user. One row per (user_id, month).
create table if not exists public.studio_usage (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  month                   text not null,           -- e.g. '2026-05'
  productions_used        int not null default 0,
  character_grids_used    int not null default 0,
  shot_generations_used   int not null default 0,
  video_promotions_used   int not null default 0,
  unique(user_id, month)
);

alter table public.studio_usage enable row level security;
create policy "Users can read own usage"
  on public.studio_usage for select
  using (auth.uid() = user_id);
create policy "Service role full access on studio_usage"
  on public.studio_usage for all
  using (true)
  with check (true);


-- 3. studio_productions
-- Saved production projects. One row per production.
create table if not exists public.studio_productions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  title            text,
  status           text not null default 'discovery',
  story_data       jsonb,
  blueprint_data   jsonb,
  screenplay_text  text,
  visual_assets    jsonb,
  shot_data        jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.studio_productions enable row level security;
create policy "Users can CRUD own productions"
  on public.studio_productions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Service role full access on studio_productions"
  on public.studio_productions for all
  using (true)
  with check (true);

-- Automatically update updated_at on row change
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_studio_productions_updated_at on public.studio_productions;
create trigger set_studio_productions_updated_at
  before update on public.studio_productions
  for each row execute procedure public.set_updated_at();


-- 4. subscriptions (if not already present from your membership platform)
-- Minimal structure — your membership platform may populate this.
create table if not exists public.subscriptions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  status               text not null default 'active',   -- 'active' | 'cancelled' | 'expired'
  amount               numeric,                           -- monthly dollar amount, used to detect Inner Circle ($297)
  subscription_plan_id uuid,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.subscriptions enable row level security;
create policy "Users can read own subscriptions"
  on public.subscriptions for select
  using (auth.uid() = user_id);
create policy "Service role full access on subscriptions"
  on public.subscriptions for all
  using (true)
  with check (true);


-- 5. subscription_plans (lookup table)
create table if not exists public.subscription_plans (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,    -- e.g. 'The Studio Lot', 'The Inner Circle'
  price      numeric,
  interval   text              -- 'month' | 'quarter' | 'year'
);

alter table public.subscription_plans enable row level security;
create policy "Anyone can read plans"
  on public.subscription_plans for select
  using (true);
