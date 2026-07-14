-- VoltFlow V8.9 — Company Brand & Document Experience
-- Additive migration. Existing company and project data is preserved.

begin;

create table if not exists public.company_profiles (
  id uuid primary key default gen_random_uuid(),
  company_key text not null unique,
  company_name text not null,
  display_name text,
  tagline text,
  phone text,
  email text,
  website text,
  license_number text,
  address_line_1 text,
  address_line_2 text,
  city text,
  region text,
  postal_code text,
  timezone text not null default 'America/Los_Angeles',
  primary_color text not null default '#061b35',
  secondary_color text not null default '#1479e8',
  accent_color text not null default '#ffc400',
  logo_path text,
  logo_mark_path text,
  document_logo_path text,
  watermark_path text,
  public_watermark_opacity numeric(4,3) not null default 0.065,
  document_watermark_opacity numeric(4,3) not null default 0.055,
  email_signature text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.company_profiles enable row level security;

drop policy if exists "Authenticated users read company profile" on public.company_profiles;
create policy "Authenticated users read company profile"
on public.company_profiles for select to authenticated using (active=true or public.is_admin());

drop policy if exists "Admins manage company profile" on public.company_profiles;
create policy "Admins manage company profile"
on public.company_profiles for all to authenticated
using (public.is_admin()) with check (public.is_admin());

grant select on public.company_profiles to authenticated;
grant insert,update,delete on public.company_profiles to authenticated;

insert into public.company_profiles(
  company_key,company_name,display_name,tagline,phone,email,website,license_number,
  city,region,primary_color,secondary_color,accent_color,
  logo_path,logo_mark_path,document_logo_path,watermark_path,
  public_watermark_opacity,document_watermark_opacity,email_signature
)
values(
  'blue-bear-electric','Blue Bear Electric','Blue Bear Electric',
  'Powering solutions. Delivering excellence.','760-234-8306','info@bluebearelectric.com',
  'https://bluebearelectric.com','1141313','Imperial','CA',
  '#061b35','#1479e8','#ffc400',
  'assets/branding/blue-bear/logo-primary.png',
  'assets/branding/blue-bear/logo-mark.png',
  'assets/branding/blue-bear/document-logo.png',
  'assets/branding/blue-bear/watermark-print.png',
  0.065,0.055,
  'Blue Bear Electric\nCA License #1141313\n760-234-8306\nSent securely through VoltFlow'
)
on conflict(company_key) do update set
  company_name=excluded.company_name,
  display_name=excluded.display_name,
  tagline=excluded.tagline,
  phone=excluded.phone,
  email=excluded.email,
  website=excluded.website,
  license_number=excluded.license_number,
  primary_color=excluded.primary_color,
  secondary_color=excluded.secondary_color,
  accent_color=excluded.accent_color,
  logo_path=excluded.logo_path,
  logo_mark_path=excluded.logo_mark_path,
  document_logo_path=excluded.document_logo_path,
  watermark_path=excluded.watermark_path,
  public_watermark_opacity=excluded.public_watermark_opacity,
  document_watermark_opacity=excluded.document_watermark_opacity,
  email_signature=excluded.email_signature,
  updated_at=now();

insert into public.voltflow_schema_migrations(version,description)
values ('8.9.0','Company profile, Blue Bear brand assets, document watermark and public intro')
on conflict(version) do nothing;

commit;