# Repository Architecture

## Why HTML remains in the root

The website is deployed as a static multi-page Vercel site. Public page filenames remain in the repository root so existing URLs such as `/industrial`, `/residential`, and `/engineering-inspection` continue working without routing changes.

## Runtime layers

1. **Public pages:** root HTML files.
2. **Presentation:** `style.css`, `theme.css`, and `portal.css`. These remain in the root because their image URLs are authored relative to the deployed root.
3. **Browser behavior:** `assets/js/`. Shared navigation and reveal behavior lives in `site-shell.js`; brand presentation lives in `brand-experience.js`.
4. **Managed media:** Supabase Storage plus `website_photo_slots` and `website_carousel_items`.
5. **Business data:** Supabase tables and RLS policies installed through incremental files in `supabase/migrations/`. Files in `docs/sql/` and `database/` are historical or diagnostic references.
6. **Server actions:** Vercel functions in `api/`.

## Media systems

- `assets/images/site/` — stable public assets.
- `assets/images/media/` — service galleries and local fallbacks.
- `assets/images/engineering-inspection/` — anonymized inspection examples.
- `assets/branding/` — production logo, watermark and intro assets.
- `assets/data/photo-slots.json` — permanent individual website image locations.

The canonical browser icon and homepage intro asset is `assets/branding/blue-bear/logo-mark-solid.png`. `site.webmanifest` provides browser and app metadata without duplicating the source artwork.

## Naming conventions

- Public page: `kebab-case.html`
- Browser module: `feature-name.js`
- SQL migration: `V<version>-DESCRIPTION.sql`
- Photo slot: `<page>-<image-purpose>-<sequence>`

## Change ownership

The complete stylesheet, browser-module, API, portal, and historical inventory is maintained in
[`CODE-MAP.md`](CODE-MAP.md). Use that map to choose the narrowest file set for a change and to
identify the required regression checks.
