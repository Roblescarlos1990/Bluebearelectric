# VoltFlow V8.1 — Production Polish

## Included fixes

- Homepage and contact estimate forms now submit to Supabase `public.leads`.
- Clear loading, success, and error states.
- Professional confirmation modal after successful delivery.
- Homepage form is now fully connected to the same lead dashboard as the contact page.
- Customer-facing prototype/version comments removed.
- Placeholder testimonials replaced with factual service commitments.
- Customer CTA buttons, fields, focus states, and mobile behavior polished.

## Where estimate requests go

Successful requests are inserted into the Supabase `public.leads` table with `source = website` and `status = New`. They appear in the VoltFlow admin lead dashboard. Email or SMS alerts are not included in this release and require a server-side notification service.

## Deployment

Replace the existing repository files with this package, then commit and push using GitHub Desktop. No SQL migration is required if the `leads` table and public insert policy are already working.
