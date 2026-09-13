-- =============================
-- IronTrack · Plans, Today, Messages, Admin
-- Run this in the Supabase SQL editor AFTER 0001_init.sql.
-- =============================

-- ---------- Profiles: email + admin flag ----------

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists is_admin boolean not null default false;

-- Admin helper (security definer so policies can't recurse)
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_admin);
$$;

-- ---------- Plans ----------

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  days_count integer not null check (days_count between 1 and 7),
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  constraint plans_name_uq unique (name)
);

create table if not exists public.plan_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  name text not null,
  position integer not null default 0,
  constraint plan_days_plan_position_uq unique (plan_id, position)
);

create table if not exists public.plan_day_exercises (
  id uuid primary key default gen_random_uuid(),
  plan_day_id uuid not null references public.plan_days (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  position integer not null default 0,
  prescribed_sets integer not null default 3,
  prescribed_reps text,
  target_weight text,
  constraint plan_day_exercises_day_exercise_uq unique (plan_day_id, exercise_id)
);

create table if not exists public.user_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plan_id uuid not null references public.plans (id) on delete cascade,
  starts_on date not null default current_date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Messages ----------

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users (id) on delete cascade,
  subject text not null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

-- ---------- workouts: link to plan day ----------

alter table public.workouts add column if not exists plan_day_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.contype = 'f'
      and c.conrelid = 'public.workouts'::regclass
      and a.attname = 'plan_day_id'
  ) then
    alter table public.workouts
      add constraint workouts_plan_day_fkey
      foreign key (plan_day_id) references public.plan_days (id) on delete set null;
  end if;
end $$;

create index if not exists workouts_plan_day_idx on public.workouts (user_id, plan_day_id, date);

-- ---------- RLS ----------

alter table public.plans enable row level security;
alter table public.plan_days enable row level security;
alter table public.plan_day_exercises enable row level security;
alter table public.user_plans enable row level security;
alter table public.messages enable row level security;

-- Admin can view all profiles
drop policy if exists "Profiles are viewable by admins" on public.profiles;
create policy "Profiles are viewable by admins"
  on public.profiles for select
  using (public.is_admin());

-- Admin can manage profile details (e.g. promote/demote other users)
drop policy if exists "Profiles can be updated by admins" on public.profiles;
create policy "Profiles can be updated by admins"
  on public.profiles for update
  using (public.is_admin()) with check (public.is_admin());

-- Plans: read for everyone, manage for admin
drop policy if exists "Plans are viewable by authenticated users" on public.plans;
create policy "Plans are viewable by authenticated users"
  on public.plans for select using (auth.role() = 'authenticated');
drop policy if exists "Plans can be created by admins" on public.plans;
create policy "Plans can be created by admins"
  on public.plans for insert with check (public.is_admin());
drop policy if exists "Plans can be updated by admins" on public.plans;
create policy "Plans can be updated by admins"
  on public.plans for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Plans can be deleted by admins" on public.plans;
create policy "Plans can be deleted by admins"
  on public.plans for delete using (public.is_admin());

drop policy if exists "Plan days are viewable by authenticated users" on public.plan_days;
create policy "Plan days are viewable by authenticated users"
  on public.plan_days for select using (auth.role() = 'authenticated');
drop policy if exists "Plan days can be managed by admins" on public.plan_days;
create policy "Plan days can be managed by admins"
  on public.plan_days for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Plan day exercises are viewable by authenticated users" on public.plan_day_exercises;
create policy "Plan day exercises are viewable by authenticated users"
  on public.plan_day_exercises for select using (auth.role() = 'authenticated');
drop policy if exists "Plan day exercises can be managed by admins" on public.plan_day_exercises;
create policy "Plan day exercises can be managed by admins"
  on public.plan_day_exercises for all using (public.is_admin()) with check (public.is_admin());

-- User plans: owner only
drop policy if exists "User plans are viewable by owner" on public.user_plans;
create policy "User plans are viewable by owner"
  on public.user_plans for select using (auth.uid() = user_id);
drop policy if exists "User plans can be created by owner" on public.user_plans;
create policy "User plans can be created by owner"
  on public.user_plans for insert with check (auth.uid() = user_id);
drop policy if exists "User plans can be updated by owner" on public.user_plans;
create policy "User plans can be updated by owner"
  on public.user_plans for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "User plans can be deleted by owner" on public.user_plans;
create policy "User plans can be deleted by owner"
  on public.user_plans for delete using (auth.uid() = user_id);

-- Messages: recipient reads/updates own, admins read + send
drop policy if exists "Messages are viewable by recipient" on public.messages;
create policy "Messages are viewable by recipient"
  on public.messages for select using (auth.uid() = recipient_id);
drop policy if exists "Messages can be marked read by recipient" on public.messages;
create policy "Messages can be marked read by recipient"
  on public.messages for update using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);
drop policy if exists "Messages are viewable by admins" on public.messages;
create policy "Messages are viewable by admins"
  on public.messages for select using (public.is_admin());
drop policy if exists "Messages can be sent by admins" on public.messages;
create policy "Messages can be sent by admins"
  on public.messages for insert with check (public.is_admin());

-- ---------- Trigger: new users get email + first user is admin ----------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, is_admin)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.email,
    not exists (select 1 from public.profiles)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.backfill_profile_emails()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles p
    set email = u.email
  from auth.users u
  where u.id = p.id and (p.email is null or p.email = '');

  update public.profiles p
    set is_admin = true
  where p.id = (select id from public.profiles order by created_at asc, id limit 1);
end;
$$;

select public.backfill_profile_emails();

-- ---------- Seed plans ----------

insert into public.plans (name, description, days_count) values
  ('3-Day Push / Pull / Legs',
   'Classic 3-day split. Train each muscle group once per week with a focus on compounds.',
   3),
  ('4-Day Upper / Lower',
   'Upper/lower split repeated twice per week for balanced strength and size.',
   4),
  ('5-Day Push / Pull / Legs / Upper / Lower',
   'PPL for three days plus dedicated upper and lower sessions to hammer weak points.',
   5),
  ('6-Day Push / Pull / Legs / Abs / Upper / Lower',
   'Push, Pull, Legs, Abs, Upper, Lower. Six focused sessions — train hard, rest on Sunday.',
   6),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery',
   'Six training days plus a light active-recovery session to close out the week.',
   7)
on conflict (name) do nothing;

insert into public.plan_days (plan_id, name, position)
select p.id, v.name, v.position
from (values
  ('3-Day Push / Pull / Legs', 'Push', 1),
  ('3-Day Push / Pull / Legs', 'Pull', 2),
  ('3-Day Push / Pull / Legs', 'Legs', 3),

  ('4-Day Upper / Lower', 'Upper Power', 1),
  ('4-Day Upper / Lower', 'Lower Power', 2),
  ('4-Day Upper / Lower', 'Upper Hypertrophy', 3),
  ('4-Day Upper / Lower', 'Lower Hypertrophy', 4),

  ('5-Day Push / Pull / Legs / Upper / Lower', 'Push', 1),
  ('5-Day Push / Pull / Legs / Upper / Lower', 'Pull', 2),
  ('5-Day Push / Pull / Legs / Upper / Lower', 'Legs', 3),
  ('5-Day Push / Pull / Legs / Upper / Lower', 'Upper', 4),
  ('5-Day Push / Pull / Legs / Upper / Lower', 'Lower', 5),

  ('6-Day Push / Pull / Legs / Abs / Upper / Lower', 'Push', 1),
  ('6-Day Push / Pull / Legs / Abs / Upper / Lower', 'Pull', 2),
  ('6-Day Push / Pull / Legs / Abs / Upper / Lower', 'Legs', 3),
  ('6-Day Push / Pull / Legs / Abs / Upper / Lower', 'Abs', 4),
  ('6-Day Push / Pull / Legs / Abs / Upper / Lower', 'Upper', 5),
  ('6-Day Push / Pull / Legs / Abs / Upper / Lower', 'Lower', 6),

  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 'Push', 1),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 'Pull', 2),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 'Legs', 3),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 'Abs', 4),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 'Upper', 5),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 'Lower', 6),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 'Active Recovery', 7)
) as v(plan_name, name, position)
join public.plans p on p.name = v.plan_name
on conflict (plan_id, position) do nothing;

insert into public.plan_day_exercises
  (plan_day_id, exercise_id, position, prescribed_sets, prescribed_reps)
select pd.id, e.id, v.position, v.sets, v.reps
from (values
  -- 3-Day Push ------------------------------------------------------------
  ('3-Day Push / Pull / Legs', 1, 'Barbell Bench Press', 1, 4, '6-8'),
  ('3-Day Push / Pull / Legs', 1, 'Incline Dumbbell Press', 2, 3, '8-10'),
  ('3-Day Push / Pull / Legs', 1, 'Standing Overhead Press', 3, 3, '8-10'),
  ('3-Day Push / Pull / Legs', 1, 'Lateral Raise', 4, 3, '12-15'),
  ('3-Day Push / Pull / Legs', 1, 'Triceps Pushdown', 5, 3, '10-12'),
  ('3-Day Push / Pull / Legs', 1, 'Skull Crusher', 6, 3, '10-12'),
  -- 3-Day Pull
  ('3-Day Push / Pull / Legs', 2, 'Deadlift', 1, 3, '5'),
  ('3-Day Push / Pull / Legs', 2, 'Pull-Up', 2, 4, '6-10'),
  ('3-Day Push / Pull / Legs', 2, 'Barbell Row', 3, 4, '8-10'),
  ('3-Day Push / Pull / Legs', 2, 'Seated Cable Row', 4, 3, '10-12'),
  ('3-Day Push / Pull / Legs', 2, 'Barbell Curl', 5, 3, '8-10'),
  ('3-Day Push / Pull / Legs', 2, 'Hammer Curl', 6, 3, '10-12'),
  -- 3-Day Legs
  ('3-Day Push / Pull / Legs', 3, 'Back Squat', 1, 4, '6-8'),
  ('3-Day Push / Pull / Legs', 3, 'Leg Press', 2, 3, '10-12'),
  ('3-Day Push / Pull / Legs', 3, 'Romanian Deadlift', 3, 3, '8-10'),
  ('3-Day Push / Pull / Legs', 3, 'Leg Curl', 4, 3, '10-12'),
  ('3-Day Push / Pull / Legs', 3, 'Standing Calf Raise', 5, 4, '12-15'),
  ('3-Day Push / Pull / Legs', 3, 'Hanging Leg Raise', 6, 3, '12-15'),

  -- 4-Day Upper Power ------------------------------------------------------
  ('4-Day Upper / Lower', 1, 'Barbell Bench Press', 1, 4, '6-8'),
  ('4-Day Upper / Lower', 1, 'Barbell Row', 2, 4, '8-10'),
  ('4-Day Upper / Lower', 1, 'Incline Dumbbell Press', 3, 3, '8-10'),
  ('4-Day Upper / Lower', 1, 'Lat Pulldown', 4, 3, '10-12'),
  ('4-Day Upper / Lower', 1, 'Lateral Raise', 5, 3, '12-15'),
  ('4-Day Upper / Lower', 1, 'Barbell Curl', 6, 3, '8-10'),
  ('4-Day Upper / Lower', 1, 'Triceps Pushdown', 7, 3, '10-12'),
  -- 4-Day Lower Power
  ('4-Day Upper / Lower', 2, 'Back Squat', 1, 4, '6-8'),
  ('4-Day Upper / Lower', 2, 'Romanian Deadlift', 2, 3, '8-10'),
  ('4-Day Upper / Lower', 2, 'Leg Press', 3, 3, '10-12'),
  ('4-Day Upper / Lower', 2, 'Standing Calf Raise', 4, 4, '12-15'),
  ('4-Day Upper / Lower', 2, 'Plank', 5, 3, '60s'),
  -- 4-Day Upper Hypertrophy
  ('4-Day Upper / Lower', 3, 'Standing Overhead Press', 1, 4, '6-8'),
  ('4-Day Upper / Lower', 3, 'Pull-Up', 2, 4, '6-10'),
  ('4-Day Upper / Lower', 3, 'Seated Cable Row', 3, 3, '10-12'),
  ('4-Day Upper / Lower', 3, 'Dumbbell Bench Press', 4, 3, '8-10'),
  ('4-Day Upper / Lower', 3, 'Face Pull', 5, 3, '12-15'),
  ('4-Day Upper / Lower', 3, 'Hammer Curl', 6, 3, '10-12'),
  ('4-Day Upper / Lower', 3, 'Skull Crusher', 7, 3, '10-12'),
  -- 4-Day Lower Hypertrophy
  ('4-Day Upper / Lower', 4, 'Front Squat', 1, 4, '6-8'),
  ('4-Day Upper / Lower', 4, 'Hip Thrust', 2, 3, '8-10'),
  ('4-Day Upper / Lower', 4, 'Leg Extension', 3, 3, '12-15'),
  ('4-Day Upper / Lower', 4, 'Leg Curl', 4, 3, '12-15'),
  ('4-Day Upper / Lower', 4, 'Seated Calf Raise', 5, 4, '12-15'),
  ('4-Day Upper / Lower', 4, 'Russian Twist', 6, 3, '20'),

  -- 5-Day Push ------------------------------------------------------------
  ('5-Day Push / Pull / Legs / Upper / Lower', 1, 'Barbell Bench Press', 1, 4, '6-8'),
  ('5-Day Push / Pull / Legs / Upper / Lower', 1, 'Incline Dumbbell Press', 2, 3, '8-10'),
  ('5-Day Push / Pull / Legs / Upper / Lower', 1, 'Standing Overhead Press', 3, 3, '8-10'),
  ('5-Day Push / Pull / Legs / Upper / Lower', 1, 'Lateral Raise', 4, 3, '12-15'),
  ('5-Day Push / Pull / Legs / Upper / Lower', 1, 'Triceps Pushdown', 5, 3, '10-12'),
  ('5-Day Push / Pull / Legs / Upper / Lower', 1, 'Skull Crusher', 6, 3, '10-12'),
  -- 5-Day Pull
  ('5-Day Push / Pull / Legs / Upper / Lower', 2, 'Deadlift', 1, 3, '5'),
  ('5-Day Push / Pull / Legs / Upper / Lower', 2, 'Pull-Up', 2, 4, '6-10'),
  ('5-Day Push / Pull / Legs / Upper / Lower', 2, 'Barbell Row', 3, 4, '8-10'),
  ('5-Day Push / Pull / Legs / Upper / Lower', 2, 'Seated Cable Row', 4, 3, '10-12'),
  ('5-Day Push / Pull / Legs / Upper / Lower', 2, 'Barbell Curl', 5, 3, '8-10'),
  ('5-Day Push / Pull / Legs / Upper / Lower', 2, 'Hammer Curl', 6, 3, '10-12'),
  -- 5-Day Legs
  ('5-Day Push / Pull / Legs / Upper / Lower', 3, 'Back Squat', 1, 4, '6-8'),
  ('5-Day Push / Pull / Legs / Upper / Lower', 3, 'Leg Press', 2, 3, '10-12'),
  ('5-Day Push / Pull / Legs / Upper / Lower', 3, 'Romanian Deadlift', 3, 3, '8-10'),
  ('5-Day Push / Pull / Legs / Upper / Lower', 3, 'Leg Curl', 4, 3, '10-12'),
  ('5-Day Push / Pull / Legs / Upper / Lower', 3, 'Standing Calf Raise', 5, 4, '12-15'),
  ('5-Day Push / Pull / Legs / Upper / Lower', 3, 'Hanging Leg Raise', 6, 3, '12-15'),
  -- 5-Day Upper
  ('5-Day Push / Pull / Legs / Upper / Lower', 4, 'Barbell Bench Press', 1, 3, '8-10'),
  ('5-Day Push / Pull / Legs / Upper / Lower', 4, 'Barbell Row', 2, 3, '8-10'),
  ('5-Day Push / Pull / Legs / Upper / Lower', 4, 'Standing Overhead Press', 3, 3, '8-10'),
  ('5-Day Push / Pull / Legs / Upper / Lower', 4, 'Lat Pulldown', 4, 3, '10-12'),
  ('5-Day Push / Pull / Legs / Upper / Lower', 4, 'Lateral Raise', 5, 3, '12-15'),
  ('5-Day Push / Pull / Legs / Upper / Lower', 4, 'Barbell Curl', 6, 3, '8-10'),
  ('5-Day Push / Pull / Legs / Upper / Lower', 4, 'Overhead Triceps Extension', 7, 3, '10-12'),
  -- 5-Day Lower
  ('5-Day Push / Pull / Legs / Upper / Lower', 5, 'Back Squat', 1, 3, '8-10'),
  ('5-Day Push / Pull / Legs / Upper / Lower', 5, 'Romanian Deadlift', 2, 3, '8-10'),
  ('5-Day Push / Pull / Legs / Upper / Lower', 5, 'Leg Extension', 3, 3, '12-15'),
  ('5-Day Push / Pull / Legs / Upper / Lower', 5, 'Leg Curl', 4, 3, '12-15'),
  ('5-Day Push / Pull / Legs / Upper / Lower', 5, 'Standing Calf Raise', 5, 3, '12-15'),
  ('5-Day Push / Pull / Legs / Upper / Lower', 5, 'Plank', 6, 3, '60s'),

  -- 6-Day Push (2 chest, 2 shoulders, 2 triceps) ---------------------------
  ('6-Day Push / Pull / Legs / Abs / Upper / Lower', 1, 'Barbell Bench Press', 1, 4, '6-8'),
  ('6-Day Push / Pull / Legs / Abs / Upper / Lower', 1, 'Incline Dumbbell Press', 2, 3, '8-10'),
  ('6-Day Push / Pull / Legs / Abs / Upper / Lower', 1, 'Standing Overhead Press', 3, 3, '8-10'),
  ('6-Day Push / Pull / Legs / Abs / Upper / Lower', 1, 'Lateral Raise', 4, 3, '12-15'),
  ('6-Day Push / Pull / Legs / Abs / Upper / Lower', 1, 'Triceps Pushdown', 5, 3, '10-12'),
  ('6-Day Push / Pull / Legs / Abs / Upper / Lower', 1, 'Close-Grip Bench Press', 6, 3, '8-10'),
  -- 6-Day Pull
  ('6-Day Push / Pull / Legs / Abs / Upper / Lower', 2, 'Deadlift', 1, 3, '5'),
  ('6-Day Push / Pull / Legs / Abs / Upper / Lower', 2, 'Pull-Up', 2, 4, '6-10'),
  ('6-Day Push / Pull / Legs / Abs / Upper / Lower', 2, 'Barbell Row', 3, 4, '8-10'),
  ('6-Day Push / Pull / Legs / Abs / Upper / Lower', 2, 'Seated Cable Row', 4, 3, '10-12'),
  ('6-Day Push / Pull / Legs / Abs / Upper / Lower', 2, 'Barbell Curl', 5, 3, '8-10'),
  ('6-Day Push / Pull / Legs / Abs / Upper / Lower', 2, 'Hammer Curl', 6, 3, '10-12'),
  -- 6-Day Legs
  ('6-Day Push / Pull / Legs / Abs / Upper / Lower', 3, 'Back Squat', 1, 4, '6-8'),
  ('6-Day Push / Pull / Legs / Abs / Upper / Lower', 3, 'Leg Press', 2, 3, '10-12'),
  ('6-Day Push / Pull / Legs / Abs / Upper / Lower', 3, 'Romanian Deadlift', 3, 3, '8-10'),
  ('6-Day Push / Pull / Legs / Abs / Upper / Lower', 3, 'Leg Curl', 4, 3, '10-12'),
  ('6-Day Push / Pull / Legs / Abs / Upper / Lower', 3, 'Standing Calf Raise', 5, 4, '12-15'),
  ('6-Day Push / Pull / Legs / Abs / Upper / Lower', 3, 'Hanging Leg Raise', 6, 3, '12-15'),
  -- 6-Day Abs
  ('6-Day Push / Pull / Legs / Abs / Upper / Lower', 4, 'Plank', 1, 3, '60s'),
  ('6-Day Push / Pull / Legs / Abs / Upper / Lower', 4, 'Cable Crunch', 2, 3, '12-15'),
  ('6-Day Push / Pull / Legs / Abs / Upper / Lower', 4, 'Hanging Leg Raise', 3, 3, '10-12'),
  ('6-Day Push / Pull / Legs / Abs / Upper / Lower', 4, 'Russian Twist', 4, 3, '20'),
  ('6-Day Push / Pull / Legs / Abs / Upper / Lower', 4, 'Ab Wheel Rollout', 5, 3, '10'),
  ('6-Day Push / Pull / Legs / Abs / Upper / Lower', 4, 'Side Plank', 6, 3, '45s'),
  -- 6-Day Upper
  ('6-Day Push / Pull / Legs / Abs / Upper / Lower', 5, 'Barbell Bench Press', 1, 4, '6-8'),
  ('6-Day Push / Pull / Legs / Abs / Upper / Lower', 5, 'Barbell Row', 2, 4, '8-10'),
  ('6-Day Push / Pull / Legs / Abs / Upper / Lower', 5, 'Standing Overhead Press', 3, 3, '8-10'),
  ('6-Day Push / Pull / Legs / Abs / Upper / Lower', 5, 'Lat Pulldown', 4, 3, '10-12'),
  ('6-Day Push / Pull / Legs / Abs / Upper / Lower', 5, 'Face Pull', 5, 3, '12-15'),
  ('6-Day Push / Pull / Legs / Abs / Upper / Lower', 5, 'Barbell Curl', 6, 3, '8-10'),
  ('6-Day Push / Pull / Legs / Abs / Upper / Lower', 5, 'Triceps Pushdown', 7, 3, '10-12'),
  -- 6-Day Lower
  ('6-Day Push / Pull / Legs / Abs / Upper / Lower', 6, 'Front Squat', 1, 4, '6-8'),
  ('6-Day Push / Pull / Legs / Abs / Upper / Lower', 6, 'Romanian Deadlift', 2, 3, '8-10'),
  ('6-Day Push / Pull / Legs / Abs / Upper / Lower', 6, 'Leg Extension', 3, 3, '12-15'),
  ('6-Day Push / Pull / Legs / Abs / Upper / Lower', 6, 'Leg Curl', 4, 3, '12-15'),
  ('6-Day Push / Pull / Legs / Abs / Upper / Lower', 6, 'Hip Thrust', 5, 3, '8-10'),
  ('6-Day Push / Pull / Legs / Abs / Upper / Lower', 6, 'Standing Calf Raise', 6, 4, '12-15'),

  -- 7-Day: same as 6-day + Active Recovery --------------------------------
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 1, 'Barbell Bench Press', 1, 4, '6-8'),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 1, 'Incline Dumbbell Press', 2, 3, '8-10'),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 1, 'Standing Overhead Press', 3, 3, '8-10'),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 1, 'Lateral Raise', 4, 3, '12-15'),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 1, 'Triceps Pushdown', 5, 3, '10-12'),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 1, 'Skull Crusher', 6, 3, '10-12'),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 2, 'Deadlift', 1, 3, '5'),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 2, 'Pull-Up', 2, 4, '6-10'),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 2, 'Barbell Row', 3, 4, '8-10'),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 2, 'Seated Cable Row', 4, 3, '10-12'),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 2, 'Barbell Curl', 5, 3, '8-10'),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 2, 'Hammer Curl', 6, 3, '10-12'),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 3, 'Back Squat', 1, 4, '6-8'),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 3, 'Leg Press', 2, 3, '10-12'),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 3, 'Romanian Deadlift', 3, 3, '8-10'),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 3, 'Leg Curl', 4, 3, '10-12'),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 3, 'Standing Calf Raise', 5, 4, '12-15'),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 3, 'Hanging Leg Raise', 6, 3, '12-15'),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 4, 'Plank', 1, 3, '60s'),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 4, 'Cable Crunch', 2, 3, '12-15'),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 4, 'Hanging Leg Raise', 3, 3, '10-12'),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 4, 'Russian Twist', 4, 3, '20'),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 4, 'Ab Wheel Rollout', 5, 3, '10'),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 4, 'Side Plank', 6, 3, '45s'),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 5, 'Barbell Bench Press', 1, 4, '6-8'),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 5, 'Barbell Row', 2, 4, '8-10'),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 5, 'Standing Overhead Press', 3, 3, '8-10'),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 5, 'Lat Pulldown', 4, 3, '10-12'),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 5, 'Face Pull', 5, 3, '12-15'),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 5, 'Barbell Curl', 6, 3, '8-10'),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 5, 'Triceps Pushdown', 7, 3, '10-12'),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 6, 'Front Squat', 1, 4, '6-8'),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 6, 'Romanian Deadlift', 2, 3, '8-10'),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 6, 'Leg Extension', 3, 3, '12-15'),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 6, 'Leg Curl', 4, 3, '12-15'),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 6, 'Hip Thrust', 5, 3, '8-10'),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 6, 'Standing Calf Raise', 6, 4, '12-15'),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 7, 'Deadlift', 1, 3, '5'),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 7, 'Push-Up', 2, 3, '15'),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 7, 'Goblet Squat', 3, 3, '12'),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 7, 'Plank', 4, 3, '60s'),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 7, 'Farmers Carry', 5, 3, '40m'),
  ('7-Day Push / Pull / Legs / Abs / Upper / Lower / Recovery', 7, 'Glute Bridge', 6, 3, '15')
) as v(plan_name, day_position, exercise_name, position, sets, reps)
join public.plans p on p.name = v.plan_name
join public.plan_days pd on pd.plan_id = p.id and pd.position = v.day_position
join public.exercises e on e.name = v.exercise_name
on conflict (plan_day_id, exercise_id) do nothing;