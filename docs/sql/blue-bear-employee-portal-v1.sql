-- Blue Bear Electric Employee Portal v1
-- Applied to Supabase project xpnkybwbliiqulsgqgho on 2026-08-02.
-- This file documents the production schema change. Review before rerunning.

-- Adds employee approval fields, signup trigger, approved-employee authorization,
-- company_announcements, employee_form_submissions, employee_documents,
-- private employee-documents storage policies, and time-clock update policy.

select version, description, applied_at
from public.voltflow_schema_migrations
where version = 'blue-bear-employee-portal-v1';
