# Module 1 — Dashboard

> **Source of truth:** [`alenstec_app.html` lines 287–354](./alenstec_app.html), wired by `#mod-dashboard` / `data-mod="dashboard"`.

## Purpose

Landing page shown on load. Gives an at-a-glance operational view of 2026 OTs: counts, cotized-cost totals, pending deliveries, open quotes, plus recent-OT and open-OC snapshots.

## Entry point

- Sidebar: "Dashboard" (first item in Section "Principal"), default active.
- Top-bar title: `Dashboard`
- Top-bar breadcrumb: `· Todas las Órdenes de Trabajo · 2026`
- Top-bar controls shown on this module: **pill-tabs only** (`Todas` / `Activas` / `Cerradas`). The OT selector and date-filter are hidden (see `goMod('dashboard')`, HTML line 1314).

## Visible requirements

### R1.1 — KPI strip (4 cards)

Fixed order, left-to-right (HTML lines 288–293). Each card renders label + numeric value + subtitle + coloured badge.

| # | Label (`.kl`)            | Value (`.kv`) | Subtitle (`.ks`)              | Badge (`.kb`)                  |
|---|--------------------------|---------------|-------------------------------|--------------------------------|
| 1 | OTs Activas              | `18`          | En proceso · 2026             | `↑ 5 nuevas en marzo` (green)  |
| 2 | Costo Total Cotizado     | `$218K`       | USD · acumulado 2026          | `T/C ref. $17.34` (blue)       |
| 3 | Material en Tránsito     | `$36K`        | MXN · OCs pendientes          | `3 entregas pendientes` (amber)|
| 4 | Cotizaciones Abiertas    | `11`          | Pendientes de aprobación      | `Vigentes 2026` (blue)         |

Values are **hardcoded** in the HTML. Backend endpoints exist for 3 of the 4:
- KPI 1 ← `GET /api/work-orders/kpi/summary` → `{activeCount, totalCost}`
- KPI 2 ← same endpoint (`totalCost`)
- KPI 3 ← `GET /api/costs/kpi/material-transit` → `{total, count}`
- KPI 4 ← `GET /api/quotes/kpi/open-count` → `{openCount}`

None of these endpoints are currently called by the dashboard — wiring is pending (gap **G-DASH-1**, see [IMPLEMENTATION_AUDIT.md](./IMPLEMENTATION_AUDIT.md)).

### R1.2 — Órdenes de Trabajo Recientes

Card with table (HTML lines 295–308). Columns: **No. OT · Cliente · Descripción · Tipo · Avance · Estado**.

- OT number rendered monospace, semibold.
- "Tipo" shown as badge: `Nuevo` (blue), `Refurbish` (amber), `Servicio` (gray).
- "Avance" shown as numeric % + coloured progress bar. Colour rule observed in mockup:
  - `0 ≤ pct < 50`  → amber
  - `50 ≤ pct < 100` → green
  - `pct = 100`     → gray (`var(--text3)`) — also used for Liberada/Cerrada rows.
- "Estado" badge: `En ejecución` (green), `En revisión` (amber), `Liberada` / `Cerrada` (gray).
- Header action: "Ver todas →" → `goMod('ot')` (HTML line 296).

Rows today are hardcoded (6 sample OTs). Backend has the list at `GET /api/work-orders`.

### R1.3 — Costo Cotizado por OT (bar chart)

Card (HTML lines 309–320). Seven horizontal bars, labelled by OT number, with monospace USD amount on the right. Bar width proportional to amount (longest = 100%). Colour rule:
- Top bar → amber (highest-cost/problematic).
- Rest → green or blue proportional to value (mockup uses fixed styling, no dynamic thresholds).
- 100 % + gray = closed OT.

Values hardcoded. Could read from `GET /api/work-orders` with client-side sort.

### R1.4 — Proveedores Activos

Card (HTML lines 323–332). Five-row timeline. Each row: coloured dot + supplier name + sub-line (categorias · OTs). Dot colour reflects status: green (activo), amber (entrega pendiente), blue (observación).

Backend has `GET /api/suppliers` returning the full list. Not wired.

### R1.5 — OCs Abiertas

Card (HTML lines 333–342). Five-row timeline. Each row: coloured dot + OC number + sub-line (cliente · OT · monto USD). Dot colour reflects urgency (red / amber / green / blue).

No backend model for "OC cliente" exists today — this is **mockup only**.

### R1.6 — Empleados en Campo

Card (HTML lines 343–353). Five-row list. Each row: avatar initials + employee name + sub-line (áreas · ID).

Employee data lives in the conciliación / horas tables — no endpoint currently serves "employees in field". Mockup only.

## Interactive behavior

| Action                                    | Wired? | Implementation                                        |
|-------------------------------------------|--------|-------------------------------------------------------|
| Navigate to Dashboard from any module     | ✅      | `goMod('dashboard')` (HTML 1314)                      |
| Click "Ver todas →"                       | ✅      | `goMod('ot')` (HTML 296)                              |
| Pill-tab click (Todas / Activas / Cerradas) | ✅ UI-only | Adds `.active` class; no data filtering yet (HTML 1339) |
| KPI values reflect live data              | ❌      | **Gap G-DASH-1** — wire to `/api/*/kpi/*`             |
| Recent-OT table reflects live data        | ❌      | **Gap G-DASH-2** — wire to `/api/work-orders`         |
| Cost-per-OT bars reflect live data        | ❌      | **Gap G-DASH-3** — derive from `/api/work-orders`     |
| Suppliers timeline reflects live data     | ❌      | **Gap G-DASH-4** — wire to `/api/suppliers`           |
| OCs Abiertas — any data source            | ❌      | **Gap G-DASH-5** — requires new model `PurchaseOrder` |
| Empleados en Campo                        | ❌      | **Gap G-DASH-6** — requires employee-field endpoint   |

## Acceptance criteria (testable)

AC-DASH-01. On first load, sidebar item `[data-mod="dashboard"]` has class `active`.
AC-DASH-02. Top-bar `#ttitle` reads exactly `Dashboard`.
AC-DASH-03. Top-bar `#tcrumb` reads exactly `· Todas las Órdenes de Trabajo · 2026`.
AC-DASH-04. `#ctrl-tabs` is visible; `#ctrl-dates` and `#ctrl-ot-sel` are hidden.
AC-DASH-05. The KPI strip renders exactly 4 cards with the labels in the R1.1 table.
AC-DASH-06. When a pill-tab is clicked, it and only it has class `active` among `.pill-tab`.
AC-DASH-07. Clicking "Ver todas →" transitions to `#mod-ot` (module OT); `#mod-dashboard` loses `.active`.
AC-DASH-08. Recent-OT table has ≥1 row and renders the six columns in order.
AC-DASH-09. Each "Avance" cell contains both a numeric-percentage text node and a `.prog-fill` element.
AC-DASH-10. Each "Estado" cell contains exactly one `.badge` element.

Once R1.2 is wired to `/api/work-orders`, add:
AC-DASH-11 (future). When the API returns N records, the Recent-OT table has `min(N, 6)` body rows.

## Regression test candidates

- **UI, stable today:** AC-DASH-01 … AC-DASH-10 — pure DOM assertions, no backend needed.
- **API contract, stable today:** `/api/work-orders/kpi/summary`, `/api/quotes/kpi/open-count`, `/api/costs/kpi/material-transit` — assert response shape against a seeded DB (see [REGRESSION_REQUIREMENTS.md](./REGRESSION_REQUIREMENTS.md) §Dashboard).
- **Blocked on implementation:** all "data reflects live state" assertions; the OCs-Abiertas widget (no backing model).

## Out of scope for Phase 1 (mockup only)

Executive dashboards by role, WebSocket streaming, Chart.js integration, custom KPI creation, mobile dashboard, alert thresholds, historical trend analysis. These appeared in earlier aspirational specs but have no mockup presence and are not to be tested.
