# Production Deployment

Phase 9 status as of September 3, 2026: pull request #4 is merged, its Vercel production deployment succeeded, the production V9.4.0 migration is applied, leaked-password protection is enabled, and the Supabase security advisor reports no security lints. Pull requests #5 and #6 completed the documentation and migration-history filename follow-ups.

## Before deployment

1. Review and run pending operational Supabase migrations in `supabase/migrations/`; use `docs/sql/` only for historical bootstrap migrations. V9.4.0 was applied to production on September 3, 2026 and must not be rerun.
2. Confirm Vercel environment variables are configured for Production and Preview.
3. Verify the `site-media` Supabase Storage bucket exists and has the intended policies.
4. Run `npm run site:build` and commit any regenerated public HTML.
5. Run `npm run test:all` locally; this includes the shared-shell synchronization and route checks.
6. Run `npm run security:audit` and `npm run security:test`.
7. Run `node scripts/security-smoke-test.mjs` against the deployed preview when applicable.
8. Confirm Supabase leaked-password protection is enabled and the security advisor is clear. This gate passed for Phase 9 on September 3, 2026; repeat the check before future authentication releases.

## Deploy

1. Commit the complete repository.
2. Push to the production Git branch.
3. Wait for the Vercel deployment to complete.
4. Test the homepage in a private browser window so the intro plays.
5. Submit one clearly labeled test quote request only with explicit approval.
6. Verify Admin media controls, customer portal and employee portal.

## Required checks

- Header and primary navigation visible
- Shared public HTML and canonical routes are synchronized
- Quote endpoint returns a successful response
- No secrets exposed in browser source
- Enforced CSP reports no browser violations
- Anonymous users cannot read private Supabase tables or insert leads directly
- Admin routes require authentication
- Mobile navigation works
- Favicon and installed-app icon use the Blue Bear mark
- Reduced-motion users do not receive the cinematic intro
- Image overrides and carousels load
- Drone and thermal page loads all imagery

## Core API security variables

Configure these in Vercel for Production and Preview:

- `SUPABASE_URL` — Blue Bear Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — server-only database key; never prefix or expose it as a public variable
- `SECURITY_HASH_SALT` — independent random server secret used to HMAC rate-limit identifiers
- `ALLOWED_ORIGIN` — optional comma-separated additional trusted origins; same-origin requests and the production Blue Bear domains are allowed by default
- `TURNSTILE_SITE_KEY` — public challenge site key returned by the security-config endpoint
- `TURNSTILE_SECRET_KEY` — server-only verification key
- `TURNSTILE_ALLOWED_HOSTNAMES` — optional comma-separated additional challenge hostnames; the request host and production domains are allowed by default

Optional controls:

- `ALLOWED_QUOTE_COUNTRIES` — defaults to `US,CA,MX`
- `GEO_MODE` — `monitor` by default; use `restrict` only after reviewing legitimate traffic
- `OPENAI_API_KEY` — server-only; omit to use the deterministic acknowledgement copy
- `OPENAI_EMAIL_MODEL` — optional acknowledgement model override

## Quote email variables

Configure these in Vercel for Production and Preview, then create a new deployment:

- `RESEND_API_KEY` — provisioned by the Resend integration
- `RESEND_EMAIL_DOMAIN` — verified sending domain provisioned by the Resend integration
- `ADMIN_NOTIFICATION_EMAIL` — internal recipient for new estimate notifications

Optional overrides:

- `ADMIN_FROM_EMAIL` — defaults to `Blue Bear Electric <estimates@${RESEND_EMAIL_DOMAIN}>`
- `ADMIN_REPLY_TO_EMAIL` — defaults to `ADMIN_NOTIFICATION_EMAIL`

