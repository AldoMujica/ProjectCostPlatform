# Alenstec — Gestión de Costos de Proyecto

> **Source of truth:** [`alenstec_app.html`](./alenstec_app.html) is the client-validated mockup. All requirements in this repository are derived from it. When this document and the HTML disagree, the HTML wins.
>
> **Status:** Phase 1 mockup. Approximately 20% of the visible surface is wired to a backend; the remainder is static HTML awaiting implementation. See [`IMPLEMENTATION_AUDIT.md`](./IMPLEMENTATION_AUDIT.md) for the full matrix.

---

## Product overview

Alenstec SA de CV is a Mexican manufacturer of industrial automation tooling. This system unifies the cost lifecycle of a manufacturing project (Orden de Trabajo / OT) from quote to payroll reconciliation, with Mexican-tax (CFDI / IMSS / ISR / INFONAVIT) compliance baked in.

The UI is a single-page Spanish-language dashboard served from [`alenstec_app.html`](./alenstec_app.html). It targets desktop operators (≥1100 px) with graceful degradation to tablet.

### Primary user persona

**Jesús Lara — Manufactura / Autorización** (visible in the sidebar footer). He authorizes OTs, captures hours, and closes payroll weeks. Secondary roles visible in the mockup: RH, Jefe de Área, Supervisor, Compras, Ingeniería.

---

## Module map (source of truth: HTML sidebar)

The sidebar (HTML lines 201–245) declares **10 modules** grouped into 3 sections. Each module's `data-mod` attribute is the stable identifier used in JS (`goMod(id)`).

| # | Section    | `data-mod`     | Title in sidebar          | Detailed spec                                                  |
|---|------------|----------------|----------------------------|----------------------------------------------------------------|
| 1 | Principal  | `dashboard`    | Dashboard                  | [dashboard-analytics-features.md](./dashboard-analytics-features.md) |
| 2 | Principal  | `ot`           | Orden de Trabajo (badge 18)| [work-order-management-features.md](./work-order-management-features.md) |
| 3 | Comercial  | `cotizaciones` | Cotizaciones y Ventas      | [sales-quoting-features.md](./sales-quoting-features.md)        |
| 4 | Costos     | `pronostico`   | Pronóstico del Costo       | [cost-forecasting-features.md](./cost-forecasting-features.md)  |
| 5 | Costos     | `material`     | Costo de Material          | [material-management-features.md](./material-management-features.md) |
| 6 | Costos     | `entregas`     | Entregas de Material       | [supplier-procurement-features.md](./supplier-procurement-features.md) |
| 7 | Costos     | `horas`        | Horas de Mano de Obra      | [labor-management-features.md](./labor-management-features.md)  |
| 8 | Costos     | `nomina`       | Nómina / CFDI              | [payroll-cfdi-features.md](./payroll-cfdi-features.md)          |
| 9 | Costos     | `conciliacion` | Conciliación               | [attendance-reconciliation-features.md](./attendance-reconciliation-features.md) |
|10 | Costos     | `costomo`      | Costo de Mano de Obra      | [labor-management-features.md](./labor-management-features.md)  |

Cross-cutting concerns (PDF/XLSX/XML export, date filtering, navigation, responsive layout) are documented in [reporting-export-features.md](./reporting-export-features.md).

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

### Backend (dual-server)
- **`backend/server.js`** on `:3000` — legacy cost API, Sequelize ORM, PostgreSQL.
  - Mounts `/api/work-orders`, `/api/quotes`, `/api/costs`, `/api/suppliers`.
- **`backend/src/server.js`** on `:3001` — conciliación module, raw `pg` pool, helmet + CORS.
  - Mounts `/api/conciliacion/*`, serves `backend/public/*` and `alenstec_app.html`.
- Models: `WorkOrder`, `Quote`, `MaterialCost`, `LaborCost`, `Supplier` (no FK relationships).
- Seed data: `backend/seed.js` loads 6 OTs, 4 quotes, 3 material + 3 labor costs, 3 suppliers.
- JWT middleware exists in `backend/src/middleware/auth.js` with roles: `supervisor`, `jefe_area`, `rh`, `admin`. Falls back to `{id:1, rol:'admin'}` when no token — **development mode**.

### Sub-project
- `asistencia-modulo/` — parallel implementation of conciliación with its own `package.json`, raw `pg` pool, express-validator. Currently contains only `package.json` and `src/db/config.js`; status unclear — audited as "scaffold only" in the implementation audit.

### Not currently in the stack (despite prior doc claims)
WebSockets, MongoDB, React/React Native, machine-learning forecasting, biometric clock, SMTP email, SAT real-time validation, three-way-match procurement, Active Directory/LDAP, GDPR/SOX compliance tooling, Gantt library, Chart.js/D3.js.

---

## Phase 2 audit plan

The next phase begins with a feature audit that treats every visible UI element in `alenstec_app.html` as a candidate requirement. For each element, one of three outcomes is recorded:

1. **Implemented** — backend endpoint + DB persistence + UI wiring all exist. Promote to **regression test**.
2. **Partial** — some layer exists (usually DB model + list GET, no writes or KPI aggregation). Record the gap; test what works.
3. **Mockup** — HTML only, static data. Do not test the data, only that the DOM renders.

The master matrix lives in [`IMPLEMENTATION_AUDIT.md`](./IMPLEMENTATION_AUDIT.md). The concrete per-module test specifications are in [`REGRESSION_REQUIREMENTS.md`](./REGRESSION_REQUIREMENTS.md). Architectural design notes and diagrams are under [`designs/`](./designs/).

### Entry criteria for Phase 2

- [ ] This documentation set has been reviewed and sign-off received.
- [ ] Architecture decisions in `designs/` (auth model, DB schema, module wiring) are accepted.
- [ ] Regression-test framework is chosen (Playwright for UI, Jest + supertest for API).

Once these hold, the regression suite can be authored directly from [`REGRESSION_REQUIREMENTS.md`](./REGRESSION_REQUIREMENTS.md).
