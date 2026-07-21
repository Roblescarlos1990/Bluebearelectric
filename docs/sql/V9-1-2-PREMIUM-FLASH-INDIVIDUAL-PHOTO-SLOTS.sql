-- Blue Bear / VoltFlow V9.1.2 — Individual Website Photo Slots
begin;

create table if not exists public.website_photo_slots (
  id uuid primary key default gen_random_uuid(),
  tenant_key text not null default 'blue-bear-electric',
  slot_key text not null,
  page_key text not null,
  alt_text text,
  storage_path text not null,
  public_url text not null,
  is_published boolean not null default true,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_key,slot_key)
);

create index if not exists website_photo_slots_lookup_idx
on public.website_photo_slots(tenant_key,slot_key,is_published);

alter table public.website_photo_slots enable row level security;

drop policy if exists "Public reads published website photo slots" on public.website_photo_slots;
create policy "Public reads published website photo slots"
on public.website_photo_slots for select
using (is_published=true and tenant_key='blue-bear-electric');

drop policy if exists "Admins manage website photo slots" on public.website_photo_slots;
create policy "Admins manage website photo slots"
on public.website_photo_slots for all to authenticated
using (public.is_admin()) with check (public.is_admin());

grant select on public.website_photo_slots to anon,authenticated;
grant insert,update,delete on public.website_photo_slots to authenticated;

insert into public.voltflow_schema_migrations(version,description)
values ('9.1.2','Premium intro flash and individual website photo slot management')
on conflict(version) do nothing;

commit;