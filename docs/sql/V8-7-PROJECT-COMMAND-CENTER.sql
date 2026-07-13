-- VoltFlow V8.7 Project Command Center
-- Run after previous VoltFlow migrations.

create table if not exists public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  status text not null default 'Pending',
  target_date date,
  completed_at timestamptz,
  display_order integer not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'Open',
  priority text not null default 'Normal',
  assigned_user_id uuid,
  due_date date,
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_activity (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  event_type text not null default 'Update',
  title text not null,
  description text,
  actor_user_id uuid,
  source_module text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.project_assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null,
  assignment_role text not null default 'Crew',
  active boolean not null default true,
  assigned_at timestamptz not null default now(),
  unique(project_id,user_id)
);

alter table public.project_milestones enable row level security;
alter table public.project_tasks enable row level security;
alter table public.project_activity enable row level security;
alter table public.project_assignments enable row level security;

grant select,insert,update,delete on public.project_milestones to authenticated;
grant select,insert,update,delete on public.project_tasks to authenticated;
grant select,insert,update,delete on public.project_activity to authenticated;
grant select,insert,update,delete on public.project_assignments to authenticated;

-- Admin access
drop policy if exists "Admins manage project milestones" on public.project_milestones;
create policy "Admins manage project milestones" on public.project_milestones for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins manage project tasks" on public.project_tasks;
create policy "Admins manage project tasks" on public.project_tasks for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins manage project activity" on public.project_activity;
create policy "Admins manage project activity" on public.project_activity for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins manage project assignments" on public.project_assignments;
create policy "Admins manage project assignments" on public.project_assignments for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Employee read access for assigned operational information
drop policy if exists "Employees read project milestones" on public.project_milestones;
create policy "Employees read project milestones" on public.project_milestones for select to authenticated using (public.is_employee() or public.is_admin());
drop policy if exists "Employees read project tasks" on public.project_tasks;
create policy "Employees read project tasks" on public.project_tasks for select to authenticated using (public.is_employee() or public.is_admin());
drop policy if exists "Employees read project activity" on public.project_activity;
create policy "Employees read project activity" on public.project_activity for select to authenticated using (public.is_employee() or public.is_admin());

create index if not exists project_milestones_project_idx on public.project_milestones(project_id,display_order);
create index if not exists project_tasks_project_status_idx on public.project_tasks(project_id,status);
create index if not exists project_tasks_due_idx on public.project_tasks(due_date) where status not in ('Completed','Done');
create index if not exists project_activity_project_created_idx on public.project_activity(project_id,created_at desc);

-- Seed standard milestones only for projects that do not already have milestones.
insert into public.project_milestones(project_id,title,status,display_order)
select p.id,v.title,case when p.status='Completed' then 'Completed' else 'Pending' end,v.ord
from public.projects p
cross join (values
 ('Lead / Award',10),('Planning',20),('Material & Mobilization',30),('Construction',40),('Testing & Inspection',50),('Closeout',60)
) as v(title,ord)
where not exists (select 1 from public.project_milestones m where m.project_id=p.id);
