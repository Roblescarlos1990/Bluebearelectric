-- Blue Bear Electric V6.7 Field Operations
-- Run in Supabase SQL Editor after V6.2+ portal tables are working.

create table if not exists public.field_daily_reports (
  id uuid primary key default gen_random_uuid(),
  employee_user_id uuid references public.employee_users(user_id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade,
  work_date date default current_date,
  work_performed text not null,
  issues text,
  next_steps text,
  reviewed boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.safety_jsa_forms (
  id uuid primary key default gen_random_uuid(),
  employee_user_id uuid references public.employee_users(user_id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade,
  task text not null,
  hazards text,
  controls text,
  ppe_confirmed boolean default false,
  loto_required boolean default false,
  signature text,
  reviewed boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.vehicle_inspections (
  id uuid primary key default gen_random_uuid(),
  employee_user_id uuid references public.employee_users(user_id) on delete set null,
  vehicle text not null,
  mileage numeric,
  tires_ok boolean default false,
  lights_ok boolean default false,
  tools_ok boolean default false,
  damage_found boolean default false,
  notes text,
  reviewed boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.material_requests (
  id uuid primary key default gen_random_uuid(),
  employee_user_id uuid references public.employee_users(user_id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade,
  items text not null,
  urgency text default 'Normal',
  status text default 'Requested',
  notes text,
  reviewed boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.job_completion_checklists (
  id uuid primary key default gen_random_uuid(),
  employee_user_id uuid references public.employee_users(user_id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade,
  work_complete boolean default false,
  area_clean boolean default false,
  photos_uploaded boolean default false,
  customer_walkthrough boolean default false,
  power_restored boolean default false,
  notes text,
  reviewed boolean default false,
  created_at timestamptz default now()
);

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;

create or replace function public.is_employee()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.employee_users
    where user_id = auth.uid() and active = true
  );
$$;

grant execute on function public.is_employee() to authenticated;

alter table public.field_daily_reports enable row level security;
alter table public.safety_jsa_forms enable row level security;
alter table public.vehicle_inspections enable row level security;
alter table public.material_requests enable row level security;
alter table public.job_completion_checklists enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.field_daily_reports to authenticated;
grant select, insert, update, delete on public.safety_jsa_forms to authenticated;
grant select, insert, update, delete on public.vehicle_inspections to authenticated;
grant select, insert, update, delete on public.material_requests to authenticated;
grant select, insert, update, delete on public.job_completion_checklists to authenticated;

-- Admins can manage all field operation records.
drop policy if exists "Admins manage field daily reports" on public.field_daily_reports;
create policy "Admins manage field daily reports" on public.field_daily_reports
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins manage safety jsa forms" on public.safety_jsa_forms;
create policy "Admins manage safety jsa forms" on public.safety_jsa_forms
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins manage vehicle inspections" on public.vehicle_inspections;
create policy "Admins manage vehicle inspections" on public.vehicle_inspections
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins manage material requests" on public.material_requests;
create policy "Admins manage material requests" on public.material_requests
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins manage job completion checklists" on public.job_completion_checklists;
create policy "Admins manage job completion checklists" on public.job_completion_checklists
for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Employees can create and read their own field operation records.
drop policy if exists "Employees create daily reports" on public.field_daily_reports;
create policy "Employees create daily reports" on public.field_daily_reports
for insert to authenticated with check (public.is_employee() and employee_user_id = auth.uid());

drop policy if exists "Employees read own daily reports" on public.field_daily_reports;
create policy "Employees read own daily reports" on public.field_daily_reports
for select to authenticated using (public.is_admin() or employee_user_id = auth.uid());

drop policy if exists "Employees create jsa forms" on public.safety_jsa_forms;
create policy "Employees create jsa forms" on public.safety_jsa_forms
for insert to authenticated with check (public.is_employee() and employee_user_id = auth.uid());

drop policy if exists "Employees read own jsa forms" on public.safety_jsa_forms;
create policy "Employees read own jsa forms" on public.safety_jsa_forms
for select to authenticated using (public.is_admin() or employee_user_id = auth.uid());

drop policy if exists "Employees create vehicle inspections" on public.vehicle_inspections;
create policy "Employees create vehicle inspections" on public.vehicle_inspections
for insert to authenticated with check (public.is_employee() and employee_user_id = auth.uid());

drop policy if exists "Employees read own vehicle inspections" on public.vehicle_inspections;
create policy "Employees read own vehicle inspections" on public.vehicle_inspections
for select to authenticated using (public.is_admin() or employee_user_id = auth.uid());

drop policy if exists "Employees create material requests" on public.material_requests;
create policy "Employees create material requests" on public.material_requests
for insert to authenticated with check (public.is_employee() and employee_user_id = auth.uid());

drop policy if exists "Employees read own material requests" on public.material_requests;
create policy "Employees read own material requests" on public.material_requests
for select to authenticated using (public.is_admin() or employee_user_id = auth.uid());

drop policy if exists "Employees create completion checklists" on public.job_completion_checklists;
create policy "Employees create completion checklists" on public.job_completion_checklists
for insert to authenticated with check (public.is_employee() and employee_user_id = auth.uid());

drop policy if exists "Employees read own completion checklists" on public.job_completion_checklists;
create policy "Employees read own completion checklists" on public.job_completion_checklists
for select to authenticated using (public.is_admin() or employee_user_id = auth.uid());
