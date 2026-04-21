# Module 6 — Entregas de Material (Proveedores, OCs, Inventario, Facturas, Entregas)

> **Source of truth:** [`alenstec_app.html` lines 509–686](./alenstec_app.html), wired by `#mod-entregas` / `data-mod="entregas"`.

## Purpose

Umbrella module for every supplier-facing surface except raw requisitions (which live in Module 5). Five sub-tabs manage the catálogo de proveedores, OCs Alenstec emits to suppliers, physical inventory, supplier invoices (CFDI), and delivery/incidence tracking.

## Entry point

- Sidebar: "Entregas de Material" (third item, Costos section).
- Top-bar title: `Entregas de Material`
- Top-bar breadcrumb: `· Control de Recepciones`
- Top-bar controls: OT selector visible, Date-filter visible.

## Sub-module structure

Navigation via `.sntab` strip (HTML 510–516). Five sub-tabs, `goSub('entregas', <slug>, el)`:

| # | Slug           | Label                     |
|---|----------------|---------------------------|
| 6.1 | `proveedores` | Proveedores               |
| 6.2 | `ocp`         | Órdenes de Compra         |
| 6.3 | `inventario`  | Inventario                |
| 6.4 | `facturas`    | Facturas                  |
| 6.5 | `entregas`    | Entregas                  |

Each sub-tab has its own date-filter (`#<slug>-desde` / `#<slug>-hasta`) and download button (`#btn-dl-<prefix>`) wired via `checkDl(prefix)`.

---

## 6.1 — Proveedores

HTML 518–546. Card header actions: `+ Agregar proveedor`, `⬇ Descargar XLSX`.

Table columns: **No. Prov. · Nombre · Moneda · Contacto · OTs asociadas · Saldo pendiente · Estado**

7 sample rows. `Estado` badges: `Activo` (green), `Entrega pend.` (amber).

Backend: `GET /api/suppliers`, `POST /api/suppliers`, `PUT /api/suppliers/:id`. **No DELETE.**

**Gaps:**
- G-PROV-1: `+ Agregar proveedor` has no handler.
- G-PROV-2: Table not wired to API.
- G-PROV-3: `⬇ Descargar XLSX` is a no-op.
- G-PROV-4: `Saldo pendiente` field missing from `Supplier` model (today: no financial tracking).

## 6.2 — Órdenes de Compra (OCA — Alenstec → Proveedor)

HTML 548–573. Card header actions: `+ Capturar OCP`, `⬇ Descargar XLSX`.

Table columns: **No. OC Alenstec · Proveedor · OT · Descripción · Moneda · Monto · F. Emisión · F. Entrega Prom. · Estado**

6 sample rows. OC numbering: `OCA-YYYY-NNN`. Estado badges: `Recibido` (green), `Parcial` (amber), `Pendiente` (amber).

Backend: **no endpoint or model exists.** This sub-tab is pure mockup.

**Gaps:**
- G-OCA-1: New model `PurchaseOrderAlenstec` required (fields = table columns).
- G-OCA-2: CRUD routes missing.
- G-OCA-3: `+ Capturar OCP` has no handler.
- G-OCA-4: Relationship to `WorkOrder` and `Supplier` required (FK or string reference matching existing convention).

## 6.3 — Inventario

HTML 575–602. Card header actions: `+ Agregar existencia`, `⬇ Descargar XLSX`.

Table columns: **Clave · Descripción · Proveedor · Moneda · Existencia · Unidad · Costo Unit. · Valor Total · OT Asignada · Estado**

7 sample rows. `Estado` badges: `Asignado` (green), `Sin asignar` (amber).

Backend: **no model exists** for warehouse stock. The `MaterialCost` table tracks purchase lines but not running balance.

**Gaps:**
- G-INV-1: New `InventoryItem` model required.
- G-INV-2: CRUD routes missing.
- G-INV-3: `+ Agregar existencia` has no handler.
- G-INV-4: Relationship to `MaterialCost` (reduce stock on OT consumption) — business rule undefined.

## 6.4 — Facturas (Supplier CFDI)

HTML 604–635. Card header actions: `+ Agregar factura`, `+ Agregar por XML`, `⬇ Descargar XLSX`. The XML button triggers a hidden `<input type="file" accept=".xml">` and passes the file to `handleXMLUpload(event)`.

Table columns (20 — widest table in the app): **RFC Emisor · RFC Receptor · UUID / Folio · Serie · Folio · F. Emisión · F. Certificación · Régimen Fiscal · Concepto · Cantidad · P. Unit. · Subtotal · IVA · Ret. ISR · Ret. IVA · Total · Moneda · T/C · Método de Pago (PUE/PPD) · Validación SAT**

9 sample rows. `Método de Pago` badges: `PUE` (green/amber/blue — varies), `PPD` (amber). `Validación SAT` badges: `✓ Válida` (green), `Pendiente` (amber), `⚠ Revisar` (red).

### 6.4.1 — Client-side XML import (`handleXMLUpload`)

Implemented in HTML 1636–1784 using native `DOMParser`. Parses CFDI v4 XML:

- Finds root `Comprobante` (with or without `cfdi:` prefix; namespace `http://www.sat.gob.mx/cfd/4`).
- Extracts: RFC emisor, RFC receptor, UUID (from `TimbreFiscalDigital`), Serie, Folio, Fecha, FechaTimbrado, SubTotal, IVA (from `Impuestos.TotalImpuestosTrasladados`), Total, Moneda, TipoCambio, Concepto.Cantidad, Concepto.ValorUnitario, MetodoPago.
- Falls back to `FormaPago` → PUE heuristic if `MetodoPago` is missing (a fixed table of 25 codes all mapping to `PUE` — HTML 1709–1736).
- Prepends a new `<tr>` to `#sub-entregas-facturas table tbody` with parsed values; badges derived client-side.
- Prints a `❌` alert on XML-parse-error and on non-CFDI files.
- Resets the file input after processing.

Result badge is always `✓ Importada` (green) — no real SAT validation occurs.

**Gaps:**
- G-FACT-1: Actual SAT validation (web service call to the PAC or SAT VerificaCFDI) is not implemented. Today all imports land as `✓ Importada`.
- G-FACT-2: Imports are in-memory only — no `SupplierInvoice` persistence.
- G-FACT-3: `+ Agregar factura` (manual form) has no handler.
- G-FACT-4: XLSX download is a no-op.

## 6.5 — Entregas

HTML 637–685. Contains:

### 6.5.1 — KPI strip (4 cards)

| # | Label                    | Value | Subtitle                                 |
|---|--------------------------|-------|------------------------------------------|
| 1 | Entregadas               | `40+` | Confirmadas en ERP                       |
| 2 | Pendientes               | `6`   | Sin fecha de recepción                   |
| 3 | Con incidencia           | `2`   | Fecha real posterior a prometida         |
| 4 | Material sin asignar     | `0%`  | Stock sin OT asignada                    |

### 6.5.2 — Registro de Entregas de Material table

Card header actions: `+ Ingresar incidencia`, `+ Registrar entrega`, `⬇ Descargar XLSX`.

Columns: **No. Prov. · Proveedor · Producto · OT · Pzas · Precio Unit. · Entregado por · F. Recibido · F. Autorizado · Incidencia · Estado**

11 sample rows. `Estado` badges: `Entregado` (green), `Pendiente` (amber).

### 6.5.3 — Últimas Incidencias table

Columns: **Folio · OT · Proveedor · Descripción · Registrado por · Fecha · Estado**

2 sample rows. Estados: `Abierta` (amber). Folio format `INC-NNN`.

**Gaps:**
- G-ENTR-1: No `Delivery` / `Incident` models exist.
- G-ENTR-2: No CRUD endpoints for either.
- G-ENTR-3: KPI strip values hardcoded — no aggregation endpoint.

---

## Interactive behavior (across all sub-tabs)

| Action                              | Wired? | Notes                                                    |
|-------------------------------------|--------|----------------------------------------------------------|
| Sub-tab switching                   | ✅      | `goSub('entregas', <slug>, el)` — DOM-only               |
| Date-filter enables per-tab download| ✅ UI-only | `checkDl(prefix)` activates the btn; no data flow    |
| `+ Agregar por XML` file dialog     | ✅      | Native `<input type="file">` click                        |
| XML parse → row insert              | ✅      | `handleXMLUpload(event)` — client-side, transient        |
| Real SAT validation                 | ❌      | G-FACT-1                                                 |
| All other `+` buttons and XLSX btns | ❌      | G-PROV-1, G-OCA-3, G-INV-3, G-FACT-3/4, G-ENTR-*         |

## Backend support summary

Only `Supplier` has a backing model/routes. Every other sub-tab requires new models + routes. Entire Sub-module 6.2, 6.3, 6.4 (persistence), 6.5 are mockup.

## Acceptance criteria

### Cross-cutting

AC-ENT-01. `#ttitle` reads `Entregas de Material`; `#tcrumb` reads `· Control de Recepciones`.
AC-ENT-02. Five sub-tabs exist with labels from the table above, in order.
AC-ENT-03. Clicking a `.sntab` makes it `active` and the corresponding `.submod` `active`; exactly one of each is active at any time.
AC-ENT-04. Default active sub-tab on module entry is `Proveedores`.

### 6.1 Proveedores

AC-ENT-11. Proveedores table renders 7 columns (see R6.1).
AC-ENT-12. Every `Moneda` cell contains one `.badge`; every `Estado` cell contains one `.badge`.

### 6.2 OCP

AC-ENT-21. OCP table renders 9 columns.
AC-ENT-22. Every `No. OC Alenstec` cell text matches `/^OCA-\d{4}-\d{3}$/`.

### 6.3 Inventario

AC-ENT-31. Inventario table renders 10 columns.
AC-ENT-32. `Valor Total` cell value equals `Existencia × Costo Unit.` (when both numeric).

### 6.4 Facturas

AC-ENT-41. Facturas table renders 20 columns.
AC-ENT-42. Uploading a CFDI XML (fixture) inserts a new `<tr>` at the top of the Facturas tbody with UUID, RFC emisor, RFC receptor, Total correctly extracted.
AC-ENT-43. Uploading an invalid XML file shows a `❌` alert and no row is inserted.
AC-ENT-44. CFDI with `MetodoPago="PPD"` renders a `PPD` badge; `MetodoPago="PUE"` renders a `PUE` badge.
AC-ENT-45. CFDI missing `MetodoPago` with `FormaPago="03"` is imported with `Método de Pago = PUE` (fallback per HTML 1709).

### 6.5 Entregas

AC-ENT-51. Entregas-KPI strip renders 4 cards in order per §6.5.1.
AC-ENT-52. Registro table renders 11 columns.
AC-ENT-53. Últimas Incidencias table renders 7 columns; `Folio` cells match `/^INC-\d{3}$/`.

### Future (post-implementation)

AC-ENT-61. Loading sub-tab Proveedores fires `GET /api/suppliers` and populates rows.
AC-ENT-62. `+ Agregar proveedor` opens a creation modal; on save `POST /api/suppliers` is called and the new row appears.
AC-ENT-63. CFDI import persists to the backend via a new `POST /api/invoices/xml` and reloading the page restores the row.

## Regression test candidates

- **UI today:** AC-ENT-01 … AC-ENT-04, -11, -21, -31, -41, -42, -43, -44, -45, -51, -52, -53. CFDI-import tests drive the largest pure-client-side test surface available today — curate a fixtures library with representative CFDI 4.0 XMLs (one each: PUE goods, PPD services, USD-denominated, missing MetodoPago, corrupt XML).
- **API contract today:** all `/api/suppliers/*` endpoints.
- **Blocked:** every sub-tab except 6.1 and 6.4-XML-parse needs new models/routes before functional tests can run.

## Out of scope for Phase 1 (mockup only)

Three-way matching (PO/Receipt/Invoice), electronic signature capture, supplier-portal self-service, SAT real-time verification, banking integration for payments, supplier scorecards, supplier-risk predictive analytics, contract-lifecycle management. These were in earlier aspirational specs but neither the mockup nor the backend reflect them.
