Blue Bear Electric V6.4 - AI Operations Center

What's added:
- AI Operations Center inside admin.html
- Manual local AI-style generators, no OpenAI API key required
- Proposal generator
- Scope of Work generator
- Estimate planning draft
- Customer email writer
- Safety/JSA notes
- Troubleshooting plan
- Maintenance PM plan
- Inspection report draft
- Saved drafts in browser localStorage
- Optional Supabase table for future saved drafts

Install:
1. Upload/replace the full folder in GitHub.
2. Let Vercel redeploy.
3. Hard refresh /admin.html.
4. Optional: run V6-4-SQL.sql in Supabase for future server-side draft saving.

Notes:
- This version keeps AI inside the admin and does not call any external AI API.
- Drafts are generated from form input plus the currently open project where possible.
