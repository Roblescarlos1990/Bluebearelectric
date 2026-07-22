# VoltFlow V8.5 — CRM & Lead Operations

V8.5 turns website estimate submissions into a structured sales and operations workflow.

## New capabilities

- Searchable lead pipeline
- Status and priority filters
- Follow-up scheduling and overdue indicators
- Lead assignment
- Call and email actions
- Internal lead notes
- Last-contact tracking
- One-click conversion to a customer and planning project
- Customer directory search
- Mobile-responsive CRM workspace

## Installation

1. Replace the current repository contents with this complete V8.5 package.
2. Commit and push using GitHub Desktop.
3. In Supabase SQL Editor, run:

   `docs/sql/V8-5-CRM-LEAD-WORKFLOW.sql`

4. Let Vercel redeploy.
5. Sign in to `/admin.html` and open **CRM**.

## Recommended test

1. Submit a test estimate from the homepage.
2. Open VoltFlow Admin → CRM.
3. Set priority to Hot.
4. Add a follow-up time and internal note.
5. Click **Convert to Customer + Project**.
6. Confirm the customer and project appear in their respective areas.

## Security

Public website visitors retain INSERT-only access to the `leads` table. They cannot read existing leads. CRM read/update/delete operations and lead notes are restricted to authenticated users listed in `admin_users`.
