insert into public.project_milestones
(project_id, label, status, display_order)
select p.id, v.label,
case when p.status='Completed' then 'Completed' else 'Pending' end,
v.ord
from public.projects p
cross join (values
('Lead / Award',10),
('Planning',20),
('Material & Mobilization',30),
('Construction',40),
('Testing & Inspection',50),
('Closeout',60)
) as v(label,ord)
where not exists (
  select 1 from public.project_milestones m where m.project_id=p.id
);
