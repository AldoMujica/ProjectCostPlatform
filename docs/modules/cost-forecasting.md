# Module 4 — Pronóstico del Costo

> **Source of truth:** [`alenstec_app.html` lines 456–477](../../alenstec_app.html), wired by `#mod-pronostico` / `data-mod="pronostico"`.

## Purpose

Side-by-side comparison of quoted (Cotizado) vs. actual (Real) cost per OT, in both USD and MXN, with a variance badge and a "semáforo" status. Targets project control and finance review.

The mockup's variance computation is visible in one row (OT-1936: quoted $8,520, real $2,473 → `−71% bajo presup.` green). Other rows show `En proceso`, `+41% avance`, `Inicio`, `Cotizado` placeholders.

## Entry point

- Sidebar: "Pronóstico del Costo" (first item, Costos section).
- Top-bar title: `Pronóstico del Costo`
- Top-bar breadcrumb: `· Cotizado vs. Real por OT`
- Top-bar controls: OT selector visible, Date-filter visible, pill-tabs hidden.

## Visible requirements

### R4.1 — KPI strip (4 cards)

HTML 457–462.

| # | Label                  | Value    | Subtitle                              |
|---|------------------------|----------|---------------------------------------|
| 1 | Costo cotizado total   | `$218K`  | USD · acumulado 2026                  |
| 2 | Costo real (OT-1936)   | `$2,473` | USD · vs $8,520 cotizado              |
| 3 | Horas cotizadas        | `413`    | hrs · OT-1936 labor directa           |
| 4 | Horas reales           | `388`    | hrs · registradas en ERP              |

### R4.2 — Pronóstico del Costo por OT table

Card (HTML 463–476), no header action button today. Columns:

**No. OT · Cliente · Descripción · Cot. (USD) · Real (USD) · T/C · Cot. (MXN) · Varianza · Semáforo**

Rules observed in mockup rows:

| Condition                                    | Varianza badge            | Semáforo badge        |
|----------------------------------------------|---------------------------|------------------------|
| Real < Cotizado (project healthy)            | `−71% bajo presup.` green | `✓ OK` green           |
| Real in-progress, under 50% spent            | `+41% avance` amber       | `Atención` amber       |
| Real empty, OT ejecutándose                  | `En proceso` gray         | `En ejecución` blue    |
| Real empty, OT newly started                 | `Inicio` green            | `En ejecución` blue    |
| Real empty, OT not yet started               | `Cotizado` gray           | `Sin iniciar` gray     |

Row for the currently-selected OT (OT-1948 in mockup) is highlighted `background:var(--green-lt)`.

## Interactive behavior

| Action                                   | Wired? | Notes                                              |
|------------------------------------------|--------|----------------------------------------------------|
| Navigate to module                       | ✅      | `goMod('pronostico')`                              |
| Date-filter enables download             | ✅ UI-only | Generic `checkGlobalDates()` wiring             |
| `⬇ Descargar XLSX` actually downloads    | ❌      | Same no-op alert as Cotizaciones — **G-COT-3**     |
| Table rows load from backend             | ❌      | **Gap G-PRON-1** — no endpoint aggregating real vs quoted |
| KPI values reflect live data             | ❌      | **Gap G-PRON-2** — depends on G-PRON-1             |
| Variance + semáforo computation rules    | ❌      | **Gap G-PRON-3** — thresholds undefined in code   |

## Backend support

No endpoint today computes the "quoted vs. real" aggregate. The ingredients exist:
- `WorkOrder.quotedCost`, `WorkOrder.actualCost` (but `actualCost` defaults to 0 and is never updated).
- `MaterialCost.totalCost` (summable by `otNumber`).
- `LaborCost.totalCost` (summable by `otNumber`).

**Recommended endpoint (architecture phase):** `GET /api/forecasting?year=2026` returning `[{otNumber, client, description, quotedUsd, realUsd, tipoCambio, quotedMxn, variancePct, semaforo}]`. The variance/semáforo rules in R4.2 must be codified.

## Acceptance criteria

AC-PRON-01. Top-bar `#ttitle` reads `Pronóstico del Costo`; `#tcrumb` reads `· Cotizado vs. Real por OT`.
AC-PRON-02. KPI strip renders 4 cards, labels per R4.1.
AC-PRON-03. The main table renders 9 columns in the order specified in R4.2.
AC-PRON-04. Every `Varianza` cell contains exactly one `.badge` element.
AC-PRON-05. Every `Semáforo` cell contains exactly one `.badge` element.
AC-PRON-06. OT numbers in the `No. OT` column are monospace (class `mono`).

Future:
AC-PRON-07. Given seeded OT with `quotedCost=8520`, sum of seeded `materialCost.totalCost + laborCost.totalCost` for that OT = `2473`, and `tipoCambio=17.95`, the row renders `Cot. (USD) = $8,520`, `Real (USD) = $2,473`, `Cot. (MXN) = $152,940` (±10 MXN).
AC-PRON-08. Variance-badge selection follows R4.2 rules.

## Regression test candidates

- **UI today:** AC-PRON-01 … AC-PRON-06.
- **Blocked:** AC-PRON-07/08 — requires the forecasting endpoint (G-PRON-1) and codified rules (G-PRON-3).

## Out of scope for Phase 1 (mockup only)

ML-based predictive modelling, what-if scenario planning, automated cost-overrun notifications, drill-down navigation, profitability analysis, cost-driver identification, hierarchical budget consolidation. These aspirational items from earlier specs have no mockup presence; they must not be part of the regression suite.
