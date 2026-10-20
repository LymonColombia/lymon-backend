# Contributing

Every change follows the same path:

**Jira ticket → branch off `main` → code + tests → commits → pull request → 1 approval → merge**

We use [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow):

- `main` is the only long-lived branch, and it must always be deployable.
- Every change gets its own branch off `main`, and goes back into `main` only through a
  reviewed pull request.
- Branches are short-lived, and `main` keeps a linear history (squash or rebase merges,
  no merge commits).

## 1. Start from a Jira ticket

Every change needs a Jira ticket (Task, User Story subtask, or Bug). Its ID, `LYMON-XXX`,
is used in the branch name, every commit, and the PR title.

Move the ticket to **In Progress** when you start working on it.

## 2. Create a branch

Always branch from an up-to-date `main`:

```bash
git switch main
git pull
git switch -c LYMON-XXX-jira-item-name
```

Name the branch after the Jira ticket: its ID, then the ticket title in lowercase with
hyphens, for example `LYMON-1103-add-tenant-slug-generation`. This is also the name Jira
generates when you create a branch from the ticket.

Keep branches small and short-lived. If `main` moves while you work, rebase onto it.
Don't merge `main` into your branch, because that adds merge commits and breaks the
linear history:

```bash
git fetch origin
git rebase origin/main
git push --force-with-lease
```

## 3. Write the code

The codebase follows Clean Architecture with CQRS. In short:

- **domain/**: entities, value objects, repository interfaces. No NestJS or Prisma imports.
- **application/**: one command or query plus its handler per use case.
- **infrastructure/**: Prisma repositories, auth, email, storage.
- **presentation/**: thin controllers and DTOs. No business logic.

Code for a feature goes in the same feature folder in each layer (for example
`src/domain/unit`, `src/application/unit`). Before writing new code, look at a
neighbouring feature and follow its patterns.

For the full rules see [`docs/`](docs/).

## 4. Database changes (only if the schema changes)

The Prisma schema in `prisma/schema/*.prisma` is the source of truth. Never edit the
database by hand, and never write a migration folder yourself.

```bash
# 1. edit the model in prisma/schema/<file>.prisma
# 2. generate and apply the migration
pnpm db:migrate --name describe_the_change
```

3. **Read the generated SQL** in `prisma/migrations/<timestamp>_describe_the_change/`
   before you commit it. CHECK constraints exist only in migration files, so a generated
   migration can drop them without warning.
4. Commit the schema change, its migration, and the code that uses it **together**.

To rebuild your local database from scratch: `pnpm db:reset`.

## 5. Tests

Every feature or fix ships with tests. There are two kinds, and most changes need both.

### Unit tests: `pnpm test`

Write unit tests for new or changed business logic. They are fast, need no database or
network, and mock every dependency (repositories, services, other handlers).

Write them especially for:

- **Calculations and transformations**: reservation totals and nights, refund amounts
  under a cancellation policy, cart totals, metrics aggregations, mappers between domain
  and DTOs.
- **Validation rules**: value objects that reject bad input (`Email`, `PlanType`,
  `PropertyType`, a hex colour, a slug), and entity invariants such as "a unit's
  inventory count can't go below zero".
- **Conditional logic**: state transitions such as a reservation moving to checked-in or
  cancelled, plan-based feature limits, and a staff user and a guest seeing different
  data.
- **Domain entities and use cases**: every command and query handler, for example
  `CreateUnitHandler` or `GetUnitsByPropertyQueryHandler`, with its repositories mocked.
- **Error handling**: the right domain error is thrown when something is not found,
  belongs to another tenant, has a duplicate slug or email, or is in an invalid state.

Put the spec under `test/` at the same path as the file it tests in `src/`:

```
src/application/unit-rating/commands/create-unit-rating/create-unit-rating.handler.ts
test/application/unit-rating/commands/create-unit-rating.handler.spec.ts
```

### Integration tests: `pnpm test:db`

Write integration tests when your change talks to infrastructure or crosses module
boundaries. They run against a real, throwaway Postgres (`<db>_test`), built from
`prisma/migrations`. They never touch your development database, but they do need Docker
running (`pnpm db:up`).

Write them for:

- **Database queries and repositories**: every Prisma repository method you add or
  change, including filters, pagination, tenant isolation (tenant A never sees tenant B's
  rows), and database constraints such as unique keys, foreign keys and CHECKs.
- **Authentication and authorization**: login and refresh-token flows, `JwtAuthGuard`
  and the permission guard, and role-based access. For example, a staff user without the
  permission gets `403`, and a guest token is rejected on staff endpoints.
- **External APIs**: the adapters for Cloudflare R2 (storage), Brevo (email) and Wompi
  (payments), including request building, response mapping, webhook signature
  verification, and error handling. Stub the HTTP layer; tests must never call the real
  services.

Integration specs go in `test/integration/`, named after the class they test, for example
`prisma-guest.repository.spec.ts`. Use the shared helpers in `test/integration/fixtures.ts`.

Security tests use **Cypress**, in `cypress/security/`.

### Before you push

CI is what blocks a merge. Checking locally first just gets you feedback faster and
avoids red PRs. Run what's cheap and relevant to your change:

```bash
pnpm test -- test/application/<module>   # unit tests for the module you changed
pnpm build                               # type errors are the most common CI failure
pnpm lint:check                          # lint, same check CI runs (`pnpm lint` also auto-fixes)
pnpm test:db                             # only if you changed a repository or the schema
```

## 6. Commits

Format:

```
LYMON-XXX type(scope): description
```

- **type**: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`
- **scope**: the module you changed (`tenant`, `unit`, `reservation`, `guest`, …)
- **description**: lowercase, imperative ("add", not "added"), no trailing period

Examples:

```
LYMON-1103 feat(tenant): implement unique slug generation for tenants
LYMON-1128 refactor(shift): use ShiftWindow in findOverlappingByStaffInRange
```

Keep each commit to one change.

## 7. Open a pull request

```bash
git push -u origin LYMON-XXX-jira-item-name
```

Open the PR on GitHub:

- **Base branch:** `main`
- **Title:** `LYMON-XXX type(scope): description`
- **Description:** GitHub pre-fills it from [`.github/pull_request_template.md`](.github/pull_request_template.md). Add the Jira ID, list what changed as short bullets, and tick the checklist.

Then move the Jira ticket from **In Progress** to **PR**.

**GitHub Actions** runs CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) on
every PR, and it has to pass before the PR can be merged. Each run has three jobs on
clean machines: `check` and `integration` in parallel, then `sonar`.

**`check`**

1. Installs dependencies from the lockfile (`pnpm install --frozen-lockfile`). If you add
   a dependency, use `pnpm add` and commit `pnpm-lock.yaml`.
2. Lints (`pnpm lint:check`). Any lint error fails the run; warnings don't.
3. Builds the project (`pnpm build`).
4. Runs every unit test with coverage (`pnpm test:cov`).

**`integration`**

1. Starts an **empty Postgres container** that exists only for that run. It never touches
   your local, staging or production databases.
2. Runs the integration tests with coverage (`pnpm test:db:cov`). This creates the test database, applies
   every migration in `prisma/migrations`, and runs the specs. A migration that doesn't
   apply cleanly fails here.
3. Checks that `prisma/schema` matches what the migrations produce. If you changed the
   schema but forgot `pnpm db:migrate` (or didn't commit the migration), it fails here.

**`sonar`**

Sends the code and the coverage from both test jobs to **SonarCloud** and waits for its
quality gate. Code covered by either unit or integration tests counts as covered. A red
gate (new bugs, vulnerabilities, under 80% coverage on the lines your PR changes, …)
fails the run. The details are on the SonarCloud page linked from the check.

On pushes to `main`, Sonar only updates the dashboard and never fails the run: the gate
is enforced before merge, so whatever is on `main` stays deployable.

When the run ends, the machine and its database are destroyed.

## 8. Review and merge

- You need **1 approval** from a teammate.
- Reply to or resolve every review comment. Push fixes to the same branch.
- Once the PR is approved and CI is green, **you** merge it with **Squash and merge** or
  **Rebase and merge**. Merge commits are not allowed, because `main` keeps a linear
  history.
  - **Squash**: the default. The whole PR becomes one commit on `main`, titled with the
    PR title.
  - **Rebase**: use it only when every commit on the branch is clean and follows the
    commit format, and each one is worth keeping on its own.
- Delete the branch after merging.

## Architecture decisions

If a change makes a significant design choice (a new pattern, library, data model, or
security rule), record it as a new numbered ADR in [`docs/adr/`](docs/adr/). Use the
existing ADRs as the template.
