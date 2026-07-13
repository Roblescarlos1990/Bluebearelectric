# VoltFlow V8.6.6 Security Deployment Guide

## 1. Run the database migration

In Supabase SQL Editor, run:

`docs/sql/V8-6-6-SECURITY-HARDENING.sql`

Then confirm `quote_attempts` and `security_events` appear in Table Editor.

## 2. Add Vercel environment variables

Project → Settings → Environment Variables. Add them to Production and Preview:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` — server only; never place this value in browser JavaScript or GitHub
- `TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY` — server only
- `ALLOWED_ORIGIN` — comma-separated exact origins, for example `https://bluebearelectric.com,https://www.bluebearelectric.com`
- `SECURITY_HASH_SALT` — a long random value
- `ALLOWED_QUOTE_COUNTRIES` — recommended `US,CA,MX`
- `GEO_MODE` — begin with `monitor`; use `restrict` only after reviewing legitimate traffic

The existing `SUPABASE_ANON_KEY` remains safe for authenticated browser use. The service-role key must only exist in Vercel's server environment.

## 3. Create Cloudflare Turnstile keys

Create a Turnstile widget for the production domain and copy its Site Key and Secret Key into Vercel. The form automatically enables Turnstile when both variables are available.

## 4. Redeploy

Environment variables only affect new deployments. Redeploy after saving them.

## 5. Test the quote flow

- Submit one legitimate estimate request.
- Confirm it appears in `public.leads` with source `website-secure-api`.
- Confirm `quote_attempts` has an accepted record.
- Confirm `security_events` has `quote_accepted`.
- Submit the form repeatedly and confirm the API eventually returns HTTP 429.
- Confirm no anonymous browser insert policy remains on `public.leads`.

## 6. Vercel Firewall setup

In Vercel Firewall:

1. Enable Bot Protection in **Log** mode first.
2. Review Firewall Observability for 24–48 hours.
3. Change Bot Protection to **Challenge**.
4. Enable AI Bots ruleset in **Log** mode, then choose Deny if the robots policy matches your preference.
5. Add an application rate-limit rule for `/api/quote` as a second layer. Start in Log mode before enforcing.

Do not place a reverse proxy in front of Vercel only for bot protection. Vercel documents that reverse proxies can degrade its bot-detection signals.

## 7. Admin security

- Enable MFA for every owner/admin in Supabase Authentication.
- Use separate user accounts; never share credentials.
- Review `admin_users` and remove unused accounts.
- VoltFlow now verifies both an active Supabase session and membership in `admin_users` before loading the dashboard.
- Admin sessions automatically sign out after 30 minutes of inactivity.

## 8. Headers and crawler policy

`vercel.json` now adds HSTS, frame protection, no-sniff, restrictive permissions, cache controls, and a Content-Security-Policy-Report-Only header.

Keep CSP in report-only mode until all pages, Supabase authentication, Turnstile, exports, and images are tested. Then tighten and enforce it in a later release.

`robots.txt` allows traditional search and user-initiated AI retrieval, while asking major AI-training crawlers not to crawl. Robots rules are advisory and are not a security boundary.

## 9. Monitoring

Open Admin → Security to review accepted requests, blocked spam, rate limits, countries, and recent security events.

Security logs retain hashes rather than raw IP addresses. Run `select public.purge_old_security_logs();` periodically according to your retention policy.
