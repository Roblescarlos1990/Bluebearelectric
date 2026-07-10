Blue Bear Electric V6.7 Field Operations

Added to employee portal:
- Technician Daily Report
- Safety / JSA form
- Vehicle Inspection
- Material Request
- Job Completion Checklist
- Recent Field Activity panel

Install:
1. Upload/replace full folder in GitHub.
2. Let Vercel redeploy.
3. Run V6-7-SQL.sql in Supabase SQL Editor.
4. Open employee-portal.html, hard refresh, sign in as mapped employee.
5. Test each form.

If an employee cannot save forms, confirm their Auth UID is present in public.employee_users and active=true.
