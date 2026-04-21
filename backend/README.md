# Alenstec Backend

Single Express app that serves the cost-management API, the conciliación-nómina API, and the frontend HTML/assets from one process. See [`../docs/implementation-roadmap.md`](../docs/implementation-roadmap.md) and [`../designs/00-architecture-decisions.md`](../designs/00-architecture-decisions.md) for the frozen architecture decisions.

## Prerequisites

- Node.js 18+
- PostgreSQL 15+

## Setup

```bash
npm install
cp .env.example .env      # then edit values
npm run migrate            # apply all umzug migrations
npm run seed               # seed 6-role users + demo fixtures
npm run dev                # nodemon on :3000
```

### Required environment variables

| Var                     | Purpose                                                    |
|-------------------------|------------------------------------------------------------|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | PostgreSQL   |
| `JWT_SECRET`            | ≥ 32 chars, not a default. Boot fails if unset/weak.       |
| `JWT_ACCESS_TTL`        | Access-token TTL (default `1h`).                           |
| `JWT_REFRESH_TTL`       | Refresh-token TTL (default `14d`).                         |
| `PORT`                  | HTTP port (default `3000`).                                |
| `FRONTEND_URL`          | Optional CORS origin.                                      |
| `SEED_DEFAULT_PASSWORD` | Password for seeded role users.                            |

## API surface

All `/api/*` routes except `/api/auth/*` and `/api/health` require a valid JWT in `Authorization: Bearer <token>`.

- `POST /api/auth/login` — `{ email, password }` → `{ accessToken, refreshToken, user }`
- `POST /api/auth/refresh` — `{ refreshToken }` → `{ accessToken }`
- `GET  /api/auth/me` — current user
- `/api/work-orders`, `/api/quotes`, `/api/costs/{material,labor}`, `/api/suppliers`, `/api/conciliacion/*`

See [`implementation-roadmap.md`](../docs/implementation-roadmap.md) §Phase 2 for the full MVP endpoint list.

## Roles

Seeded users (Phase 1): `admin`, `jefe_area`, `rh`, `supervisor`, `ventas`, `compras`.

## Migrations

Managed by [umzug](https://github.com/sequelize/umzug). Files live in [`src/db/migrations/`](src/db/migrations/). Supports both `*.js` (Sequelize QueryInterface) and `*.sql` (raw SQL, forward-only).

- `npm run migrate` — run all pending.
- `npm run migrate:down` — revert the last migration (JS only; SQL migrations are forward-only).

## Testing

```bash
# One-time: start a throwaway Postgres for tests
docker compose -f docker-compose.test.yml up -d

cp .env.test.example .env.test   # edit if your test DB differs
npm run lint                      # eslint:recommended, warnings allowed
npm test                          # jest smoke suite (health, auth, migrate/seed idempotence)
```

The smoke suite ([test/smoke.test.js](test/smoke.test.js)) is deliberately small — expand as Phase-2 wiring lands. It runs migrations once via jest `globalSetup`, and tests re-run `umzug.up()` / `seed()` to verify idempotence.

CI runs the same sequence on every push ([.github/workflows/ci.yml](../.github/workflows/ci.yml)): lint → migrate ×2 → seed → test, with Postgres 15 as a service container.

## Layout

```
src/
├── db/
│   ├── sequelize.js        # shared Sequelize instance
│   ├── migrator.js         # umzug runner
│   ├── config.js           # raw pg pool (ADR-003 escape hatch)
│   └── migrations/
├── middleware/auth.js      # assertJwtSecret, verificarJWT, verificarRol
├── models/                 # Sequelize models + associations (models/index.js)
├── routes/                 # auth, workOrders, quotes, costs, suppliers, conciliacionRoutes
├── seed/index.js           # idempotent seed
├── services/               # conciliacionService, parserChecadorService
├── utils/excelExporter.js
└── server.js               # single Express app on :3000
```
