# Module 3 — Cotizaciones y Ventas

> **Source of truth:** [`alenstec_app.html` lines 426–453](../../alenstec_app.html), wired by `#mod-cotizaciones` / `data-mod="cotizaciones"`.

## Purpose

Commercial ledger for 2026. Tracks every quote issued (Cotización), links it to the corresponding client OC, the Alenstec OT it spawned (if any), and the USD price without IVA. Functions as "Control de Ventas 2026".

## Entry point

- Sidebar: "Cotizaciones y Ventas" (only item in **Comercial** section).
- Top-bar title: `Cotizaciones y Ventas`
- Top-bar breadcrumb: `· Control de Ventas 2026`
- Top-bar controls: **OT selector visible**, **Date-filter visible** (`Desde` / `Hasta` + `⬇ Descargar XLSX` button, disabled until both dates set).

## Visible requirements

### R3.1 — KPI strip (4 cards)

HTML 427–432.

| # | Label                 | Value    | Subtitle                               |
|---|-----------------------|----------|----------------------------------------|
| 1 | Cotizaciones 2026     | `18+`    | Registradas en control ventas          |
| 2 | Monto cotizado        | `$218K`  | USD · sin IVA · acumulado              |
| 3 | Tipo de cambio ref.   | `$17.34` | USD · Diario Oficial                   |
| 4 | Clientes activos      | `6`      | F3, Avanzar, Autoliv, Adient…          |

### R3.2 — Control de Ventas 2026 table

Card (HTML 433–452), header button `+ Nueva cotización`.

Columns, in order: **Item · Cliente · COT Ref. · COT Alenstec · Fecha COT · Costo (USD s/IVA) · OC Cliente · T/C · No. OT · Tipo · Estado**.

11 sample rows in the mockup. Notable formatting:

- `Item`, `COT Ref.`, `COT Alenstec`, `Costo`, `OC Cliente`, `T/C`, `No. OT` rendered monospace.
- `Tipo` badges seen in mockup: `Nuevo` (blue), `Refurbish` (amber), `MECR` (green), `Corte` (gray), `Fabricación` (blue), `Manufactura` (blue). Spanish badge palette.
- `Estado` badges: `Aprobada` (green), `En revisión` (amber).
- Row with the active/current OT (OT-1948 in the mockup) is highlighted with `background:var(--green-lt)`.
- Dashes (`—`) denote missing values.

### R3.3 — Download XLSX action

Button `#btn-dl-global` in the top-bar becomes enabled when both `#g-desde` and `#g-hasta` are filled (`checkGlobalDates()`, HTML 1356–1365). Clicking it today calls `handleGlobalAction()` which only triggers `exportConciliacionExcel` when the active module is `conciliacion`; for Cotizaciones it alerts "Acción no disponible en este módulo." — **Gap G-COT-3**.

## Interactive behavior

| Action                                   | Wired? | Notes                                               |
|------------------------------------------|--------|-----------------------------------------------------|
| Navigate to module                       | ✅      | `goMod('cotizaciones')`                             |
| OT selector visible in topbar            | ✅      | CSS `display:flex` for non-dashboard modules        |
| Date-filter enables download             | ✅ UI-only | Button enables when both dates set               |
| `⬇ Descargar XLSX` actually downloads    | ❌      | **Gap G-COT-3** — handler is a no-op alert          |
| Click `+ Nueva cotización`               | ❌      | **Gap G-COT-1** — no handler, no modal              |
| Table rows load from backend             | ❌      | **Gap G-COT-2** — `GET /api/quotes` exists, unused  |
| KPI values reflect live data             | ❌      | **Gap G-COT-4** — wire to `/api/quotes/kpi/open-count` + aggregate of `amount` |

## Backend support

`backend/models/Quote.js` — UUID PK, `quoteNumber` (unique), `client`, `description`, `amount`, `currency` (default USD), `status` (enum `Pendiente`/`Aprobada`/`Rechazada`/`Expirada`), `validUntil`.

`backend/routes/quotes.js` — `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `GET /kpi/open-count`. **No `DELETE`**.

**Gap G-COT-5:** the UI table columns require `cotRefCliente` (the client's reference number, e.g. `057AMX-24` or `TERM. Y COND.`), `ocClienteNumber`, `fechaCotizacion`, `tipoCambio`, `otNumber` (FK to WorkOrder), and `tipo` (enum covering mockup values `Nuevo / Refurbish / MECR / Corte / Fabricación / Manufactura`). These are not in the model.

## Acceptance criteria

AC-COT-01. Sidebar item `[data-mod="cotizaciones"]` becomes `active` on click.
AC-COT-02. `#ttitle` reads `Cotizaciones y Ventas`; `#tcrumb` reads `· Control de Ventas 2026`.
AC-COT-03. `#ctrl-ot-sel` and `#ctrl-dates` are both visible; `#ctrl-tabs` is hidden.
AC-COT-04. KPI strip renders 4 cards with labels from R3.1 in the listed order.
AC-COT-05. Control-de-Ventas table renders 11 columns in the order specified in R3.2.
AC-COT-06. Every `Tipo` cell contains exactly one `.badge` element.
AC-COT-07. Every `Estado` cell contains exactly one `.badge` element.
AC-COT-08. `#btn-dl-global` is disabled (opacity `.45`) while either date field is empty.
AC-COT-09. Setting both `#g-desde` and `#g-hasta` enables `#btn-dl-global`.
AC-COT-10. Clicking `+ Nueva cotización` (today) does not navigate away from the module.

Future (post-implementation):
AC-COT-11. Clicking `+ Nueva cotización` opens a creation modal/form.
AC-COT-12. On save, the new row appears in the table via `POST /api/quotes`.
AC-COT-13. Loading the module fires `GET /api/quotes` and renders returned records.

## Regression test candidates

- **UI today:** AC-COT-01 … AC-COT-10 — DOM-only.
- **API contract today:** CRUD + KPI for `/api/quotes` against seeded DB.
- **Blocked:** XLSX-download assertion (downloadable file name/content); create-dialog flow; live data rendering.

## Out of scope for Phase 1 (mockup only)

Quote-to-email delivery, sales-pipeline visualization, revenue forecasting, commission calculation, QuickBooks/Xero integration, CRM integration, client satisfaction surveys, GDPR-compliant contact management. None of these have any presence in the mockup.
