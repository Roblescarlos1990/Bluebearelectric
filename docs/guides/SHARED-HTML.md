# Shared Public HTML

## Purpose

Blue Bear Electric is still deployed as a static multi-page site. Phase 5 adds a minimal build-time
template so shared business information and public navigation cannot drift between pages. The
generated root HTML is committed to the repository; browsers and search engines receive complete
HTML without waiting for JavaScript.

## Ownership

| Source                         | Responsibility                                                                                                                                        |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| config/site.json               | Company facts, phone number, service area, license, credentials, shared link definitions, navigation order, footer lists, and per-page shell variants |
| src/templates/public-shell.mjs | The single public header renderer and single public footer renderer                                                                                   |
| scripts/build-shared-html.mjs  | Route ownership checks, canonical generation, public-shell materialization, formatting, and synchronization checks                                    |
| Root public HTML               | Committed deployment output plus page-specific content outside generated markers                                                                      |

Security-policy.html is an intentional standalone public page. Customer, employee, reset-password,
admin, customization, and system-check entry points are not processed by the public generator.

## Editing workflow

1. Update shared business facts or link destinations in config/site.json.
2. Update public header or footer markup in src/templates/public-shell.mjs only when the structure
   must change.
3. Keep page-specific body copy in the appropriate root HTML file outside the generated markers.
4. Regenerate and verify:

       npm run site:build
       npm run site:check
       npm run test:all

Do not hand-edit content between these marker pairs:

    <!-- shared:public-header:start -->
    <!-- shared:public-header:end -->

    <!-- shared:public-footer:start -->
    <!-- shared:public-footer:end -->

The next build intentionally replaces those regions.

## Route and SEO guarantees

- Every public route remains a root .html file.
- Vercel clean URLs continue to expose the same extensionless routes.
- Existing relative links and inbound .html links remain valid.
- Each public page receives one unique canonical URL on bluebearelectric.com.
- The homepage canonical is the root domain; other canonicals use the clean extensionless route.
- Essential navigation and footer content are present in the delivered HTML.
- Portal and admin layouts are checked for accidental public-shell markers.

The site:check command fails if a configured route leaves the public manifest, a public route has no
declared owner, generated output is stale, canonical URLs collide, or a portal/admin page is pulled
into the public shell.

## Page variants

The renderer retains the existing presentation variants while sourcing their shared data from one
place:

- Every public marketing page uses the same approved compact mobile navigation.
- The homepage keeps its solid bear mobile mark and menu icon.
- Primary service pages keep their capabilities footer.
- Drone and thermal inspection keeps its dedicated request action and inspection footer.
- The security policy stays standalone.

These variants preserve the rendered site while removing duplicated business data and shell markup
from maintenance workflows.

## Deployment and rollback

Vercel serves the committed root HTML and does not need a runtime templating service. Always run the
generator before publishing a branch. If a shell release must be rolled back, revert the Phase 5
commit and redeploy; no database or API rollback is involved.
