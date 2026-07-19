-- Blue Bear / VoltFlow V9.0 — Engineering Inspection Division
begin;

create table if not exists public.inspection_case_studies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  asset_category text not null,
  summary text not null,
  classification text not null default 'Normal',
  inspection_method text,
  operating_condition text,
  findings text,
  recommendation text,
  cover_image_url text,
  is_published boolean not null default false,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.inspection_case_studies enable row level security;

drop policy if exists "Public reads published inspection studies" on public.inspection_case_studies;
create policy "Public reads published inspection studies"
on public.inspection_case_studies for select
using (is_published=true);

drop policy if exists "Admins manage inspection studies" on public.inspection_case_studies;
create policy "Admins manage inspection studies"
on public.inspection_case_studies for all to authenticated
using (public.is_admin()) with check (public.is_admin());

grant select on public.inspection_case_studies to anon,authenticated;
grant insert,update,delete on public.inspection_case_studies to authenticated;

insert into public.voltflow_schema_migrations(version,description)
values ('9.0.0','Engineering Inspection Division, anonymized thermal case studies and admin management')
on conflict(version) do nothing;

commit;