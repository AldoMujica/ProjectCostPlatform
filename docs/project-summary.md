# Alenstec — Gestión de Costos de Proyecto

> **Source of truth:** [`alenstec_app.html`](../alenstec_app.html) is the client-validated mockup. All requirements in this repository are derived from it. When this document and the HTML disagree, the HTML wins.
>
> **Status (2026-04-20):** Phase-1 backend foundations landed — single Express app on `:3000`, JWT auth with boot-time secret guard, six seeded roles, FK-enforced schema, umzug migrations. Approximately 20% of the visible UI surface is wired to a backend; the remainder is static HTML awaiting Phase-2 wiring. See [`implementation-roadmap.md`](./implementation-roadmap.md) for phase status and [`implementation-audit.md`](./implementation-audit.md) for the full matrix.

---

## Product overview

Alenstec SA de CV is a Mexican manufacturer of industrial automation tooling. This system unifies the cost lifecycle of a manufacturing project (Orden de Trabajo / OT) from quote to payroll reconciliation, with Mexican-tax (CFDI / IMSS / ISR / INFONAVIT) compliance baked in.

The UI is a single-page Spanish-language dashboard served from [`alenstec_app.html`](../alenstec_app.html). It targets desktop operators (≥1100 px) with graceful degradation to tablet.

### Primary user persona

**Jesús Lara — Manufactura / Autorización** (visible in the sidebar footer). He authorizes OTs, captures hours, and closes payroll weeks. Secondary roles visible in the mockup: RH, Jefe de Área, Supervisor, Compras, Ingeniería.

---

## Module map (source of truth: HTML sidebar)

The sidebar (HTML lines 201–245) declares **10 modules** grouped into 3 sections. Each module's `data-mod` attribute is the stable identifier used in JS (`goMod(id)`).

| # | Section    | `data-mod`     | Title in sidebar          | Detailed spec                                                  |
|---|------------|----------------|----------------------------|----------------------------------------------------------------|
| 1 | Principal  | `dashboard`    | Dashboard                  | [modules/dashboard.md](./modules/dashboard.md) |
| 2 | Principal  | `ot`           | Orden de Trabajo (badge 18)| [modules/work-orders.md](./modules/work-orders.md) |
| 3 | Comercial  | `cotizaciones` | Cotizaciones y Ventas      | [modules/sales-quoting.md](./modules/sales-quoting.md)        |
| 4 | Costos     | `pronostico`   | Pronóstico del Costo       | [modules/cost-forecasting.md](./modules/cost-forecasting.md)  |
| 5 | Costos     | `material`     | Costo de Material          | [modules/material.md](./modules/material.md) |
| 6 | Costos     | `entregas`     | Entregas de Material       | [modules/supplier-procurement.md](./modules/supplier-procurement.md) |
| 7 | Costos     | `horas`        | Horas de Mano de Obra      | [modules/labor.md](./modules/labor.md)  |
| 8 | Costos     | `nomina`       | Nómina / CFDI              | [modules/payroll-cfdi.md](./modules/payroll-cfdi.md)          |
| 9 | Costos     | `conciliacion` | Conciliación               | [modules/attendance-reconciliation.md](./modules/attendance-reconciliation.md) |
|10 | Costos     | `costomo`      | Costo de Mano de Obra      | [modules/labor.md](./modules/labor.md)  |

Cross-cutting concerns (PDF/XLSX/XML export, date filtering, navigation, responsive layout) are documented in [modules/reporting-export.md](./modules/reporting-export.md).

---

## Terminology (Spanish → meaning)

Regression tests must match these exact strings as they appear in the UI.

| Term                   | Meaning                                                             |
|------------------------|---------------------------------------------------------------------|
| **OT** (Orden de Trabajo) | Work order. Numbered `OT-AL-XXXX`. Core unit of work-cost tracking. |
| **COT**                | Cotización. Numbered `COT-AL-NNNXXX-YYT` (e.g. `COT-AL-027ADL-26C`). |
| **OC**                 | Orden de Compra (cliente). Purchase order issued by client.         |
| **OCP / OCA**          | OC Alenstec. Purchase order Alenstec issues to its suppliers.       |
| **CFDI**               | Comprobante Fiscal Digital por Internet. Mexican electronic invoice (XML, SAT-signed). |
| **UUID (fiscal)**      | CFDI unique identifier assigned at timbrado.                        |
| **PUE / PPD**          | Pago en Una Exhibición / Pago en Parcialidades o Diferido.          |
| **RFC / CURP / IMSS / ISR / INFONAVIT / FONACOT** | Mexican tax + social-security identifiers. |
| **T/C**                | Tipo de cambio (USD→MXN reference rate, "Diario Oficial").          |
| **Requisición**        | Material requisition tied to an OT.                                 |
| **Checador**           | Time-clock system (CSV/XLSX import).                                 |
| **Conciliación**       | Reconciliation: checador hours vs. supervisor-classified hours vs. incidencias. |
| **Cierre de semana**   | Irreversible payroll-week close.                                    |
| **S.D / S.D.I**        | Salario Diario / Salario Diario Integrado (IMSS-contribution wage). |
| **MECR**               | Modificación / Evaluación / Cambio / Refurbish category.             |

---

## Technology stack (as built)

Aspirational items from prior revisions of this document have been removed. This is what actually exists:

### Frontend
- Single HTML file (`alenstec_app.html`, ~1800 lines), vanilla JS, no build step.
- DM Sans / DM Mono fonts (Google Fonts).
- `jspdf` 2.5.1 (CDN) for OT PDF export.
- `html2canvas` 1.4.1 (CDN) — loaded but **not currently invoked**.
- Native `DOMParser` for CFDI XML import.

### Backend (single Express app, `:3000`)

- **[`backend/src/server.js`](../backend/src/server.js)** — helmet + CORS, mounts `/api/auth` (public), then `app.use('/api', verificarJWT)` and all resource routes: `/api/work-orders`, `/api/quotes`, `/api/costs`, `/api/suppliers`, `/api/conciliacion/*`. Serves `backend/public/*` and `alenstec_app.html`.
- **Auth ([`src/middleware/auth.js`](../backend/src/middleware/auth.js) + [`src/routes/auth.js`](../backend/src/routes/auth.js)):** JWT access + refresh tokens, six roles — `admin`, `jefe_area`, `rh`, `supervisor`, `ventas`, `compras`. Boot-time `assertJwtSecret()` refuses to start on unset / default / < 32-char secrets. No dev fallback.
- **Models ([`src/models/`](../backend/src/models/)):** `User`, `WorkOrder`, `Quote`, `MaterialCost`, `LaborCost`, `Supplier`, `SupplierWorkOrder` (join). FK-enforced: `material_costs.work_order_id`, `labor_costs.work_order_id` (`ON DELETE RESTRICT`), `supplier_work_orders` (`CASCADE`). `otNumber` retained as redundant human column per ADR-006.
- **Migrations ([`src/db/migrations/`](../backend/src/db/migrations/)):** umzug-managed, supports `*.js` (Sequelize QueryInterface) and `*.sql` (raw SQL, forward-only). `sequelize.sync({alter:true})` removed. Scripts: `npm run migrate`, `npm run migrate:down`, `npm run seed`.
- **Seed ([`src/seed/index.js`](../backend/src/seed/index.js)):** idempotent — upserts one user per role + demo OTs/quotes/costs/suppliers if tables empty. Default password via `SEED_DEFAULT_PASSWORD` env var.
- **Database:** PostgreSQL 15+, connected through a shared Sequelize instance ([`src/db/sequelize.js`](../backend/src/db/sequelize.js)). Raw `pg` pool ([`src/db/config.js`](../backend/src/db/config.js)) retained as an escape hatch for conciliación hot paths per ADR-003.
- **Conciliación ([`src/routes/conciliacionRoutes.js`](../backend/src/routes/conciliacionRoutes.js) + [`src/services/`](../backend/src/services/)):** the formerly separate module is now fully merged into this tree (see ADR-002). `asistencia-modulo/` has been deleted.

### Not currently in the stack (despite prior doc claims)
WebSockets, MongoDB, React/React Native, machine-learning forecasting, biometric clock, SMTP email, SAT real-time validation, three-way-match procurement, Active Directory/LDAP, GDPR/SOX compliance tooling, Gantt library, Chart.js/D3.js.

---

## Phase 2 audit plan

The next phase begins with a feature audit that treats every visible UI element in `alenstec_app.html` as a candidate requirement. For each element, one of three outcomes is recorded:

1. **Implemented** — backend endpoint + DB persistence + UI wiring all exist. Promote to **regression test**.
2. **Partial** — some layer exists (usually DB model + list GET, no writes or KPI aggregation). Record the gap; test what works.
3. **Mockup** — HTML only, static data. Do not test the data, only that the DOM renders.

The master matrix lives in [`implementation-audit.md`](./implementation-audit.md). The concrete per-module test specifications are in [`regression-requirements.md`](./regression-requirements.md). Architectural design notes and diagrams are under [`../designs/`](../designs/).

### Entry criteria for Phase 2

- [ ] This documentation set has been reviewed and sign-off received.
- [ ] Architecture decisions in `designs/` (auth model, DB schema, module wiring) are accepted.
- [ ] Regression-test framework is chosen (Playwright for UI, Jest + supertest for API).

Once these hold, the regression suite can be authored directly from [`regression-requirements.md`](./regression-requirements.md).
