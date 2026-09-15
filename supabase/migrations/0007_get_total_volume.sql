-- Server-side aggregate for the dashboard "Total volume" stat.
-- Replaces the heavy client query that pulled every nested set row.
-- Sums weight_kg * reps for the calling user only.

create or replace function get_total_volume()
returns bigint
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(sum(s.weight_kg * s.reps), 0)::bigint
  from workouts w
  join workout_exercises we on we.workout_id = w.id
  join sets s on s.workout_exercise_id = we.id
  where w.user_id = auth.uid()
    and s.weight_kg is not null
    and s.reps is not null;
$$;

revoke all on function get_total_volume() from public, anon;
grant execute on function get_total_volume() to authenticated;