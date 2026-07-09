-- Blue Bear Electric V6.2 Portal + Operations Tables
-- Run in Supabase SQL Editor after V6/V6.1 is already working.

create table if not exists public.customer_users (
  user_id uuid primary key,
  customer_id uuid references public.customers(id) on delete cascade,
  role text default 'customer',
  created_at timestamptz default now()
);

create table if not exists public.employee_users (
  user_id uuid primary key,
  full_name text not null,
  role text default 'technician',
  phone text,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.project_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  note text not null,
  note_type text default 'General',
  visible_to_customer boolean default false,
  created_by uuid,
  created_at timestamptz default now()
);

create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  employee_user_id uuid references public.employee_users(user_id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade,
  start_time timestamptz default now(),
  end_time timestamptz,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.closeout_checklists (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade unique,
  before_photos boolean default false,
  after_photos boolean default false,
  estimate_complete boolean default false,
  invoice_complete boolean default false,
  customer_approval boolean default false,
  warranty_notes boolean default false,
  final_inspection boolean default false,
  updated_at timestamptz default now()
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

create or replace function public.customer_id_for_user()
returns uuid
language sql
security definer
set search_path = public
as $$
  select customer_id from public.customer_users where user_id = auth.uid() limit 1;
$$;

grant execute on function public.customer_id_for_user() to authenticated;

alter table public.customer_users enable row level security;
alter table public.employee_users enable row level security;
alter table public.project_notes enable row level security;
alter table public.time_entries enable row level security;
alter table public.closeout_checklists enable row level security;

-- Admin management policies
drop policy if exists "Admins manage customer users" on public.customer_users;
create policy "Admins manage customer users" on public.customer_users
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins manage employee users" on public.employee_users;
create policy "Admins manage employee users" on public.employee_users
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins manage project notes" on public.project_notes;
create policy "Admins manage project notes" on public.project_notes
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins manage time entries" on public.time_entries;
create policy "Admins manage time entries" on public.time_entries
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins manage closeout checklists" on public.closeout_checklists;
create policy "Admins manage closeout checklists" on public.closeout_checklists
for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Employee access policies
drop policy if exists "Employees can read projects" on public.projects;
create policy "Employees can read projects" on public.projects
for select to authenticated using (public.is_employee() or public.is_admin());

drop policy if exists "Employees can read schedule" on public.schedule_events;
create policy "Employees can read schedule" on public.schedule_events
for select to authenticated using (public.is_employee() or public.is_admin());

drop policy if exists "Employees can create time entries" on public.time_entries;
create policy "Employees can create time entries" on public.time_entries
for insert to authenticated with check (public.is_employee() or public.is_admin());

drop policy if exists "Employees can read own time entries" on public.time_entries;
create policy "Employees can read own time entries" on public.time_entries
for select to authenticated using (public.is_admin() or employee_user_id = auth.uid());

-- Customer portal read policies
drop policy if exists "Customers can read own customer profile" on public.customers;
create policy "Customers can read own customer profile" on public.customers
for select to authenticated using (id = public.customer_id_for_user() or public.is_admin());

drop policy if exists "Customers can read own projects" on public.projects;
create policy "Customers can read own projects" on public.projects
for select to authenticated using (customer_id = public.customer_id_for_user() or public.is_admin() or public.is_employee());

drop policy if exists "Customers can read visible project notes" on public.project_notes;
create policy "Customers can read visible project notes" on public.project_notes
for select to authenticated using (
  public.is_admin() or public.is_employee() or
  (visible_to_customer = true and exists (
    select 1 from public.projects p
    where p.id = project_notes.project_id
    and p.customer_id = public.customer_id_for_user()
  ))
);

drop policy if exists "Customers can read own invoices" on public.invoices;
create policy "Customers can read own invoices" on public.invoices
for select to authenticated using (
  public.is_admin() or exists (
    select 1 from public.projects p
    where p.id = invoices.project_id
    and p.customer_id = public.customer_id_for_user()
  )
);

drop policy if exists "Customers can read own estimate items" on public.estimate_items;
create policy "Customers can read own estimate items" on public.estimate_items
for select to authenticated using (
  public.is_admin() or exists (
    select 1 from public.projects p
    where p.id = estimate_items.project_id
    and p.customer_id = public.customer_id_for_user()
  )
);

-- Public/customer-visible gallery policy. Only show files marked is_public=true to customers.
drop policy if exists "Customers can read public own gallery" on public.gallery;
create policy "Customers can read public own gallery" on public.gallery
for select to authenticated using (
  public.is_admin() or public.is_employee() or
  (is_public = true and exists (
    select 1 from public.projects p
    where p.id = gallery.project_id
    and p.customer_id = public.customer_id_for_user()
  ))
);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.customer_users to authenticated;
grant select, insert, update, delete on public.employee_users to authenticated;
grant select, insert, update, delete on public.project_notes to authenticated;
grant select, insert, update, delete on public.time_entries to authenticated;
grant select, insert, update, delete on public.closeout_checklists to authenticated;

-- Employee self profile read
drop policy if exists "Employees can read own employee profile" on public.employee_users;
create policy "Employees can read own employee profile" on public.employee_users
for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- Customer mapping self read
drop policy if exists "Customers can read own portal mapping" on public.customer_users;
create policy "Customers can read own portal mapping" on public.customer_users
for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- Storage read access for employee/customer portals on private bucket
drop policy if exists "Employees can view project photo objects" on storage.objects;
create policy "Employees can view project photo objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'project-photos'
  and (public.is_admin() or public.is_employee())
);

drop policy if exists "Customers can view own public project photo objects" on storage.objects;
create policy "Customers can view own public project photo objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'project-photos'
  and exists (
    select 1
    from public.projects p
    join public.gallery g on g.project_id = p.id
    where g.file_path = storage.objects.name
    and g.is_public = true
    and p.customer_id = public.customer_id_for_user()
  )
);
