# CLAUDE.md

Guidance for Claude Code when working in this repo. The canonical docs are linked below — **keep them in sync as work lands**.

## What this is

Alenstec cost-management platform. Single Node/Express/Sequelize/Postgres app serving both the cost API and the conciliación-nómina API from `:3000`, with a vanilla-JS SPA (`alenstec_app.html`) as the frontend. On-prem mini-PC deployment, LAN-only. ~19-week phased roadmap; Phases 1–3 complete, Phase 4 (Nómina) up next.

Product summary: [docs/project-summary.md](docs/project-summary.md).

## Documentation map — where to look

| You want…                                  | Read                                                                     |
|--------------------------------------------|--------------------------------------------------------------------------|
| Phase status, work items, exit criteria     | [docs/implementation-roadmap.md](docs/implementation-roadmap.md)         |
| What's mockup vs wired (gap catalogue)      | [docs/implementation-audit.md](docs/implementation-audit.md)             |
| Architecture decisions (ADRs 001–007)       | [designs/00-architecture-decisions.md](designs/00-architecture-decisions.md) |
| Per-module design (intended vs as-built)    | [designs/README.md](designs/README.md) + `designs/0{1..7}-*-design.md`   |
| Per-module feature specs (from mockup)      | [docs/modules/](docs/modules/)                                           |
| Acceptance criteria / regression list       | [docs/regression-requirements.md](docs/regression-requirements.md)       |
| Checklist de pruebas manuales (QA / cliente) | [docs/checklist-pruebas-usuario.md](docs/checklist-pruebas-usuario.md) |
| Backend setup, env vars, API surface        | [backend/README.md](backend/README.md) · [docs/backend-setup.md](docs/backend-setup.md) |
| Conciliación operator runbook               | [docs/conciliacion-ops.md](docs/conciliacion-ops.md)                     |
| Commercial proposal (ES)                    | [docs/propuesta-comercial.md](docs/propuesta-comercial.md)               |
| End-user guide (ES, HTML)                   | [guia-de-usuario.html](guia-de-usuario.html)                             |

Repo is an Obsidian vault — see root [README.md](README.md) for graph/backlinks usage.

## Update discipline — what to touch when you change X

| Change                                        | Update                                                                                |
|-----------------------------------------------|---------------------------------------------------------------------------------------|
| Close a gap (`G-<MOD>-N`) or roadmap item     | [docs/implementation-audit.md](docs/implementation-audit.md) (status), [docs/implementation-roadmap.md](docs/implementation-roadmap.md) (checkbox + snapshot table) |
| New/changed API endpoint                      | Module feature doc under [docs/modules/](docs/modules/), API-surface list in [backend/README.md](backend/README.md) |
| Schema / migration                            | [designs/00-architecture-decisions.md](designs/00-architecture-decisions.md) if ADR-level, module feature doc, audit entry |
| New architectural decision                    | Append ADR to [designs/00-architecture-decisions.md](designs/00-architecture-decisions.md); the `-design.md` under [designs/](designs/) that uses it |
| New/moved feature in the mockup SPA           | Corresponding file in [docs/modules/](docs/modules/); audit row; roadmap work item |
| Test added or promoted                        | [docs/regression-requirements.md](docs/regression-requirements.md) — move AC from future-testable → active; update phase totals |
| Phase complete                                | Roadmap progress snapshot at top + phase exit-criteria checkboxes; audit "Phase-N closures" section |
| Env var / setup step                          | [backend/README.md](backend/README.md) + [docs/backend-setup.md](docs/backend-setup.md) |
| Conciliación operational detail               | [docs/conciliacion-ops.md](docs/conciliacion-ops.md)                                  |

**Rule of thumb:** every committed feature should leave at least the audit and roadmap newer than the code.

## Stack

- **Backend:** Node 18+, Express, Sequelize (raw `pg` escape hatch per ADR-003), PostgreSQL 15+, JWT (boot-time secret guard), umzug migrations.
- **Frontend:** single vanilla-JS SPA in [alenstec_app.html](alenstec_app.html). No framework. jsPDF for OT PDF, ExcelJS server-side for XLSX (ADR-004), DOMParser for CFDI XML import.
- **Deployment:** on-prem mini-PC (Ubuntu 22.04, LAN), systemd, nightly `pg_dump` → Backblaze B2, Tailscale for remote SSH.

## Running locally

```bash
# Windows one-shot:
./run.bat

# Manual:
cd backend
cp .env.example .env   # fill in DB_*, JWT_SECRET (≥ 32 chars — boot fails otherwise)
npm install
npm run migrate        # umzug; idempotent
npm run seed           # 6 role users + cost fixtures + conciliación demo data
npm run dev            # nodemon on :3000
```

Roles seeded: `admin`, `jefe_area`, `rh`, `supervisor`, `ventas`, `compras`.

## Backend layout

```
backend/src/
├── db/            sequelize.js, migrator.js, migrations/
├── middleware/    auth.js (assertJwtSecret, verificarJWT, verificarRol, filtrarPorSupervisor)
├── models/        Sequelize models + associations (models/index.js)
├── routes/        auth, workOrders, quotes, costs, suppliers, employees,
│                  purchaseOrders, inventory, supplierInvoices, deliveries,
│                  approvals, conciliacionRoutes
├── seed/          idempotent seed (re-entrant for Phase-3 fixtures)
├── services/      conciliacionService, parserChecadorService
├── utils/         excelExporter.js, xlsxTable.js
└── server.js      single Express app on :3000
```

## Current state (2026-04-23)

**Phase 3 is complete.** All 21 Phase-3 work items (P3.1–P3.21 + deferred P3.18b) landed in a single cumulative commit. New models: `Employee` (maps the existing `empleados` table, extended with RFC/CURP/IMSS/puesto/SD/SDI columns), `PurchaseOrder` (OCP), `InventoryItem` + `StockMovement`, `SupplierInvoice` (CFDI persistence, idempotent upsert by `uuid_fiscal`), `Delivery` + `Incident`, `WorkOrderApproval` (5-step liberation flow with sequential-order + role-gated transitions; approving `liberacion_final` flips the OT to `Liberada`).

Module 6 (Entregas) is now fully wired end-to-end — all 5 sub-tabs live. Module 7 gained the Control de Empleados sub-tab. Module 2 gained a functional Flujo de Liberación table with per-row Approve/Reject buttons. XLSX export is live for 9 tables (4 new Phase-3: OCP / inventory / invoices / deliveries).

Per-record supervisor ACL (P3.18b, deferred from P1.7): ownership lives at the OT level via new `work_orders.supervisor_id` column (nullable; NULL = visible to all). `filtrarPorSupervisor` is wired into `GET /api/work-orders` — supervisor-role callers see OTs assigned to them or unassigned.

About **85 %** of ~72 grouped mockup features are now wired. What's still mockup: Pronóstico, Nómina, Costo-MO, OCs Abiertas / Empleados en Campo dashboard widgets, activity-code rollup — all gated on Phase-4 (Nómina) or Phase-5 (Analytics). `v0.2-entregas` tag-ready.

## Known doc drift

- [designs/README.md](designs/README.md) system-architecture diagram still shows the old dual-server split (`:3000` legacy + `:3001` conciliación). Post Phase-1 it's a single app on `:3000`. Refresh when the design docs are split per module (Phase-2 architecture kickoff).
