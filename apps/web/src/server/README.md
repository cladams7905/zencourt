Server actions structure

| Type                     | Folder                 | Description                            |
| ------------------------ | ---------------------- | -------------------------------------- |
| Database-related (CRUD)  | server/actions/db/     | Direct ORM or Supabase operations      |
| External API-related     | server/actions/api/    | AWS, Stripe, etc. via services         |
| System/utility actions   | server/actions/system/ | Revalidation, feature flags, cron jobs |
| Reusable backend helpers | server/lib/            | Shared config (db, logger, env)        |
