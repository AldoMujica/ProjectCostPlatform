# Module 2 — Orden de Trabajo (OT)

> **Source of truth:** [`alenstec_app.html` lines 356–423](../../alenstec_app.html), wired by `#mod-ot` / `data-mod="ot"`. Sidebar badge shows `18` (active-OT count).

## Purpose

Detail view of a single Orden de Trabajo (work order), presented as a liberation form: client, requisitor, responsables, presupuestos, estimated hours, and the approval flow. Generates the physical "FORMATO PARA INICIO Y/O LIBERACION" PDF that plant operations sign.

## Entry point

- Sidebar: "Orden de Trabajo · badge 18" (second item, Principal section).
- Top-bar title: `Orden de Trabajo`
- Top-bar breadcrumb: `· Formato OT / Liberación`
- Top-bar controls shown: **OT selector dropdown** (`#ctrl-ot-sel`) with 13 hardcoded OT numbers (`OT-AL-1948` … `OT-AL-1936`). Changing it calls `updateOTBanner(value)` which updates `.ot-num` text but does **not** re-load form fields (known gap). Date-filter is hidden; pill-tabs hidden.

## Visible requirements

### R2.1 — OT banner

Full-width green banner (HTML 358–364) with:
- Large monospace OT number (`.ot-num`, e.g. `OT-AL-1948`).
- Description (`.ot-desc`) — client · short description · plant.
- Action button: `⬇ Imprimir PDF` → `generateOTPDF()`.

### R2.2 — Datos Generales

Card with 13 form inputs organized in 2-column grid (HTML 367–379):

| Field                     | Example                                    |
|---------------------------|---------------------------------------------|
| No. de OT                 | `OT-AL-1948`                                |
| Fecha de liberación       | `3 de marzo de 2026`                        |
| Cliente                   | `ADIENT LERMA`                              |
| Área Requisitora          | `Coordinator Proyect`                       |
| Requisitor                | `Ing. Alejandro García`                     |
| E-mail                    | `j.garcia.calzada@adient.com`               |
| # OC Cliente              | `2301498137`                                |
| COT Ref. Alenstec         | `COT-AL-027ADL-26C`                         |
| Fecha de emisión          | `10 de marzo de 2026`                       |
| F. Entrega Compromiso     | `7 de abril de 2026`                        |
| Tipo de proyecto (select) | options: `Refurbish`, `Nuevo`, `MECR`       |
| Cantidad                  | `1`                                         |
| Descripción del trabajo   | free-text (rendered as read-only block, not an `input`) |

### R2.3 — Liberado a (Jefaturas)

Card (HTML 382–388). Four form inputs in a 2×2 grid: **Ingeniería, Manufactura, Compras, Otros**.

### R2.4 — Presupuestos

Card (HTML 389–395). Five inputs:
- Tipo de Cambio (USD) — e.g. `$17.34 USD`
- Ppto. MO (MXN)  — e.g. `$21,263`
- Ppto. MO (USD)  — e.g. `$1,226`
- Ppto. Material (MXN) — e.g. `$12,050`
- Ppto. Material (USD) — e.g. `$695`

### R2.5 — Horas Estimadas del Proyecto

Card with table (HTML 398–409), one row per área (**Manufactura (Est.)**, **Inst. Planta (Est.)**, **Manufactura (Reales)**, plus footer **TOTAL HORAS ESTIMADAS**). Columns:

`Área · Ing./Diseño · Corte · Fabricación · Maquinado · L. Ensamble · L. Eléctrica · Automatiz. · Supervisor · Méc./Téc. · Eléctrico · Programador · Total`

- Manufactura vs. Instalación rows show different subsets of columns (dashes for N/A).
- Reales row defaults to zeros — editable but not persisted.
- TOTAL is a computed footer cell (currently hardcoded `243`).

### R2.6 — Flujo de Liberación

Card with workflow table (HTML 410–422). Columns: **Paso · Responsable · Área · Fecha · Estado · Observaciones**. Five rows:

| Paso                       | Estado badge   |
|----------------------------|----------------|
| Elaboración OT             | `Completo` (green) |
| Revisión Ingeniería        | `Completo` (green) |
| Revisión Compras           | `Pendiente` (amber) |
| Aprobación Manufactura     | `Bloqueado` (gray) |
| Liberación a Producción    | `Liberada` (green) |

This represents the approval-state-machine per OT. Today it is **static mockup** — no backend workflow engine exists.

### R2.7 — PDF export (`generateOTPDF`)

Implemented in HTML lines 1115–1311 using `jspdf`. Produces an A4 / letter-sized single-page document with:

1. Title band "ALENSTEC SA DE CV / FORMATO PARA INICIO Y/O LIBERACION".
2. FECHA / CANTIDAD / No. DE OT ASIGNADA row.
3. CLIENTE row.
4. AREA REQUISITOR / REQUISITOR / E-MAIL / PROGRAMA rows.
5. FECHA LIBERACION / F. ENTREGA COMPROMISO row.
6. # OC CLIENTE / # COT REF. ALENSTEC row.
7. DESCRIPCION block (wrapped multi-line).
8. OBSERVACIONES block (hardcoded: "SE ANEXA CARATULA DE COTIZACION.").
9. TIPO DE CAMBIO + REF. DIARIO OFICIAL line.
10. PRESUPUESTO MANO DE OBRA / PRESUPUESTO MATERIAL COMERCIAL two-column block with MXN/USD cells.
11. HORAS ESTIMADAS table (ING/DISEÑO / CORTE / FABRICACION / MAQUINADO / L.ENSAMBLE / L.ELECTRICA / AUTOMATIZ. / TOTAL).
12. HORAS REALES table (initialized to `—`).
13. Footer: FIRMA DE LAS JEFATURAS — six labelled boxes (`VENTAS · R.H · INGENIERIA · CONTABILIDAD · MANUFACTURA · COMPRAS`).

File is saved as `OT-<otNum>.pdf`. The function reads `.fi` inputs within `#mod-ot` and uses the `.ot-num` text for the number.

## Interactive behavior

| Action                                    | Wired? | Notes                                            |
|-------------------------------------------|--------|--------------------------------------------------|
| OT selector change → banner text updates  | ✅      | `updateOTBanner(value)` only changes `.ot-num`   |
| OT selector change → reload all form data | ❌      | **Gap G-OT-1** — no fetch call                   |
| Click "Imprimir PDF"                      | ✅      | `generateOTPDF()` (HTML 1115)                    |
| Edit a form field                         | ⚠️      | Value updates in DOM only, no persistence        |
| Save / update OT                          | ❌      | **Gap G-OT-2** — no "Save" control; backend has `PUT /api/work-orders/:id` |
| `+ Nueva OT` button (top-bar)             | ❌      | **Gap G-OT-3** — button exists; no handler       |
| Approval-flow state transition            | ❌      | **Gap G-OT-4** — workflow engine missing         |

## Backend support

`backend/models/WorkOrder.js` — UUID PK, `otNumber` (unique), `client`, `description`, `type` (enum `Nuevo`/`Refurbish`/`Servicio`), `progress`, `status` (enum `En ejecución`/`Liberada`/`En revisión`/`Cerrada`), `quotedCost`, `actualCost`, `currency`, `startDate`, `endDate`.

`backend/routes/workOrders.js` — full CRUD + `GET /kpi/summary`. Fields missing from the schema that the form captures: `requisitor`, `email`, `ocClienteNumber`, `cotRef`, `fechaEmision`, `fechaEntrega`, `liberadoIngenieria`, `liberadoManufactura`, `liberadoCompras`, `liberadoOtros`, `presupuestoMOMxn`, `presupuestoMOUsd`, `presupuestoMaterialMxn`, `presupuestoMaterialUsd`, `tipoCambio`, `areaRequisitora`, `cantidad`, plus the hours-breakdown rows and the approval-flow history.

**Recommendation (for architecture phase):** extend `WorkOrder` to cover the liberation-form fields and introduce a sibling `WorkOrderApproval` table for R2.6.

## Acceptance criteria

AC-OT-01. Sidebar badge for `[data-mod="ot"]` displays the active-OT count (today hardcoded `18`).
AC-OT-02. Top-bar controls: `#ctrl-ot-sel` visible, `#ctrl-dates` hidden, `#ctrl-tabs` hidden.
AC-OT-03. Changing the OT selector updates `.ot-num` text to the selected value.
AC-OT-04. Datos Generales renders 12 `input` elements + 1 `select` (Tipo de proyecto) with options `Refurbish`, `Nuevo`, `MECR`.
AC-OT-05. Liberado a card renders exactly 4 inputs (Ingeniería, Manufactura, Compras, Otros).
AC-OT-06. Presupuestos card renders exactly 5 inputs in the order specified in R2.4.
AC-OT-07. Horas Estimadas table has 13 columns and footer row "TOTAL HORAS ESTIMADAS" with a numeric total.
AC-OT-08. Flujo de Liberación renders 5 rows with a `.badge` in each Estado cell.
AC-OT-09. Clicking `⬇ Imprimir PDF` triggers a browser download of a PDF named `OT-<otNumber>.pdf`.
AC-OT-10. Generated PDF contains the six signature-block labels `VENTAS`, `R.H`, `INGENIERIA`, `CONTABILIDAD`, `MANUFACTURA`, `COMPRAS`.
AC-OT-11. Generated PDF's title text contains `ALENSTEC SA DE CV` and `FORMATO PARA INICIO V/O LIBERACION`.
AC-OT-12. When form values are edited and PDF is regenerated, the new values appear in the PDF.

When G-OT-1 is closed:
AC-OT-13 (future). Changing the OT selector fires `GET /api/work-orders?otNumber=<val>` and populates form inputs.

## Regression test candidates

- **UI + PDF, stable today:** AC-OT-01 … AC-OT-12 — visual/DOM assertions on the active module, plus a PDF-content assertion using `pdf-parse` or similar on the downloaded file against a fixed form state.
- **API contract, stable today:** all five endpoints under `/api/work-orders` with seeded DB — see [REGRESSION_REQUIREMENTS.md](../regression-requirements.md) §OT.
- **Blocked:** save-flow tests, approval-transition tests, "+ Nueva OT" dialog tests, selector → form repopulation tests.

## Out of scope for Phase 1 (mockup only)

Email/SMS notifications, digital-signature capture, AD/LDAP integration, Gantt visualization, automated client-portal progress reports, version control on form edits. The presence of the signature-block in the PDF is a *paper* workflow, not a digital-signature system.
