-- IronTrack: Members can build their own custom plans.
-- Adds plan ownership and scopes plan/day/exercise visibility and editing
-- so a custom plan is only visible to its owner (templates stay public).

alter table public.plans add column if not exists owner_id uuid references auth.users (id) on delete cascade;
create index if not exists plans_owner_idx on public.plans (owner_id);

-- Plans: keep public templates visible to everyone; custom plans only to their owner.
drop policy if exists "Plans are viewable by authenticated users" on public.plans;
create policy "Plans are viewable by authenticated users"
  on public.plans for select
  using (is_public = true or owner_id = auth.uid());

drop policy if exists "Users can create custom plans" on public.plans;
create policy "Users can create custom plans"
  on public.plans for insert
  with check (auth.uid() = owner_id);

drop policy if exists "Custom plans can be updated by owner" on public.plans;
create policy "Custom plans can be updated by owner"
  on public.plans for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "Custom plans can be deleted by owner" on public.plans;
create policy "Custom plans can be deleted by owner"
  on public.plans for delete
  using (owner_id = auth.uid());

-- Plan days: public templates readable by all + tenants; owners manage their own.
drop policy if exists "Plan days are viewable by authenticated users" on public.plan_days;
create policy "Plan days are viewable by authenticated users"
  on public.plan_days for select
  using (
    exists (
      select 1 from public.plans p
      where p.id = plan_id and (p.is_public = true or p.owner_id = auth.uid())
    )
  );

drop policy if exists "Plan days can be managed by plan owner" on public.plan_days;
create policy "Plan days can be managed by plan owner"
  on public.plan_days for all
  using (
    exists (select 1 from public.plans p where p.id = plan_id and p.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.plans p where p.id = plan_id and p.owner_id = auth.uid())
  );

-- Plan day exercises: same scope as plan days.
drop policy if exists "Plan day exercises are viewable by authenticated users" on public.plan_day_exercises;
create policy "Plan day exercises are viewable by authenticated users"
  on public.plan_day_exercises for select
  using (
    exists (
      select 1 from public.plan_days d
      join public.plans p on p.id = d.plan_id
      where d.id = plan_day_id and (p.is_public = true or p.owner_id = auth.uid())
    )
  );

drop policy if exists "Plan day exercises can be managed by plan owner" on public.plan_day_exercises;
create policy "Plan day exercises can be managed by plan owner"
  on public.plan_day_exercises for all
  using (
    exists (
      select 1 from public.plan_days d
      join public.plans p on p.id = d.plan_id
      where d.id = plan_day_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.plan_days d
      join public.plans p on p.id = d.plan_id
      where d.id = plan_day_id and p.owner_id = auth.uid()
    )
  );