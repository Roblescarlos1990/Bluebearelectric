# Active SQL Migration Index

Run migrations in historical order when creating a database from scratch. For an existing production database, apply only migrations not already recorded in `voltflow_schema_migrations`.

Current feature migrations include:

- V8.9 company branding and document experience
- V8.9.2 website carousel manager
- V8.9.6 unified service carousels
- V9.0 engineering inspection division
- V9.1.2 individual website photo slots

Current operational migration:

- `supabase/migrations/20260822155652_database_hardening.sql` — V9.3.1 RLS hardening, authorization-helper cleanup, migration-history access, and foreign-key indexes
- `supabase/migrations/20260903102607_phase_9_security_hardening.sql` — V9.4.0 anonymous Data API grant reduction, protected estimate-only lead creation, and employee time-entry ownership enforcement

New operational schema changes belong in `supabase/migrations/` and should be
created with `supabase migration new <name>`. The historical SQL under
`docs/sql/` remains the bootstrap record for earlier releases.

Never rerun a destructive statement without reviewing it first.
