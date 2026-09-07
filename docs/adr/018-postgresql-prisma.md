# ADR-018: PostgreSQL con Prisma como Capa de Persistencia

**Fecha:** 2026-09-06
**Estado:** Aceptado
**Sustituye a:** [ADR-007: MongoDB con Mongoose](007-mongodb-mongoose.md)

---

## Contexto

ADR-007 eligió MongoDB por la estructura variable de las unidades y por su
integración con NestJS. Con el dominio ya estabilizado, el modelo real resultó ser
relacional: casi todo lo que se consulta cruza tenants, propiedades, unidades,
huéspedes y reservas, y el aislamiento multi-tenant se sostenía únicamente en que
cada repositorio recordara filtrar por `tenantId`.

La migración de los datos existentes lo confirmó. Al aplicar las llaves foráneas
aparecieron filas que Mongo aceptaba y que el modelo no admite:

- 4 reservas cuyo huésped pertenece a **otro tenant**
- los 82 `incident_reports`, cuyo `propertyId` guarda en realidad el id del tenant
- 51 `payment_sessions` con `reference` duplicada

Ninguna de estas inconsistencias era detectable sin la base de datos como árbitro.

## Decisión

Usamos **PostgreSQL 18** accedido con **Prisma 7** (`prisma-client` + el driver
adapter `@prisma/adapter-pg`, sin motor Rust).

- El esquema vive en `prisma/schema.prisma`, introspectado una sola vez desde
  `src/infrastructure/migrations/sql/postgres-schema.sql`. A partir de ahí
  `prisma migrate dev` gobierna los cambios.
- Los `CHECK` no se pueden expresar en `schema.prisma`: viven en el SQL de las
  migraciones (`prisma/migrations/0_init/migration.sql`). **Hay que revisar cada
  migración generada antes de aplicarla.** Los índices parciales sí sobreviven a la
  introspección (`@@index(..., where: raw(...))`).
- Los ids son `uuid` con `gen_random_uuid()`; los genera la base de datos, salvo
  donde el dominio ya los creaba (`ConversationId`, `GuestEmailId`,
  `GuestMessageId`).
- El aislamiento multi-tenant se declara con llaves foráneas compuestas —
  `reservations (tenant_id, unit_id) → units (tenant_id, id)` — de modo que una
  referencia cruzada entre tenants falla con `23503`. Los repositorios **igual**
  filtran por `tenant_id` en cada lectura: una FK restringe escrituras, no lecturas.
- Los value objects pequeños se aplanan a columnas; las listas embebidas
  (`bedrooms`, `check_in_info`, `preferences`, items del carrito) siguen en `jsonb`.
  Los arreglos que sí se consultan por sus miembros pasaron a tablas puente:
  `user_role_assignments`, `guest_tag_assignments`, `shift_staff_members`.

## Consecuencias

**El dominio no cambió.** La regla de dependencia se sostuvo: fuera de
`src/infrastructure/` la migración tocó cinco lugares — dos value objects de id, un
handler y 17 decoradores `@IsMongoId()` que pasaron a `@IsUUID()`. Los 29 puertos de
repositorio quedaron intactos, y con ellos los handlers y controladores.

**Ganancias**
- Integridad referencial y `CHECK` verificados por el motor, no por convención.
- Las agregaciones se expresan en SQL. El `$facet` de métricas de cancelación es hoy
  un `GROUP BY GROUPING SETS` con agregados `FILTER`.
- `reservation_number` usa `UNIQUE (tenant_id, reservation_number)` con reintento
  ante `23505`, y desaparece la colección `counters` que emulaba una secuencia.

**Costos**
- Un cambio de forma exige una migración; ya no se agrega un campo escribiéndolo.
- Los `CHECK` quedan fuera de `schema.prisma`, así que el archivo no es la
  descripción completa del esquema.
- El cliente de Prisma es código generado: se ignora en git y se regenera en
  `postinstall`.

## Alternativas consideradas

- **TypeORM**: es el módulo oficial de NestJS, pero su generación de migraciones es
  poco fiable y sus entidades decoradas invitan a filtrarse al dominio.
- **Drizzle**: más delgado y más cercano a SQL; se descartó por un ecosistema menor
  y por herramientas de migración menos maduras.
- **MikroORM**: el mejor calce con DDD sobre el papel (Unit of Work, Identity Map),
  pero el proyecto no usa esos patrones y su comunidad es más pequeña.

## Referencias

- `src/infrastructure/migrations/sql/postgres-schema.sql` — esquema y convenciones
- `src/infrastructure/migrations/sql/schema-smoke.sql` — pruebas de restricciones
- `test/integration/` — repositorios verificados contra Postgres real (`pnpm test:db`)
