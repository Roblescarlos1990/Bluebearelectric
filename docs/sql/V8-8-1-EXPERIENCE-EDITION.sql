-- VoltFlow V8.8.1 Experience Edition
begin;

create table if not exists public.document_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  document_type text not null default 'Editable',
  content_html text not null,
  version_number integer not null default 1,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique(project_id, title, version_number)
);

create index if not exists document_versions_project_idx
on public.document_versions(project_id, created_at desc);

alter table public.document_versions enable row level security;

drop policy if exists "Admins manage document versions" on public.document_versions;
create policy "Admins manage document versions" on public.document_versions
for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select,insert,update,delete on public.document_versions to authenticated;

insert into public.voltflow_schema_migrations(version,description)
values ('8.8.1','Experience Edition, boot sequence, document studio, email automation')
on conflict (version) do nothing;

commit;