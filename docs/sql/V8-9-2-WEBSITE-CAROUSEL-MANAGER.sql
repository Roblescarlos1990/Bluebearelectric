-- VoltFlow V8.9.2 — Website Carousel Manager
begin;

create table if not exists public.website_carousel_items (
  id uuid primary key default gen_random_uuid(),
  tenant_key text not null default 'blue-bear-electric',
  page_key text not null,
  section_key text not null,
  carousel_key text not null,
  title text not null,
  alt_text text,
  storage_path text not null,
  public_url text not null,
  display_order integer not null default 10,
  is_published boolean not null default true,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists website_carousel_lookup_idx
on public.website_carousel_items(tenant_key,page_key,section_key,carousel_key,is_published,display_order);

alter table public.website_carousel_items enable row level security;

drop policy if exists "Public reads published carousel items" on public.website_carousel_items;
create policy "Public reads published carousel items"
on public.website_carousel_items for select
using (is_published=true and tenant_key='blue-bear-electric');

drop policy if exists "Admins manage carousel items" on public.website_carousel_items;
create policy "Admins manage carousel items"
on public.website_carousel_items for all to authenticated
using (public.is_admin()) with check (public.is_admin());

grant select on public.website_carousel_items to anon,authenticated;
grant insert,update,delete on public.website_carousel_items to authenticated;

insert into public.voltflow_schema_migrations(version,description)
values ('8.9.2','Interactive residential home systems and database carousel manager')
on conflict(version) do nothing;

commit;