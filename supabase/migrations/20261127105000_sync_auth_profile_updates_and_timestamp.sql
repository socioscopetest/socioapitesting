-- Keep profile email synchronized with Supabase Auth and maintain updated_at.
create or replace function private.sync_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
        updated_at = now();
  return new;
end;
$$;

revoke all on function private.sync_auth_user_profile() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_profile on auth.users;
drop trigger if exists on_auth_user_profile_changed on auth.users;

create trigger on_auth_user_profile_changed
  after insert or update of email, raw_user_meta_data on auth.users
  for each row execute function private.sync_auth_user_profile();

create or replace function private.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_profile_updated_at() from public, anon, authenticated;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function private.set_profile_updated_at();
