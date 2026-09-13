-- =============================
-- IronTrack · Gym Tracker schema
-- Run this once in the Supabase SQL editor.
-- =============================

create extension if not exists "pgcrypto";

-- ---------- Tables ----------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  height_cm numeric(5,1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  muscle_group text not null,
  equipment text,
  primary_muscle text,
  instructions text,
  constraint exercises_name_group_uq unique (name, muscle_group)
);

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  position integer not null default 0
);

create table if not exists public.sets (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references public.workout_exercises (id) on delete cascade,
  set_number integer not null,
  weight_kg numeric(6,2),
  reps integer,
  is_warmup boolean not null default false
);

create table if not exists public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  measured_on date not null default current_date,
  weight_kg numeric(5,2) not null,
  body_fat_pct numeric(4,1),
  constraint body_measurements_user_day_uq unique (user_id, measured_on)
);

-- ---------- Indexes ----------

create index if not exists workouts_user_date_idx on public.workouts (user_id, date desc);
create index if not exists workout_exercises_workout_idx on public.workout_exercises (workout_id);
create index if not exists sets_workout_exercise_idx on public.sets (workout_exercise_id);
create index if not exists body_measurements_user_idx on public.body_measurements (user_id, measured_on);

-- ---------- Row Level Security ----------

alter table public.profiles enable row level security;
alter table public.exercises enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.sets enable row level security;
alter table public.body_measurements enable row level security;

-- Profiles -------------------------------------------------------------
create policy "Profiles are viewable by owner"
  on public.profiles for select using (auth.uid() = id);
create policy "Profiles can be created by owner"
  on public.profiles for insert with check (auth.uid() = id);
create policy "Profiles can be updated by owner"
  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Exercises (shared catalog, read-only for authenticated users) ---------
create policy "Exercises are viewable by all authenticated users"
  on public.exercises for select using (auth.role() = 'authenticated');

-- Workouts ----------------------------------------------------------------
create policy "Workouts are viewable by owner"
  on public.workouts for select using (auth.uid() = user_id);
create policy "Workouts can be created by owner"
  on public.workouts for insert with check (auth.uid() = user_id);
create policy "Workouts can be updated by owner"
  on public.workouts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Workouts can be deleted by owner"
  on public.workouts for delete using (auth.uid() = user_id);

-- Workout exercises --------------------------------------------------------
create policy "Workout exercises are viewable by owner"
  on public.workout_exercises for select
  using (exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid()));
create policy "Workout exercises can be created by owner"
  on public.workout_exercises for insert
  with check (exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid()));
create policy "Workout exercises can be updated by owner"
  on public.workout_exercises for update
  using (exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid()))
  with check (exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid()));
create policy "Workout exercises can be deleted by owner"
  on public.workout_exercises for delete
  using (exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid()));

-- Sets -----------------------------------------------------------------------
create policy "Sets are viewable by owner"
  on public.sets for select
  using (exists (
    select 1 from public.workout_exercises we
    join public.workouts w on w.id = we.workout_id
    where we.id = workout_exercise_id and w.user_id = auth.uid()
  ));
create policy "Sets can be created by owner"
  on public.sets for insert
  with check (exists (
    select 1 from public.workout_exercises we
    join public.workouts w on w.id = we.workout_id
    where we.id = workout_exercise_id and w.user_id = auth.uid()
  ));
create policy "Sets can be updated by owner"
  on public.sets for update
  using (exists (
    select 1 from public.workout_exercises we
    join public.workouts w on w.id = we.workout_id
    where we.id = workout_exercise_id and w.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.workout_exercises we
    join public.workouts w on w.id = we.workout_id
    where we.id = workout_exercise_id and w.user_id = auth.uid()
  ));
create policy "Sets can be deleted by owner"
  on public.sets for delete
  using (exists (
    select 1 from public.workout_exercises we
    join public.workouts w on w.id = we.workout_id
    where we.id = workout_exercise_id and w.user_id = auth.uid()
  ));

-- Body measurements -----------------------------------------------------------
create policy "Body measurements are viewable by owner"
  on public.body_measurements for select using (auth.uid() = user_id);
create policy "Body measurements can be created by owner"
  on public.body_measurements for insert with check (auth.uid() = user_id);
create policy "Body measurements can be updated by owner"
  on public.body_measurements for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Body measurements can be deleted by owner"
  on public.body_measurements for delete using (auth.uid() = user_id);

-- ---------- Triggers ----------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------- Seed exercise catalog ----------

insert into public.exercises (name, muscle_group, equipment, primary_muscle) values
  -- Push · Chest
  ('Barbell Bench Press', 'Chest', 'Barbell', 'Chest'),
  ('Incline Barbell Bench Press', 'Chest', 'Barbell', 'Upper chest'),
  ('Decline Barbell Bench Press', 'Chest', 'Barbell', 'Lower chest'),
  ('Dumbbell Bench Press', 'Chest', 'Dumbbells', 'Chest'),
  ('Incline Dumbbell Press', 'Chest', 'Dumbbells', 'Upper chest'),
  ('Dumbbell Fly', 'Chest', 'Dumbbells', 'Chest'),
  ('Cable Crossover', 'Chest', 'Cable', 'Chest'),
  ('Push-Up', 'Chest', 'Bodyweight', 'Chest'),
  ('Weighted Dip', 'Chest', 'Bodyweight', 'Lower chest'),
  ('Machine Chest Press', 'Chest', 'Machine', 'Chest'),
  -- Push · Shoulders
  ('Standing Overhead Press', 'Shoulders', 'Barbell', 'Shoulders'),
  ('Seated Dumbbell Shoulder Press', 'Shoulders', 'Dumbbells', 'Shoulders'),
  ('Machine Shoulder Press', 'Shoulders', 'Machine', 'Shoulders'),
  ('Arnold Press', 'Shoulders', 'Dumbbells', 'Shoulders'),
  ('Lateral Raise', 'Shoulders', 'Dumbbells', 'Side delts'),
  ('Cable Lateral Raise', 'Shoulders', 'Cable', 'Side delts'),
  ('Front Raise', 'Shoulders', 'Dumbbells', 'Front delts'),
  ('Reverse Fly', 'Shoulders', 'Dumbbells', 'Rear delts'),
  ('Face Pull', 'Shoulders', 'Cable', 'Rear delts'),
  -- Push · Triceps
  ('Close-Grip Bench Press', 'Triceps', 'Barbell', 'Triceps'),
  ('Skull Crusher', 'Triceps', 'EZ Bar', 'Triceps'),
  ('Triceps Pushdown', 'Triceps', 'Cable', 'Triceps'),
  ('Overhead Triceps Extension', 'Triceps', 'Cable', 'Triceps'),
  ('Triceps Kickback', 'Triceps', 'Dumbbells', 'Triceps'),
  ('Bench Dip', 'Triceps', 'Bodyweight', 'Triceps'),
  -- Pull · Back
  ('Pull-Up', 'Back', 'Bodyweight', 'Lats'),
  ('Chin-Up', 'Back', 'Bodyweight', 'Lats'),
  ('Lat Pulldown', 'Back', 'Cable', 'Lats'),
  ('Barbell Row', 'Back', 'Barbell', 'Mid back'),
  ('Pendlay Row', 'Back', 'Barbell', 'Mid back'),
  ('Single-Arm Dumbbell Row', 'Back', 'Dumbbells', 'Lats'),
  ('Seated Cable Row', 'Back', 'Cable', 'Mid back'),
  ('T-Bar Row', 'Back', 'Machine', 'Mid back'),
  ('Straight-Arm Pulldown', 'Back', 'Cable', 'Lats'),
  ('Deadlift', 'Back', 'Barbell', 'Posterior chain'),
  ('Behind-the-Neck Pulldown', 'Back', 'Cable', 'Lats'),
  -- Pull · Biceps
  ('Barbell Curl', 'Biceps', 'Barbell', 'Biceps'),
  ('EZ Bar Curl', 'Biceps', 'EZ Bar', 'Biceps'),
  ('Dumbbell Curl', 'Biceps', 'Dumbbells', 'Biceps'),
  ('Hammer Curl', 'Biceps', 'Dumbbells', 'Brachialis'),
  ('Preacher Curl', 'Biceps', 'EZ Bar', 'Biceps'),
  ('Incline Dumbbell Curl', 'Biceps', 'Dumbbells', 'Biceps'),
  ('Cable Curl', 'Biceps', 'Cable', 'Biceps'),
  ('Concentration Curl', 'Biceps', 'Dumbbells', 'Biceps'),
  -- Pull · Forearms
  ('Wrist Curl', 'Forearms', 'Barbell', 'Forearms'),
  ('Reverse Wrist Curl', 'Forearms', 'Barbell', 'Forearms'),
  ('Farmers Carry', 'Forearms', 'Dumbbells', 'Grip'),
  -- Legs · Quads
  ('Back Squat', 'Quads', 'Barbell', 'Quads'),
  ('Front Squat', 'Quads', 'Barbell', 'Quads'),
  ('Leg Press', 'Quads', 'Machine', 'Quads'),
  ('Leg Extension', 'Quads', 'Machine', 'Quads'),
  ('Hack Squat', 'Quads', 'Machine', 'Quads'),
  ('Goblet Squat', 'Quads', 'Dumbbells', 'Quads'),
  ('Bulgarian Split Squat', 'Quads', 'Dumbbells', 'Quads'),
  ('Walking Lunge', 'Quads', 'Dumbbells', 'Quads'),
  -- Legs · Hamstrings / Glutes
  ('Romanian Deadlift', 'Hamstrings', 'Barbell', 'Hamstrings'),
  ('Stiff-Leg Deadlift', 'Hamstrings', 'Barbell', 'Hamstrings'),
  ('Leg Curl', 'Hamstrings', 'Machine', 'Hamstrings'),
  ('Hip Thrust', 'Glutes', 'Barbell', 'Glutes'),
  ('Glute Bridge', 'Glutes', 'Barbell', 'Glutes'),
  ('Cable Kickback', 'Glutes', 'Cable', 'Glutes'),
  -- Legs · Calves
  ('Standing Calf Raise', 'Calves', 'Machine', 'Calves'),
  ('Seated Calf Raise', 'Calves', 'Machine', 'Calves'),
  ('Leg Press Calf Raise', 'Calves', 'Machine', 'Calves'),
  -- Core / Abs
  ('Plank', 'Abs', 'Bodyweight', 'Core'),
  ('Cable Crunch', 'Abs', 'Cable', 'Upper abs'),
  ('Hanging Leg Raise', 'Abs', 'Bodyweight', 'Lower abs'),
  ('Lying Leg Raise', 'Abs', 'Bodyweight', 'Lower abs'),
  ('Crunch', 'Abs', 'Bodyweight', 'Upper abs'),
  ('Russian Twist', 'Abs', 'Bodyweight', 'Obliques'),
  ('Ab Wheel Rollout', 'Abs', 'Bodyweight', 'Core'),
  ('Dead Bug', 'Abs', 'Bodyweight', 'Core'),
  ('Side Plank', 'Abs', 'Bodyweight', 'Obliques'),
  ('V-Up', 'Abs', 'Bodyweight', 'Upper abs')
on conflict (name, muscle_group) do nothing;