# Blue Bear Electric V7 — Professional Restructure

## Why V7
V7 keeps the working public website and VoltFlow backend, but fixes asset-path drift and standardizes the repository.

## Required root files
Keep all `.html` files, `vercel.json`, `favicon.svg`, and the entire `assets/` folder.

## Folder layout
- `assets/css/` — website and theme styling
- `assets/js/` — website, Supabase, admin, portal, and field operations logic
- `assets/images/site/` — public website photos
- `docs/sql/` — database scripts and policies
- `docs/guides/` — operating and customization guides

## Deploy to GitHub/Vercel
1. Extract this ZIP.
2. Replace the repository contents with the extracted files and folders.
3. Confirm GitHub visibly shows `assets` as a folder.
4. Commit changes.
5. Vercel redeploys automatically.
6. Open `/system-check.html` first.
7. Hard refresh with Ctrl+Shift+R.

## Add or replace website photos
Upload a new image to `assets/images/site/`.
The easiest safe method is replacing an existing image while keeping the exact filename.

## Project photos
Do not place customer/project records in GitHub. Continue using the private Supabase `project-photos` bucket.
