-- VoltFlow V8.4 Content Manager + Media Library
-- Run once in Supabase SQL Editor.

create table if not exists public.site_content (
  id uuid primary key default gen_random_uuid(),
  tenant_key text not null default 'blue-bear-electric',
  content_key text not null,
  content_value jsonb not null default '{}'::jsonb,
  status text not null default 'published' check (status in ('draft','published','archived')),
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_key, content_key)
);

create table if not exists public.site_media (
  id uuid primary key default gen_random_uuid(),
  tenant_key text not null default 'blue-bear-electric',
  title text not null,
  category text not null default 'general',
  file_path text not null,
  file_type text,
  alt_text text,
  public_url text,
  is_active boolean not null default true,
  uploaded_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.site_services (
  id uuid primary key default gen_random_uuid(),
  tenant_key text not null default 'blue-bear-electric',
  title text not null,
  slug text not null,
  category text,
  short_description text,
  image_path text,
  page_url text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_key, slug)
);

create table if not exists public.site_portfolio (
  id uuid primary key default gen_random_uuid(),
  tenant_key text not null default 'blue-bear-electric',
  title text not null,
  category text not null,
  location text,
  service_type text,
  description text,
  capabilities text[] default '{}',
  cover_image_path text,
  display_order integer not null default 0,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public)
values ('site-media', 'site-media', true)
on conflict (id) do update set public = true;

alter table public.site_content enable row level security;
alter table public.site_media enable row level security;
alter table public.site_services enable row level security;
alter table public.site_portfolio enable row level security;

drop policy if exists "Public reads published site content" on public.site_content;
create policy "Public reads published site content" on public.site_content
for select to anon, authenticated
using (status = 'published');

drop policy if exists "Admins manage site content" on public.site_content;
create policy "Admins manage site content" on public.site_content
for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public reads active site media" on public.site_media;
create policy "Public reads active site media" on public.site_media
for select to anon, authenticated
using (is_active = true);

drop policy if exists "Admins manage site media" on public.site_media;
create policy "Admins manage site media" on public.site_media
for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public reads active site services" on public.site_services;
create policy "Public reads active site services" on public.site_services
for select to anon, authenticated
using (is_active = true);

drop policy if exists "Admins manage site services" on public.site_services;
create policy "Admins manage site services" on public.site_services
for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public reads published portfolio" on public.site_portfolio;
create policy "Public reads published portfolio" on public.site_portfolio
for select to anon, authenticated
using (status = 'published');

drop policy if exists "Admins manage portfolio" on public.site_portfolio;
create policy "Admins manage portfolio" on public.site_portfolio
for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public reads site media objects" on storage.objects;
create policy "Public reads site media objects" on storage.objects
for select to anon, authenticated
using (bucket_id = 'site-media');

drop policy if exists "Admins upload site media objects" on storage.objects;
create policy "Admins upload site media objects" on storage.objects
for insert to authenticated
with check (bucket_id = 'site-media' and public.is_admin());

drop policy if exists "Admins update site media objects" on storage.objects;
create policy "Admins update site media objects" on storage.objects
for update to authenticated
using (bucket_id = 'site-media' and public.is_admin())
with check (bucket_id = 'site-media' and public.is_admin());

drop policy if exists "Admins delete site media objects" on storage.objects;
create policy "Admins delete site media objects" on storage.objects
for delete to authenticated
using (bucket_id = 'site-media' and public.is_admin());

grant usage on schema public to anon, authenticated;
grant select on public.site_content, public.site_media, public.site_services, public.site_portfolio to anon;
grant select, insert, update, delete on public.site_content, public.site_media, public.site_services, public.site_portfolio to authenticated;

insert into public.site_content (tenant_key, content_key, content_value, status)
values
('blue-bear-electric','company', jsonb_build_object(
  'company_name','Blue Bear Electric',
  'phone','760-234-8306',
  'license','1141313',
  'service_area','Southern California and Arizona',
  'mission','Innovate and help companies and communities with the professional electrical help they deserve.'
), 'published'),
('blue-bear-electric','homepage_hero', jsonb_build_object(
  'eyebrow','Industrial • Commercial • Residential',
  'headline','Powering Imperial County with quality & integrity',
  'description','Professional electrical services for industrial plants, commercial facilities and homes.',
  'primary_button','Call 760-234-8306',
  'secondary_button','Request My Estimate'
), 'published')
on conflict (tenant_key, content_key) do nothing;

insert into public.site_services (tenant_key,title,slug,category,short_description,image_path,page_url,display_order,is_active)
values
('blue-bear-electric','Industrial','industrial','Industrial','Plant maintenance, switchgear, VFDs, controls, conduit, testing and downtime-focused repairs.','assets/images/site/vfd.jpg','industrial.html',10,true),
('blue-bear-electric','Commercial','commercial','Commercial','Tenant improvements, lighting, service upgrades, warehouses, shops and offices.','assets/images/site/fuse-panel.jpg','commercial.html',20,true),
('blue-bear-electric','Residential','residential','Residential','Panel upgrades, EV charging, lighting, remodel electrical and troubleshooting.','assets/images/site/instagram.jpg','residential.html',30,true),
('blue-bear-electric','Solar & BESS','solar-bess','Energy','Solar PV, battery storage, combiner boxes, inverters, testing and field repairs.','assets/images/site/solar-field.jpg','solar-bess.html',40,true),
('blue-bear-electric','Service & Repair','service-repair','Maintenance','Troubleshooting, emergency repairs, testing and preventive maintenance.','assets/images/site/megger.jpg','service-repair.html',50,true)
on conflict (tenant_key, slug) do nothing;
