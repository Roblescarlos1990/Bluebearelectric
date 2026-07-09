-- Blue Bear Electric V5.3 full admin policies
-- Run this after all V5 tables have been created.

insert into public.admin_users (user_id, role)
values
  ('6baffde2-009b-4f38-8744-9cc483232d77', 'admin'),
  ('b98e5a28-3f6f-4345-86f7-dbf7e0514e16', 'admin')
on conflict (user_id) do update set role = 'admin';

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
    and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;
grant usage on schema public to anon, authenticated;

grant select on public.admin_users to authenticated;
grant select, insert, update, delete on public.customers to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.gallery to authenticated;
grant select, insert, update, delete on public.services to authenticated;
grant select, insert, update, delete on public.reviews to authenticated;
grant select, insert, update, delete on public.estimate_items to authenticated;
grant select, insert, update, delete on public.estimates to authenticated;
grant select, insert, update, delete on public.invoices to authenticated;
grant select, insert, update, delete on public.schedule_events to authenticated;

alter table public.customers enable row level security;
alter table public.projects enable row level security;
alter table public.gallery enable row level security;
alter table public.services enable row level security;
alter table public.reviews enable row level security;
alter table public.estimate_items enable row level security;
alter table public.estimates enable row level security;
alter table public.invoices enable row level security;
alter table public.schedule_events enable row level security;

drop policy if exists "TEMP authenticated can manage customers" on public.customers;
drop policy if exists "TEMP authenticated can manage projects" on public.projects;
drop policy if exists "TEMP authenticated can manage gallery" on public.gallery;
drop policy if exists "Admins can manage customers" on public.customers;
drop policy if exists "Admins can manage projects" on public.projects;
drop policy if exists "Admins can manage gallery" on public.gallery;
drop policy if exists "Admins can manage services" on public.services;
drop policy if exists "Admins can manage reviews" on public.reviews;
drop policy if exists "Admins can manage estimate items" on public.estimate_items;
drop policy if exists "Admins can manage estimates" on public.estimates;
drop policy if exists "Admins can manage invoices" on public.invoices;
drop policy if exists "Admins can manage schedule events" on public.schedule_events;

create policy "Admins can manage customers" on public.customers for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins can manage projects" on public.projects for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins can manage gallery" on public.gallery for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins can manage services" on public.services for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins can manage reviews" on public.reviews for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins can manage estimate items" on public.estimate_items for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins can manage estimates" on public.estimates for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins can manage invoices" on public.invoices for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins can manage schedule events" on public.schedule_events for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Storage policies for the private project-photos bucket.
drop policy if exists "TEMP authenticated can upload project photos" on storage.objects;
drop policy if exists "TEMP authenticated can view project photos" on storage.objects;
drop policy if exists "TEMP authenticated can update project photos" on storage.objects;
drop policy if exists "TEMP authenticated can delete project photos" on storage.objects;
drop policy if exists "Admin users can upload project photos" on storage.objects;
drop policy if exists "Admin users can view project photos" on storage.objects;
drop policy if exists "Admin users can update project photos" on storage.objects;
drop policy if exists "Admin users can delete project photos" on storage.objects;

create policy "Admin users can upload project photos" on storage.objects for insert to authenticated with check (bucket_id = 'project-photos' and public.is_admin());
create policy "Admin users can view project photos" on storage.objects for select to authenticated using (bucket_id = 'project-photos' and public.is_admin());
create policy "Admin users can update project photos" on storage.objects for update to authenticated using (bucket_id = 'project-photos' and public.is_admin()) with check (bucket_id = 'project-photos' and public.is_admin());
create policy "Admin users can delete project photos" on storage.objects for delete to authenticated using (bucket_id = 'project-photos' and public.is_admin());
