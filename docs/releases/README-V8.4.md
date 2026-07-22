# VoltFlow V8.4 — Content Manager + Media Library

V8.4 adds a production-minded website management layer inside the VoltFlow admin.

## Included

- Website Content Manager
- Public-site Media Library
- Services Manager
- Portfolio Publisher
- Draft / Publish / Unpublish controls
- Supabase `site-media` storage bucket
- Public content loader with safe static fallbacks
- Tenant-ready `tenant_key` fields for future SaaS expansion

## Install

1. Replace the local repository contents with this package.
2. Commit and push through GitHub Desktop.
3. Run `docs/sql/V8-4-CONTENT-MANAGER.sql` in Supabase SQL Editor.
4. Sign out and back into `/admin.html`.
5. Open **Website** in the VoltFlow sidebar.

Existing public pages remain usable even before SQL is run because the current HTML content is retained as a fallback.
