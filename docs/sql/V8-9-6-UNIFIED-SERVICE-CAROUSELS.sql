begin;
alter table public.website_carousel_items add column if not exists caption text;
insert into public.voltflow_schema_migrations(version,description) values ('8.9.6','Unified managed carousels for all service pages') on conflict(version) do nothing;
commit;