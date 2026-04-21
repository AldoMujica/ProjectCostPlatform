# Regression Test Requirements

> **Purpose:** This document is the handoff from "design spec" to "test automation". Every requirement below is phrased to make a one-line test assertion easy to author. Each requirement carries a stable ID (`AC-<MODULE>-NN`) that should persist unchanged across releases — they are how we track regressions.
>
> **Prereq:** The architecture phase (see [`../designs/README.md`](../designs/README.md) and [`implementation-audit.md`](./implementation-audit.md)) must be confirmed OK before executing the "Future" sections.
>
> **Scope split:**
> - **Now-testable (UI)** — pure DOM/JS assertions on `alenstec_app.html`. No backend required.
> - **Now-testable (API contract)** — HTTP-level tests against a freshly-seeded backend.
> - **Now-testable (integration)** — UI actions against a live backend (a subset of Conciliación today).
> - **Future-testable** — blocked on one or more gaps from the audit.

## Recommended test framework

| Concern                      | Recommended tool                               |
|------------------------------|------------------------------------------------|
| UI DOM assertions            | **Playwright** (headless Chromium)             |
| PDF content assertions       | `pdf-parse` (Node) or `pdfjs-dist`             |
| XLSX content assertions      | `exceljs` or `xlsx` (Node)                     |
| CFDI XML fixtures            | Checked-in files under `test/fixtures/cfdi/`   |
| Backend HTTP                 | **Jest + supertest** on `backend/server.js` and `backend/src/server.js` |
| DB state                     | Ephemeral PostgreSQL per test suite (Docker or `pg-mem` for unit) + `seed.js` |
| Coverage gate                | `jest --coverage`, Playwright trace on failure |

Place specs under `backend/tests/` (API) and `tests/e2e/` (Playwright).

---

## Navigation & global shell

### Now-testable (UI)

| ID              | Assertion                                                                                            |
|-----------------|------------------------------------------------------------------------------------------------------|
| AC-NAV-01       | Sidebar renders 10 `.ni` items with the `data-mod` values: `dashboard, ot, cotizaciones, pronostico, material, entregas, horas, nomina, conciliacion, costomo`, in that order. |
| AC-NAV-02       | Sidebar section headings in order: `Principal`, `Comercial`, `Costos`.                               |
| AC-NAV-03       | `[data-mod="ot"]` has `.ni-badge` with text `18`.                                                    |
| AC-NAV-04       | Clicking any `.ni` applies `.active` to it and the corresponding `.mod`; exactly one of each `.mod` has `.active` at any time. |
| AC-NAV-05       | `#ttitle` and `#tcrumb` update on navigation per the `CFG` table (HTML 1067–1078).                   |
| AC-NAV-06       | Top-bar control visibility per module (as per `goMod`, HTML 1326–1333):                              |
|                 | • `dashboard`: tabs shown, dates hidden, OT-selector hidden.                                         |
|                 | • `ot`: tabs hidden, dates hidden, OT-selector shown.                                                |
|                 | • `conciliacion`: tabs hidden, dates hidden, OT-selector hidden.                                     |
|                 | • all others: tabs hidden, dates shown, OT-selector shown.                                           |
| AC-NAV-07       | Pill-tab click toggles `.active` on exactly one `.pill-tab` at a time.                               |
| AC-NAV-08       | Sidebar footer shows `JL` avatar, name `Jesús Lara`, role `Manufactura · Autorización`.              |
| AC-NAV-09       | At viewport width 800 px, sidebar collapses to icon-only (`:root{--sw:52px}`); `.s-name` hidden.     |
| AC-NAV-10       | At viewport width 1100 px, KPI grid switches from 4-col to 2-col (`.kg`).                            |

### Future-testable

| ID              | Assertion                                                                                 | Blocker    |
|-----------------|--------------------------------------------------------------------------------------------|------------|
| AC-NAV-F11      | Unauthenticated request to any `/api/*` returns 401.                                       | G-CONC-6   |

---

## Module 1 — Dashboard

| ID           | Scope | Assertion                                                                                  |
|--------------|:-----:|--------------------------------------------------------------------------------------------|
| AC-DASH-01 … 10 | UI | See [`modules/dashboard.md`](./modules/dashboard.md) §Acceptance criteria. |
| AC-DASH-A1   | API   | `GET /api/work-orders/kpi/summary` returns `{activeCount, totalCost}` with numeric values. |
| AC-DASH-A2   | API   | With a seeded DB of 6 work orders (3 `En ejecución`, 2 `Liberada`, 1 `Cerrada`), `activeCount = 3`. |
| AC-DASH-A3   | API   | `GET /api/quotes/kpi/open-count` returns `{openCount}` numeric; matches count of seeded `Pendiente` quotes. |
| AC-DASH-A4   | API   | `GET /api/costs/kpi/material-transit` returns `{total, count}`; `total` is a decimal, `count` is integer. |
| AC-DASH-F1   | UI    | On module load, KPI cards 1,2,3,4 display values from endpoints above.                      | *(G-DASH-1)* |
| AC-DASH-F2   | UI    | Recent-OT table renders exactly `min(N, 6)` rows where N = `/api/work-orders` length.       | *(G-DASH-2)* |

---

## Module 2 — Orden de Trabajo

| ID           | Scope | Assertion                                                                                     |
|--------------|:-----:|-----------------------------------------------------------------------------------------------|
| AC-OT-01 … 12 | UI + PDF | See [`modules/work-orders.md`](./modules/work-orders.md).            |
| AC-OT-A1     | API   | `GET /api/work-orders` returns array; each element has `id`, `otNumber`, `client`, `description`, `type`, `progress`, `status`, `quotedCost`, `actualCost`, `currency`. |
| AC-OT-A2     | API   | `GET /api/work-orders/:id` with unknown UUID returns 404.                                      |
| AC-OT-A3     | API   | `POST /api/work-orders` with body `{otNumber:"OT-TEST-001", client:"Test", description:"x", type:"Nuevo", quotedCost:1000}` returns 201 with the created record. |
| AC-OT-A4     | API   | `POST /api/work-orders` with duplicate `otNumber` returns 4xx.                                  |
| AC-OT-A5     | API   | `PUT /api/work-orders/:id` with `{progress: 50}` updates and returns the new record.           |
| AC-OT-A6     | API   | `DELETE /api/work-orders/:id` returns `{message:"Work order deleted"}` and the record is gone. |
| AC-OT-A7     | API   | `GET /api/work-orders?status=En%20ejecución` returns only matching records.                    |
| AC-OT-A8     | API   | `GET /api/work-orders?startDate=2026-01-01&endDate=2026-03-31` filters by `createdAt`.         |
| AC-OT-F1     | UI    | Selecting a different OT in the topbar dropdown fires `GET /api/work-orders?otNumber=<value>` and re-populates the Datos Generales inputs. | *(G-OT-1)* |
| AC-OT-F2     | UI    | Clicking `+ Nueva OT` opens a creation modal; submit fires `POST /api/work-orders`.             | *(G-OT-3)* |
| AC-OT-F3     | UI    | Flujo de Liberación row `Revisión Compras`: transitioning to `Completo` fires a workflow-transition endpoint (TBD). | *(G-OT-4)* |

---

## Module 3 — Cotizaciones y Ventas

| ID          | Scope | Assertion                                                                                     |
|-------------|:-----:|-----------------------------------------------------------------------------------------------|
| AC-COT-01 … 10 | UI | See [`modules/sales-quoting.md`](./modules/sales-quoting.md).                                |
| AC-COT-A1   | API   | `GET /api/quotes` returns an array; each element has `quoteNumber`, `client`, `amount`, `status`, `validUntil`. |
| AC-COT-A2   | API   | `POST /api/quotes` with `{quoteNumber:"COT-TEST-1", client:"Test", description:"x", amount:1000, status:"Pendiente"}` returns 201. |
| AC-COT-A3   | API   | `POST /api/quotes` with duplicate `quoteNumber` returns 4xx.                                    |
| AC-COT-A4   | API   | `PUT /api/quotes/:id` with `{status:"Aprobada"}` returns updated record.                        |
| AC-COT-A5   | API   | `GET /api/quotes/kpi/open-count` returns `{openCount}` matching count of `Pendiente`.           |
| AC-COT-F1   | UI    | On module load, Control de Ventas table renders rows from `GET /api/quotes`.                   | *(G-COT-2)* |

---

## Module 4 — Pronóstico del Costo

| ID          | Scope | Assertion                                                                          |
|-------------|:-----:|------------------------------------------------------------------------------------|
| AC-PRON-01 … 06 | UI | See [`modules/cost-forecasting.md`](./modules/cost-forecasting.md).             |
| AC-PRON-F1  | API   | `GET /api/forecasting?year=2026` returns array of `{otNumber, client, description, quotedUsd, realUsd, tipoCambio, quotedMxn, variancePct, semaforo}`. | *(G-PRON-1)* |
| AC-PRON-F2  | Rules | For a seeded OT with `quotedUsd=8520`, `realUsd=2473` → `variancePct` computed as `round((2473-8520)/8520 * 100) = -71` and `semaforo = "OK"` (green). | *(G-PRON-3)* |

---

## Module 5 — Costo de Material

| ID          | Scope | Assertion                                                                           |
|-------------|:-----:|-------------------------------------------------------------------------------------|
| AC-MAT-01 … 06 | UI | See [`modules/material.md`](./modules/material.md).         |
| AC-MAT-A1   | API   | `GET /api/costs/material` returns array; each element has `otNumber, materialDescription, quantity, unitCost, totalCost, currency, supplier, status, deliveryDate`. |
| AC-MAT-A2   | API   | `POST /api/costs/material` with a valid body returns 201 and echo.                  |
| AC-MAT-A3   | API   | `GET /api/costs/material?status=En%20tránsito` filters by status.                  |
| AC-MAT-A4   | API   | `GET /api/costs/kpi/material-transit` returns `{total, count}`; `total` equals sum of seeded `En tránsito` `totalCost`. |

---

## Module 6 — Entregas de Material

### Now-testable (UI)

| ID            | Scope | Assertion                                                                        |
|---------------|:-----:|----------------------------------------------------------------------------------|
| AC-ENT-01 … 53 | UI | See [`modules/supplier-procurement.md`](./modules/supplier-procurement.md).     |

### Sub-tab 6.1 API

| ID          | Assertion                                                                    |
|-------------|------------------------------------------------------------------------------|
| AC-PROV-A1  | `GET /api/suppliers` returns array with `supplierName, categories[], workOrders[], status, contactEmail, contactPhone`. |
| AC-PROV-A2  | `POST /api/suppliers` with `{supplierName:"Test", status:"Activo"}` returns 201. |
| AC-PROV-A3  | `PUT /api/suppliers/:id` with `{status:"Inactivo"}` returns updated record.  |
| AC-PROV-A4  | `GET /api/suppliers?status=Activo` filters correctly.                        |

### Sub-tab 6.4 (CFDI import — client side)

Seed a fixture library `tests/fixtures/cfdi/`:

| Fixture file                  | Traits                                              |
|-------------------------------|-----------------------------------------------------|
| `cfdi-v4-pue-mxn.xml`         | Valid, MetodoPago=PUE, Moneda=MXN                    |
| `cfdi-v4-ppd-mxn.xml`         | Valid, MetodoPago=PPD                                |
| `cfdi-v4-pue-usd.xml`         | Moneda=USD, TipoCambio present                       |
| `cfdi-v4-no-metodo.xml`       | MetodoPago missing, FormaPago=03 (should fall back to PUE) |
| `cfdi-v3-legacy.xml`          | cfdi 3.3 namespace (should parse via fallback)       |
| `not-a-cfdi.xml`              | Valid XML but missing `Comprobante` root             |
| `corrupt.xml`                 | Malformed                                            |

| ID          | Assertion                                                            |
|-------------|----------------------------------------------------------------------|
| AC-CFDI-01  | Upload `cfdi-v4-pue-mxn.xml` → exactly one new row at the top of Facturas tbody. |
| AC-CFDI-02  | That row's UUID cell matches the fixture's `TimbreFiscalDigital.UUID`. |
| AC-CFDI-03  | That row's RFC Emisor cell matches the fixture's `Emisor.Rfc`.        |
| AC-CFDI-04  | That row's Total cell matches `"$"+Comprobante.Total.toLocaleString('es-MX')`. |
| AC-CFDI-05  | Moneda badge text equals the Moneda attribute.                        |
| AC-CFDI-06  | Método de Pago badge text equals PUE.                                |
| AC-CFDI-07  | Upload `cfdi-v4-ppd-mxn.xml` → badge reads `PPD`.                     |
| AC-CFDI-08  | Upload `cfdi-v4-no-metodo.xml` → badge reads `PUE` (fallback).        |
| AC-CFDI-09  | Upload `not-a-cfdi.xml` → browser `alert()` called with text containing `No es un CFDI válido`. No row inserted. |
| AC-CFDI-10  | Upload `corrupt.xml` → `alert()` with `Archivo XML inválido`. No row inserted. |

### Sub-tabs 6.2, 6.3, 6.5 — future-testable only (models missing)

| ID            | Assertion                                                                 | Blocker     |
|---------------|---------------------------------------------------------------------------|-------------|
| AC-ENT-F21    | `GET /api/purchase-orders-alenstec` returns array.                         | G-OCA-1,2   |
| AC-ENT-F31    | `GET /api/inventory` returns array with stock balances.                    | G-INV-1,2   |
| AC-ENT-F51    | `GET /api/deliveries` returns array; `POST` creates.                       | G-ENTR-1,2  |
| AC-ENT-F52    | `GET /api/incidents` returns array; `POST` creates.                        | G-ENTR-1,2  |

---

## Module 7 — Horas de Mano de Obra

| ID           | Scope | Assertion                                                                     |
|--------------|:-----:|-------------------------------------------------------------------------------|
| AC-HOR-01 … 07 | UI | See [`modules/labor.md`](./modules/labor.md).          |
| AC-HOR-A1    | API   | `GET /api/costs/labor` returns array with `otNumber, employeeName, role, hoursWorked, hourlyRate, totalCost, date`. |
| AC-HOR-A2    | API   | `POST /api/costs/labor` with valid body returns 201.                           |
| AC-HOR-A3    | API   | `GET /api/costs/labor?startDate=2026-01-01&endDate=2026-03-31` filters by `date`. |
| AC-HOR-F1    | UI    | Resumen table populates from `GET /api/costs/labor`.                           | *(G-HOR-2)* |
| AC-HOR-F2    | UI    | `+ Capturar horas` opens modal; submit fires `POST /api/costs/labor`.          | *(G-HOR-1)* |
| AC-HOR-F3    | UI    | Control de Empleados populates from `GET /api/employees`.                      | *(G-HOR-3)* |

---

## Module 8 — Nómina / CFDI

| ID           | Scope | Assertion                                                                     |
|--------------|:-----:|-------------------------------------------------------------------------------|
| AC-NOM-01 … 08 | UI | See [`modules/payroll-cfdi.md`](./modules/payroll-cfdi.md).                  |
| AC-NOM-F1    | UI    | Captura table renders 86 distinct leaf-header cells (snapshot-lock test).     | —           |
| AC-NOM-F2    | API   | `GET /api/payroll/lines?semana=NN&año=YYYY` returns array.                    | G-NOM-2     |
| AC-NOM-F3    | UI    | CFDI sub-tab upload no longer modifies Facturas table; inserts into CFDI sub-tab table. | G-NOM-3 |
| AC-NOM-F4    | API   | Uploading a CFDI-nómina XML persists; `GET /api/payroll/cfdi/:uuid` returns it. | G-NOM-6  |

---

## Module 9 — Conciliación

| ID              | Scope | Assertion                                                                     |
|-----------------|:-----:|-------------------------------------------------------------------------------|
| AC-CONC-01 … 54 | UI + Integration | See [`modules/attendance-reconciliation.md`](./modules/attendance-reconciliation.md). |

### API contract (all under `/api/conciliacion/*`, seeded DB)

| ID           | Assertion                                                                     |
|--------------|-------------------------------------------------------------------------------|
| AC-CONC-A01  | `POST /checador/preview` with valid CSV returns 200, shape `{exitoso, preview:{total_leidos, total_validos, total_errores, registros[], errores[]}, temp_file}`. |
| AC-CONC-A02  | `POST /checador/preview` with `.txt` file returns 4xx.                         |
| AC-CONC-A03  | `POST /checador/preview` with file > 10 MB returns 4xx.                        |
| AC-CONC-A04  | `POST /checador/importar` with valid `temp_file` + `semana_id` returns 200.   |
| AC-CONC-A05  | `GET /:semana_id` returns `{exitoso, semana, resumen, empleados[], puede_cerrar}`. |
| AC-CONC-A06  | `GET /:semana_id/:empleado_id` returns `{exitoso, empleado, semana, detalles_dia[]}`. |
| AC-CONC-A07  | `POST /justificar` without role in (`supervisor`, `jefe_area`, `rh`, `admin`) returns 403. |
| AC-CONC-A08  | `POST /forzar` without role in (`rh`, `admin`) returns 403.                   |
| AC-CONC-A09  | `GET /:semana_id/alertas` returns `{total_alertas, alertas_criticas, alertas_medias, alertas[]}`. |
| AC-CONC-A10  | `POST /horas-clasificadas` with valid body returns 200 and `{horas_clasificadas, conciliacion_resultado}`. |
| AC-CONC-A11  | `PUT /horas-clasificadas/:id` returns updated record.                          |
| AC-CONC-A12  | `DELETE /horas-clasificadas/:id` returns `{exitoso, mensaje}`.                 |
| AC-CONC-A13  | `POST /:semana_id/cerrar` without role in (`rh`, `admin`) returns 403.         |
| AC-CONC-A14  | `POST /:semana_id/cerrar` on a week with unresolved conflicts returns 4xx with descriptive error. |
| AC-CONC-A15  | `POST /:semana_id/cerrar` on clean week returns 200 with `{cierre}`.           |
| AC-CONC-A16  | Re-calling `POST /:semana_id/cerrar` on already-closed week returns 4xx.      |
| AC-CONC-A17  | `GET /:semana_id/exportar` returns content-type `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` and a non-empty body. |

### Business-rule tests (`conciliacionService.js`)

Seed employee `E001` + one week `S01`. Vary inputs:

| ID           | Inputs (hrs)                       | Expected estado |
|--------------|------------------------------------|-----------------|
| AC-CONC-R01  | checador 8.0, clasif 8.0           | `ok`            |
| AC-CONC-R02  | checador 8.0, clasif 8.3           | `ok` (diff ≤ 0.5) |
| AC-CONC-R03  | checador 8.0, clasif 9.0           | `alerta` (diff = 1.0) |
| AC-CONC-R04  | checador 8.0, clasif 12.0          | `conflicto` (diff = 4.0 > 2.0) |
| AC-CONC-R05  | incidencia=vacacion, checador 0    | `ok` (incidencia valida) |
| AC-CONC-R06  | After `POST /justificar` on R04    | `justificado`   |
| AC-CONC-R07  | After `POST /forzar` on R04        | `forzada`       |

---

## Module 10 — Costo de Mano de Obra

| ID          | Scope | Assertion                                                                      |
|-------------|:-----:|--------------------------------------------------------------------------------|
| AC-MO-01 … 05 | UI  | See [`modules/labor.md`](./modules/labor.md).           |
| AC-MO-F1    | API   | `GET /api/costs/labor/rollup?otNumber=OT-AL-1936` returns 13 rows + totals row. | *(G-MO-1)* |
| AC-MO-F2    | Rule  | Given seeded `LaborCost` with 413 cot. hrs and 388 real hrs for OT-1936, rollup's totals row = `Hrs. Cot. 413`, `Hrs. Reales 388`. | *(G-MO-2)* |

---

## Cross-cutting — Reporting & Export

| ID          | Scope | Assertion                                                                   |
|-------------|:-----:|-----------------------------------------------------------------------------|
| AC-REP-01 … 06 | UI | OT PDF export — see [`modules/reporting-export.md`](./modules/reporting-export.md). |
| AC-REP-11 … 14 | Integration | Conciliación Excel export.                                             |
| AC-REP-21 … 27 | UI | CFDI XML import.                                                          |

### Regression-locking strategy

To protect against accidental breakage:

- **Snapshot tests** for the sidebar markup, module header structures, and the 86-col nómina matrix — these are structural anchors that rarely change and loudly alert on edits.
- **DOM-selector tests** for every `data-mod`, `#<id>`, `.<class>` referenced in the feature specs. The CSS class prefixes (`.kpi`, `.bar-row`, `.tl-row`, `.badge`, `.atag`, `.sntab`, `.submod`, `.conciliacion-panel`, `.conciliacion-card`, `.conciliacion-mini`, `.alert-card`, `.upload-box`) each appear in more than one place — treat them as contract.
- **API response-shape tests** via Jest matchers (`toMatchObject`) against a seeded DB. Use factories (Fishery / faker) rather than fixtures so the tests are resilient to seed-data changes.
- **PDF and XLSX content tests** use value-based assertions on extracted strings, not byte-level comparisons (which would over-fit).

---

## Seeding strategy

Before executing the API tests:

```bash
# from /backend
npm install
# configure .env (DB_NAME, DB_USER, DB_PASSWORD)
createdb alenstec_test
npm run seed
```

`seed.js` currently loads 6 OTs, 4 quotes, 3 MaterialCost, 3 LaborCost, 3 suppliers. The regression tests above assume this dataset. If `seed.js` is extended, update the numeric expectations in `AC-DASH-A2`, `AC-COT-A5`, `AC-MAT-A4`, and `AC-CONC-R*`.

For Conciliación tests, also apply the schema at `asistencia-modulo/src/db/migrations/…` (or wherever the architecture phase settles). Required tables: `empleados`, `semanas_nomina`, `registros_checador`, `horas_clasificadas`, `incidencias`, `conciliacion_detalle`, `cierres_semana`, `proyectos`, `usuarios`. Seed at least `E001`, one `semana_id=1` spanning `2026-03-01..2026-03-07`, and the four demo users (`supervisor@…`, `jefe@…`, `rh@…`, `admin@…`).

---

## Test-suite organization

```
tests/
├── e2e/
│   ├── navigation.spec.ts          # AC-NAV-*
│   ├── dashboard.spec.ts           # AC-DASH-*
│   ├── ot.spec.ts                  # AC-OT-* (UI)
│   ├── ot-pdf.spec.ts              # AC-OT-09..12 + AC-REP-01..06
│   ├── cotizaciones.spec.ts        # AC-COT-* (UI)
│   ├── pronostico.spec.ts          # AC-PRON-* (UI)
│   ├── material.spec.ts            # AC-MAT-* (UI)
│   ├── entregas/
│   │   ├── proveedores.spec.ts
│   │   ├── ocp.spec.ts
│   │   ├── inventario.spec.ts
│   │   ├── facturas.spec.ts        # includes AC-CFDI-*
│   │   └── entregas.spec.ts
│   ├── horas.spec.ts
│   ├── nomina.spec.ts
│   ├── conciliacion/
│   │   ├── checador.spec.ts
│   │   ├── semanal.spec.ts
│   │   ├── alertas.spec.ts
│   │   ├── clasificacion.spec.ts
│   │   └── cierre.spec.ts
│   └── costomo.spec.ts
└── fixtures/
    ├── cfdi/                       # XML fixtures per AC-CFDI-*
    └── checador/
        ├── valid.csv
        ├── valid.xlsx
        ├── missing-checkout.csv
        └── unknown-employee.csv

backend/tests/
├── work-orders.spec.js             # AC-OT-A*
├── quotes.spec.js                  # AC-COT-A*
├── costs.spec.js                   # AC-MAT-A*, AC-HOR-A*
├── suppliers.spec.js               # AC-PROV-A*
├── conciliacion/
│   ├── checador.spec.js            # AC-CONC-A01..04
│   ├── semana.spec.js              # AC-CONC-A05..06, A13..17
│   ├── horas-clasificadas.spec.js  # AC-CONC-A10..12
│   ├── alertas.spec.js             # AC-CONC-A09
│   ├── justificar-forzar.spec.js   # AC-CONC-A07..08
│   └── reglas-service.spec.js      # AC-CONC-R01..07
└── exports/
    └── excel.spec.js               # AC-REP-11..14
```

---

## Test counts (for planning)

| Layer                                 | Now | Future | Total |
|---------------------------------------|----:|-------:|------:|
| UI DOM                                | 78  | 28     | 106   |
| API contract                          | 26  | 14     | 40    |
| Integration (UI ↔ live API)           | 10  | 40+    | 50+   |
| PDF / XLSX / XML content              | 13  | 2      | 15    |
| **Total**                             | 127 | 84+    | 211+  |

"Now" = author and execute in Phase 2 kickoff. "Future" = blocked on architecture & gap closures from [`implementation-audit.md`](./implementation-audit.md).
