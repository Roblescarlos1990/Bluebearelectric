-- VoltFlow V8.7.2 Live Media compatibility
alter table public.gallery add column if not exists is_public boolean not null default false;
alter table public.gallery add column if not exists uploaded_by uuid;
alter table public.gallery add column if not exists favorite boolean not null default false;
alter table public.gallery add column if not exists tags text[] not null default '{}'::text[];
create index if not exists gallery_project_created_idx on public.gallery(project_id,created_at desc);
create index if not exists gallery_public_project_idx on public.gallery(project_id,is_public) where is_public=true;
-- Realtime publication: safely add gallery if it is not already present.
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='gallery') then
    alter publication supabase_realtime add table public.gallery;
  end if;
end $$;
