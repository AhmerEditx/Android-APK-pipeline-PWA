-- IronTrack: Add Pec Dec Fly to the catalog without losing logged data.
-- The member logged Pec Dec Fly under 'Barbell Bench Press'. Rename that row
-- (same id, so workout history and started plans keep pointing at the data,
-- now shown as Pec Dec Fly) and add a fresh 'Barbell Bench Press' entry.

update public.exercises
set name = 'Pec Dec Fly',
    muscle_group = 'Chest',
    equipment = 'Machine',
    primary_muscle = 'Chest'
where name = 'Barbell Bench Press'
  and muscle_group = 'Chest';

insert into public.exercises (name, muscle_group, equipment, primary_muscle)
values ('Barbell Bench Press', 'Chest', 'Barbell', 'Chest')
on conflict (name, muscle_group) do nothing;