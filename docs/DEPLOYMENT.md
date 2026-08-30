# Production Deployment

## Before deployment

1. Run pending operational Supabase migrations in `supabase/migrations/`; use `docs/sql/` only for historical bootstrap migrations.
2. Confirm Vercel environment variables are configured for Production and Preview.
3. Verify the `site-media` Supabase Storage bucket exists and has the intended policies.
4. Run `npm run site:build` and commit any regenerated public HTML.
5. Run `npm run test:all` locally; this includes the shared-shell synchronization and route checks.
6. Run `node scripts/security-smoke-test.mjs` against the deployed preview when applicable.

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
- Admin routes require authentication
- Mobile navigation works
- Favicon and installed-app icon use the Blue Bear mark
- Reduced-motion users do not receive the cinematic intro
- Image overrides and carousels load
- Drone and thermal page loads all imagery

## Quote email variables

Configure these in Vercel for Production and Preview, then create a new deployment:

- `RESEND_API_KEY` — provisioned by the Resend integration
- `RESEND_EMAIL_DOMAIN` — verified sending domain provisioned by the Resend integration
- `ADMIN_NOTIFICATION_EMAIL` — internal recipient for new estimate notifications

Optional overrides:

- `ADMIN_FROM_EMAIL` — defaults to `Blue Bear Electric <estimates@${RESEND_EMAIL_DOMAIN}>`
- `ADMIN_REPLY_TO_EMAIL` — defaults to `ADMIN_NOTIFICATION_EMAIL`
