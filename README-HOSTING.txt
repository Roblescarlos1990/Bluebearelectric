-- Blue Bear Electric V5.2 policies for Project Workspace features.
-- Run in Supabase SQL Editor after the V5.2 tables exist.

-- Make sure both known admin users are in the admin list.
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

grant select, insert, update, delete on public.customers to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.gallery to authenticated;
grant select, insert, update, delete on public.services to authenticated;
grant select, insert, update, delete on public.reviews to authenticated;
grant select, insert, update, delete on public.estimate_items to authenticated;
grant select, insert, update, delete on public.estimates to authenticated;
grant select, insert, update, delete on public.invoices to authenticated;
grant select, insert, update, delete on public.schedule_events to authenticated;
grant select on public.admin_users to authenticated;

alter table public.estimate_items enable row level security;
alter table public.estimates enable row level security;
alter table public.invoices enable row level security;
alter table public.schedule_events enable row level security;

-- Drop old V5.2 policies if re-running.
drop policy if exists "Admins can manage estimate items" on public.estimate_items;
drop policy if exists "Admins can manage estimates" on public.estimates;
drop policy if exists "Admins can manage invoices" on public.invoices;
drop policy if exists "Admins can manage schedule events" on public.schedule_events;

create policy "Admins can manage estimate items"
on public.estimate_items
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage estimates"
on public.estimates
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage invoices"
on public.invoices
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage schedule events"
on public.schedule_events
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
