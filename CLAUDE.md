# CLAUDE.md

Guidance for Claude Code when working in this repo. The canonical docs are linked below — **keep them in sync as work lands**.

## What this is

Alenstec cost-management platform. Single Node/Express/Sequelize/Postgres app serving both the cost API and the conciliación-nómina API from `:3000`, with a vanilla-JS SPA (`alenstec_app.html`) as the frontend. On-prem mini-PC deployment, LAN-only. ~19-week phased roadmap; Phase-1 backend foundations landed, Phase-2 wiring pending.

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
npm run seed           # 6 role users
npm run dev            # nodemon on :3000
```

Roles seeded: `admin`, `jefe_area`, `rh`, `supervisor`, `ventas`, `compras`.

## Backend layout

```
backend/src/
├── db/            sequelize.js, migrator.js, migrations/
├── middleware/    auth.js (assertJwtSecret, verificarJWT, verificarRol, filtrarPorSupervisor)
├── models/        Sequelize models + associations (models/index.js)
├── routes/        auth, workOrders, quotes, costs, suppliers, conciliacionRoutes
├── seed/          idempotent seed
├── services/      conciliacionService, parserChecadorService
├── utils/         excelExporter.js
└── server.js      single Express app on :3000
```

## Current state (2026-04-21)

Phase-1 backend **done** ([docs/implementation-roadmap.md](docs/implementation-roadmap.md#progress-snapshot--2026-04-20)). Still open in Phase 1: P1.7 (wire `filtrarPorSupervisor` into resource routes), P1.15 (FE login), P1.16 (FE 401 interceptor), P1.17 (CI), P1.18 (ephemeral-Postgres test harness).

~20 % of mockup features wired end-to-end (audit headline). Next milestone: `v0.1-mvp` at end of Phase 2 (~week 6).

## Known doc drift

- [designs/README.md](designs/README.md) system-architecture diagram still shows the old dual-server split (`:3000` legacy + `:3001` conciliación). Post Phase-1 it's a single app on `:3000`. Refresh when the design docs are split per module (Phase-2 architecture kickoff).
