-- Blue Bear OS V6.4 AI Operations Center
-- Optional table for saving generated AI/manual drafts later.

create table if not exists public.ai_drafts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  draft_type text default 'proposal',
  title text,
  content text not null,
  created_by uuid,
  created_at timestamptz default now()
);

alter table public.ai_drafts enable row level security;

drop policy if exists "Admins manage ai drafts" on public.ai_drafts;
create policy "Admins manage ai drafts"
on public.ai_drafts
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select, insert, update, delete on public.ai_drafts to authenticated;
