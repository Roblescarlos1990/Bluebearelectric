# CSS Cascade Audit

## Phase 6 outcome

Phase 6 reduced the active stylesheets without intentionally changing the rendered public, portal, or admin experience.

| Metric                               |  Before |   After |     Reduction |
| ------------------------------------ | ------: | ------: | ------------: |
| CSS bytes                            | 227,444 | 206,828 | 20,616 (9.1%) |
| Lines                                |  11,070 |  10,062 |  1,008 (9.1%) |
| Rules                                |   1,896 |   1,746 |    150 (7.9%) |
| Declarations                         |   6,042 |   5,560 |    482 (8.0%) |
| Repeated-selector occurrences        |     714 |     666 |     48 (6.7%) |
| Exact duplicate rule occurrences     |       1 |       0 |      1 (100%) |
| Duplicate declarations inside a rule |       0 |       0 |             0 |

The machine-readable reports are `docs/baselines/phase-6/css-before.json` and `css-after.json`. Keyframe steps are excluded from selector-duplication counts so `from`, `to`, and percentages do not inflate the result.

## Removed safely

- Four obsolete intro implementations, their unused markup selectors, old progress/loaders, particles, voltage streaks, full-scene flashes, and private keyframes were removed from `theme.css`.
- The current `assets/js/brand-experience.js` creates only the `.bbe-cinematic-3d-intro` logo-stage markup. The retained “Public intro component — logo-only cinematic reveal” block fully defines that markup, including mobile and reduced-motion behavior.
- Duplicate global color/radius/spacing token declarations were consolidated into the first `:root` block in `style.css` with identical computed values.
- One exact duplicate admin line-table border rule was removed; the earlier identical rule still applies to the same selector.

No public page component, service-photo rule, engineering feature, portal selector, or admin feature block was removed. Historical admin/portal selectors with uncertain runtime ownership remain as compatibility rules.

## Verified cascade winners

The repeated `.hero`, `.nav`, `.section`, `.brand img`, `.btn`, and `button` definitions were inspected declaration by declaration. Their winning definitions and breakpoint order are documented in `docs/guides/CSS-ARCHITECTURE.md`. Repeats were retained whenever they supply additive declarations, responsive behavior, or deliberate later-source refinements.

## Visual and responsive proof

The homepage was captured before and after at 320×568, 375×667, 390×844, 768×1024, 844×390 landscape, 1024×768, 1280×800, and 1440×900. Each compact before/after JPEG pair has an identical SHA-256 digest.

The browser gate also checks these widths for horizontal overflow, header/main overlap, visible primary heading, and runtime errors. Representative services, projects, contact, employee portal, and admin routes are checked at mobile, landscape, and desktop sizes.

Phase 7 JavaScript cleanup is intentionally out of scope for this phase.
