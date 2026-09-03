# Phase 1 — Automated Quality Foundation

Completed on August 27, 2026, on `cleanup/safety-foundation` after the Phase 0 gate passed.

## Scope

Phase 1 adds development-only formatting, linting, link, accessibility, and browser checks. It does not change public HTML, active stylesheets, browser feature modules, API behavior, portal behavior, database code, URLs, or production deployment configuration.

## Tooling

| Tool          | Version | Coverage                                                                                                   |
| ------------- | ------- | ---------------------------------------------------------------------------------------------------------- |
| Prettier      | 3.9.6   | Tooling, tests, workflow files, JSON, and Markdown. Runtime source formatting remains deferred to Phase 2. |
| ESLint        | 10.9.1  | Active API, browser, test, and repository scripts.                                                         |
| Stylelint     | 17.14.1 | `style.css`, `theme.css`, and `portal.css`.                                                                |
| html-validate | 11.10.0 | All root runtime HTML pages.                                                                               |
| Playwright    | 1.62.1  | Chromium browser smoke and responsive tests.                                                               |
| axe-core      | 4.13.0  | Accessibility regression scans for the primary public conversion pages.                                    |

The isolated local server returns a disabled Turnstile configuration and rejects quote submissions. Automated tests therefore cannot create leads, send email, or mutate Supabase.

## Required commands

All requested commands are available:

- `npm run format:check`
- `npm run lint:html`
- `npm run lint:css`
- `npm run lint:js`
- `npm run test:links`
- `npm run test:accessibility`
- `npm run test:browser`
- `npm run test:all`

`npm run validate:site` preserves the repository's original validator, and `npm run test:install` installs the isolated Playwright Chromium runtime.

## Verification result

`npm run test:all` passes with:

- Prettier format check: pass.
- HTML lint: pass.
- CSS lint: pass.
- JavaScript lint: pass.
- Repository validator: pass — 20 HTML pages, 54 active JavaScript files, and local references.
- Link and fragment test: pass — 19 runtime root HTML pages.
- Accessibility regression suite: pass — 4 pages.
- Browser smoke suite: pass — 8 tests.

The browser suite verifies:

- Homepage rendering without JavaScript runtime errors.
- Desktop navigation.
- Mobile-menu open and close behavior.
- Estimate call-to-action routing.
- `tel:7602348306` preservation.
- All six service-card destinations.
- Project filtering, project images, and lightbox behavior.
- Required estimate-form errors without network submission.
- Customer redirect, employee entry, and admin entry.
- No horizontal overflow on all eleven public routes at 390 pixels.

The final app-browser gut check found meaningful homepage content, eleven desktop navigation links, no framework error overlay, no console warnings or errors, and no horizontal overflow. The post-intro appearance remains consistent with the Phase 0 baseline.

## Recorded accessibility debt

The regression baseline records existing issues without hiding them:

- `/services.html`: five `image-alt` nodes.
- `/projects.html`: one `color-contrast` node.

Any increase fails Phase 1 CI. Phase 3 owns correcting these existing accessibility findings and then reducing the baseline to zero.

## CI protection

`.github/workflows/quality.yml` runs the complete gate on pull requests to `main` and pushes to `main` or `cleanup/**`. Browser screenshots, traces, videos, and the HTML report are uploaded for failed runs.

After the workflow has run on GitHub, the repository's `main` ruleset must require `Phase 1 quality gate / Formatting, lint, accessibility, and browser tests`. The workflow supplies the required check; enabling the repository ruleset is an external repository setting.

## Phase 1 gate

| Requirement                                              | Status |
| -------------------------------------------------------- | ------ |
| All new automated checks pass against the unchanged site | Pass   |
| No visual or functional changes introduced               | Pass   |
| Primary public conversion paths covered                  | Pass   |
| Failure screenshots retained                             | Pass   |
| Pull-request workflow added                              | Pass   |

**Overall local status: PASS.** Remote CI and the required-check ruleset can be confirmed after the branch is pushed.
