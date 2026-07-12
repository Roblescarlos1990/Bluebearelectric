-- VoltFlow V8.5 CRM + Lead Workflow
-- Run once in Supabase SQL Editor after V8.4.

alter table public.leads
  add column if not exists priority text default 'Normal',
  add column if not exists assigned_to text,
  add column if not exists follow_up_at timestamptz,
  add column if not exists last_contact_at timestamptz,
  add column if not exists converted_customer_id uuid references public.customers(id) on delete set null,
  add column if not exists converted_project_id uuid references public.projects(id) on delete set null,
  add column if not exists updated_at timestamptz default now();

create table if not exists public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  note text not null,
  created_by uuid,
  created_at timestamptz default now()
);

create index if not exists leads_status_idx on public.leads(status);
create index if not exists leads_follow_up_idx on public.leads(follow_up_at);
create index if not exists lead_notes_lead_id_idx on public.lead_notes(lead_id);

alter table public.lead_notes enable row level security;

drop policy if exists "Admins manage lead workflow" on public.leads;
create policy "Admins manage lead workflow"
on public.leads for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins manage lead notes" on public.lead_notes;
create policy "Admins manage lead notes"
on public.lead_notes for all to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select, insert, update, delete on public.leads to authenticated;
grant select, insert, update, delete on public.lead_notes to authenticated;

-- Keep the existing anonymous/public INSERT-only policy on leads.
-- Do not add anonymous SELECT, UPDATE, or DELETE permissions.
