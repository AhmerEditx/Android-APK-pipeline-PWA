-- IronTrack: Per-user copy of plan exercises.
-- Allows members to add/remove/reorder exercises within their started plan
-- without altering the shared template data.
-- Run in Supabase SQL editor AFTER 0005_protect_profile_privileges.sql.

create table if not exists public.user_plan_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  user_plan_id uuid not null references public.user_plans (id) on delete cascade,
  plan_day_id uuid not null references public.plan_days (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  position integer not null default 0,
  prescribed_sets integer not null default 3,
  prescribed_reps text,
  target_weight text,
  constraint user_plan_exercises_day_exercise_uq unique (user_plan_id, plan_day_id, exercise_id)
);

alter table public.user_plan_exercises enable row level security;

create policy "User plan exercises are viewable by owner"
  on public.user_plan_exercises for select
  using (auth.uid() = user_id);

create policy "User plan exercises can be created by owner"
  on public.user_plan_exercises for insert
  with check (auth.uid() = user_id);

create policy "User plan exercises can be updated by owner"
  on public.user_plan_exercises for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "User plan exercises can be deleted by owner"
  on public.user_plan_exercises for delete
  using (auth.uid() = user_id);

create index if not exists user_plan_exercises_plan_idx
  on public.user_plan_exercises (user_plan_id, plan_day_id);
