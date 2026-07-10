-- Blue Bear OS V6 database additions
create table if not exists public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  label text not null,
  status text default 'Pending',
  notes text,
  created_at timestamptz default now()
);

-- Helpful project fields for V6 growth
alter table public.projects
add column if not exists priority text default 'Normal',
add column if not exists estimated_value numeric default 0,
add column if not exists assigned_to text,
add column if not exists latitude numeric,
add column if not exists longitude numeric;

-- RLS for V6 tables
alter table public.project_milestones enable row level security;

drop policy if exists "TEMP authenticated can manage milestones" on public.project_milestones;
drop policy if exists "Owner can manage milestones" on public.project_milestones;

-- Use the confirmed logged-in website UID from your admin session.
create policy "Owner can manage milestones"
on public.project_milestones
for all
to authenticated
using (auth.uid() = '6baffde2-009b-4f38-8744-9cc483232d77')
with check (auth.uid() = '6baffde2-009b-4f38-8744-9cc483232d77');

grant select, insert, update, delete on public.project_milestones to authenticated;
grant select, insert, update, delete on public.estimate_items to authenticated;
grant select, insert, update, delete on public.estimates to authenticated;
grant select, insert, update, delete on public.invoices to authenticated;
grant select, insert, update, delete on public.schedule_events to authenticated;
