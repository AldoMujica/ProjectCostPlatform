# Architecture Decisions Record (ADR)

> **Status:** Accepted · **Date:** 2026-04-20 · **Scope:** v0.1–v1.0 roadmap (see [`../IMPLEMENTATION_ROADMAP.md`](../IMPLEMENTATION_ROADMAP.md)).
>
> This document captures the architecture decisions made before Phase 1 begins, so the rationale survives the roadmap. Format per decision: context → options → chosen → consequences.

---

## ADR-001 · Single Express application

**Context.** The repository today runs two Express servers: `backend/server.js` on `:3000` (legacy cost API, Sequelize) and `backend/src/server.js` on `:3001` (conciliación, raw `pg` + helmet + JWT).

**Options.**
- **(A) Merge** into a single Express app on `:3000`.
- (B) Keep dual-server deployment.

**Chosen: (A) Single app.**

**Rationale.** At SME scale (<100 internal users) the ops cost of two processes outweighs any isolation benefit. One CORS policy, one auth chain, one deploy, one log stream, one TLS config. The frontend already uses the relative `/api` base URL, which requires same-origin serving. If load ever demands isolation, splitting back out is ~1 day of work.

**Consequences.**
- `backend/server.js` is deleted in Phase 1; routes are mounted under `backend/src/server.js`.
- Conciliación's 50 MB multipart body limit applies globally. Acceptable at this scale.
- Frontend's `API_URL = '/api'` stays unchanged.

---

## ADR-002 · `backend/src/` is the canonical conciliación implementation

**Context.** Two parallel conciliación implementations exist: `backend/src/` (functional, 13 endpoints, the code the HTML actually calls) and `asistencia-modulo/` (scaffold only — `package.json` and `src/db/config.js`).

**Options.**
- **(A) Keep `backend/src/`**, delete `asistencia-modulo/`.
- (B) Migrate everything to `asistencia-modulo/`.
- (C) Maintain both.

**Chosen: (A).**

**Rationale.** `asistencia-modulo/` has no functional code. Adopting it would be pure rework. Maintaining both perpetuates the current confusion — the exact thing we're eliminating.

**Consequences.**
- Phase 1 task: diff the two `package.json`s, migrate `bcryptjs` and `express-validator` into the main backend (both useful), then `rm -rf asistencia-modulo/`.
- Any novelty in `asistencia-modulo/src/db/config.js` must be scanned before deletion.

---

## ADR-003 · Sequelize as default ORM; raw `pg` as escape hatch

**Context.** The cost API uses Sequelize models. Conciliación uses a raw `pg.Pool` with parametrized SQL. New-engineer confusion today; drift risk tomorrow.

**Options.**
- **(A) Sequelize everywhere** except explicitly-flagged performance paths.
- (B) Raw `pg` everywhere.
- (C) Keep the current mix unrestricted.

**Chosen: (A).**

**Rationale.** Sequelize gives us validation, associations, migration tooling, and one mental model. Rewriting the conciliación aggregation SQL to Sequelize query-builder would hurt readability. Carving out a narrow escape hatch for imports + aggregations keeps the ergonomic wins without the rewrite cost.

**Consequences.**
- Bulk checador import keeps `pg.Pool` — justified by throughput.
- Reconciliation service aggregations keep raw SQL — justified by readability.
- New code defaults to Sequelize.
- **Ban `sequelize.sync({alter:true})` in production.** Formal migrations only (Phase 1 work).

---

## ADR-004 · Server-side XLSX exports with a shared helper

**Context.** 12 `⬇ Descargar XLSX` buttons across the UI. Only one (conciliación) is wired, via server-side ExcelJS.

**Options.**
- **(A) Server-side endpoints** `GET /api/<module>/export`, one per table, using a shared helper.
- (B) Client-side SheetJS generation, reading the rendered DOM.

**Chosen: (A).**

**Rationale.** Financial data. Server-side exports reflect the authoritative DB state (not paginated DOM snapshots), respect role-based filtering, and log every download for audit. Client-side saves server CPU but loses all three. A shared utility keeps the per-endpoint cost to ~10 lines of boilerplate.

**Consequences.**
- Phase 2 delivers `backend/src/routes/exports.js` with a helper `(modelName, filterParams, columnSpec) → XLSX stream`.
- The existing conciliación export is refactored to use the shared helper (consistency).
- 11 new export endpoints ship in Phase 2.

---

## ADR-005 · JWT auth with six roles; fail-fast on default secret

**Context.** JWT middleware exists at `backend/src/middleware/auth.js` with roles `supervisor`, `jefe_area`, `rh`, `admin`. A development fallback injects `{id:1, rol:'admin'}` when no token is present. The cost API has no auth at all. Default `JWT_SECRET = 'tu_secret_key'` if env unset.

**Options.**
- **(A) Extend existing JWT.** Add `ventas` and `compras` roles; short access-token expiry + refresh token; remove dev fallback; fail-fast on default secret.
- (B) Switch to server-side sessions (Redis).
- (C) Use an external identity provider (Auth0, Clerk, Keycloak).

**Chosen: (A).**

**Rationale.** The existing JWT code is usable. Server-side sessions add Redis infra with no revocation benefit at this scale. External IdP is overkill for ~20 internal users on one LAN. Short access-tokens + refresh tokens mitigate the revocation concern without architectural change.

**Consequences.**
- Six roles: `supervisor`, `jefe_area`, `rh`, `admin`, `ventas`, `compras`.
- Access token TTL: 1 hour. Refresh token TTL: 7 days, in HTTP-only cookie.
- Boot-time check: if `JWT_SECRET` is unset, empty, or equals `'tu_secret_key'`, the process refuses to start.
- Dev fallback removed; a pre-baked `admin@alenstec.test` account in seed data replaces it.
- Auth middleware applied to every `/api/*` route except `/api/auth/login`, `/api/auth/refresh`, and `/api/health`.
- The labor/OT per-record permission filter (existing `filtrarPorSupervisor` pattern) extends to other resources as needed.

---

## ADR-006 · Enforce foreign keys; keep `otNumber` as a redundant human identifier

**Context.** `MaterialCost.otNumber`, `LaborCost.otNumber`, and `Supplier.workOrders[]` reference `OT-AL-NNNN` as free strings. No FK constraint. Renaming or deleting an OT silently orphans data.

**Options.**
- **(A) Add `work_order_id UUID` FK column to the child tables.** Keep `otNumber` as a redundant unique string on `WorkOrder` for human/CSV use.
- (B) Keep loose string references indefinitely.

**Chosen: (A).**

**Rationale.** Financial integrity requires referential integrity. Every day that passes adds data that must later be migrated. The cost of the Phase-1 migration is bounded (current seed data only, plus whatever's in the staging DB); the cost of deferring grows.

**Consequences.**
- Phase 1 migration:
  1. Add `work_order_id UUID NULL` to `material_costs` and `labor_costs`.
  2. `UPDATE ... SET work_order_id = (SELECT id FROM work_orders WHERE otNumber = child.ot_number)`.
  3. Fail the migration if any row has NULL — forces a conscious decision on orphans.
  4. `ALTER COLUMN work_order_id SET NOT NULL; ADD CONSTRAINT ... REFERENCES work_orders(id) ON DELETE RESTRICT`.
- `Supplier.workOrders[]` array is replaced with a join table `supplier_work_orders (supplier_id, work_order_id)`.
- APIs continue to accept `otNumber` in query params; the backend resolves it to `work_order_id` at the request boundary.
- Keep `ot_number` as a redundant string on child tables — convenient for CSV export and legacy tooling; the FK is what the DB enforces.

---

## ADR-007 · Deployment target: on-prem mini-PC

**Context.** Alenstec is an SME manufacturer with an existing office and IT footprint. The system is an internal tool; external access is unnecessary in v1.0.

**Options.**
- **(A) On-prem mini-PC / reused desktop** running Ubuntu Server 22.04, LAN-only.
- (B) Cheapest cloud VPS (Hetzner / Contabo, ~$5/mo).
- (C) Managed PaaS (Railway / Fly.io, ~$20–30/mo).

**Chosen: (A).**

**Rationale.** LAN-only means no domain, no TLS, no public-facing attack surface. Used Dell OptiPlex from Mercado Libre ($100–150 one-time) is wildly over-spec. Electricity ~$1/mo. If users ever need remote access, Tailscale free tier covers it. Off-site backup via Backblaze B2 is ~$0.10/mo. Total running cost well under $1/mo.

**Consequences.**
- No public DNS or TLS in v1.0. If required later, migration to Option B is `pg_dump` + DNS switch.
- Power outage == app down, but the plant is also down during power outages.
- Hardware failure recovery depends on the backup discipline established in Phase 0.
- Remote dev access via Tailscale. No SSH exposed to the internet.

---

## Non-decisions (explicitly deferred to v2+)

The following were considered but deliberately not decided now, because they don't affect v0.1–v1.0 design:

- **Horizontal scaling / load balancing** — not needed at <100 users on one LAN.
- **Caching layer (Redis / Memcached)** — not needed; Postgres on the same box is fast enough.
- **Message queue (RabbitMQ / BullMQ)** — no async jobs in v1.0 scope.
- **Service mesh / microservices** — monolith is correct for this scale.
- **Real-time updates (WebSockets)** — mockup has no real-time surface.
- **Multi-tenancy** — single organization.
- **Observability stack (Prometheus / Grafana / Loki)** — Phase 6 adds basic Sentry + UptimeRobot; full stack is v2+.

Revisit any of these only when a concrete need appears.
