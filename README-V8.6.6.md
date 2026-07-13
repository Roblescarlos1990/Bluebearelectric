# VoltFlow V8.6.6 — Security Hardening

This release moves public quote submissions from direct browser-to-database inserts to the protected Vercel endpoint `/api/quote`.

Included:

- server-side Turnstile verification
- honeypot and minimum-completion-time checks
- IP, email, and phone rate limiting using hashed identifiers
- duplicate/spam controls
- geographic monitoring or restriction
- security event logging and admin dashboard
- verified admin membership checks and idle timeout
- security headers, robots.txt, AI crawler policy, and security.txt
- deployment and firewall setup guide

Run `docs/sql/V8-6-6-SECURITY-HARDENING.sql`, configure Vercel variables, and redeploy.
