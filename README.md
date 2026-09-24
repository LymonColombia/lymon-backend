# Lyhost Backend

API for **Lyhost**, a multi-tenant SaaS for hotel and property management.
One backend for tenants to run their properties and units, reservations,
guests (CRM, messaging, guest portal), experiences and payments, inventory,
staff shifts, incident reports, and metrics.

**Stack:** NestJS 11 · TypeScript · PostgreSQL 18 (Prisma 7)

## Quick start

### 1. Prerequisites

- **Node.js 20+**
- **pnpm** (don't use npm or yarn in this repo)
- **Docker** with Compose: only Postgres runs in a container; the API runs on your machine

### 2. Install dependencies

```bash
git clone https://github.com/LymonColombia/lymon-backend.git
# or over SSH: git clone git@github.com:LymonColombia/lymon-backend.git
cd lymon-backend
pnpm install          # also generates the Prisma client
```

### 3. Configure the environment

```bash
cp .env.example .env
```

The defaults are enough to run locally. Replace the `JWT_SECRET` placeholder with any
random string.

| Variable | Needed locally? | What it does |
|---|---|---|
| `DATABASE_URL` | yes (default works) | Points at the Docker Postgres on port **5433** |
| `JWT_SECRET` | **yes** | Signs auth tokens; the app won't start without it |
| `isDevelopment` | yes (`true`) | Enables Swagger and seeds demo data on boot |
| `PORT` | no | Defaults to `3000` |
| `R2_*` | no | Cloudflare R2 file uploads; uploads fail without it |
| `BREVO_API_KEY`, `SENDER_EMAIL` | no | Sends transactional email (verification, password reset) |
| `WOMPI_*` | no | Payment gateway callbacks |

### 4. Start the database and the API

```bash
pnpm dev
```

This starts Postgres (`docker compose`, container `lymon-pg`), applies every migration in
`prisma/migrations`, and runs the API in watch mode. When the log shows
`Application running on: http://localhost:3000`, the API is up.

### 5. Try it

Open Swagger at **http://localhost:3000/api/docs**.

On first boot the app seeds a demo tenant (a property, a unit, roles and guest tags) and
these accounts, already email-verified:

| Account | Email | Password | Login endpoint |
|---|---|---|---|
| Tenant owner (staff) | `dev.owner@lymon.local` | `DevPassword123!` | `POST /auth/login` |
| Guest | `dev.guest@lymon.local` | `DevPassword123!` | `POST /guest/auth/login` |

Log in, copy the `accessToken`, click **Authorize** in Swagger (`JWT-auth` for staff,
`GuestJWT-auth` for guests), and call any endpoint.

### Everyday commands

```bash
pnpm start:dev        # API only (database already running)
pnpm test             # unit tests
pnpm test:db          # repository tests against a real Postgres
pnpm build            # production build

pnpm db:down          # stop Postgres and wipe its data
pnpm dev:fresh        # wipe the database and start over
```

### Troubleshooting

- **`Can't reach database server at 127.0.0.1:5433`**: Docker isn't running, or the
  container failed to start. Check it with `docker ps`.
- **`JWT_SECRET no está definida`**: `JWT_SECRET` is missing from `.env`.
- **Port 5433 already in use**: stop whatever is using it, or change the port in
  `docker-compose.yml` and in `DATABASE_URL`.
- **Seeded accounts missing**: make sure `.env` has exactly `isDevelopment=true`, then restart.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow from Jira ticket to merged PR.
