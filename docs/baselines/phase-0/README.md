# Phase 0 — Production Baseline

Captured on August 27, 2026, before cleanup work began.

## Source-control protection

- Production repository: `Roblescarlos1990/Bluebearelectric`
- Baseline branch: `cleanup/safety-foundation`
- Baseline commit: `b2fc800cd078ffa74e2a4cb27318cbd96c6f0d4e`
- Baseline commit title: `Enable verified estimate email delivery and database hardening`
- Local annotated rollback tag: `cleanup-baseline-20260827`
- Existing Photo Center work remains isolated on `agent/production-site-polish` and was not modified.
- The cleanup worktree was clean before this evidence directory was added.
- No scripts, styles, forms, portal behavior, admin behavior, database code, or deployment configuration changed in Phase 0. The cleanup branch later received only the approved favicon and manifest head metadata needed to clear the existing validator.

Production public HTML was compared with the baseline commit after normalizing line endings and matched.

## Deployment and security checks

| Check | Result | Evidence |
| --- | --- | --- |
| Vercel deployment | Pass | GitHub reports the Vercel deployment check completed successfully for the baseline commit. |
| Production availability | Pass | `https://bluebearelectric.com/` and all listed public routes returned HTTP 200. |
| Supabase Preview check | Fail | GitHub check run `97075482860` failed after four seconds on the baseline commit. This is an existing baseline issue. |
| Security configuration endpoint | Pass | HTTP 200. |
| Quote endpoint rejects GET | Pass | HTTP 405. |
| Robots policy | Pass | HTTP 200. |
| Security contact | Pass | HTTP 200. |
| Admin no-index header | Pass | HTTP 200 response included the expected no-index policy. |

Command used for the deployed security check:

```text
node scripts/security-smoke-test.mjs https://bluebearelectric.com
```

## Validator result and approved repair

`node scripts/validate-site.mjs` does **not** pass on the unchanged baseline. It reports:

```text
admin-portal.html: missing web manifest metadata
customer-portal.html: missing favicon metadata
customer-portal.html: missing web manifest metadata
employee-portal.html: missing web manifest metadata
reset-password.html: missing web manifest metadata
```

After explicit approval, the cleanup branch added only the missing favicon and manifest `<link>` metadata to `admin-portal.html`, `customer-portal.html`, `employee-portal.html`, and `reset-password.html`. The validator now reports:

```text
PASS 20 HTML pages, 44 JavaScript files, and all local references validated.
```

The production deployment remains on the recorded baseline commit.

## Route baseline

All of these public routes returned HTTP 200:

- `/`
- `/services`
- `/industrial`
- `/commercial`
- `/residential`
- `/solar-bess`
- `/service-repair`
- `/engineering-inspection`
- `/projects`
- `/about`
- `/contact`

Private entry routes returned HTTP 200 while keeping their protected data behind authentication. Search-indexing observations:

| Route | Meta robots | `X-Robots-Tag` | Baseline observation |
| --- | --- | --- | --- |
| `/customer-portal` | `noindex` | `noindex` | Browser navigation currently redirects to `/employee-portal`. |
| `/employee-portal` | `noindex` | `noindex` | Entry page loads. |
| `/admin` | `noindex` | `noindex` | Sign-in entry loads. |
| `/customize` | `noindex` | `noindex` | Entry page loads. |
| `/system-check` | `noindex` | `noindex` | Entry page loads. |
| `/admin-portal.html` | `noindex` | Missing | Existing header inconsistency. |
| `/reset-password.html` | `noindex` | Missing | Existing header inconsistency. |

## Browser baseline

- Desktop viewport: 1440 × 1000.
- Mobile viewport: 390 × 844.
- No horizontal overflow was detected at either viewport.
- The mobile menu opened and closed, with `aria-expanded` changing as expected.
- Empty estimate submission remained on the homepage, focused `full_name`, marked three required controls invalid, and displayed: `Please complete your name, phone number, and service needed.`
- The multi-page browser sweep returned no console errors and 16 warning records. All warnings were the same Supabase category: multiple `GoTrueClient` instances sharing one storage key. Repeated navigation in the same browser context amplified the count, but the warning itself is a cleanup target.
- After explicit approval, one clearly labeled synthetic estimate was submitted to production. The request succeeded once, displayed the expected confirmation modal, and returned reference `80A8D6E8`. The test message states that it is a Phase 0 QA submission and that no customer follow-up is required.
- A clean local-origin browser pass confirmed the four repaired pages expose the intended manifest and favicon metadata, retain the customer-to-employee redirect, and produce no console warnings or errors.

## Screenshot inventory

| File | What it records |
| --- | --- |
| `desktop-homepage.png` | Homepage at the desktop viewport after the intro completes. |
| `mobile-homepage.png` | Homepage at the mobile viewport. |
| `mobile-navigation-open.png` | Expanded mobile navigation. |
| `intro-logo-reveal-fullpage.png` | The existing cinematic logo intro during the initial baseline capture. |
| `services.png` | Services page. |
| `industrial-service.png` | Individual industrial service page. |
| `project-gallery.png` | Project gallery. |
| `contact.png` | Contact page. |
| `estimate-validation-state.png` | First invalid estimate control focused. |
| `estimate-validation-message.png` | Visible estimate validation summary. |
| `estimate-confirmation.png` | Successful approved production test submission, reference `80A8D6E8`. |
| `customer-portal-entry.png` | Actual destination reached from the customer portal URL (employee portal at baseline). |
| `employee-portal-entry.png` | Employee portal entry. |
| `admin-sign-in-entry.png` | Admin sign-in entry. |

The approved test created one production estimate record and triggered the configured notification workflow. It was not retried.

## Phase 0 gate

| Requirement | Status |
| --- | --- |
| Existing validator passes | Pass — all 20 HTML pages, 44 JavaScript files, and local references validate after the approved metadata-only repair. |
| Production site is documented | Pass |
| Baseline screenshots are saved | Pass |
| Rollback point is confirmed | Pass |
| No production code has changed | Pass — production remains on the recorded baseline; the cleanup branch contains only the approved metadata repair and evidence. |

**Overall status: PASS.** Phase 1 may begin as a separate commit after this Phase 0 repair and evidence are committed.
