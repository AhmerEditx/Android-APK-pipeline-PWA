-- IronTrack: Let admins edit and delete broadcast messages.
-- Recipients keep read/update-own; admins can now revise or withdraw messages.

drop policy if exists "Messages can be updated by admins" on public.messages;
create policy "Messages can be updated by admins"
  on public.messages for update
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Messages can be deleted by admins" on public.messages;
create policy "Messages can be deleted by admins"
  on public.messages for delete
  using (public.is_admin());