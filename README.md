# Blue Bear Electric V6.8 — Customization Foundation

This release keeps V6.7 functionality and reorganizes the project so it is easier to customize.

## Main folders
- `assets/css/` — global styling and theme variables
- `assets/js/` — website and admin behavior
- `assets/images/site/` — public website images
- `docs/sql/` — Supabase migrations and policy scripts
- `docs/guides/` — setup notes and prior release documentation

## Change colors and shapes
Open `customize.html` online to preview a theme. For permanent changes, copy the generated CSS into `assets/css/theme.css`.

## Add or replace photos
Upload public website photos into `assets/images/site/`.
Project/job photos uploaded inside the admin stay in Supabase Storage and should not be placed here.

## Deployment
Upload the complete extracted folder to GitHub. Do not upload only the HTML files. Vercel needs the `assets` folder too.
