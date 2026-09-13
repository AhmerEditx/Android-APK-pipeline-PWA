-- =============================
-- IronTrack · Admin insights
-- Lets the owner view each user's active plan and workout stats in the admin panel.
-- Run AFTER 0002_plans_messages.sql.
-- =============================

-- Admins can read every user's active plan (inserts stay owner-only)
drop policy if exists "User plans are viewable by admins" on public.user_plans;
create policy "User plans are viewable by admins"
  on public.user_plans for select
  using (public.is_admin());

-- Admins can read workout list/meta for all users (writes stay owner-only)
drop policy if exists "Workouts are viewable by admins" on public.workouts;
create policy "Workouts are viewable by admins"
  on public.workouts for select
  using (public.is_admin());