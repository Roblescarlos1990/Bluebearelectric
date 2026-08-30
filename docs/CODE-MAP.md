# Runtime Code Map

This map identifies the files that currently participate in the production site. A version suffix
records the release lineage of a module; it does not mean the module is inactive. Runtime status is
determined by the script tags in the root HTML pages.

## Safe change boundaries

| Work area                      | Primary files                                                                         | Required care                                                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Shared public shell            | `config/site.json`, `src/templates/public-shell.mjs`, `scripts/build-shared-html.mjs` | Regenerate committed HTML; never move essential navigation to client-side rendering.                                        |
| Public copy and page structure | Root marketing HTML outside generated shell markers                                   | Preserve filenames, links, form names, `data-*` hooks, and script order.                                                    |
| Public styling                 | `style.css`, `theme.css`                                                              | Preserve cascade order and verify desktop and mobile screenshots.                                                           |
| Public interactions            | Public/shared modules listed below                                                    | Keep selectors, storage keys, URL parameters, and events stable.                                                            |
| Employee and admin portals     | Portal HTML, `portal.css`, and portal/admin modules                                   | Test authentication entry points; do not change Supabase table or field names casually.                                     |
| Quote delivery                 | `contact.html`, `index.html`, `assets/js/contact-backend.js`, `api/quote.js`          | Never submit a live test without approval. Preserve Turnstile, email, and database contracts.                               |
| Database                       | `supabase/migrations/`                                                                | Add a new migration; do not edit an applied migration. `docs/sql/` and `database/` are historical or diagnostic references. |
| Deployment                     | `vercel.json`, `.github/workflows/`, `docs/DEPLOYMENT.md`                             | Verify headers, routes, environment-variable requirements, and the full quality gate.                                       |

## Stylesheets

| File         | Purpose                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------ |
| `style.css`  | Shared design foundation: layout, navigation, cards, forms, page grids, utilities, and responsive rules.           |
| `theme.css`  | Blue Bear brand layer: tokens, cinematic intro, premium visual treatments, motion, and page-specific presentation. |
| `portal.css` | Employee authentication, employee workspace, password reset, and employee-administration layouts.                  |

Do not merge or reorder stylesheet rules as part of formatting-only work. The root location is
intentional because deployed HTML and image URLs depend on the current static-site structure.

## Build-time public shell

The public header, footer, company facts, navigation links, footer links, phone number, service
area, license, credentials, and canonical routes are materialized at build time. Edit shared data
in `config/site.json`, edit shell markup in `src/templates/public-shell.mjs`, then run
`npm run site:build`. The root HTML outputs are committed so all navigation and content work with
JavaScript disabled.

The standalone security policy is intentionally listed without the marketing header and footer.
Portal and admin pages remain outside this public generator and retain their separate layouts.

## Public and shared browser modules

| Module                              | Purpose                                                                                                        |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `blue-bear-3d-carousel.js`          | Enhances service-page galleries with the shared Blue Bear carousel interaction.                                |
| `brand-experience.js`               | Runs the logo-only intro and shared brand/reveal behavior.                                                     |
| `company-profile.js`                | Applies shared company profile and contact information to marked page elements.                                |
| `contact-backend.js`                | Validates quote forms, loads security configuration, and submits approved requests to `/api/quote`.            |
| `engineering-inspection-v9.js`      | Powers the public drone and thermal-inspection experience.                                                     |
| `home-systems-v8-9-2.js`            | Powers residential home-system cards and interactions.                                                         |
| `photo-slots-v9-1-2.js`             | Replaces registered public images with published Supabase photo-slot overrides.                                |
| `project-gallery.js`                | Handles project filters, keyboard interaction, and the project lightbox.                                       |
| `public-content.js`                 | Applies published Supabase content, service, and portfolio overrides.                                          |
| `service-experience.js`             | Handles service-page technical selectors and related visual details.                                           |
| `service-photo-3d-v8-9-6.js`        | Adds pointer depth and lightbox behavior to service photography.                                               |
| `site-shell.js`                     | Owns shared navigation, mobile-menu state, and common shell behavior.                                          |
| `supabase-config.js`                | Exposes the public Supabase project URL and publishable browser key. It must never contain a service-role key. |
| `theme-loader.js`                   | Restores saved theme variables for the customization workflow.                                                 |
| `typical-project-prefill-v8-9-4.js` | Prefills the estimate form from approved project query parameters.                                             |

## Active portal and administration modules

| Module                               | Purpose                                                                                       |
| ------------------------------------ | --------------------------------------------------------------------------------------------- |
| `admin-backend.js`                   | Core VoltFlow administrator authentication, data loading, and operational CRUD workflows.     |
| `admin-employee-portal-v1.js`        | Employee-account approval, form review, announcements, and employee documents.                |
| `billing-v8-6.js`                    | Estimating, invoice, and billing workflows.                                                   |
| `blue-bear-documents-v8-9.js`        | Shared company-brand data used by generated business documents.                               |
| `carousel-manager-v8-9-2.js`         | Administration for managed website carousel items.                                            |
| `content-manager.js`                 | Administration for published site content, services, and portfolio records.                   |
| `crm-v8-5.js`                        | Lead and customer relationship workflow in the admin application.                             |
| `customizer.js`                      | Theme controls on `customize.html`.                                                           |
| `document-studio-v8-8-1.js`          | Branded document templates and document-studio controls.                                      |
| `employee-portal-v1.js`              | Current employee sign-in, approval state, time, forms, announcements, and documents.          |
| `engineering-inspection-admin-v9.js` | Administration for engineering-inspection records and content.                                |
| `experience-v8-8-1.js`               | Admin experience enhancements shared by the operations workspace.                             |
| `media-v8-7-2.js`                    | Managed media library and upload workflows.                                                   |
| `operations-intelligence-v8-8.js`    | Operational metrics and intelligence panels.                                                  |
| `photo-slot-admin-v9-1-2.js`         | Individual website photo-slot search, upload, and publishing controls.                        |
| `project-command-center-v8-7.js`     | Project workspace, milestones, estimates, schedule, and customer context.                     |
| `reset-password-v1.js`               | Supabase password-update flow on `reset-password.html`.                                       |
| `security-dashboard.js`              | Security-event summaries and monitoring panels.                                               |
| `v6-3-command-center.js`             | Earlier command-center reporting panels still loaded by `admin.html`.                         |
| `v6-4-ai-ops.js`                     | Client-side drafting helpers for operational documents.                                       |
| `v6-5-doc-center.js`                 | Printable project, estimate, invoice, and schedule document exports.                          |
| `v6-7-field-ops-admin.js`            | Admin summaries for field reports, JSA forms, vehicles, materials, and completion checklists. |

## Inactive historical browser modules

These files are retained for reference but are not loaded by any current root HTML route:

| Module                          | Status                                                                                   |
| ------------------------------- | ---------------------------------------------------------------------------------------- |
| `customer-portal.js`            | Historical customer portal. `customer-portal.html` now redirects to the employee portal. |
| `customer-experience-v8-7-2.js` | Historical enhancement for the retired customer portal.                                  |
| `employee-portal.js`            | Earlier employee field-operations portal, superseded by `employee-portal-v1.js`.         |

Do not reconnect an inactive module by adding a script tag without a dedicated functional and
security review. Removal should happen only in a later dead-code phase after history and database
dependencies are checked.

## Serverless API modules

| Module                   | Purpose                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| `api/quote.js`           | Validates and rate-limits quote requests, records approved data, and coordinates notification delivery. |
| `api/security-config.js` | Returns public Turnstile and geographic-monitoring configuration to the quote form.                     |

Secrets belong in deployment environment variables. Never commit email credentials, service-role
keys, customer information, or production test data.
