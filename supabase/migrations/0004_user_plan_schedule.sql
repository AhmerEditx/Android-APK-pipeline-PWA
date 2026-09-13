-- Custom per-member schedule: ordered cycle slots (plan day / rest / named custom day).
alter table public.user_plans
  add column if not exists schedule jsonb;

alter table public.user_plans
  alter column schedule set default '[]'::jsonb;