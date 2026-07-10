BLUE BEAR ELECTRIC - ADMIN DASHBOARD CONNECTION STEPS

1) Supabase tables are already created.
You should see: admin_users, leads, customers, services, projects, gallery, reviews.

2) Create the admin login user:
Supabase > Authentication > Users > Add user
Use Jonathan/staff email and a password.

3) Copy that user's UUID.

4) In SQL Editor, run this with the real UUID:
insert into public.admin_users (user_id, role)
values ('PASTE-USER-UUID-HERE', 'admin')
on conflict (user_id) do update set role = 'admin';

5) Optional but recommended security policies:
Run ADMIN-POLICIES.sql in Supabase SQL Editor.

6) Upload this full extracted folder to GitHub.
Important files to include:
- admin.html
- contact.html
- supabase-config.js
- admin-backend.js
- contact-backend.js
- style.css
- script.js
- assets folder

7) Vercel will redeploy automatically.

8) Test:
- Submit contact form on /contact.html
- Open /admin.html
- Login with the Supabase Auth user
- Confirm the new lead appears
- Change the lead status
