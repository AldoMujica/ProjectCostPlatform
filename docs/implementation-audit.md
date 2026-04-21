# Implementation Audit — Mockup vs. Implemented

> **Audit date:** 2026-04-20 (original baseline against `alenstec_app.html` at commit `3c22899`).
> **Last refresh:** 2026-04-20 — Phase-1 backend foundations landed (single server, JWT, FKs, umzug).
>
> **Method:** Every visible UI element in `alenstec_app.html` was inventoried. For each, the backend (models + routes) and client JS wiring were inspected. Each element is classified **Implemented / Partial / Mockup** with a gap ID (`G-<MODULE>-<N>`) when work remains.
>
> **Headline:** Of the ~115 distinct features identified in the mockup, ~20 % are fully wired end-to-end. Several cross-cutting architectural gaps (dual server, no FKs, no auth, default JWT secret, dual conciliación impls) have been closed in Phase 1 of the roadmap; most feature-level gaps remain.

## Phase-1 closures (2026-04-20)

Gaps fully closed by the Phase-1 backend foundations landing:

| Gap       | Resolution                                                                                   |
|-----------|-----------------------------------------------------------------------------------------------|
| G-CONC-6  | Dev JWT fallback removed; all `/api/*` require a signed token except `/auth/*` and `/health`. |
| G-CONC-7  | Boot-time `assertJwtSecret()` refuses to start on unset / default / < 32-char secrets.        |
| G-CONC-8  | `asistencia-modulo/` deleted; `backend/src/` is the canonical conciliación implementation.    |
| D-arch    | Single Express app on `:3000`; legacy `backend/server.js` merged and removed.                 |
| D-fk      | `material_costs.work_order_id`, `labor_costs.work_order_id` (both `ON DELETE RESTRICT`) and `supplier_work_orders` join table in place; `Supplier.workOrders[]` array column removed. |
| G-MAT-4   | `MaterialCost` now carries `subtotal`, `iva`, `retencion` columns.                            |
| G-PROV-4  | `Supplier.saldo_pendiente` column added.                                                      |
| G-COT-5   | `Quote` now carries `cotRef`, `ocCliente`, `exchangeRate`, `otNumber`, `tipo`.                |

Model-side work for **G-OT-2** (liberation-form fields on `WorkOrder`) is done; FE still renders mockup values — the audit entries remain ⚠️ until Phase-2 wires them.

### Phase-1 deferrals

**P1.7 (per-record supervisor ACL) → Phase 3.** The helper `filtrarPorSupervisor` is present in [`backend/src/middleware/auth.js`](../backend/src/middleware/auth.js), but `WorkOrder` / `Quote` / `MaterialCost` / `LaborCost` have no `supervisor_id` column — and `LaborCost` has no `empleado_id` (only free-text `employeeName`). Picking the ownership semantic before the `Employee` master (G-HOR-3) exists would lock in an arbitrary choice between "supervisor owns OT" and "supervisor owns employee → labor-cost". Deferred to P3.18b after G-HOR-3 lands. In the meantime `verificarRol` already restricts supervisor writes to `POST /api/costs/labor`, which is the only write they should be doing in Phase 1.

## Legend

| Symbol | Meaning                                                   |
|--------|-----------------------------------------------------------|
| ✅     | **Implemented** — backend + UI + wiring all exist.        |
| ⚠️     | **Partial** — some layer exists; at least one is missing. |
| ❌     | **Mockup** — HTML only; no backend, no wiring.            |

## Module-level summary

| Module                       | Visible features | Implemented ✅ | Partial ⚠️ | Mockup ❌ | Primary gap              |
|------------------------------|-----------------:|---------------:|-----------:|----------:|--------------------------|
| 1. Dashboard                 | 6                | 0              | 2          | 4         | No API calls; OCs + empleados data sources missing |
| 2. Orden de Trabajo          | 7                | 1 (PDF)        | 3          | 3         | No save path; no approval workflow |
| 3. Cotizaciones y Ventas     | 3                | 0              | 1          | 2         | UI not wired to `/api/quotes`; model missing fields |
| 4. Pronóstico del Costo      | 2                | 0              | 0          | 2         | No forecasting endpoint; thresholds undefined |
| 5. Costo de Material         | 2                | 0              | 1          | 1         | Model lacks IVA/retención split |
| 6. Entregas (5 sub-tabs)     | 12               | 1 (CFDI parse) | 1 (suppliers) | 10   | 4 missing models (OCP, Inventory, SupplierInvoice, Delivery) |
| 7. Horas de Mano de Obra     | 4                | 0              | 1          | 3         | Employee master missing; activity codes undefined |
| 8. Nómina / CFDI             | 4                | 0              | 0          | 4         | No model at all; 86-col matrix not schema'd |
| 9. Conciliación              | 15               | 5              | 6          | 4         | Alertas + Clasif form wiring; asistencia-modulo vs backend/src decision |
|10. Costo de Mano de Obra     | 2                | 0              | 0          | 2         | No activity rollup endpoint   |
| **Cross-cutting: Export**    | 15               | 3              | 1          | 11        | `G-EXP-1` — 11 XLSX buttons are no-ops |
| **Totals**                   | ~72 (grouped)    | 10             | 15         | 47        | — |

Counts above group related controls; see per-module feature docs for the full flat list.

---

## Feature-by-feature matrix

### Dashboard (module 1)

| Feature              | Status | Backing                                     | Gap        |
|----------------------|:------:|---------------------------------------------|------------|
| 4-KPI strip          | ⚠️      | Endpoints exist, UI not wired               | G-DASH-1   |
| Recent-OT table      | ⚠️      | `GET /api/work-orders` exists, UI not wired | G-DASH-2   |
| Cost-per-OT bars     | ⚠️      | Derivable from `/api/work-orders`           | G-DASH-3   |
| Proveedores timeline | ⚠️      | `GET /api/suppliers` exists, UI not wired   | G-DASH-4   |
| OCs Abiertas         | ❌      | No `PurchaseOrder` model                    | G-DASH-5   |
| Empleados en Campo   | ❌      | No `Employee` endpoint                      | G-DASH-6   |
| Pill-tab filtering   | ⚠️      | UI toggles class; no data filter            | —          |

### Orden de Trabajo (module 2)

| Feature                         | Status | Backing                                             | Gap     |
|---------------------------------|:------:|-----------------------------------------------------|---------|
| OT banner + selector            | ⚠️      | Dropdown changes label only; no data reload         | G-OT-1  |
| Datos Generales form            | ⚠️      | Model lacks ~12 fields the form captures            | G-OT-2  |
| Liberado a (Jefaturas) card     | ❌      | 4 fields not in `WorkOrder` model                   | G-OT-2  |
| Presupuestos card               | ❌      | 5 fields not in model                                | G-OT-2  |
| Horas Estimadas table           | ❌      | No `HoursEstimate` table                             | G-OT-2  |
| Flujo de Liberación             | ❌      | No approval state machine                           | G-OT-4  |
| PDF export                      | ✅      | `generateOTPDF()` fully wired                        | —       |
| `+ Nueva OT` button             | ❌      | No handler                                           | G-OT-3  |

### Cotizaciones y Ventas (module 3)

| Feature                        | Status | Backing                                 | Gap      |
|--------------------------------|:------:|-----------------------------------------|----------|
| KPI strip                      | ❌      | Open-count endpoint exists, not wired   | G-COT-4  |
| Control-de-Ventas table        | ⚠️      | Model missing cotRef/OC/T-C/otNumber    | G-COT-2, G-COT-5 |
| `+ Nueva cotización`           | ❌      | No handler                              | G-COT-1  |
| `⬇ Descargar XLSX`             | ❌      | Global no-op button                     | G-EXP-1 / G-COT-3 |

### Pronóstico del Costo (module 4)

| Feature                        | Status | Backing                           | Gap         |
|--------------------------------|:------:|-----------------------------------|-------------|
| KPI strip                      | ❌      | No aggregate endpoint             | G-PRON-2    |
| Pronóstico table               | ❌      | No `GET /api/forecasting`         | G-PRON-1    |
| Variance/semáforo rules        | ❌      | Thresholds not codified           | G-PRON-3    |
| XLSX export                    | ❌      | Global no-op                      | G-EXP-1     |

### Costo de Material (module 5)

| Feature                 | Status | Backing                                        | Gap      |
|-------------------------|:------:|------------------------------------------------|----------|
| KPI strip               | ⚠️      | `/api/costs/kpi/material-transit` exists; rest unimplemented | G-MAT-3 |
| Requisición table       | ⚠️      | `GET /api/costs/material` exists, UI not wired | G-MAT-2  |
| Table columns           | ⚠️      | Model lacks IVA/Ret./subtotal split            | G-MAT-4  |
| `+ Registrar material`  | ❌      | No handler                                     | G-MAT-1  |
| XLSX export             | ❌      | Global no-op                                   | G-EXP-1  |

### Entregas de Material (module 6)

| Sub-tab / Feature              | Status | Backing                                     | Gap      |
|--------------------------------|:------:|---------------------------------------------|----------|
| 6.1 Proveedores table          | ⚠️      | `/api/suppliers` exists, UI not wired       | G-PROV-2 |
| 6.1 `+ Agregar proveedor`      | ❌      | No handler                                  | G-PROV-1 |
| 6.1 `Saldo pendiente` field    | ❌      | Not in model                                | G-PROV-4 |
| 6.2 OCP table                  | ❌      | No model, no routes                         | G-OCA-1,2 |
| 6.2 `+ Capturar OCP`           | ❌      | No handler                                  | G-OCA-3  |
| 6.3 Inventario table           | ❌      | No `InventoryItem` model                    | G-INV-1,2 |
| 6.3 `+ Agregar existencia`     | ❌      | No handler                                  | G-INV-3  |
| 6.4 Facturas table             | ❌      | No `SupplierInvoice` model                  | G-FACT-2 |
| 6.4 `+ Agregar por XML` parse  | ✅      | `handleXMLUpload` parses + renders          | —        |
| 6.4 Real SAT validation        | ❌      | No SAT webservice call                      | G-FACT-1 |
| 6.4 `+ Agregar factura` manual | ❌      | No handler                                  | G-FACT-3 |
| 6.5 Entregas KPI strip         | ❌      | No aggregate endpoint                       | G-ENTR-3 |
| 6.5 Entregas table             | ❌      | No `Delivery` model                         | G-ENTR-1 |
| 6.5 Incidencias table          | ❌      | No `Incident` model                         | G-ENTR-1 |
| 6.5 `+ Registrar entrega`      | ❌      | No handler                                  | G-ENTR-2 |
| All XLSX download buttons      | ❌      | Global no-op                                | G-EXP-1  |

### Horas de Mano de Obra (module 7)

| Feature                           | Status | Backing                                   | Gap     |
|-----------------------------------|:------:|-------------------------------------------|---------|
| KPI strip                         | ❌      | No aggregate endpoint                     | —       |
| Resumen table                     | ⚠️      | `GET /api/costs/labor` exists, UI not wired | G-HOR-2 |
| Activity code colour map          | ❌      | Not codified in model                     | G-HOR-4 |
| Control de Empleados table        | ❌      | No `Employee` master model                | G-HOR-3 |
| `+ Capturar horas`                | ❌      | No handler                                | G-HOR-1 |

### Nómina / CFDI (module 8)

| Feature                    | Status | Backing                                  | Gap           |
|----------------------------|:------:|------------------------------------------|---------------|
| Captura table (86 cols)    | ❌      | No model                                 | G-NOM-2,4,5   |
| `+ Nueva línea`            | ❌      | No handler                               | G-NOM-1       |
| CFDI sub-tab form          | ❌      | Placeholder only                         | G-NOM-2       |
| `+ Cargar CFDI`            | ⚠️      | Triggers handler but misrouted to Facturas | G-NOM-3     |
| CFDI-nómina parsing        | ❌      | No complemento-nómina parser             | G-NOM-6       |
| Resumen KPI strip          | ❌      | All zeros, no endpoint                   | —             |

### Conciliación (module 9)

| Feature                              | Status | Backing                                             | Gap       |
|--------------------------------------|:------:|-----------------------------------------------------|-----------|
| Week selector + Actualizar           | ⚠️      | Hardcoded 4 options                                 | G-CONC-5  |
| 9.1 Checador preview                 | ✅      | Full API round-trip                                 | —         |
| 9.1 Checador import                  | ✅      | Full API round-trip                                 | —         |
| 9.2 Resumen semanal                  | ✅      | Full API round-trip + render                        | —         |
| 9.3 Alertas                          | ⚠️      | Hardcoded 3 cards; endpoint exists                  | G-CONC-1  |
| 9.4 Clasif form                      | ⚠️      | Persists local-only; endpoint exists                | G-CONC-2  |
| 9.5 Cierre de Semana                 | ✅      | Full API round-trip                                 | —         |
| 9.5 Exportar Excel                   | ✅      | Full API round-trip, ExcelJS streaming              | —         |
| Employee daily detail                | ❌      | Endpoint exists, no UI surface                      | G-CONC-3  |
| Justificación + forzar flows         | ❌      | Endpoints exist, no UI surface                      | G-CONC-4  |
| Production JWT enforcement           | ✅      | `app.use('/api', verificarJWT)` guards every route (2026-04-20) | G-CONC-6 ✓ |
| Default JWT secret                   | ✅      | Boot refuses on unset / default / < 32-char (2026-04-20) | G-CONC-7 ✓ |
| `asistencia-modulo/` vs backend/src  | ✅      | `asistencia-modulo/` deleted; `backend/src/` canonical (2026-04-20) | G-CONC-8 ✓ |

### Costo de Mano de Obra (module 10)

| Feature              | Status | Backing                                      | Gap     |
|----------------------|:------:|----------------------------------------------|---------|
| KPI strip            | ❌      | Hardcoded                                    | —       |
| Costos MO table A–M  | ❌      | No activity-rollup endpoint; A–M not in DB   | G-MO-1,2 |

### Cross-cutting exports

| Feature                     | Status | Gap      |
|-----------------------------|:------:|----------|
| OT PDF (jsPDF)              | ✅      | —        |
| Conciliación XLSX (exceljs) | ✅      | —        |
| Facturas CFDI XML import    | ✅      | —        |
| 11 XLSX no-op buttons       | ❌      | G-EXP-1  |
| Nómina CFDI import misrouted| ⚠️      | G-NOM-3  |
| html2canvas loaded, unused  | ⚠️      | decision required |

---

## Consolidated gap list

Every gap mentioned above, grouped by recommended fix-before-regression-test priority.

### Priority 1 — Blocking the most mockups

- **G-EXP-1** — Wire 11 XLSX no-op buttons. Single architecture decision (client vs. server XLSX) unlocks 11 tables. *(decision locked in ADR-004; implementation pending in Phase 2)*
- **G-OT-2** — ~~Extend `WorkOrder` schema to cover liberation-form fields.~~ Model-side landed 2026-04-20; FE wiring still pending.
- ~~**G-CONC-6 / G-CONC-7** — Replace JWT dev fallback and default secret before production.~~ **Closed 2026-04-20.**
- **G-NOM-4** — Encode the 86-col nómina matrix into `PayrollLine` + `PayrollWeek` models. Blocks entire Module 8.

### Priority 2 — New feature work, high visibility

- **G-OT-3** — Wire `+ Nueva OT` creation modal.
- **G-OT-4** — Implement approval state machine + transition endpoints.
- **G-OCA-1,2** — New `PurchaseOrderAlenstec` model + CRUD. Unlocks sub-tab 6.2.
- **G-INV-1,2** — New `InventoryItem` model + CRUD. Unlocks sub-tab 6.3.
- **G-FACT-2** — New `SupplierInvoice` model + XML persistence. Unlocks sub-tab 6.4.
- **G-ENTR-1,2** — New `Delivery` + `Incident` models + CRUD. Unlocks sub-tab 6.5.
- **G-HOR-3** — New `Employee` master model.
- **G-NOM-3** — Separate CFDI-nómina upload handler from Facturas.

### Priority 3 — Wiring existing endpoints

- **G-DASH-1…4** — Wire dashboard KPIs and tables to existing `/api/*/kpi/*` and list endpoints.
- **G-COT-2, G-COT-4** — Wire Cotizaciones table + KPI.
- **G-MAT-2** — Wire Requisición table.
- **G-PROV-2** — Wire Proveedores table.
- **G-HOR-2** — Wire Horas table.
- **G-CONC-1** — Wire Alertas list to existing endpoint.
- **G-CONC-2** — Wire Clasif form to existing endpoint.
- **G-CONC-3,4** — Add UI for justificar/forzar and empleado-detail (endpoints exist).

### Priority 4 — New analytics

- **G-PRON-1,2,3** — Pronóstico endpoint + rules.
- **G-MO-1,2** — Costo-MO activity-rollup endpoint + Real-cost computation rule.
- **G-HOR-4** — Activity-code catalogue + colour map.
- **G-DASH-5,6** — OCs Abiertas + Empleados en Campo endpoints.

### Priority 5 — External integrations

- **G-FACT-1** — Real SAT CFDI validation (PAC / SAT web service).
- **G-NOM-6** — CFDI complemento-nómina parser + persistence.

### Priority 6 — Housekeeping

- **G-CONC-5** — Populate week selector from DB.
- ~~**G-CONC-8** — Decide: backend/src or asistencia-modulo as canonical.~~ **Closed 2026-04-20** (asistencia-modulo removed).
- ~~**G-MAT-4, G-COT-5, G-PROV-4** — Model-field audits and migrations.~~ **Closed 2026-04-20** (model migrations landed).
- **html2canvas removal or feature addition.**
- Reconcile legacy docs with current tree: the asistencia migration SQL now lives at [`backend/src/db/migrations/20260420-0003-asistencia-conciliacion.sql`](../backend/src/db/migrations/20260420-0003-asistencia-conciliacion.sql) and runs via umzug alongside the two JS migrations that land the cost-models + users tables.

---

## Risk summary

1. ~~**Dual-server architecture (`:3000` legacy + `:3001` conciliación)** is unconventional and likely to cause deployment confusion.~~ **Resolved 2026-04-20** — single Express app on `:3000`.
2. ~~**No foreign-key constraints** in the Sequelize models — everything references `otNumber` as a free string.~~ **Resolved 2026-04-20** — `work_order_id` FKs on `material_costs`/`labor_costs` and `supplier_work_orders` join table; `otNumber` retained as a redundant human column per ADR-006.
3. ~~**Two parallel conciliación implementations** (`backend/src/` + `asistencia-modulo/`).~~ **Resolved 2026-04-20** — `asistencia-modulo/` deleted.
4. ~~**No authentication** on the cost API~~ **Resolved 2026-04-20** — `app.use('/api', verificarJWT)` gates every resource route; per-role guards on writes.
5. ~~**Default JWT secret** in development mode leaks admin role silently.~~ **Resolved 2026-04-20** — `assertJwtSecret()` refuses to boot on unset / default / short secrets.
6. **Static mockup data baked into HTML** confuses testers — a row in the Recent-OT table might look "wired" but is just HTML. *(still open — Phase-2 FE wiring)*

---

## Phase-2 recommended sequence

1. **Architecture kickoff (week 1):** resolve G-CONC-8 (single conciliación), G-CONC-6/7 (auth), G-EXP-1 (export strategy), single Express app, FK strategy. Produce a revised schema.
2. **Schema migration (week 2):** apply G-OT-2 / G-COT-5 / G-MAT-4 and introduce missing models (G-OCA-1, G-INV-1, G-FACT-2, G-ENTR-1, G-HOR-3, G-NOM-4).
3. **Existing-endpoint wiring (week 3):** Priority 3 gaps close quickly — each is a `fetch + render` per module.
4. **New feature rollout (weeks 4–6):** Priority 2 items, module-by-module, driven by acceptance criteria in each feature spec.
5. **Analytics (week 7):** Priority 4.
6. **External integrations (week 8+):** Priority 5 (SAT, PAC) — schedule around SAT's own changes and environments.
7. **Regression test suite (parallel from week 3):** start with the UI-today and API-contract-today tests in `REGRESSION_REQUIREMENTS.md`. Add integration tests as each endpoint wires up.
