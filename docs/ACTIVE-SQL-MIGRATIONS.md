# Active SQL Migration Index

Run migrations in historical order when creating a database from scratch. For an existing production database, apply only migrations not already recorded in `voltflow_schema_migrations`.

Current feature migrations include:

- V8.9 company branding and document experience
- V8.9.2 website carousel manager
- V8.9.6 unified service carousels
- V9.0 engineering inspection division
- V9.1.2 individual website photo slots

Never rerun a destructive statement without reviewing it first.
