-- VoltFlow V8.8 Operations Intelligence
-- Safe, additive migration.

begin;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  project_id uuid references public.projects(id) on delete cascade,
  notification_type text not null default 'General',
  title text not null,
  message text,
  severity text not null default 'Info',
  action_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
on public.notifications(user_id, created_at desc);

create index if not exists notifications_project_created_idx
on public.notifications(project_id, created_at desc);

create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  query_text text not null,
  filters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(user_id, name)
);

create table if not exists public.operations_insight_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  project_id uuid references public.projects(id) on delete cascade,
  insight_key text not null,
  feedback text not null check (feedback in ('Useful','Dismissed','Resolved')),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;
alter table public.saved_searches enable row level security;
alter table public.operations_insight_feedback enable row level security;

drop policy if exists "Admins manage notifications" on public.notifications;
create policy "Admins manage notifications" on public.notifications
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Users manage own saved searches" on public.saved_searches;
create policy "Users manage own saved searches" on public.saved_searches
for all to authenticated using (user_id=auth.uid() or public.is_admin())
with check (user_id=auth.uid() or public.is_admin());

drop policy if exists "Admins manage insight feedback" on public.operations_insight_feedback;
create policy "Admins manage insight feedback" on public.operations_insight_feedback
for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select,insert,update,delete on public.notifications to authenticated;
grant select,insert,update,delete on public.saved_searches to authenticated;
grant select,insert,update,delete on public.operations_insight_feedback to authenticated;

insert into public.voltflow_schema_migrations(version,description)
values ('8.8.0','Operations Intelligence foundation')
on conflict (version) do nothing;

commit;