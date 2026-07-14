begin;

create table if not exists public.voltflow_schema_migrations (
  version text primary key,
  description text not null,
  applied_at timestamptz not null default now()
);

create table if not exists public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  label text not null,
  status text default 'Pending',
  notes text,
  display_order integer not null default 0,
  created_at timestamptz default now()
);

alter table public.project_milestones
  add column if not exists project_id uuid,
  add column if not exists label text,
  add column if not exists status text default 'Pending',
  add column if not exists notes text,
  add column if not exists display_order integer not null default 0,
  add column if not exists created_at timestamptz default now();

update public.project_milestones
set label = 'Milestone'
where label is null or btrim(label) = '';

alter table public.project_milestones alter column label set not null;

create index if not exists project_milestones_project_idx
on public.project_milestones(project_id, display_order);

create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status text default 'Open',
  priority text default 'Normal',
  due_date date,
  assigned_user_id uuid,
  completed_at timestamptz,
  created_at timestamptz default now()
);

alter table public.project_tasks
  add column if not exists project_id uuid,
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists status text default 'Open',
  add column if not exists priority text default 'Normal',
  add column if not exists due_date date,
  add column if not exists assigned_user_id uuid,
  add column if not exists completed_at timestamptz,
  add column if not exists created_at timestamptz default now();

create index if not exists project_tasks_project_status_idx
on public.project_tasks(project_id, status);

create index if not exists project_tasks_due_idx
on public.project_tasks(due_date)
where status not in ('Completed','Done');

create table if not exists public.project_activity (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  activity_type text default 'General',
  summary text not null,
  details text,
  created_by uuid,
  created_at timestamptz default now()
);

alter table public.project_activity
  add column if not exists project_id uuid,
  add column if not exists activity_type text default 'General',
  add column if not exists summary text,
  add column if not exists details text,
  add column if not exists created_by uuid,
  add column if not exists created_at timestamptz default now();

create index if not exists project_activity_project_created_idx
on public.project_activity(project_id, created_at desc);

create table if not exists public.project_assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  employee_user_id uuid,
  assignment_role text default 'Technician',
  active boolean default true,
  assigned_at timestamptz default now()
);

alter table public.project_assignments
  add column if not exists project_id uuid,
  add column if not exists employee_user_id uuid,
  add column if not exists assignment_role text default 'Technician',
  add column if not exists active boolean default true,
  add column if not exists assigned_at timestamptz default now();

alter table public.project_milestones enable row level security;
alter table public.project_tasks enable row level security;
alter table public.project_activity enable row level security;
alter table public.project_assignments enable row level security;

drop policy if exists "Admins manage project milestones" on public.project_milestones;
create policy "Admins manage project milestones" on public.project_milestones
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins manage project tasks" on public.project_tasks;
create policy "Admins manage project tasks" on public.project_tasks
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins manage project activity" on public.project_activity;
create policy "Admins manage project activity" on public.project_activity
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins manage project assignments" on public.project_assignments;
create policy "Admins manage project assignments" on public.project_assignments
for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.project_milestones to authenticated;
grant select, insert, update, delete on public.project_tasks to authenticated;
grant select, insert, update, delete on public.project_activity to authenticated;
grant select, insert, update, delete on public.project_assignments to authenticated;

insert into public.voltflow_schema_migrations(version, description)
values ('8.7.1','Project Command Center compatibility foundation')
on conflict (version) do nothing;

commit;
