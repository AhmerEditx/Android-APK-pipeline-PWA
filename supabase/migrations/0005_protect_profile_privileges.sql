-- Protect privileged profile fields from self-escalation.
-- RLS lets owners update their own profile row, which would otherwise allow
-- any member to set is_admin = true on themselves. This trigger blocks any
-- change to is_admin / email unless the actor is a real admin.
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin
     or new.email is distinct from old.email then
    if not public.is_admin() then
      raise exception 'Only admins can change admin or email fields';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_privileges on public.profiles;
create trigger protect_profile_privileges
  before update on public.profiles
  for each row
  execute function public.protect_profile_privileges();