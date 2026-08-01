# Production Deployment

## Before deployment

1. Run the latest required Supabase migrations in `docs/sql/`.
2. Confirm Vercel environment variables are configured for Production and Preview.
3. Verify the `site-media` Supabase Storage bucket exists and has the intended policies.
4. Run `node scripts/validate-site.mjs` locally.
5. Run `node scripts/security-smoke-test.mjs` against the deployed preview when applicable.

## Deploy

1. Commit the complete repository.
2. Push to the production Git branch.
3. Wait for the Vercel deployment to complete.
4. Test the homepage in a private browser window so the intro plays.
5. Submit one test quote request.
6. Verify Admin media controls, customer portal and employee portal.

## Required checks

- Header and primary navigation visible
- Quote endpoint returns a successful response
- No secrets exposed in browser source
- Admin routes require authentication
- Mobile navigation works
- Favicon and installed-app icon use the Blue Bear mark
- Reduced-motion users do not receive the cinematic intro
- Image overrides and carousels load
- Drone and thermal page loads all imagery
