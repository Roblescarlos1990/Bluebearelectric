Blue Bear Electric V5 Photo Upload Steps

1) Confirm Supabase Storage bucket exists:
   project-photos
   Private bucket: ON/private

2) Confirm these storage policies were already created successfully:
   - Admin users can upload project photos
   - Admin users can view project photos
   - Admin users can update project photos
   - Admin users can delete project photos

3) Upload this full extracted folder to GitHub.
   Important files:
   - admin.html
   - admin-backend.js
   - style.css
   - supabase-config.js
   - assets/

4) Let Vercel redeploy.

5) Test:
   - Open /admin.html
   - Log in
   - Create or confirm at least one project exists
   - Go to Project Photo Upload
   - Choose a project, category, and image
   - Click Upload to Project

6) Verify in Supabase:
   Storage -> project-photos -> project-id/category/file
   Table Editor -> gallery -> new row with image_url path

Notes:
- Bucket is private, so the dashboard creates temporary signed links for previews.
- Customers cannot see the bucket unless we later build a customer portal with its own rules.
- Public project gallery can be added later by using approved gallery items and signed/public delivery rules.
