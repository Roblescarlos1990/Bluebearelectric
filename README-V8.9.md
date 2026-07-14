# VoltFlow V8.9 — Company Brand & Document Experience

## Included

- Blue Bear Electric public-site intro screen
- Intro appears once per browser session and never creates a fixed artificial delay
- Real Blue Bear bear-and-lightning logo integrated as the primary company mark
- Optimized transparent, compact, document, and watermark logo variants
- Subtle background watermark on Blue Bear public and portal pages
- VoltFlow remains the primary identity inside operational software
- Blue Bear remains the active company identity
- Reusable `company-profile.js` brand configuration
- Supabase `company_profiles` foundation
- Reusable branded document shell
- Blue Bear document header, footer, status label, logo, and print-safe watermark
- Updated estimate, proposal, AI export, billing, and Document Studio print outputs
- Print / Save PDF support through the browser
- Existing project, customer, quote, security, media, and operations functions preserved

## Installation

1. Replace the current repository contents with this package.
2. Commit and push through GitHub Desktop.
3. Run `docs/sql/V8-9-COMPANY-BRAND-DOCUMENT-EXPERIENCE.sql` in Supabase SQL Editor.
4. Allow Vercel to redeploy.
5. Open the public homepage in a new browser session to test the intro.
6. Print an estimate or Document Studio document to verify the watermark.

## Brand asset structure

`assets/branding/blue-bear/`

- `logo-primary.png`
- `logo-mark.png`
- `document-logo.png`
- `watermark-dark.png`
- `watermark-print.png`

## Watermark behavior

- Public website opacity: approximately 6.5%
- Printed document opacity: approximately 5.5%
- No large watermark across the VoltFlow operational dashboard
- Values can be changed in `company-profile.js`

## Architecture

- VoltFlow = software platform
- Blue Bear Electric = active company identity
