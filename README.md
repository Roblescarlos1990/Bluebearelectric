# Blue Bear Electric — Production Website

**Current production baseline:** V9.2.0

This repository contains the live Blue Bear Electric marketing website, customer and employee portals, VoltFlow-powered admin tools, quote API, Supabase integrations, managed website media, and engineering-inspection services.

## Production entry points

- `index.html` — public homepage
- `services.html` — service overview
- `engineering-inspection.html` — drone and thermal inspection division
- `admin.html` — internal administration portal
- `customer-portal.html` — customer portal
- `employee-portal.html` — employee portal
- `api/quote.js` — secured quote-request endpoint

## Main directories

- `assets/js/` — all browser JavaScript
- `assets/images/` — website, branding, carousel and inspection media
- `assets/data/` — managed photo-slot registry
- `api/` — Vercel serverless endpoints
- `docs/sql/` — Supabase migrations
- `docs/guides/` — active operating guides
- `docs/releases/` — historical release notes
- `docs/archive/` — legacy implementation notes
- `database/` — database diagnostics, seeds and compatibility migrations
- `scripts/` — deployment and security checks

## Deployment

Deploy the repository root to Vercel. Do not set a subdirectory as the project root. Environment variables and Supabase setup are documented in `docs/DEPLOYMENT.md`.

## Production rule

Do not restore historical files from `docs/archive/` into the runtime root. New browser code belongs in `assets/js/`; new SQL belongs in `docs/sql/`.
