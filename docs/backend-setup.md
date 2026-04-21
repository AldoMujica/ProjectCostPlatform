# Backend setup

> **Authoritative reference:** [`../backend/README.md`](../backend/README.md) has the full env-var list, layout, and API surface. This page is the quick-start + Phase-1 changelog.

## Quick start

```bash
cd backend
npm install
cp .env.example .env        # then fill DB credentials + JWT_SECRET
npm run migrate             # umzug applies all pending migrations
npm run seed                # seeds one user per role + demo fixtures
npm start                   # or `npm run dev` for nodemon
```

Default login after `npm run seed` (password from `SEED_DEFAULT_PASSWORD`, default `alenstec_dev_2026`):

| Role        | Email                        |
|-------------|------------------------------|
| admin       | `admin@alenstec.mx`          |
| jefe_area   | `jefe.area@alenstec.mx`      |
| rh          | `rh@alenstec.mx`             |
| supervisor  | `supervisor@alenstec.mx`     |
| ventas      | `ventas@alenstec.mx`         |
| compras     | `compras@alenstec.mx`        |

## What changed on 2026-04-20

The Phase-1 backend foundations from [`implementation-roadmap.md`](./implementation-roadmap.md) landed:

- Single Express app on `:3000` (ADR-001). Legacy `backend/server.js` merged into `backend/src/server.js`.
- `asistencia-modulo/` deleted (ADR-002).
- JWT auth enforced on every `/api/*` route except `/api/auth/*` and `/api/health` (ADR-005). Boot fails on unset / default / short `JWT_SECRET`.
- Six-role seed: `admin`, `jefe_area`, `rh`, `supervisor`, `ventas`, `compras`.
- Sequelize FKs on `material_costs.work_order_id`, `labor_costs.work_order_id`, plus a `supplier_work_orders` join table replacing the old `Supplier.workOrders[]` array column (ADR-006).
- Model extensions for `WorkOrder` (liberation fields), `Quote` (cotRef/oc/tipo), `MaterialCost` (IVA/retencion/subtotal), `Supplier.saldoPendiente`.
- Migration runner switched from `sequelize.sync({alter:true})` to [umzug](https://github.com/sequelize/umzug) (ADR-003). Migrations live in [`../backend/src/db/migrations/`](../backend/src/db/migrations/).

See [`../backend/README.md`](../backend/README.md) for the current API surface, env-var reference, and layout.
