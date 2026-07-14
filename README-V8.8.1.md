# VoltFlow V8.8.1 — Experience Edition

## Included

- VoltFlow boot sequence and secure login transition
- Automatic scroll-to-top when changing left navigation workspaces
- Polished toast notifications
- Compact rotating customer reviews on the homepage
- Premium service cards
- Subtle iOS-style photo depth on supported service imagery
- In-app Document Studio with editable HTML, version history, restore, and Print/Save PDF
- Automatic estimate acknowledgement email
- Optional AI-generated acknowledgement using the OpenAI Responses API
- Optional admin notification email using Resend
- Safe fallback email copy when AI is not configured

## Database

Run:

`docs/sql/V8-8-1-EXPERIENCE-EDITION.sql`

## Email environment variables

Add in Vercel only when ready:

- `RESEND_API_KEY`
- `ADMIN_FROM_EMAIL`
- `ADMIN_REPLY_TO_EMAIL`
- `ADMIN_NOTIFICATION_EMAIL`

Optional AI:

- `OPENAI_API_KEY`
- `OPENAI_EMAIL_MODEL` (defaults to `gpt-5-mini`)

The quote form continues working even when email or AI is not configured. Email failures do not prevent a lead from being saved.

## Important

Resend requires a verified sending domain for production mail. Until verified, use the provider's permitted test sender. Customer reviews included in this package are starter placeholders and must be replaced with approved, authentic reviews before marketing use.
