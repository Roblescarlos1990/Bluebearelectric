-- Blue Bear Electric admin policies for Phase 2 tables
-- Run in Supabase SQL Editor after creating the tables.

alter table public.customers enable row level security;
alter table public.services enable row level security;
alter table public.projects enable row level security;
alter table public.gallery enable row level security;
alter table public.reviews enable row level security;

-- Public can read active services and approved reviews for future website sections.
drop policy if exists "public can read active services" on public.services;
create policy "public can read active services" on public.services
for select to anon, authenticated using (active = true);

drop policy if exists "public can read approved reviews" on public.reviews;
create policy "public can read approved reviews" on public.reviews
for select to anon, authenticated using (approved = true);

-- Admin helper condition repeated in each policy.
drop policy if exists "admins manage customers" on public.customers;
create policy "admins manage customers" on public.customers
for all to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "admins manage services" on public.services;
create policy "admins manage services" on public.services
for all to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "admins manage projects" on public.projects;
create policy "admins manage projects" on public.projects
for all to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "admins manage gallery" on public.gallery;
create policy "admins manage gallery" on public.gallery
for all to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "admins manage reviews" on public.reviews;
create policy "admins manage reviews" on public.reviews
for all to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));
