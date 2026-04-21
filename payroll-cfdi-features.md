# Module 8 — Nómina / CFDI

> **Source of truth:** [`alenstec_app.html` lines 922–1062](./alenstec_app.html), wired by `#mod-nomina` / `data-mod="nomina"`.

## Purpose

Weekly payroll capture and CFDI (nómina XML) management. Holds the full IMSS/ISR/INFONAVIT/FONACOT calculation grid that Mexican payroll law requires. This is the largest table in the entire application (86 columns).

## Entry point

- Sidebar: "Nómina / CFDI" (fifth item, Costos).
- Top-bar title: `Nómina / CFDI`
- Top-bar breadcrumb: `· Registro de nómina y CFDI`
- Top-bar controls: OT selector visible, Date-filter visible.

## Sub-module structure

Three sub-tabs (`.sntab`, HTML 923–927):

| # | Slug       | Label     |
|---|------------|-----------|
| 8.1 | `captura` | Captura (default active) |
| 8.2 | `cfdi`    | CFDI      |
| 8.3 | `resumen` | Resumen   |

---

## 8.1 — Captura sub-tab

HTML 928–1023. Header action: `+ Nueva línea`.

Table (`min-width:2400px`, 86 columns arranged in two header rows with `colspan`/`rowspan`). Spec summary:

### Block A — Período y empleado (rowspan=2, 15 columns)

`AÑO · MES · BIMESTRE · SEMANA · PUESTO · AREA · NO. LISTA DE NOMINA · TURNO · NOMBRE DEL TRABAJADOR · RFC · CURP · NO.IMSS · FECHA DE INGRESO · S.D · S.D.I 2`

### Block B — Horas por turno (colspan=2 headers with sub-columns)

- HRS X 1ER TURNO NORMAL: **MIXTO · NORMAL**
- HRS X 2DO TURNO NORMAL: **VESPERTINO · NORMAL**
- HRS TURNO NORMAL: **MATUTINO · NORMAL**

### Block C — Tiempo extra + días (rowspan=2 + colspan)

`TIEMPO EXTRA HRS DOBLES · TIEMPO EXTRA HRS TRIPLES · DIAS TRABAJADOS`, then colspan blocks:
- DIA: **FESTIVO · VACACIONES**
- HORAS DIA FESTIVO
- DIA DE: **FALTA · INCAPACIDAD**
- `TOTAL DIAS EN NOMINA`
- FALTAS: **GRAVADO · EXENTO** (→ second header row reads them back with TOTAL triads)

### Block D — Horas semanales y sueldo

`HRS LABORADAS EN LA SEMANA · SD · SDI · SUELDO SEMANAL: GRAVADO · EXENTO · TOTAL`

### Block E — Tiempo extra calculado

`TIEMPO EXTRA DOBLE: GRAVADO · EXENTO · TOTAL`
`TIEMPO EXTRA TRIPLE: GRAVADO · EXENTO · TOTAL`

### Block F — Percepciones extras

`PRIMA VACACIONAL: GRAVADO · EXENTO · TOTAL`
`VACACIONES: GRAVADO · EXENTO · TOTAL`
`OTRAS PERCEPCIONES: GRAVADO · EXENTO · TOTAL`
`VIATICOS: GRAVADO · EXENTO · TOTAL`

### Block G — Totales y deducciones

`TOTAL PERCEPCIONES · 3% NOMINA · PERCEPCIONES GRAVADAS`
`IMSS: NORMAL · VACACIONES · IMSS`
`ISR · INFONAVIT · FONACOT · TOTAL DEDUCCIONES · PAGO NOMINA`

Today the tbody is empty — single row shows placeholder "Registros de nómina disponibles para capturar aquí." (colspan 86).

### Interactive behavior — 8.1

| Action                  | Wired? | Notes                                          |
|-------------------------|--------|------------------------------------------------|
| Sub-tab switching       | ✅      | `goSub('nomina', <slug>, el)`                  |
| `+ Nueva línea`         | ❌      | **Gap G-NOM-1** — no handler                   |
| Table load from backend | ❌      | **Gap G-NOM-2** — no model, no endpoint        |

## 8.2 — CFDI sub-tab

HTML 1024–1041. Header action: `+ Cargar CFDI` → hidden file input `#nominaXmlFileInput` (accepts `.xml`) → calls the **same** `handleXMLUpload` function used by Facturas (HTML 1636). That handler always appends to `#sub-entregas-facturas table tbody` — **this means uploading a nómina CFDI from this sub-tab actually inserts a row into the *supplier* facturas table, not a nómina-specific table.** Either a bug or a known-compromise; flag **Gap G-NOM-3**.

Visible panel:
- Form with 4 inputs: `RFC Emisor`, `RFC Receptor`, `UUID / Folio`, `Método de Pago` — all placeholders, not persisted.
- Table with 7 columns: **RFC Emisor · UUID · Folio · Fecha · Moneda · Total · Estado**, currently empty ("Carga un CFDI para ver datos de validación y procesos de nómina.").

### Interactive behavior — 8.2

| Action           | Wired? | Notes                                                            |
|------------------|--------|------------------------------------------------------------------|
| `+ Cargar CFDI`  | ⚠️      | Triggers the handler, but row appears in Facturas table, not here |

## 8.3 — Resumen sub-tab

HTML 1042–1061. KPI strip (4 cards, all zeros today):

| # | Label                 | Value | Subtitle                     |
|---|-----------------------|-------|------------------------------|
| 1 | Registros de nómina   | `0`   | Líneas capturadas            |
| 2 | Percepciones totales  | `$0`  | CFDI / nómina                |
| 3 | Deducciones totales   | `$0`  | ISR · IMSS · INFONAVIT       |
| 4 | Pago de nómina        | `$0`  | Monto neto                   |

Plus a small Detalle card with 2-column key/value table: `Período` (`2026 · Semana 1`), `Total empleados`, `Total días en nómina`, `Total horas trabajadas` — all zeros.

## Backend support

**None.** No `Payroll`, `PayrollLine`, or `NominaCFDI` model exists. This module is pure mockup today.

### Gaps

- G-NOM-1: `+ Nueva línea` has no handler.
- G-NOM-2: No models, no endpoints, no persistence.
- G-NOM-3: Nómina CFDI upload routes to the Facturas table (shared `handleXMLUpload`). Needs either a dedicated `handleNominaXMLUpload` or a mode parameter.
- G-NOM-4: The 86-column matrix must be encoded in a model. Recommend splitting: `PayrollLine` (per-employee-per-week row) + `PayrollWeek` (header with año/mes/bimestre/semana).
- G-NOM-5: Mexican payroll-calc rules (IMSS bases, ISR progressive table, subsidio al empleo, PV/vacaciones prorata) must be defined. These are regulated by SAT/IMSS and can change yearly.
- G-NOM-6: CFDI-nómina import must validate against the v1.2 complemento schema — today only a generic cfdi-v4 parse happens, and all nómina-specific nodes (`Nomina`, `Percepciones`, `Deducciones`, `TipoNomina`, etc.) are ignored.

## Acceptance criteria

AC-NOM-01. `#ttitle` reads `Nómina / CFDI`; `#tcrumb` reads `· Registro de nómina y CFDI`.
AC-NOM-02. Three sub-tabs exist (Captura, CFDI, Resumen) in order; Captura active by default.
AC-NOM-03. Captura table has a header region producing 86 leaf cells across the two header rows.
AC-NOM-04. Captura tbody today contains exactly one placeholder row with `colspan="86"`.
AC-NOM-05. CFDI sub-tab renders 4 labelled inputs (RFC Emisor, RFC Receptor, UUID/Folio, Método de Pago) in a 2×2 grid.
AC-NOM-06. Resumen KPI strip renders 4 cards per §8.3.
AC-NOM-07. Detalle card renders the 2-column key/value table with Período `2026 · Semana 1`.
AC-NOM-08. Clicking `+ Cargar CFDI` opens a native file-picker accepting `.xml`. (Do **not** assert on the post-upload DOM until G-NOM-3 is fixed.)

### Future (post-implementation)

AC-NOM-11. `+ Nueva línea` opens a creation modal and persists via `POST /api/payroll/lines`.
AC-NOM-12. Uploading a CFDI-nómina inserts a row in the CFDI sub-tab table, not in Facturas.
AC-NOM-13. Resumen KPIs reflect sum of captured lines for the selected week.

## Regression test candidates

- **UI today:** AC-NOM-01 … AC-NOM-08. Assertion on the 86-leaf header structure is a strong regression lock — if anyone accidentally edits the colspan/rowspan grid, tests break immediately.
- **Blocked:** everything behavioral, pending G-NOM-1…G-NOM-6.

## Out of scope for Phase 1 (mockup only)

Automated IMSS/SUA file generation, STPS reporting, BAT/RCM compliance automation, payroll-bank direct-deposit integration, digital nómina receipt emailing, annual declaración. These are aspirational; not in mockup.
