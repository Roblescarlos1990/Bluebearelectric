# Blue Bear Electric V9.0 — Engineering Inspection Division

## New public service

`engineering-inspection.html`

The page includes:

- Aerial visual inspection services
- Drone thermal diagnostics
- Solar and BESS inspection capabilities
- Electrical infrastructure inspection
- Commercial roof and construction-progress documentation
- Emergency assessment
- Interactive Visual / Thermal / Blended viewer
- An anonymized high-voltage electrical case study
- Professional deliverables
- Industries served
- Typical inspection process
- Prefilled inspection request workflow

## Privacy

The uploaded report was used only to derive generic inspection methodology and sample imagery.

The public page removes:

- Customer name
- Facility name
- Exact asset designation
- Employee or inspector name
- Exact inspection date
- Precise location
- Original filenames and report identifiers

Review all imagery before production deployment to confirm it contains no private or restricted visual details.

## Admin

A new Inspection Case Study Manager is included in the admin website-management area.

Case studies save as private drafts by default and must be explicitly published.

## Supabase

Run:

`docs/sql/V9-0-ENGINEERING-INSPECTION-DIVISION.sql`

## Deployment test

1. Push the complete repository.
2. Run the SQL migration.
3. Open `/engineering-inspection.html`.
4. Test Visual / Thermal / Blended switching.
5. Test the sample-image lightbox.
6. Click Request an Inspection and confirm the quote form is prefilled.
7. Open Admin and create an anonymized inspection case-study draft.
