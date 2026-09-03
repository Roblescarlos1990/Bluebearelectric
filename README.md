# Blue Bear Electric

Production website and operations portal for Blue Bear Electric, a licensed electrical contractor serving Imperial County, California.

The repository is a static, multi-page Vercel site with serverless quote handling, Supabase-backed content and portal features, managed media, and the engineering inspection division.

Public pages use a small build-time template for shared navigation, footer content, company facts, search/social metadata, and canonical URLs. The generator also owns the public sitemap. Generated root HTML is committed, so the deployed site remains static and essential navigation never depends on client-side rendering.

## Production routes

| Area                          | Entry point                       |
| ----------------------------- | --------------------------------- |
| Public website                | `index.html`                      |
| Services                      | `services.html`                   |
| Project gallery               | `projects.html`                   |
| Quote requests                | `contact.html` and `api/quote.js` |
| Drone and thermal inspections | `engineering-inspection.html`     |
| Customer portal               | `customer-portal.html`            |
| Employee portal               | `employee-portal.html`            |
| Internal administration       | `admin.html`                      |

## Repository structure

```text
.
├── api/                  Vercel serverless endpoints
├── config/               Shared public-site facts, links, and page variants
├── assets/
│   ├── branding/         Canonical Blue Bear logo and watermark assets
│   ├── data/             Managed photo slots and generated image metadata
│   ├── images/           Source media plus generated responsive derivatives
│   └── js/               Browser behavior and feature modules
├── database/             Diagnostics, compatibility migrations, and seeds
├── docs/
│   ├── guides/           Active operating guides
│   ├── releases/         Historical release notes
│   ├── sql/              Historical Supabase bootstrap and release SQL
│   └── archive/          Legacy reference material only
├── scripts/              Local validation and deployed security checks
├── src/templates/        Build-time public header and footer templates
├── supabase/migrations/  Incremental production database migrations
├── *.html                Stable public and portal routes
├── style.css             Tokens, base styles, shared layout, and production public overrides
├── theme.css             Feature, admin, media, inspection, and intro enhancements
├── portal.css            Portal-only presentation loaded after the shared styles
├── site.webmanifest      Browser and app metadata
└── vercel.json           Routing and security headers
```

Root HTML and CSS files are intentional. Existing production URLs and root-relative image behavior depend on this static deployment structure; feature JavaScript and media belong under `assets/`. Do not hand-edit content between generated public-shell or public-SEO markers. Change shared facts and metadata in `config/site.json`, change shared markup in `src/templates/public-shell.mjs`, and regenerate the committed pages.

See [`docs/CODE-MAP.md`](docs/CODE-MAP.md) before changing runtime code. It identifies public,
portal, admin, API, database, deployment, and historical ownership boundaries.
The stylesheet load order, token ownership, responsive breakpoints, and cascade rules are in
[`docs/guides/CSS-ARCHITECTURE.md`](docs/guides/CSS-ARCHITECTURE.md).

## Local preview

The production site remains static at runtime. A simple preview still works without installing packages because generated HTML is committed:

```powershell
python -m http.server 4173
```

Open `http://127.0.0.1:4173/`. Use a private browser window when checking the one-time homepage intro.

After changing shared links, company facts, metadata, header or footer markup, install development dependencies and regenerate the public shell and sitemap before previewing:

    npm ci
    npm run site:build
    npm run site:check

## Development quality checks

Node.js 22 or newer is required for the development-only quality suite. The packages do not ship to production.

```powershell
npm ci
npm run test:install
npm run test:all
```

The first browser installation downloads an isolated Chromium runtime. Individual checks are available when working on a focused change:

| Command                         | Purpose                                                                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `npm run css:audit`             | Report stylesheet size, rules, declarations, repeated selectors, exact duplicates, breakpoints, and focal cascade definitions.  |
| `npm run css:baseline -- after` | Capture the eight documented Phase 6 homepage viewport baselines after starting the local test server automatically.            |
| `npm run site:build`            | Materialize shared public shell, search/social metadata, structured data, canonical URLs, and sitemap into committed files.     |
| `npm run site:check`            | Fail on stale generated HTML/sitemap, missing route ownership, duplicate descriptions/canonicals, or portal/admin leakage.      |
| `npm run security:audit`        | Verify enforced CSP, browser dependencies, inline-code rules, secret signatures, and required security migrations.              |
| `npm run security:test`         | Exercise quote API origin, payload, validation, rate-limit, Turnstile, and sensitive-error behavior with isolated mocks.        |
| `npm run format:check`          | Check runtime HTML, CSS, API and browser JavaScript, tooling, tests, workflow files, JSON, and active Markdown with Prettier.   |
| `npm run media:build`           | Regenerate responsive AVIF/WebP derivatives, app icons, image metadata, inventory, and runtime image markup.                    |
| `npm run lint:html`             | Validate all runtime HTML with `html-validate`.                                                                                 |
| `npm run lint:css`              | Check active root stylesheets with Stylelint.                                                                                   |
| `npm run lint:js`               | Check active API, browser, test, and script JavaScript with ESLint.                                                             |
| `npm run validate:site`         | Run the repository metadata, asset-reference, and JavaScript syntax validator.                                                  |
| `npm run test:links`            | Verify local runtime links, assets, and URL fragments.                                                                          |
| `npm run test:accessibility`    | Scan the primary public conversion pages with axe and fail on accessibility regressions beyond the recorded baseline.           |
| `npm run test:browser`          | Run Chromium smoke tests for navigation, mobile behavior, services, gallery, form validation, portals, and horizontal overflow. |
| `npm run test:browser:headed`   | Run the browser smoke suite with a visible Chromium window for debugging.                                                       |
| `npm run test:all`              | Run the complete production quality gate in CI order.                                                                           |

Playwright records screenshots, traces, and video only when a browser test fails. GitHub Actions uploads `playwright-report/` and `test-results/` on failure. Configure the `Phase 1 quality gate / Formatting, lint, accessibility, and browser tests` check as required in the `main` branch ruleset before merging cleanup pull requests.

## Validation

Run the repository validator before publishing:

```powershell
node scripts/validate-site.mjs
```

The validator checks HTML metadata, local links and assets, the web manifest, and JavaScript syntax.

Search metadata ownership, published-claim rules, Android installation, Safari Add to Home Screen, and the deliberate no-offline decision are documented in [`docs/guides/SEARCH-AND-INSTALLABILITY.md`](docs/guides/SEARCH-AND-INSTALLABILITY.md).

The enforced browser policy, pinned browser dependency, quote abuse controls, Supabase RLS/storage review, required server secrets, and Phase 9 release order are documented in [`docs/guides/SECURITY-HARDENING.md`](docs/guides/SECURITY-HARDENING.md).

For a deployed preview, also run:

```powershell
node scripts/security-smoke-test.mjs https://your-preview-domain.example
```

Then verify the homepage, mobile navigation, service pages, project filters and lightbox, quote form validation, and authenticated portal entry points.

## Brand assets

`assets/branding/blue-bear/logo-mark-solid.png` is the canonical solid-color bear mark used by the homepage intro, favicon, and app metadata. The original artwork is retained separately; other logo variants support documents, watermarks, and wider placements.

The generated browser and install icons are `favicon.ico`, Apple touch 180×180, app 192×192 and 512×512, and maskable 512×512. The maskable version deliberately has a larger safe zone so launchers do not crop the bear or lightning bolt.

## Image pipeline

Source photographs stay in their existing stable locations. Responsive AVIF and WebP derivatives live under `assets/images/optimized/`; generated brand derivatives live under `assets/branding/blue-bear/optimized/`. Do not edit generated derivatives by hand.

Install the pinned media dependency and rebuild after replacing a source image:

```powershell
python -m pip install -r requirements-media.txt
npm run media:build
npx prettier --write "*.html" docs/IMAGE-INVENTORY.md assets/data/image-variants.json
npm run test:all
```

`npm run media:compress-sources` is an intentional one-time fallback recompression task, not the normal update command. Full operating details, ownership boundaries, and rollback notes are in [`docs/guides/MEDIA-PIPELINE.md`](docs/guides/MEDIA-PIPELINE.md).

## Content and data

- Page-specific marketing copy lives in root HTML outside generated public-shell markers.
- Shared public links and company facts live in `config/site.json`; header and footer markup lives in `src/templates/public-shell.mjs`.
- Managed public content and media use Supabase.
- Permanent image locations are registered in `assets/data/photo-slots.json`.
- New database changes belong in `supabase/migrations/`; historical bootstrap SQL remains in `docs/sql/` and `database/` as documented in `docs/ACTIVE-SQL-MIGRATIONS.md`.
- Historical files under `docs/archive/` and `docs/releases/` must not be restored to the runtime root.

## Deployment

Deploy the repository root to Vercel. Do not configure a subdirectory as the project root. Required environment variables and the release checklist are documented in `docs/DEPLOYMENT.md`.

Never commit secrets, service-role keys, customer data, or local environment files.
