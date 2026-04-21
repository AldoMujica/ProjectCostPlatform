# Module 5 — Costo de Material

> **Source of truth:** [`alenstec_app.html` lines 479–506](./alenstec_app.html), wired by `#mod-material` / `data-mod="material"`.
>
> **Related:** Module 6 (Entregas) covers `Inventario` — stock existence. This module covers *requisitions* — what's been bought per OT.

## Purpose

Line-item view of every material purchase requested against an OT. Captures provider, moneda (MXN/USD), clave/SKU, descripción, pzas, precio unitario, IVA 16 %, Retención ISR (1.25 % when applicable), subtotal, IVA $, Total.

## Entry point

- Sidebar: "Costo de Material" (second item, Costos section).
- Top-bar title: `Costo de Material`
- Top-bar breadcrumb: `· Requisición por OT`
- Top-bar controls: OT selector visible, Date-filter visible.

## Visible requirements

### R5.1 — KPI strip (4 cards)

HTML 481–486.

| # | Label                   | Value      | Subtitle                           |
|---|-------------------------|------------|------------------------------------|
| 1 | Líneas de material      | `377+`     | OCs en base de datos               |
| 2 | Material stock activas  | `$1,411`   | USD · rev. 13-Mar-2026             |
| 3 | Material solicitado     | `$19,875`  | USD · total activas                |
| 4 | Costo gral. real        | `$44,491`  | MXN · OT-1936                      |

### R5.2 — Requisición de Material Comercial por OT table

Card (HTML 487–505), header action `+ Registrar material`.

Columns (13): **No. Prov. · Proveedor · Moneda · Clave · Descripción · OT · Pzas · Precio Unit. · IVA · Ret. ISR · Subtotal · IVA $ · Total**

Observations from mockup data (11 sample rows):

- `Moneda` is a badge: `USD` (blue) or `MXN` (gray).
- `IVA` column shows a literal `16%` (flat-rate column).
- `Ret. ISR` shows `1.25%` or `—`. Appears on supplier-services lines (e.g. CORTELASER, Pei Equipos) but not on goods.
- Numeric columns monospace.
- `Total` bold.

## Interactive behavior

| Action                                  | Wired? | Notes                                         |
|-----------------------------------------|--------|-----------------------------------------------|
| Navigate to module                      | ✅      | `goMod('material')`                           |
| Date-filter enables download            | ✅ UI-only |                                         |
| `⬇ Descargar XLSX` actually downloads   | ❌      | **Gap G-COT-3**                                |
| Click `+ Registrar material`            | ❌      | **Gap G-MAT-1** — no handler, no modal        |
| Table rows load from backend            | ❌      | **Gap G-MAT-2** — `GET /api/costs/material` exists, unused |
| KPI values reflect live data            | ❌      | **Gap G-MAT-3** — partial endpoint exists (`GET /api/costs/kpi/material-transit`); line-count and solicitado totals not endpoint-covered |

## Backend support

`backend/models/MaterialCost.js` — UUID PK, `otNumber`, `materialDescription`, `quantity`, `unitCost`, `totalCost`, `currency` (default MXN), `supplier`, `status` (enum `Pendiente`/`En tránsito`/`Entregado`), `deliveryDate`.

`backend/routes/costs.js` — `GET /material`, `POST /material`, `GET /kpi/material-transit`. **No PUT / DELETE** on individual lines.

**Gap G-MAT-4** — fields missing from the model that the table requires: `providerNumber` (No. Prov.), `clave` (SKU/part number), `pzas` (separate from `quantity` if they diverge), `ivaRate` / `ivaAmount`, `retencionIsr` / `retencionIva`, `subtotal`, `total`. Today `MaterialCost.totalCost` is a single precomputed column and does not split subtotal/IVA/retencion.

## Acceptance criteria

AC-MAT-01. Top-bar `#ttitle` reads `Costo de Material`; `#tcrumb` reads `· Requisición por OT`.
AC-MAT-02. KPI strip renders 4 cards, labels per R5.1 in order.
AC-MAT-03. Requisición table renders 13 columns in the order specified in R5.2.
AC-MAT-04. Each row's `Moneda` cell contains a single `.badge` (`bb` for USD, `bn` for MXN).
AC-MAT-05. `Subtotal`, `IVA $`, `Total` cells are monospace; `Total` cell has `font-weight:600`.
AC-MAT-06. `+ Registrar material` button is present in the card header.

Future:
AC-MAT-07. On module load, `GET /api/costs/material` populates the table with returned records (columns mapped per G-MAT-4).
AC-MAT-08. Clicking `+ Registrar material` opens a creation modal.

## Regression test candidates

- **UI today:** AC-MAT-01 … AC-MAT-06.
- **API contract today:** `GET /api/costs/material`, `POST /api/costs/material`, `GET /api/costs/kpi/material-transit`.
- **Blocked:** live-data rendering (G-MAT-2), modal-driven creation (G-MAT-1), KPI aggregates for "líneas totales" and "solicitado" (G-MAT-3).

## Out of scope for Phase 1 (mockup only)

MRP engine, barcode/QR tracking, RFID integration, inventory optimization algorithms, reorder-point alerts, supplier scorecards, preferred-supplier program, mobile inventory app. Those appeared in earlier aspirational specs. They do not appear in the mockup and are not to be regression-tested.

> **Note:** Inventory stock-level display (what's physically in the warehouse) is a separate feature and lives in **Module 6 — Entregas de Material**, sub-tab "Inventario". See [`supplier-procurement-features.md`](./supplier-procurement-features.md) §6.3.
