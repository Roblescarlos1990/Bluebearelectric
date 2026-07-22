# Blue Bear / VoltFlow V8.9.4 — Request Routing & Logo Refinement

## Changes

- Removed the Customer Reviews section from the homepage.
- Connected every existing Typical Project CTA to the Free Estimate form.
- Typical Project requests now preselect the correct service.
- The project name and a professional scope summary are inserted automatically.
- A visible selected-project banner confirms what the customer requested.
- Added a Clear control so the customer can reset the prefilled request.
- Rebuilt the Blue Bear intro asset from the original logo without destructive background removal.
- Added a high-definition WebP intro logo and solid dark-field navigation logo.
- Replaced the legacy website JPG logo with a higher-quality progressive image.

## Typical Project routing

- Residential Panel Upgrade → Residential
- Warehouse Lighting Retrofit → Commercial
- MCC Preventive Maintenance → Industrial
- Combiner Box Corrective Repair → Solar / BESS

## SQL

No Supabase SQL migration is required.

## Test

1. Open each service page.
2. Scroll to Typical Project.
3. Click its yellow request button.
4. Confirm the Contact page opens at the estimate form.
5. Confirm the service and project message are prefilled.
6. Open the homepage in an incognito window.
7. Confirm the Blue Bear intro logo is cleaner and more solid.
