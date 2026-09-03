# Phase 9 Security Hardening

This guide records the browser, API, Supabase, storage, and deployment security boundary for Blue Bear Electric. It reflects the branch audit completed on September 3, 2026. Production database changes remain pending until the V9.4.0 migration is separately approved and applied.

## Browser policy

Vercel serves an enforced Content Security Policy from `vercel.json`.

- Scripts: same-origin code, the exact Supabase browser SDK at `2.112.4`, and Cloudflare Turnstile only.
- SDK integrity: all 15 Supabase includes use the same SHA-384 integrity value and anonymous CORS.
- Inline code: executable inline scripts, inline event handlers, and inline style blocks are prohibited.
- Structured data: the shared non-executable JSON-LD block is authorized by its exact SHA-256 hash.
- Styles: stylesheets are same-origin. Six legacy layout attributes remain inventoried under `style-src-attr 'unsafe-inline'`; scripts cannot execute through attributes because `script-src-attr` is `none`.
- Images and media: same-origin assets, data/blob assets, and the Blue Bear Supabase project host only.
- Connections: same-origin requests, the Blue Bear Supabase HTTPS/WebSocket endpoints, and Cloudflare Turnstile only.
- Frames: Cloudflare Turnstile only. Third-party framing of Blue Bear pages remains denied.

Bootstrap Icons was removed because loading an entire remote font and stylesheet for five mobile icons was unnecessary. The small icons are now local inline SVG markup.

Cloudflare's runtime Turnstile loader is intentionally not pinned with Subresource Integrity because it is a provider-managed endpoint rather than an immutable versioned artifact. It remains host-scoped by CSP, loads only when both Turnstile keys are configured, and the server verifies the `quote` action.

Run `npm run security:audit` after editing HTML, `vercel.json`, browser dependencies, structured data, migrations, or secret handling. A structured-data edit changes its CSP hash and will deliberately fail the audit until reviewed.

## Quote API boundary

`api/quote.js` is the only supported public path for creating a lead.

- Same-origin and explicitly configured origins are accepted; unrelated browser origins are rejected.
- Only JSON bodies up to 24 KB are accepted.
- Required fields, field lengths, email, phone, service, and urgency are validated server-side.
- Turnstile is fail-closed when enabled and verifies the expected action and request hostname.
- IP, email, and phone rate-limit identifiers use HMAC-SHA-256 with `SECURITY_HASH_SALT`, falling back only to the server-only Supabase service key.
- Accepted submissions are limited to three per IP in 10 minutes, eight per IP per day, three per email per day, and three per phone per day.
- Supabase, Cloudflare, OpenAI, and Resend calls have bounded timeouts.
- Upstream response bodies and provider errors are never returned or written to logs.
- API responses use `no-store` and `nosniff`.

Run `npm run security:test` for the isolated abuse and sensitive-error suite. Run `node scripts/security-smoke-test.mjs https://preview.example` after every deployment.

## Supabase audit

Read-only production inspection on September 3, 2026 found:

- 54 public tables; RLS enabled on all 54.
- No public views or materialized views.
- 114 policies, including 12 intentionally anonymous/public policies.
- No policies based on editable user metadata or deprecated `auth.role()` checks.
- `is_admin()`, `is_employee()`, and `customer_id_for_user()` are security-invoker functions, have fixed empty search paths, and are executable only by authenticated/service roles.
- `purge_old_security_logs()` is the only `SECURITY DEFINER` function; it has a fixed empty search path and is executable only by the service role.
- `employee-documents` is private, limited to 10 MB, restricted to PDF/PNG/JPEG/WebP, and scoped to an approved employee's own UUID folder or an administrator.
- `project-photos` is private. Customers can read only public gallery objects belonging to their own project; approved employees and administrators have their documented access.
- `site-media` is intentionally public for website content; uploads, updates, and deletes remain administrator-only.

The V9.4.0 migration in `supabase/migrations/20260903102607_phase_9_security_hardening.sql` adds defense in depth:

1. Removes the anonymous direct `leads` insert policy so callers cannot bypass `/api/quote`.
2. Revokes anonymous table/sequence/function privileges, then restores read-only access to the nine published-content tables.
3. Prevents an employee from inserting a time entry for another employee UUID.
4. Caps public site images at 15 MB and project photos/documents at 25 MB with explicit MIME families.
5. Removes anonymous `site-media` object listing while preserving public delivery of known URLs and administrator object access.
6. Tightens default privileges for future database objects created by the migration owner.

Do not apply this migration from a preview deployment automatically. Review and apply it once, then rerun the Supabase security advisor and the deployed smoke test.

## Remaining dashboard action

The Supabase security advisor currently reports one warning: leaked-password protection is disabled. Enable it in Supabase Auth password security, then rerun the security advisor. Reference: <https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection>.

## Required server environment

These values belong only in Vercel server environment settings:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SECURITY_HASH_SALT` (recommended independent random value)
- `TURNSTILE_SECRET_KEY`
- `RESEND_API_KEY`
- `OPENAI_API_KEY` when AI-written acknowledgements are enabled

`TURNSTILE_SITE_KEY` and the `sb_publishable_` Supabase key are designed for browser use. The browser publishable key is still constrained by grants, RLS, and storage policies.

## Release order

1. Run `npm ci`, `npm run site:check`, `npm run security:audit`, `npm run security:test`, and `npm run test:all`.
2. Deploy a branch preview and run the deployed security smoke test.
3. Review and apply the V9.4.0 Supabase migration once.
4. Verify anonymous private-table counts remain zero and repeat portal authorization checks.
5. Enable leaked-password protection and rerun the Supabase security advisor.
6. Merge only after the preview, database, and authentication gates pass.

Never include environment values, access tokens, customer records, or signed storage URLs in issues, screenshots, test fixtures, or logs.
