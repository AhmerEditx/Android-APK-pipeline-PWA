-- IronTrack: bug reports and suggestions from users.
-- Users create/read their own rows; admins can see everything and change status.

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('bug', 'suggestion')),
  message text not null check (char_length(message) between 1 and 4000),
  status text not null default 'new' check (status in ('new', 'resolved')),
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

create index if not exists feedback_created_at_idx
  on public.feedback (created_at desc);

create policy "Users can create feedback" on public.feedback
  for insert with check (auth.uid() = user_id);

create policy "Users can view their own feedback" on public.feedback
  for select using (auth.uid() = user_id);

drop policy if exists "Admins can view feedback" on public.feedback;
create policy "Admins can view feedback" on public.feedback
  for select using (public.is_admin());

drop policy if exists "Admins can update feedback" on public.feedback;
create policy "Admins can update feedback" on public.feedback
  for update using (public.is_admin()) with check (public.is_admin());