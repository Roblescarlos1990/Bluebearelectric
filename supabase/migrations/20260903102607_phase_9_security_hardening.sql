-- Blue Bear Electric — Phase 9 security hardening
-- This migration closes the direct anonymous lead-write path, narrows anonymous
-- Data API grants to published site content, and binds employee-created time
-- entries to the authenticated employee.

begin;

-- Estimate submissions must pass through /api/quote so Turnstile, origin,
-- validation, rate-limiting, and audit controls cannot be bypassed with the
-- browser publishable key.
drop policy if exists "public can create leads" on public.leads;

-- RLS remains the primary row boundary. These grants add least privilege at
-- the Data API layer so anonymous clients cannot even attempt private-table
-- operations.
revoke all privileges on all tables in schema public from anon;
revoke all privileges on all sequences in schema public from anon;
revoke execute on all functions in schema public from public, anon;

grant select on table
  public.inspection_case_studies,
  public.reviews,
  public.services,
  public.site_content,
  public.site_media,
  public.site_portfolio,
  public.site_services,
  public.website_carousel_items,
  public.website_photo_slots
to anon;

-- Prevent future tables and functions created by this migration owner from
-- silently becoming anonymous Data API surfaces.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke execute on functions from public, anon;

-- An approved employee can create only their own time entry. Administrators
-- retain full access through the separate administrator policy.
drop policy if exists "Employees can create time entries" on public.time_entries;
create policy "Employees can create own time entries"
on public.time_entries
for insert
to authenticated
with check (
  (select public.is_employee())
  and employee_user_id = (select auth.uid())
);

-- Keep uploaded media within the file families used by the administration UI
-- and cap single-file storage/egress exposure. Existing objects are unaffected.
update storage.buckets
set
  file_size_limit = 15728640,
  allowed_mime_types = array['image/*']::text[]
where id = 'site-media';

update storage.buckets
set
  file_size_limit = 26214400,
  allowed_mime_types = array[
    'image/*',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
where id = 'project-photos';

-- Public buckets do not require an object-table SELECT policy to serve known
-- URLs. Remove anonymous object listing while preserving administrator access.
drop policy if exists "Public reads site media objects" on storage.objects;
drop policy if exists "Admins read site media objects" on storage.objects;
create policy "Admins read site media objects"
on storage.objects
for select
to authenticated
using (bucket_id = 'site-media' and (select public.is_admin()));

insert into public.voltflow_schema_migrations(version, description)
values ('9.4.0', 'Phase 9 browser, API, and database security hardening')
on conflict (version) do update
set description = excluded.description;

commit;
