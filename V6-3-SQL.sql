-- Blue Bear OS V6.3 Optional Command Center Tables
-- Safe to run after V6.2. This prepares future modules without breaking the current admin UI.

create table if not exists public.ai_drafts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  draft_type text default 'proposal',
  title text,
  content text,
  created_by uuid,
  created_at timestamptz default now()
);

create table if not exists public.project_activity (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  activity_type text not null,
  activity_title text,
  activity_note text,
  created_by uuid,
  created_at timestamptz default now()
);

create table if not exists public.service_templates (
  id uuid primary key default gen_random_uuid(),
  service_type text not null,
  template_name text not null,
  scope_template text,
  default_labor_rate numeric default 0,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  item_name text not null,
  category text,
  quantity numeric default 0,
  unit text,
  reorder_level numeric default 0,
  notes text,
  active boolean default true,
  created_at timestamptz default now()
);

alter table public.ai_drafts enable row level security;
alter table public.project_activity enable row level security;
alter table public.service_templates enable row level security;
alter table public.inventory_items enable row level security;

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
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.ai_drafts to authenticated;
grant select, insert, update, delete on public.project_activity to authenticated;
grant select, insert, update, delete on public.service_templates to authenticated;
grant select, insert, update, delete on public.inventory_items to authenticated;

drop policy if exists "Admins manage ai drafts" on public.ai_drafts;
create policy "Admins manage ai drafts" on public.ai_drafts for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins manage project activity" on public.project_activity;
create policy "Admins manage project activity" on public.project_activity for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins manage service templates" on public.service_templates;
create policy "Admins manage service templates" on public.service_templates for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins manage inventory items" on public.inventory_items;
create policy "Admins manage inventory items" on public.inventory_items for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.service_templates (service_type, template_name, scope_template, default_labor_rate)
values
('Industrial', 'Industrial troubleshooting', 'Troubleshoot electrical equipment, verify power, document findings, complete repairs, and provide closeout notes.', 125),
('Commercial', 'Commercial lighting / tenant improvement', 'Provide commercial electrical installation, lighting, circuits, panels, testing, and clean closeout documentation.', 115),
('Residential', 'Residential service / panel work', 'Provide residential electrical service, troubleshooting, installation, inspection support, and warranty notes.', 105),
('Solar & BESS', 'Solar / BESS support', 'Support solar or battery energy storage electrical work, testing, maintenance, documentation, and project closeout.', 135)
on conflict do nothing;
