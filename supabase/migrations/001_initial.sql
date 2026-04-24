-- Interview Forge — initial schema.
-- Run once in Supabase SQL Editor. Safe to re-run: uses IF NOT EXISTS.

-- ============ Profiles ============
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email       text not null,
  role        text not null default 'user' check (role in ('admin', 'user')),
  interests   text[] not null default '{}',
  fresh_start boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_self_insert" on public.profiles;
create policy "profiles_self_insert"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update"
  on public.profiles for update
  using (auth.uid() = id);

-- ============ Questions ============
create table if not exists public.questions (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  question    text not null,
  answer      text not null,
  topic_slug  text not null,
  difficulty  text not null check (difficulty in ('easy', 'medium', 'hard')),
  author_id   uuid references auth.users on delete set null,
  is_public   boolean not null default true,
  tags        text[] not null default '{}',
  source_url  text,
  created_at  timestamptz not null default now()
);

create index if not exists questions_topic_idx on public.questions (topic_slug);
create index if not exists questions_author_idx on public.questions (author_id);
create index if not exists questions_public_idx on public.questions (is_public);

alter table public.questions enable row level security;

-- Anyone signed in can read public questions or their own private ones.
drop policy if exists "questions_read" on public.questions;
create policy "questions_read"
  on public.questions for select
  using (is_public or author_id = auth.uid());

-- Admins can insert/update/delete any. Regular users: only their own rows (the
-- UI currently gates New/Edit to admins, but keep this permissive so users
-- could later own their own private questions without another migration).
drop policy if exists "questions_insert" on public.questions;
create policy "questions_insert"
  on public.questions for insert
  with check (
    auth.uid() = author_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "questions_update" on public.questions;
create policy "questions_update"
  on public.questions for update
  using (
    author_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "questions_delete" on public.questions;
create policy "questions_delete"
  on public.questions for delete
  using (
    author_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
