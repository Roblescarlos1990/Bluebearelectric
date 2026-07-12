-- VoltFlow V8.6 Professional Estimating & Billing
-- Run after V8.5. Safe to run more than once.

alter table public.estimates
  add column if not exists customer_id uuid references public.customers(id) on delete set null,
  add column if not exists valid_until date,
  add column if not exists scope_of_work text,
  add column if not exists exclusions text,
  add column if not exists warranty_text text,
  add column if not exists terms_text text,
  add column if not exists markup_percent numeric default 0,
  add column if not exists tax_percent numeric default 0,
  add column if not exists discount_amount numeric default 0,
  add column if not exists deposit_percent numeric default 0,
  add column if not exists cost_total numeric default 0,
  add column if not exists markup_amount numeric default 0,
  add column if not exists tax_amount numeric default 0,
  add column if not exists sent_at timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists updated_at timestamptz default now();

alter table public.estimate_items
  add column if not exists estimate_id uuid references public.estimates(id) on delete cascade,
  add column if not exists category text default 'Material',
  add column if not exists unit text default 'ea',
  add column if not exists cost numeric default 0,
  add column if not exists sort_order integer default 0,
  add column if not exists notes text;

alter table public.invoices
  add column if not exists estimate_id uuid references public.estimates(id) on delete set null,
  add column if not exists customer_id uuid references public.customers(id) on delete set null,
  add column if not exists customer_po text,
  add column if not exists amount_paid numeric default 0,
  add column if not exists notes text,
  add column if not exists sent_at timestamptz,
  add column if not exists paid_at timestamptz,
  add column if not exists updated_at timestamptz default now();

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references public.invoices(id) on delete cascade,
  description text not null,
  category text default 'Service',
  quantity numeric default 1,
  unit text default 'ea',
  unit_price numeric default 0,
  total numeric generated always as (quantity * unit_price) stored,
  sort_order integer default 0,
  created_at timestamptz default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references public.invoices(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  amount numeric not null check (amount > 0),
  payment_date date default current_date,
  method text default 'Check',
  reference text,
  notes text,
  created_by uuid,
  created_at timestamptz default now()
);

create table if not exists public.change_orders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  estimate_id uuid references public.estimates(id) on delete set null,
  change_order_number text,
  title text not null,
  description text,
  amount numeric default 0,
  status text default 'Draft',
  approved_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.estimate_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text,
  description text,
  scope_of_work text,
  exclusions text,
  warranty_text text,
  terms_text text,
  default_markup_percent numeric default 0,
  default_tax_percent numeric default 0,
  default_deposit_percent numeric default 0,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.estimate_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.estimate_templates(id) on delete cascade,
  category text default 'Material',
  description text not null,
  quantity numeric default 1,
  unit text default 'ea',
  unit_price numeric default 0,
  cost numeric default 0,
  sort_order integer default 0
);

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  activity_type text not null,
  title text not null,
  details text,
  reference_table text,
  reference_id uuid,
  created_by uuid,
  created_at timestamptz default now()
);

alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;
alter table public.change_orders enable row level security;
alter table public.estimate_templates enable row level security;
alter table public.estimate_template_items enable row level security;
alter table public.activity_log enable row level security;

-- Reusable admin-only policies.
do $$
declare t text;
begin
  foreach t in array array['invoice_items','payments','change_orders','estimate_templates','estimate_template_items','activity_log'] loop
    execute format('drop policy if exists "Admins manage %s" on public.%I', t, t);
    execute format('create policy "Admins manage %s" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t, t);
  end loop;
end $$;

grant select, insert, update, delete on public.estimates to authenticated;
grant select, insert, update, delete on public.estimate_items to authenticated;
grant select, insert, update, delete on public.invoices to authenticated;
grant select, insert, update, delete on public.invoice_items to authenticated;
grant select, insert, update, delete on public.payments to authenticated;
grant select, insert, update, delete on public.change_orders to authenticated;
grant select, insert, update, delete on public.estimate_templates to authenticated;
grant select, insert, update, delete on public.estimate_template_items to authenticated;
grant select, insert, update, delete on public.activity_log to authenticated;

insert into public.estimate_templates (name, category, description, scope_of_work, exclusions, warranty_text, terms_text, default_markup_percent, default_tax_percent, default_deposit_percent)
values
('Residential Panel Upgrade','Residential','Reusable panel-upgrade starting point','Provide labor, material, permits, coordination, removal of existing equipment, installation of new listed service equipment, labeling, testing, and cleanup as defined by the approved proposal.','Utility upgrades, trenching, drywall repair, painting, hazardous-material remediation, and work not specifically listed are excluded unless added by change order.','Workmanship warranty applies to Blue Bear Electric installation labor. Manufacturer warranties remain subject to manufacturer terms.','Proposal is subject to site verification, permitting, utility requirements, and material availability.',15,0,25),
('Commercial Lighting Retrofit','Commercial','Warehouse, office, or retail lighting retrofit','Survey existing lighting, furnish and install approved fixtures and controls, remove designated equipment, test operation, label controls, and provide closeout documentation.','Ceiling repair, hazardous-material abatement, structural modifications, and after-hours work unless specifically included.','Workmanship warranty applies to installed work; fixture warranties follow manufacturer terms.','Pricing assumes reasonable access and a coordinated work window.',18,0,30),
('Industrial Service & Troubleshooting','Industrial','Industrial diagnostics and repair starting point','Perform safe electrical troubleshooting, document findings, identify failed components, complete approved repairs, test operation, and provide service notes.','Production losses, manufacturer engineering, replacement components not listed, and energized work unless specifically authorized.','Repair workmanship is warranted; existing equipment condition and unrelated failures are excluded.','Final billing may reflect authorized time and material beyond the initial diagnostic allowance.',20,0,50),
('Solar / BESS Preventive Maintenance','Energy','Renewable-energy PM starting point','Perform visual inspection, electrical checks, torque verification where authorized, cleaning observations, thermal review where included, documentation, and corrective recommendations.','Major corrective repairs, OEM software access, replacement parts, outages, and testing not listed in the approved scope.','Services are performed to documented scope; equipment warranties remain with the OEM.','Customer provides access, site safety requirements, and approved outage windows.',18,0,25)
on conflict (name) do nothing;

insert into public.estimate_template_items (template_id, category, description, quantity, unit, unit_price, cost, sort_order)
select t.id, x.category, x.description, x.quantity, x.unit, x.unit_price, x.cost, x.sort_order
from public.estimate_templates t
join (values
  ('Residential Panel Upgrade','Labor','Journeyman electrician labor',16,'hr',125,65,10),
  ('Residential Panel Upgrade','Material','Panel, breakers, fittings and conductors allowance',1,'lot',2800,2100,20),
  ('Residential Panel Upgrade','Permit','Permit and inspection allowance',1,'lot',500,500,30),
  ('Commercial Lighting Retrofit','Labor','Installation labor allowance',40,'hr',125,65,10),
  ('Commercial Lighting Retrofit','Material','Fixtures and controls allowance',1,'lot',6500,5000,20),
  ('Industrial Service & Troubleshooting','Labor','Industrial troubleshooting labor',8,'hr',165,85,10),
  ('Industrial Service & Troubleshooting','Equipment','Test equipment and service vehicle',1,'day',650,250,20),
  ('Solar / BESS Preventive Maintenance','Labor','Renewable-energy PM technician labor',24,'hr',155,80,10),
  ('Solar / BESS Preventive Maintenance','Equipment','Testing and documentation equipment allowance',1,'lot',950,350,20)
) as x(template_name,category,description,quantity,unit,unit_price,cost,sort_order)
on t.name=x.template_name
where not exists (
  select 1 from public.estimate_template_items eti where eti.template_id=t.id and eti.description=x.description
);
