-- Unified per-user search history for every monitoring source.
create table if not exists public.monitoring_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('tiktok','instagram','facebook','youtube','threads','twitter','news','tv','radio')),
  action text not null check (action in ('search_post','search_profile')),
  params_json jsonb not null default '{}'::jsonb,
  response_json jsonb not null,
  http_status integer not null check (http_status between 100 and 599),
  credits_used numeric,
  result_count integer not null default 0 check (result_count >= 0),
  created_at timestamptz not null default now()
);
alter table public.monitoring_searches enable row level security;
create index if not exists monitoring_searches_user_created_idx on public.monitoring_searches (user_id, created_at desc);
create index if not exists monitoring_searches_platform_created_idx on public.monitoring_searches (user_id, platform, created_at desc);
drop policy if exists "Users can read their own monitoring searches" on public.monitoring_searches;
create policy "Users can read their own monitoring searches" on public.monitoring_searches for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can save their own monitoring searches" on public.monitoring_searches;
create policy "Users can save their own monitoring searches" on public.monitoring_searches for insert to authenticated with check ((select auth.uid()) = user_id);
revoke all on table public.monitoring_searches from anon, authenticated;
grant select, insert on table public.monitoring_searches to authenticated;
revoke all on table public.instagram_searches from anon, authenticated;
grant select, insert on table public.instagram_searches to authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
