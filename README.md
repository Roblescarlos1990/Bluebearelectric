# Blue Bear Electric

Production website and operations portal for Blue Bear Electric, a licensed electrical contractor serving Imperial County, California.

The repository is a static, multi-page Vercel site with serverless quote handling, Supabase-backed content and portal features, managed media, and the engineering inspection division.

## Production routes

| Area | Entry point |
| --- | --- |
| Public website | `index.html` |
| Services | `services.html` |
| Project gallery | `projects.html` |
| Quote requests | `contact.html` and `api/quote.js` |
| Drone and thermal inspections | `engineering-inspection.html` |
| Customer portal | `customer-portal.html` |
| Employee portal | `employee-portal.html` |
| Internal administration | `admin.html` |

## Repository structure

```text
.
├── api/                  Vercel serverless endpoints
├── assets/
│   ├── branding/         Canonical Blue Bear logo and watermark assets
│   ├── data/             Managed photo-slot registry
│   ├── images/           Public, service, and inspection media
│   └── js/               Browser behavior and feature modules
├── database/             Diagnostics, compatibility migrations, and seeds
├── docs/
│   ├── guides/           Active operating guides
│   ├── releases/         Historical release notes
│   ├── sql/              Supabase migrations
│   └── archive/          Legacy reference material only
├── scripts/              Local validation and deployed security checks
├── supabase/migrations/  Incremental production database migrations
├── *.html                Stable public and portal routes
├── style.css             Shared layout and component styles
├── theme.css             Brand and feature-specific presentation
├── site.webmanifest      Browser and app metadata
└── vercel.json           Routing and security headers
```

Root HTML and CSS files are intentional. Existing production URLs and root-relative image behavior depend on this static deployment structure; feature JavaScript and media belong under `assets/`.

## Local preview

No build step or package installation is required.

```powershell
python -m http.server 4173
```

Open `http://127.0.0.1:4173/`. Use a private browser window when checking the one-time homepage intro.

## Validation

Run the repository validator before publishing:

```powershell
node scripts/validate-site.mjs
```

The validator checks HTML metadata, local links and assets, the web manifest, and JavaScript syntax.

For a deployed preview, also run:

```powershell
node scripts/security-smoke-test.mjs https://your-preview-domain.example
```

Then verify the homepage, mobile navigation, service pages, project filters and lightbox, quote form validation, and authenticated portal entry points.

## Brand assets

`assets/branding/blue-bear/logo-mark-solid.png` is the canonical solid-color bear mark used by the homepage intro, favicon, and app metadata. The original artwork is retained separately; other logo variants support documents, watermarks, and wider placements.

## Content and data

- Static marketing copy lives in the root HTML pages.
- Managed public content and media use Supabase.
- Permanent image locations are registered in `assets/data/photo-slots.json`.
- New database changes belong in `supabase/migrations/`; historical bootstrap SQL remains in `docs/sql/` and `database/` as documented in `docs/ACTIVE-SQL-MIGRATIONS.md`.
- Historical files under `docs/archive/` and `docs/releases/` must not be restored to the runtime root.

## Deployment

Deploy the repository root to Vercel. Do not configure a subdirectory as the project root. Required environment variables and the release checklist are documented in `docs/DEPLOYMENT.md`.

Never commit secrets, service-role keys, customer data, or local environment files.

