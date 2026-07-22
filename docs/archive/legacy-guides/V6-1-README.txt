Blue Bear Electric V6.1 - Project Workspace Polish

What's new:
- Polished project cards with progress bars and job metrics.
- Activity Timeline tab for recent projects, files, invoices, and schedule items.
- Lightbox viewer for project photos.
- Closeout checklist UI inside each project workspace.
- Better KPI cards and mobile-friendly admin polish.

Deploy steps:
1. Upload/replace the full extracted folder in GitHub.
2. Let Vercel redeploy.
3. Hard refresh /admin.html.
4. No new SQL is required if V6-SQL.sql was already run.

Recommended test:
- Open /admin.html
- Open a project card
- Upload a photo and click it to test lightbox
- Add estimate item
- Create invoice
- Add schedule event
- Open Activity tab
