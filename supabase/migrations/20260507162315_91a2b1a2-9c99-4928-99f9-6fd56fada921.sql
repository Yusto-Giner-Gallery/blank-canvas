create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  gid uuid;
  user_role public.app_role;
begin
  select id into gid from public.galleries limit 1;
  if gid is null then
    insert into public.galleries (name) values ('YGManager') returning id into gid;
    insert into public.locations (gallery_id, name) values (gid, 'Main');
    user_role := 'admin';
  else
    user_role := 'staff';
  end if;

  insert into public.profiles (id, gallery_id, email, full_name, role)
  values (
    new.id,
    gid,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    user_role
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();