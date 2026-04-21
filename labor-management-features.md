# Modules 7 & 10 — Horas de Mano de Obra + Costo de Mano de Obra

> **Source of truth:** Module 7 = [`alenstec_app.html` lines 689–753](./alenstec_app.html) (`#mod-horas`, `data-mod="horas"`). Module 10 = [lines 756–786](./alenstec_app.html) (`#mod-costomo`, `data-mod="costomo"`).

These two modules cover the same domain (labor) from two angles: raw hour captures (Module 7) and cost roll-ups by activity category (Module 10). They are documented together to keep rules consistent.

---

## Module 7 — Horas de Mano de Obra

### Purpose

Ledger of every hour captured against an OT + activity category, plus the employee master ("Control de Empleados"). Source: `ALE-030424-J83` (form code visible in subtitle).

### Entry point

- Sidebar: "Horas de Mano de Obra" (fourth item, Costos).
- Top-bar title: `Horas de Mano de Obra`
- Top-bar breadcrumb: `· ALE-030424-J83 · Ene–Mar 2026`
- Top-bar controls: OT selector visible, Date-filter visible.

### Sub-module structure

Two sub-tabs (`.sntab`, HTML 697–699):

| # | Slug        | Label                     |
|---|-------------|---------------------------|
| 7.1 | `main`     | Resumen (default active)  |
| 7.2 | `empleados`| Control de Empleados      |

### R7.0 — KPI strip (4 cards)

HTML 691–695.

| # | Label                     | Value                   | Subtitle                          |
|---|---------------------------|-------------------------|-----------------------------------|
| 1 | Horas capturadas          | `1,864+`                | Registros ERP · Ene–Mar 2026      |
| 2 | Empleados registrados     | `20+`                   | Activos en proyectos              |
| 3 | Autorizador principal     | `Jesús Lara` (15 px)    | Manufactura · Terminal 02         |
| 4 | Período del reporte       | `Ene–Mar` (15 px)       | 01/01/2026 al 16/03/2026          |

### R7.1 — Resumen sub-tab

Card header action: `+ Capturar horas`.

Table (HTML 703–721), columns: **ID Reg. · ID Cli. · OT · Descripción Proyecto · ID Empl. · Nombre Empleado · Actividad · Hrs. · F. Captura · Capturado por**

14 sample rows. `Actividad` rendered as `.atag` with colour-coded background reflecting the activity category:

| Category code prefix (mockup sample)    | Colour     |
|-----------------------------------------|------------|
| `E) Maquinado`                          | amber      |
| `2) Des. y Preventa`                    | green      |
| `8) Control Costo`, `8) Corte`, `7) Almacén`, `10) Mantenimiento` | gray |
| `G) Ensamble`                           | blue       |
| `13) Curso/Cap.`                        | red        |

The coding combines a letter (A–M — Module 10 activity rows) and a numeric code (indirect-labor classifications). This needs to be codified (see G-HOR-4).

`Capturado por` shows authorizer name + HH:MM:SS timestamp.

### R7.2 — Control de Empleados sub-tab

Card with wide table (min-width 1600 px) (HTML 727–750).

Columns (13): **No. listado de nómina · Nombre Rep Proc · Nombre · RFC · CURP · No. IMSS · Nivel de Estudios · Puesto · Departamento · Area · Fecha de ingreso · S.D · S.D.I 2**

19 sample rows (sample includes both production staff with `0XXX` numbering and admin/direction staff with decimal numbering `1.1` … `1.6` — S.D.I 2 blank for admin).

### R7.3 — Interactive behavior

| Action                                    | Wired? | Notes                                              |
|-------------------------------------------|--------|----------------------------------------------------|
| Sub-tab switching                         | ✅      | `goSub('horas', <slug>, el)`                       |
| `+ Capturar horas`                        | ❌      | **Gap G-HOR-1** — no handler, no modal             |
| Table rows load from backend              | ❌      | **Gap G-HOR-2** — no endpoint                      |
| Control de Empleados loads from backend   | ❌      | **Gap G-HOR-3** — no endpoint/model                |
| KPIs reflect live data                    | ❌      | depends on G-HOR-2/3                               |
| `⬇ Descargar XLSX`                        | ❌      | G-COT-3                                            |

### R7.4 — Backend support

- `LaborCost` model tracks per-employee hours against an OT (fields: `otNumber`, `employeeName`, `role`, `hoursWorked`, `hourlyRate`, `totalCost`, `currency`, `date`).
- `GET /api/costs/labor`, `POST /api/costs/labor` exist. No PUT / DELETE.
- **Missing:** `Employee` master model (the Control-de-Empleados table). Today only free-text `employeeName` on `LaborCost`.
- **Missing:** `Activity` / `ActivityCategory` reference model to codify the `.atag` colour map. The `asistencia-modulo/` conciliación module separately manages activities — these should merge at the architecture phase.
- **Gap G-HOR-4:** activity-code colour map not defined in code.

---

## Module 10 — Costo de Mano de Obra

### Purpose

Labor-cost roll-up by activity category for a single OT, comparing Cotizado vs. Real. Uses the rate `$20.63 USD/hr` (labor directa) as the quoted rate and splits by 13 activity rows (A–M).

### Entry point

- Sidebar: "Costo de Mano de Obra" (last item, Costos).
- Top-bar title: `Costo de Mano de Obra`
- Top-bar breadcrumb: `· Labor Directa / Indirecta · OT-1936`
- Top-bar controls: OT selector visible, Date-filter visible.

### R10.1 — KPI strip (4 cards)

HTML 757–762.

| # | Label               | Value    | Subtitle                     |
|---|---------------------|----------|------------------------------|
| 1 | Precio/hr cotizado  | `$20.63` | USD · labor directa          |
| 2 | Costo cotizado MO   | `$8,520` | USD · OT-1936 · 413 hrs      |
| 3 | Horas reales        | `388`    | hrs · OT-1936 registradas    |
| 4 | Moneda base         | `USD`    | T/C ref. $17.95 MXN          |

### R10.2 — Costos MO table

Card (HTML 763–785). Title: "Costos MO — Labor Directa / Indirecta · OT-1936".

Columns: **Parte · Labor Directa · Precio/Cot. · Costo/Cot. · Hrs. Cot. · Precio/Real · Costo/Real · Hrs. Reales · Fechas**

Row structure:
1. Section row `.sec-row` spanning all columns: `COTIZADO vs. REAL · OT-1936`.
2. 13 activity rows keyed by letter **A–M**:

| Letter | Activity                                 | Highlighted? |
|--------|------------------------------------------|--------------|
| A      | Levantamiento, Ing. y Diseño             | —            |
| B      | Corte                                    | —            |
| C      | Fabricación (Soldadura)                  | —            |
| D      | Otros (Pavonado, Pintura, Temple)        | —            |
| E      | Maquinado                                | amber (row highlight) |
| F      | Hiloerosión                              | —            |
| G      | Ensamble                                 | blue (row highlight)  |
| H      | Labor Eléctrica                          | —            |
| I      | Automatización                           | —            |
| J      | Shopper / Picer                          | —            |
| K      | Certificación Dimensional                | —            |
| L      | Empaque y Embalaje                       | —            |
| M      | Instalación en Campo                     | —            |

3. TOTAL footer row (green highlight) with Costo/Cot. `$8,520.19`, Hrs. Cot. `413`, Costo/Real `$0.00`, Hrs. Reales `388`.

Mockup data shows Real hours populated for several activities (A, D, E, F, G, J, L) but the Costo/Real column stays `$0.00` — i.e. rate × real-hours is *not* computed in the mockup. This is either (a) deliberate because rates vary by employee, or (b) a bug. Clarify at architecture phase.

### R10.3 — Interactive behavior

| Action                         | Wired? | Notes                                             |
|--------------------------------|--------|---------------------------------------------------|
| Navigate to module             | ✅      | `goMod('costomo')`                                |
| Table loads from backend       | ❌      | **Gap G-MO-1** — no endpoint aggregates by activity |
| Recompute Costo/Real from hrs  | ❌      | **Gap G-MO-2** — rule undefined (see note above) |

### R10.4 — Backend support

No activity-aggregation endpoint exists. The 13 A–M activity categories are **not represented in the data model**. `LaborCost.role` is free-text. `asistencia-modulo/` uses its own activity table for conciliación but it is not exposed here.

**Recommended (architecture phase):** create `Activity` enum or lookup table with codes A–M (and the indirect-labor codes from Module 7) and require `LaborCost.activityCode` as FK. Add `GET /api/costs/labor/rollup?otNumber=<X>` returning the 13-row matrix.

---

## Acceptance criteria

### Module 7 — Horas

AC-HOR-01. `#ttitle` = `Horas de Mano de Obra`; `#tcrumb` = `· ALE-030424-J83 · Ene–Mar 2026`.
AC-HOR-02. Two sub-tabs: `Resumen` (active) and `Control de Empleados`.
AC-HOR-03. KPI strip renders 4 cards per R7.0.
AC-HOR-04. Resumen table renders 10 columns per R7.1.
AC-HOR-05. Every `Actividad` cell contains exactly one `.atag`.
AC-HOR-06. Control de Empleados table renders 13 columns per R7.2 and includes at least one row.
AC-HOR-07. Clicking `+ Capturar horas` does not throw a JS error (but has no visible effect today).

### Module 10 — Costo MO

AC-MO-01. `#ttitle` = `Costo de Mano de Obra`; `#tcrumb` = `· Labor Directa / Indirecta · OT-1936`.
AC-MO-02. KPI strip renders 4 cards per R10.1.
AC-MO-03. Costos MO table has one `.sec-row`, 13 A–M rows, and one TOTAL footer row (15 rows total).
AC-MO-04. TOTAL row shows `Hrs. Cot. = 413`, `Hrs. Reales = 388`, `Costo/Cot. = $8,520.19` (current mockup values).
AC-MO-05. Row `E` has `background:var(--amber-lt)`; row `G` has `background:var(--blue-lt)`; TOTAL has `background:var(--green-lt)`.

### Future (post-implementation)

AC-HOR-11. On module load, `GET /api/costs/labor` populates the Resumen table.
AC-HOR-12. Submitting `+ Capturar horas` form fires `POST /api/costs/labor` and the row appears.
AC-MO-11. `GET /api/costs/labor/rollup?otNumber=<X>` returns 13 rows keyed A–M plus a totals row.

## Regression test candidates

- **UI today:** AC-HOR-01…07, AC-MO-01…05.
- **API contract today:** `GET /api/costs/labor`, `POST /api/costs/labor`.
- **Blocked:** activity-rollup, employee-master CRUD, activity-code colour map.

## Out of scope for Phase 1 (mockup only)

Biometric/facial-recognition clock-in, GPS field tracking, React-Native mobile time app, productivity / efficiency analytics, skill-based costing, succession planning, training-needs assessment, capacity forecasting. None of these have mockup presence.
