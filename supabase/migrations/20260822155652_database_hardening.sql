-- Blue Bear Electric / VoltFlow database hardening.
-- Removes temporary access, makes authorization helpers honor RLS, optimizes
-- policy lookups, and adds the foreign-key indexes reported by Supabase.

set lock_timeout = '10s';
set statement_timeout = '120s';

-- Authorization helpers only need access to the caller's own mapping row, so
-- SECURITY INVOKER is sufficient and avoids bypassing row-level security.
create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
      and role = 'admin'
  );
$$;

create or replace function public.is_employee()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.employee_users
    where user_id = (select auth.uid())
      and active is true
      and approval_status = 'approved'
  );
$$;

create or replace function public.customer_id_for_user()
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select customer_id
  from public.customer_users
  where user_id = (select auth.uid())
  limit 1;
$$;

revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_employee() from public, anon;
revoke all on function public.customer_id_for_user() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.is_employee() to authenticated, service_role;
grant execute on function public.customer_id_for_user() to authenticated, service_role;

-- Log retention is an operational task, never a browser-callable RPC.
create or replace function public.purge_old_security_logs()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.quote_attempts
  where created_at < now() - interval '30 days';

  delete from public.security_events
  where created_at < now() - interval '30 days'
    and severity in ('info', 'low', 'medium');

  delete from public.security_events
  where created_at < now() - interval '365 days'
    and severity in ('high', 'critical');
end;
$$;

revoke all on function public.purge_old_security_logs() from public, anon, authenticated;
grant execute on function public.purge_old_security_logs() to service_role;

-- Remove the three temporary policies that allowed every signed-in user to
-- create, edit, or delete core customer and project data.
drop policy if exists "TEMP authenticated can manage customers" on public.customers;
drop policy if exists "TEMP authenticated can manage projects" on public.projects;
drop policy if exists "TEMP authenticated can manage gallery" on public.gallery;

-- Keep one self-read policy for the admin profile table.
drop policy if exists "Admins can read admin users" on public.admin_users;
drop policy if exists "admin users can read own admin profile" on public.admin_users;
drop policy if exists "Users read own admin profile" on public.admin_users;
create policy "Users read own admin profile"
on public.admin_users
for select
to authenticated
using ((select auth.uid()) = user_id);

-- Standardize the three legacy admin-management checks while preserving the
-- separate historical owner policies.
drop policy if exists "admins manage customers" on public.customers;
create policy "Admins manage customers"
on public.customers
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists "admins manage projects" on public.projects;
create policy "Admins manage projects"
on public.projects
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists "admins manage gallery" on public.gallery;
create policy "Admins manage gallery"
on public.gallery
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

-- Cache stable authorization helpers once per statement rather than once per
-- row. The projects policy already includes approved employees, so the older
-- employee-only policy was redundant.
drop policy if exists "Customers can read own customer profile" on public.customers;
create policy "Customers can read own customer profile"
on public.customers
for select
to authenticated
using (
  id = (select public.customer_id_for_user())
  or (select public.is_admin())
);

drop policy if exists "Customers can read own projects" on public.projects;
drop policy if exists "Employees can read projects" on public.projects;
create policy "Portal users read authorized projects"
on public.projects
for select
to authenticated
using (
  customer_id = (select public.customer_id_for_user())
  or (select public.is_employee())
  or (select public.is_admin())
);

drop policy if exists "Customers can read public own gallery" on public.gallery;
create policy "Portal users read authorized gallery"
on public.gallery
for select
to authenticated
using (
  (select public.is_admin())
  or (select public.is_employee())
  or (
    is_public is true
    and exists (
      select 1
      from public.projects p
      where p.id = gallery.project_id
        and p.customer_id = (select public.customer_id_for_user())
    )
  )
);

-- Optimize the remaining policies specifically reported by the Supabase
-- auth_rls_initplan advisor. ALTER POLICY preserves each command and role.
do $$
declare
  policy_record record;
  using_expression text;
  check_expression text;
begin
  for policy_record in
    select p.schemaname, p.tablename, p.policyname, p.qual, p.with_check
    from pg_policies p
    join (
      values
        ('leads', 'admins can read leads'),
        ('leads', 'admins can update leads'),
        ('leads', 'admins can delete leads'),
        ('time_entries', 'Employees can read own time entries'),
        ('services', 'admins manage services'),
        ('reviews', 'admins manage reviews'),
        ('employee_users', 'Employees can read own employee profile'),
        ('customer_users', 'Customers can read own portal mapping'),
        ('project_milestones', 'Owner can manage milestones'),
        ('field_daily_reports', 'Employees create daily reports'),
        ('field_daily_reports', 'Employees read own daily reports'),
        ('safety_jsa_forms', 'Employees create jsa forms'),
        ('safety_jsa_forms', 'Employees read own jsa forms'),
        ('vehicle_inspections', 'Employees create vehicle inspections'),
        ('vehicle_inspections', 'Employees read own vehicle inspections'),
        ('material_requests', 'Employees create material requests'),
        ('material_requests', 'Employees read own material requests'),
        ('job_completion_checklists', 'Employees create completion checklists'),
        ('job_completion_checklists', 'Employees read own completion checklists'),
        ('saved_searches', 'Users manage own saved searches'),
        ('profiles', 'Users can view own profile'),
        ('customers', 'Owner can manage customers'),
        ('projects', 'Owner can manage projects'),
        ('gallery', 'Owner can manage gallery')
    ) as target(tablename, policyname)
      on target.tablename = p.tablename
     and target.policyname = p.policyname
    where p.schemaname = 'public'
  loop
    using_expression := case
      when policy_record.qual is null then null
      else replace(policy_record.qual, 'auth.uid()', '(select auth.uid())')
    end;
    check_expression := case
      when policy_record.with_check is null then null
      else replace(policy_record.with_check, 'auth.uid()', '(select auth.uid())')
    end;

    if using_expression is not null and check_expression is not null then
      execute format(
        'alter policy %I on %I.%I using (%s) with check (%s)',
        policy_record.policyname,
        policy_record.schemaname,
        policy_record.tablename,
        using_expression,
        check_expression
      );
    elsif using_expression is not null then
      execute format(
        'alter policy %I on %I.%I using (%s)',
        policy_record.policyname,
        policy_record.schemaname,
        policy_record.tablename,
        using_expression
      );
    elsif check_expression is not null then
      execute format(
        'alter policy %I on %I.%I with check (%s)',
        policy_record.policyname,
        policy_record.schemaname,
        policy_record.tablename,
        check_expression
      );
    end if;
  end loop;
end;
$$;

-- Migration history is admin-readable metadata and service-role writable.
alter table public.voltflow_schema_migrations enable row level security;
drop policy if exists "Admins read migration history" on public.voltflow_schema_migrations;
create policy "Admins read migration history"
on public.voltflow_schema_migrations
for select
to authenticated
using ((select public.is_admin()));

revoke all on table public.voltflow_schema_migrations from anon, authenticated;
grant select on table public.voltflow_schema_migrations to authenticated;
grant select, insert, update, delete on table public.voltflow_schema_migrations to service_role;

-- Cover every currently unindexed public-schema foreign key. Postgres does not
-- create these indexes automatically; they support joins and cascade deletes.
create index if not exists activity_log_customer_id_fkey_idx on public.activity_log (customer_id);
create index if not exists activity_log_project_id_fkey_idx on public.activity_log (project_id);
create index if not exists ai_drafts_project_id_fkey_idx on public.ai_drafts (project_id);
create index if not exists change_orders_estimate_id_fkey_idx on public.change_orders (estimate_id);
create index if not exists change_orders_project_id_fkey_idx on public.change_orders (project_id);
create index if not exists company_announcements_created_by_fkey_idx on public.company_announcements (created_by);
create index if not exists customer_users_customer_id_fkey_idx on public.customer_users (customer_id);
create index if not exists employee_documents_user_id_fkey_idx on public.employee_documents (user_id);
create index if not exists employee_form_submissions_reviewed_by_fkey_idx on public.employee_form_submissions (reviewed_by);
create index if not exists employee_form_submissions_user_id_fkey_idx on public.employee_form_submissions (user_id);
create index if not exists employee_users_approved_by_fkey_idx on public.employee_users (approved_by);
create index if not exists estimate_items_estimate_id_fkey_idx on public.estimate_items (estimate_id);
create index if not exists estimate_items_project_id_fkey_idx on public.estimate_items (project_id);
create index if not exists estimate_template_items_template_id_fkey_idx on public.estimate_template_items (template_id);
create index if not exists estimates_customer_id_fkey_idx on public.estimates (customer_id);
create index if not exists estimates_project_id_fkey_idx on public.estimates (project_id);
create index if not exists field_daily_reports_employee_user_id_fkey_idx on public.field_daily_reports (employee_user_id);
create index if not exists field_daily_reports_project_id_fkey_idx on public.field_daily_reports (project_id);
create index if not exists invoice_items_invoice_id_fkey_idx on public.invoice_items (invoice_id);
create index if not exists invoices_customer_id_fkey_idx on public.invoices (customer_id);
create index if not exists invoices_estimate_id_fkey_idx on public.invoices (estimate_id);
create index if not exists invoices_project_id_fkey_idx on public.invoices (project_id);
create index if not exists job_completion_checklists_employee_user_id_fkey_idx on public.job_completion_checklists (employee_user_id);
create index if not exists job_completion_checklists_project_id_fkey_idx on public.job_completion_checklists (project_id);
create index if not exists leads_converted_customer_id_fkey_idx on public.leads (converted_customer_id);
create index if not exists leads_converted_project_id_fkey_idx on public.leads (converted_project_id);
create index if not exists material_requests_employee_user_id_fkey_idx on public.material_requests (employee_user_id);
create index if not exists material_requests_project_id_fkey_idx on public.material_requests (project_id);
create index if not exists operations_insight_feedback_project_id_fkey_idx on public.operations_insight_feedback (project_id);
create index if not exists payments_invoice_id_fkey_idx on public.payments (invoice_id);
create index if not exists payments_project_id_fkey_idx on public.payments (project_id);
create index if not exists project_assignments_project_id_fkey_idx on public.project_assignments (project_id);
create index if not exists project_notes_project_id_fkey_idx on public.project_notes (project_id);
create index if not exists projects_customer_id_fkey_idx on public.projects (customer_id);
create index if not exists safety_jsa_forms_employee_user_id_fkey_idx on public.safety_jsa_forms (employee_user_id);
create index if not exists safety_jsa_forms_project_id_fkey_idx on public.safety_jsa_forms (project_id);
create index if not exists schedule_events_project_id_fkey_idx on public.schedule_events (project_id);
create index if not exists time_entries_project_id_fkey_idx on public.time_entries (project_id);
create index if not exists vehicle_inspections_employee_user_id_fkey_idx on public.vehicle_inspections (employee_user_id);

insert into public.voltflow_schema_migrations(version, description)
values ('9.3.1', 'Database access hardening and performance polish')
on conflict (version) do update
set description = excluded.description;

