# Dev seed

Data copied from the old MongoDB (Atlas) on 2026-09-10, so features can be tried against
realistic volume. One file per table. These are not test fixtures: the integration specs
seed their own rows.

- Ids are fresh uuidv7 (time-ordered from the original ObjectIds), not the Mongo ids.
- Rows that broke a foreign key in Mongo were left out: dangling tenant/property/guest
  references, and every incident report (they pointed at a tenant id).
- Every staff user and guest account logs in with the password `Lymon123!`. Reset and
  verification tokens were not copied.
- Cleaned after the copy. Repeats left by e2e runs were collapsed to one copy: tenants,
  properties, units, experiences, guests and guest accounts sharing a name, payment sessions
  replaced by a newer checkout, and more than one login a day per user in the audit log.
  Offensive names and notes were removed, and so were audit entries about deleted rows.
- Only tenants whose owner email is on a test domain were kept (`hotel.com`, `test.com`,
  `lymon.com.co`, `example.com`, ...). Tenants owned by real addresses (gmail and company
  domains) were removed with all their data, along with guest accounts left tied to no
  remaining tenant.
- Tables with no rows get no file.

## Loading

The file prefix is the load order: parents come before the rows that reference them. Load
into an empty schema, since the files delete nothing first. Use this seed instead of
`../schema-seed.sql`, not on top of it. From `src/infrastructure/migrations/sql`:

```bash
docker compose down -v && docker compose up -d --wait
cat seed/*.sql | docker compose exec -T postgres psql -U lymon -d lymon -v ON_ERROR_STOP=1
```

A single table loads on its own too, as long as the tables it references are already loaded.
