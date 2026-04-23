# Implementation Audit — Mockup vs. Implemented

> **Audit date:** 2026-04-20 (original baseline against `alenstec_app.html` at commit `3c22899`).
> **Last refresh:** 2026-04-21 — Phase-2 MVP wiring complete (every Phase-2 module live; XLSX export for 5 tables).
>
> **Method:** Every visible UI element in `alenstec_app.html` was inventoried. For each, the backend (models + routes) and client JS wiring were inspected. Each element is classified **Implemented / Partial / Mockup** with a gap ID (`G-<MODULE>-<N>`) when work remains.
>
> **Headline:** After Phase 2, roughly **55 %** of the ~72 grouped features are fully wired end-to-end. The remaining ~45 % (Pronóstico, Nómina, Costo-MO, 4 of 5 Entregas sub-tabs, OT approval workflow, per-record supervisor ACL) depend on Phase-3 models or later phases.

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

## Phase-2 closures (2026-04-21)

Gaps fully closed by the Phase-2 cumulative merge (commit `ee60685`):

| Gap         | Resolution                                                                          |
|-------------|-------------------------------------------------------------------------------------|
| G-DASH-1    | Dashboard 4-KPI strip wired to `/api/*/kpi/*` via `loadDashboardKpis`.              |
| G-DASH-2    | Recent-OT table populated from `GET /api/work-orders`.                              |
| G-DASH-3    | Cost-per-OT bars derived from same fetch, sorted by `quotedCost` DESC.              |
| G-DASH-4    | Proveedores timeline populated from `GET /api/suppliers` (eager-loaded workOrders). |
| G-COT-2     | Control-de-Ventas table wired (`loadCotizaciones`).                                 |
| G-COT-4     | Cotizaciones KPI strip derived client-side from the same list.                      |
| G-OT-1      | OT selector populated; change fires `loadOTDetail(id)`.                             |
| G-OT-3      | `+ Nueva OT` modal lands on top of reusable shell; POSTs then refreshes selector.   |
| G-MAT-1     | `+ Registrar material` modal; auto-computes subtotal + total.                       |
| G-MAT-2     | Requisición table wired with 11 columns (G-MAT-4 IVA/ret/subtotal split visible).   |
| G-PROV-1    | `+ Agregar proveedor` modal with OT-linkage checklist.                              |
| G-PROV-2    | Proveedores table (6.1) wired; saldo pendiente rendered from G-PROV-4.              |
| G-HOR-1     | `+ Capturar horas` modal; total auto = horas × tarifa until operator edits.         |
| G-HOR-2     | Horas Resumen table wired.                                                          |
| G-CONC-1    | Alertas sub-tab (9.3) hits `/api/conciliacion/:id/alertas` on entry.                |
| G-CONC-2    | Clasificación form (9.4) POSTs to `/api/conciliacion/horas-clasificadas`.           |
| G-CONC-5    | Week selector populated from new `GET /api/conciliacion/semanas` endpoint.          |
| G-EXP-1 (partial) | Shared `sendTableXlsx` helper; 5 live exports (WO, quotes, material, labor, suppliers). 6 remaining buttons disabled with tooltips pending Phase-3 models. |

Reusable pieces that enable future work: the **generic modal shell** (`openModal({title, bodyHtml})` + Escape/overlay/X close handlers) is the foundation for every future creation modal; the **shared xlsxTable helper** is column-config-driven so adding an export is one route + a column list.

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
| 1. Dashboard                 | 6                | 4              | 0          | 2         | OCs Abiertas + Empleados en Campo need new endpoints (Phase-5 P5.9–P5.10) |
| 2. Orden de Trabajo          | 7                | 4 (PDF, selector, form, Nueva OT) | 2 | 1 | Approval workflow (G-OT-4, Phase-3 P3.19–P3.21); G-OT-2 form extras still manual-entry |
| 3. Cotizaciones y Ventas     | 3                | 2              | 0          | 1         | `+ Nueva cotización` modal (G-COT-1, deferred P2.x) |
| 4. Pronóstico del Costo      | 2                | 0              | 0          | 2         | No forecasting endpoint; thresholds undefined (Phase-5) |
| 5. Costo de Material         | 2                | 2              | 0          | 0         | Module complete (P2.9 + P2.10) |
| 6. Entregas (5 sub-tabs)     | 12               | 3 (CFDI parse, suppliers table, Agregar proveedor) | 0 | 9 | 4 missing models (OCP, Inventory, SupplierInvoice, Delivery) — Phase 3 |
| 7. Horas de Mano de Obra     | 4                | 2 (Resumen, Capturar) | 0    | 2         | Employee master (G-HOR-3) + activity codes (G-HOR-4) — Phase-3 / Phase-5 |
| 8. Nómina / CFDI             | 4                | 0              | 0          | 4         | No model at all — Phase-4 (the hardest phase) |
| 9. Conciliación              | 15               | 10             | 1          | 4         | Justificar/forzar UI (G-CONC-3/4); empleado daily detail — Phase 2 has closed 5 of the original 8 pending items |
|10. Costo de Mano de Obra     | 2                | 0              | 0          | 2         | No activity rollup endpoint — Phase 5 |
| **Cross-cutting: Export**    | 15               | 8 (3 Phase-1 + 5 Phase-2 xlsx) | 0  | 7   | 6 XLSX buttons still disabled (target mockup modules) |
| **Totals**                   | ~72 (grouped)    | **35**         | 3          | 34        | MVP path (`v0.1-mvp`) complete |

Counts above group related controls; see per-module feature docs for the full flat list.

---

## Feature-by-feature matrix

### Dashboard (module 1)

| Feature              | Status | Backing                                     | Gap        |
|----------------------|:------:|---------------------------------------------|------------|
| 4-KPI strip          | ✅      | Wired in P2.1 — `apiFetch` parallel to 3 endpoints; compact currency format | ~~G-DASH-1~~ |
| Recent-OT table      | ✅      | Wired in P2.2 — `loadDashboardWorkOrders`   | ~~G-DASH-2~~ |
| Cost-per-OT bars     | ✅      | Wired in P2.3 — same fetch, sorted by `quotedCost` | ~~G-DASH-3~~ |
| Proveedores timeline | ✅      | Wired in P2.4 — `loadDashboardSuppliers`    | ~~G-DASH-4~~ |
| OCs Abiertas         | ❌      | No `PurchaseOrder` model                    | G-DASH-5   |
| Empleados en Campo   | ❌      | No `Employee` endpoint                      | G-DASH-6   |
| Pill-tab filtering   | ⚠️      | UI toggles class; no data filter            | —          |

### Orden de Trabajo (module 2)

| Feature                         | Status | Backing                                             | Gap     |
|---------------------------------|:------:|-----------------------------------------------------|---------|
| OT banner + selector            | ✅      | Wired in P2.7 — selector populated from `/api/work-orders`; change fires `loadOTDetail` | ~~G-OT-1~~ |
| Datos Generales form            | ⚠️      | Model lacks ~12 fields the form captures            | G-OT-2  |
| Liberado a (Jefaturas) card     | ❌      | 4 fields not in `WorkOrder` model                   | G-OT-2  |
| Presupuestos card               | ❌      | 5 fields not in model                                | G-OT-2  |
| Horas Estimadas table           | ❌      | No `HoursEstimate` table                             | G-OT-2  |
| Flujo de Liberación             | ❌      | No approval state machine                           | G-OT-4  |
| PDF export                      | ✅      | `generateOTPDF()` fully wired                        | —       |
| `+ Nueva OT` button             | ✅      | Wired in P2.8 — reusable modal shell + `showNewOTModal`; POSTs then refreshes selector | ~~G-OT-3~~ |

### Cotizaciones y Ventas (module 3)

| Feature                        | Status | Backing                                 | Gap      |
|--------------------------------|:------:|-----------------------------------------|----------|
| KPI strip                      | ✅      | Wired in P2.6 — derived from `/api/quotes` list (count, USD sum, last FX, distinct clients) | ~~G-COT-4~~ |
| Control-de-Ventas table        | ✅      | Wired in P2.5 — `loadCotizaciones`; model extensions from G-COT-5 already in place | ~~G-COT-2~~ |
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
| Requisición table       | ✅      | Wired in P2.9 — `loadMaterialCosts` renders 11 cols with subtotal/IVA/retención/total | ~~G-MAT-2~~ |
| Table columns           | ⚠️      | Model lacks IVA/Ret./subtotal split            | G-MAT-4  |
| `+ Registrar material`  | ✅      | Wired in P2.10 — reuses shared modal; auto-fills subtotal + total | ~~G-MAT-1~~ |
| XLSX export             | ❌      | Global no-op                                   | G-EXP-1  |

### Entregas de Material (module 6)

| Sub-tab / Feature              | Status | Backing                                     | Gap      |
|--------------------------------|:------:|---------------------------------------------|----------|
| 6.1 Proveedores table          | ✅      | Wired in P2.11 — `loadProveedores`; shows categories, contacto, saldo, OTs | ~~G-PROV-2~~ |
| 6.1 `+ Agregar proveedor`      | ✅      | Wired in P2.11 — reusable modal with OT checklist and comma-separated categories | ~~G-PROV-1~~ |
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
| Resumen table                     | ✅      | Wired in P2.12 — `loadLaborCosts`; 8-col layout (OT, empleado, rol, hrs, tarifa, total, moneda, fecha) | ~~G-HOR-2~~ |
| Activity code colour map          | ❌      | Not codified in model                     | G-HOR-4 |
| Control de Empleados table        | ❌      | No `Employee` master model                | G-HOR-3 |
| `+ Capturar horas`                | ✅      | Wired in P2.13 — reusable modal; auto-computes total until user overrides | ~~G-HOR-1~~ |

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
| Week selector + Actualizar           | ✅      | Wired in P2.16 — `GET /api/conciliacion/semanas` (new endpoint) populates dropdown | ~~G-CONC-5~~ |
| 9.1 Checador preview                 | ✅      | Full API round-trip                                 | —         |
| 9.1 Checador import                  | ✅      | Full API round-trip                                 | —         |
| 9.2 Resumen semanal                  | ✅      | Full API round-trip + render                        | —         |
| 9.3 Alertas                          | ✅      | Wired in P2.14 — on sub-tab entry fetches `/alertas` and renders cards | ~~G-CONC-1~~ |
| 9.4 Clasif form                      | ✅      | Wired in P2.15 — POST `/horas-clasificadas`; empleado dropdown hydrated from Resumen | ~~G-CONC-2~~ |
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
| 11 XLSX no-op buttons       | ⚠️      | P2.17 landed 5 live exports (WO / quotes / material / labor / suppliers) via shared `sendTableXlsx` helper. 6 buttons still disabled for mockup modules (OCP, Inventario, Facturas, Entregas sub-tab, Pronóstico, Nómina, Costo-MO) — ~~G-EXP-1~~ remaining scope narrows to those |
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
