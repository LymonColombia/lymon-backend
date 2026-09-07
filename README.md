# Lymon Backend

**Multi-tenant hotel & property management platform — API backend**

Built with NestJS, Clean Architecture, and CQRS.

---

## Table of Contents

- [About the Project](#about-the-project)
  - [Built With](#built-with)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Usage](#usage)
- [API Reference](#api-reference)
- [Architecture & Design](#architecture--design)
  - [Clean Architecture Layers](#clean-architecture-layers)
  - [CQRS](#cqrs)
- [Contributing](#contributing)

---

## About the Project

Lymon Backend is the API for a multi-tenant SaaS platform that lets
properties (hotels, hostels, short-term rentals) manage reservations, units,
guests, staff, billing, and the full guest experience through a single
backend. Each tenant is isolated by `tenantId`, with role- and
permission-based access control embedded in JWTs.

### Built With

| Layer | Technology |
|---|---|
| Framework | [NestJS](https://nestjs.com/) 11 |
| Language | TypeScript 5.7 |
| Database | PostgreSQL 18 (via Prisma 7) |
| Architecture | Clean Architecture + CQRS (`@nestjs/cqrs`) |
| Auth | JWT (`@nestjs/jwt`, Passport) + bcrypt |
| File storage | Cloudflare R2 (S3-compatible) |
| Email | Brevo (transactional + inbound webhook) |
| API docs | Swagger / OpenAPI |
| Testing | Jest (unit/e2e), Cypress (security), k6 (performance) |
| Package manager | pnpm |

---

## Getting Started

### Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/)
- A PostgreSQL 18 instance. For local work:
  `docker compose -f src/infrastructure/migrations/sql/docker-compose.yml up -d --wait`
  (listens on port 5433 and applies the schema on first start)
- (Optional, for file uploads) A Cloudflare R2 bucket
- (Optional, for transactional email) A Brevo account

### Installation

1. Clone the repo and install dependencies:

   ```bash
   git clone <repo-url>
   cd lymon-backend
   pnpm install
   ```

2. Copy the environment template and fill in your values:

   ```bash
   cp .env.example .env
   ```

   | Variable | Purpose |
   |---|---|
   | `DATABASE_URL` | PostgreSQL connection string |
   | `JWT_SECRET` | Secret used to sign auth tokens |
   | `APP_URL` | Base URL of this API (used in emails/links) |
   | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` | Cloudflare R2 file storage |
   | `EMAIL_INBOUND_ENABLED`, `EMAIL_WEBHOOK_SECRET` | Brevo inbound email webhook |

3. Start the app in watch mode:

   ```bash
   pnpm start:dev
   ```

### Usage

```bash
pnpm start:dev      # dev server with hot-reload
pnpm build          # production build
pnpm start:prod     # run the built app
pnpm test           # unit tests
pnpm test:db        # repository tests against a real Postgres (needs Docker)
pnpm test:e2e       # end-to-end tests
pnpm test:cov       # unit tests with coverage
pnpm lint           # eslint --fix
```

Once running, the API is available at `http://localhost:<PORT>` and
interactive docs at `http://localhost:<PORT>/api/docs`.

---

## API Reference

Full, always-up-to-date API reference is generated from the code via
**Swagger**. Don't look for a hand-written endpoint list — run the app and
open:

**`http://localhost:<PORT>/api/docs`** — interactive Swagger UI
**`http://localhost:<PORT>/api/docs-json`** — raw OpenAPI JSON

---

## Architecture & Design

### Clean Architecture Layers

The codebase is organized into four layers under `src/`, following Clean
Architecture. Dependencies only point inward:

```
presentation/    → HTTP layer: controllers, DTOs, Swagger decorators
       ↓
infrastructure/  → external concerns: PostgreSQL, JWT, email, storage
       ↓
application/     → use cases: Commands/Queries + their handlers
       ↓
domain/          → entities, value objects, repository interfaces
                   (zero framework dependencies)
```

`infrastructure` depends on `application`, `application` depends on
`domain`, and nothing depends on `presentation` except the framework
bootstrap. Repository **interfaces** live in `domain/`; concrete
implementations (e.g. Prisma) live in `infrastructure/`. Handlers depend
on the interface via dependency injection and have no knowledge of PostgreSQL.

Each layer is further split by feature, so related code stays co-located.
Example — the `unit` feature:

```
src/domain/unit/
├── entities/unit.entity.ts
├── repositories/unit.repository.ts   ← interface
└── value-objects/

src/application/unit/
├── commands/create-unit.command.ts
├── commands/create-unit.handler.ts
├── commands/update-unit.command.ts
├── commands/delete-unit.command.ts
└── queries/GetUnitsByProperty/

src/infrastructure/persistence/
├── repositories/prisma-unit.repository.ts  ← implementation
└── prisma/prisma.service.ts

src/presentation/
├── controllers/unit.controller.ts
└── dtos/unit/
```

See [`docs/adr/001-arquitectura-limpia.md`](docs/adr/001-arquitectura-limpia.md)
for the full rationale.

### CQRS

Write operations are **Commands**, read operations are **Queries**, each
dispatched through NestJS's `CommandBus` / `QueryBus`
(`@nestjs/cqrs`). A command/query is a plain data object; its logic lives in
a paired handler.

**Query example** — `src/application/unit/queries/GetUnitsByProperty/`:

```ts
// get-units-by-property.query.ts
export class GetUnitsByPropertyQuery implements IQuery {
  constructor(
    public readonly tenantId: string,
    public readonly propertyId: string,
    public readonly page: number = 1,
    public readonly limit: number = 10,
  ) {}
}

// get-units-by-property.query-handler.ts
@QueryHandler(GetUnitsByPropertyQuery)
export class GetUnitsByPropertyQueryHandler
  implements IQueryHandler<GetUnitsByPropertyQuery, GetUnitsByPropertyResult>
{
  constructor(
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepository: PropertyRepository,
    @Inject(UNIT_REPOSITORY)
    private readonly unitRepository: UnitRepository,
  ) {}

  async execute(
    query: GetUnitsByPropertyQuery,
  ): Promise<GetUnitsByPropertyResult> {
    // verify property belongs to tenant, then fetch + return units
  }
}
```

Controllers dispatch through the bus using **generics on `.execute()`**
(not a variable type annotation):

```ts
// unit.controller.ts
const query = new GetUnitsByPropertyQuery(user.tenantId, propertyId, page, limit);

const result = await this.queryBus.execute<
  GetUnitsByPropertyQuery,
  GetUnitsByPropertyResult
>(query);
```

Handlers are registered per module (e.g. `CommandHandlers` /
`QueryHandlers` arrays in each `*.module.ts`) and provided to Nest's DI
container. See
[`docs/adr/002-cqrs.md`](docs/adr/002-cqrs.md) for the full decision and
[`docs/adr/`](docs/adr/) for the rest of the architecture decision log
(auth, permissions, multi-tenancy, reservations, etc.).

---

## Contributing

`LYMON-XXX` is the ID of the Jira item you're working from (Task, User
Story, Subtask, or Bug) — it drives both the branch name and the commit
message.

- **Branch naming:**

  ```
  LYMON-XXX-branch-name
  ```

  Example: `LYMON-1103-add-tenant-slug-generation`

- **Commit message format:**

  ```
  LYMON-XXX type(scope): description
  ```

  where `type` follows Conventional Commits (`feat`, `fix`, `refactor`,
  `test`, `chore`, ...) and `scope` is the affected module. Example:

  ```
  LYMON-1103 feat(tenant): implement unique slug generation for tenants
  ```

- Branch off `staging` (not `main`) and open PRs back into `staging`.
- **Every new feature needs a unit test** added under `test/`, mirroring the
  `src/` layer it belongs to (e.g. a handler in
  `src/application/unit/commands/...` gets its spec in
  `test/application/unit/...`), using the module's existing testing tool:
  **Jest** for unit/integration specs (`*.spec.ts`), **Cypress** for
  security specs (`cypress/security/`). No PR merges without one.
- Run `pnpm test` and `pnpm build` before opening a PR.
- Architectural decisions go in `docs/adr/` as a new numbered ADR — see
  existing ones for the format.
