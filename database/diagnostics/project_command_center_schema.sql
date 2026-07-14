select table_name,column_name,data_type,is_nullable,column_default
from information_schema.columns
where table_schema='public'
and table_name in ('project_milestones','project_tasks','project_activity','project_assignments')
order by table_name,ordinal_position;
