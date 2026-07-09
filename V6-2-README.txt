Blue Bear Electric V6.2 - Customer + Employee Portal Starter

What was added:
- customer-portal.html
- employee-portal.html
- customer-portal.js
- employee-portal.js
- V6-2-SQL.sql

Steps:
1. Upload the full extracted folder to GitHub.
2. Let Vercel redeploy.
3. Run V6-2-SQL.sql in Supabase SQL Editor.
4. Create customer/employee users in Supabase Authentication.
5. Map users to customers/employees with SQL examples below.

Customer user mapping example:
insert into public.customer_users (user_id, customer_id, role)
values ('AUTH-USER-UUID-HERE', 'CUSTOMER-ID-HERE', 'customer')
on conflict (user_id) do update set customer_id = excluded.customer_id, role='customer';

Employee user mapping example:
insert into public.employee_users (user_id, full_name, role, phone, active)
values ('AUTH-USER-UUID-HERE', 'Employee Name', 'technician', '760-000-0000', true)
on conflict (user_id) do update set full_name=excluded.full_name, role=excluded.role, phone=excluded.phone, active=true;

Test links:
/customer-portal.html
/employee-portal.html
/admin.html

Notes:
- Customer portal only shows projects tied to the mapped customer_id.
- Customer gallery only shows files where gallery.is_public = true.
- Employee portal shows projects and schedule events, and can create time entries.
