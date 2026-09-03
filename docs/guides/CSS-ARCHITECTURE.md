# CSS Architecture

## Load order and ownership

The deployed HTML keeps a three-file cascade. Source order is part of the compatibility contract and must not be changed casually.

| Order | Stylesheet   | Responsibility                                                                                                                                                                                                     |
| ----- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | `style.css`  | Global design tokens, reset/base styles, public navigation, shared layout, buttons/forms, public components, historical feature/admin compatibility, production public overrides, utilities, and responsive rules. |
| 2     | `theme.css`  | Feature presentation loaded after the shared sheet: admin intelligence views, media systems, engineering inspection, home systems, photo management, and the active logo-only intro.                               |
| 3     | `portal.css` | Portal-only shell and components. It is loaded only by the employee/portal experience and deliberately wins over the shared sheets.                                                                                |

The files use documented logical layers rather than native CSS `@layer`. Introducing native layers around only part of the existing CSS would reorder unlayered and layered declarations and could change the admin or portal UI without a selector changing.

## Logical layers

Use this order when adding or relocating a rule:

1. Tokens: colors, typography defaults, spacing, shadows, radii, motion, and content width.
2. Reset/base: box sizing, document/body defaults, links, and media defaults.
3. Shared layout: containers, sections, grids, navigation, header, and footer.
4. Shared controls: buttons, form fields, focus styles, validation, and notices.
5. Public components: cards, galleries, service content, reviews, and CTAs.
6. Page features: homepage, service/project pages, engineering inspection, and managed media.
7. Portal/admin compatibility: existing operational selectors stay in their present source order unless that area is being tested explicitly.
8. Utilities and responsive overrides: narrowly scoped rules at the end of the relevant feature block.

Global tokens live in the first `:root` block of `style.css`. Portal-specific tokens remain in the first `:root` block of `portal.css`. Do not recreate global color or radius values in `theme.css`; reference the shared variables instead.

## Canonical public breakpoints

New general public layout rules should use the smallest applicable breakpoint from this set:

| Breakpoint | Use                                                         |
| ---------- | ----------------------------------------------------------- |
| `1180px`   | Reduce full desktop navigation density.                     |
| `1120px`   | Collapse primary navigation and tighten two-column layouts. |
| `800px`    | Stack tablet layouts and reduce shared section spacing.     |
| `620px`    | Activate the approved compact mobile homepage/header.       |
| `560px`    | Apply final compact spacing and control sizing.             |

Feature-local `720px` image-source, `640px` intro/form, and legacy `950px` compatibility queries remain because they serve distinct assets or precede the final production overrides. Portal/admin breakpoints are compatibility boundaries and are not to be normalized during public CSS work.

Every responsive change must cover 320, 375, 390, 768, 1024, 1280, and 1440 CSS-pixel widths plus a short landscape viewport. The browser suite in `tests/browser/responsive.spec.mjs` enforces overflow, header-flow, heading visibility, and console-error checks at those sizes.

## Cascade contracts

The focal public selectors intentionally have a base definition followed by production and responsive refinements. The current winners are:

| Selector     | Winning contract                                                                                                                                                                                            |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.hero`      | Production public rule in `style.css`, then its `1120px` and `800px` responsive overrides. The earlier `950px` rule is retained compatibility.                                                              |
| `.nav`       | Production public rule, then `1120px`, `800px`, and `560px`; the `620px` mobile concept is more specific through `.blue-bear-site .nav`.                                                                    |
| `.section`   | Production public width/horizontal padding in `style.css`; `theme.css` supplies the final shared block spacing through `--section-space`.                                                                   |
| `.brand img` | Production public dimensions, then `800px`; the mobile logo is controlled by the more specific `.blue-bear-site .brand-logo-mobile` rule at `620px`.                                                        |
| `.btn`       | Base structure and motion in `style.css`; production sizing in `style.css`; `theme.css` supplies the final shared radius through `--button-radius`; page-specific button selectors may add color or layout. |
| `button`     | Production shared transition and focus-visible behavior; component selectors supply presentation.                                                                                                           |

Do not “deduplicate” a selector solely because its name repeats. A repeat at a later source position or inside a media query can be an intentional refinement. Run `npm run css:audit`, inspect the contexts and declarations, and remove a rule only when the rendered markup cannot select it or when an exact equivalent is already active.

## Safe change workflow

1. Run `npm run css:audit -- --output docs/baselines/phase-6/css-working.json --quiet`.
2. Run the focused responsive suite before editing.
3. Keep public changes under `.blue-bear-site` when a global selector could reach admin/portal HTML.
4. Re-capture a local baseline with `npm run css:baseline -- after`.
5. Run `npm run test:all` before publishing.

The Phase 6 decision log and measured cleanup are in [`docs/CSS-CASCADE-AUDIT.md`](../CSS-CASCADE-AUDIT.md).
