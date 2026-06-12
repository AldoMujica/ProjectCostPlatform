# Implementation Audit — Mockup vs. Implemented

> **Audit date:** 2026-04-20 (original baseline against `alenstec_app.html` at commit `3c22899`).
> **Last refresh:** 2026-06-12 — Cotizaciones table expanded to 85 cols, import hardening, mockup data purge, Permisos/Usuarios fully wired.
>
> **Method:** Every visible UI element in `alenstec_app.html` was inventoried. For each, the backend (models + routes) and client JS wiring were inspected. Each element is classified **Implemented / Partial / Mockup** with a gap ID (`G-<MODULE>-<N>`) when work remains.
>
> **Headline:** After Phase 3 + Pronóstico + admin panel (2026-04-23) + correctivas 2026-06-12, roughly **96 %** of the ~72 grouped features are fully wired. Remaining: Nómina calculadoras (Phase-4 blocked), Costo-MO (Phase-5), Horas Estimadas table, G-MAT-3 KPI extras, G-HOR-4 activity codes.

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
| G-COT-5   | `Quote` now carries `cotRef`, `ocCliente`, `exchangeRate`, `otNumber`, `tipo`, plus Control-Ventas round-trip columns (`proyecto`, `celda`, `rfq`, `mecr`, `fechaCotizacion`, `tipoContrato`, `fechaOC`, `costoOC`, `fechaCompromiso`). |

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

## Phase-3 closures (2026-04-23)

Gaps fully closed by the Phase-3 cumulative merge (all 21 work items + P3.18b):

| Gap         | Resolution                                                                          |
|-------------|-------------------------------------------------------------------------------------|
| G-HOR-3     | `empleados` table extended with RFC/CURP/IMSS/puesto/departamento/SD/SDI columns; `Employee` Sequelize model; `/api/employees` CRUD + XLSX export; sub-tab 7.2 wired with live table + `+ Nuevo empleado` modal; seed populates 18 empleados (5 conciliación + 13 Control-de-Empleados). |
| G-OCA-1,2,3 | New `purchase_orders_alenstec` table; `PurchaseOrder` model; `/api/purchase-orders` CRUD + KPI + XLSX export; sub-tab 6.2 wired with `+ Capturar OCP` modal; 6 seed rows. |
| G-INV-1,2,3,4 | New `inventory_items` + `stock_movements` tables; `InventoryItem` + `StockMovement` models; `/api/inventory` CRUD + `/:id/movements` + XLSX export; sub-tab 6.3 wired with `+ Agregar existencia` modal; `POST /deliveries` rule increments existencia and logs stock movement (P3.7). |
| G-FACT-2,3  | New `supplier_invoices` table; `SupplierInvoice` model; `/api/invoices` CRUD + `POST /api/invoices/cfdi` (idempotent upsert by `uuidFiscal`); sub-tab 6.4 wired with `+ Agregar factura` modal and `+ Agregar por XML` persistent import; raw XML stored for Phase-6 re-processing. |
| G-ENTR-1,2,3 | New `deliveries` + `incidents` tables; `Delivery` + `Incident` models; `/api/deliveries` CRUD + `/api/deliveries/kpi` + `/api/deliveries/incidents` CRUD + XLSX export; sub-tab 6.5 wired with live table + 4-KPI strip + `+ Registrar entrega` / `+ Ingresar incidencia` modals. |
| G-OT-4      | New `work_order_approvals` table; `WorkOrderApproval` model; `/api/approvals/:workOrderId` auto-creates 5 pending rows; `POST /:id/transition` enforces sequential step order and per-step role gating; Flujo de Liberación renders with per-row Approve/Reject buttons; approving `liberacion_final` flips OT `status` → `Liberada`. |
| G-DASH-5    | Dashboard "OCs Abiertas" widget wired to `/api/purchase-orders`; filters `status IN (Pendiente, Parcial)`, sorts by `expectedDeliveryDate` ascending, renders top 8 with traffic-light dots (red = overdue, amber = ≤7d, green = later, blue = no date). |
| G-DASH-6    | Dashboard "Empleados en Campo" widget wired to `/api/employees?activo=true`; renders top 8 active empleados with avatar initials + puesto/departamento/ID sub-line. Note: until v2 work-session tracking lands, "en campo" = "activo". |
| G-COT-1     | `+ Nueva cotización` modal captures the 19-col Control-Ventas cotización block (minus O.C. fields, which get filled later); POSTs to `/api/quotes`; auto-refreshes the table. |
| G-EXP-1     | Cotizaciones XLSX round-trip: `GET /api/quotes/export` writes the Control-Ventas header block; `POST /api/quotes/import` accepts the master workbook (multipart + ExcelJS), tolerates `rowCount = 1,048,576` sparse XLSX metadata (uses `actualRowCount`; hard cap 10k data rows; early-exit on 50 consecutive blank rows). |
| G-OT-2      | Migration `20260423-0004-ot-form-extras.js` added 9 business fields to `work_orders` (`areaRequisitora`, `requisitorNombre`, `requisitorEmail`, `jefeIngenieria`/`Manufactura`/`Compras`/`Otros`, `pptoMaterialMxn`, `pptoMaterialUsd`); `WorkOrder` model extended; Datos Generales / Liberado a (Jefaturas) / Presupuestos cards now edit live values via `data-ot-field`; new 💾 Guardar button fires `PUT /api/work-orders/:id` and refreshes the detail. |
| G-CONC-3    | Resumen table gained a **Ver detalle** action per empleado; opens a modal that calls `GET /api/conciliacion/:semana/:empleado` and renders the 7-day breakdown (check_in/out, horas checador, horas clasificadas, diferencia, estado, justificación). Also fixed a pre-existing backend bug: the SQL nested `SUM(hc.horas)` inside `json_build_object` under `json_agg` (Postgres error "no se pueden anidar llamadas a funciones de agregación") — rewrote as scalar sub-queries per día. |
| G-CONC-4    | Empleado-detail modal shows inline **Justificar** (any role except readonly) and **Forzar** (rh/admin only) buttons per día with `estado IN (conflicto, alerta)`. Role is read from `AUTH.user().rol`. POSTs to `/api/conciliacion/justificar` or `/forzar`, then refreshes the day-detail + Resumen table. |
| html2canvas | Removed unused CDN include from `alenstec_app.html` (no code referenced it); updated CSP comment in `server.js`. |
| P1.7 → P3.18b | Per-record supervisor ACL landed. Decision: ownership lives at the OT level via new `work_orders.supervisor_id` column (nullable; NULL = visible to all). `filtrarPorSupervisor` now filters `GET /api/work-orders` for supervisor-role users. |

Phase-3 schema change summary — 4 migrations added 7 new tables (`purchase_orders_alenstec`, `inventory_items`, `stock_movements`, `supplier_invoices`, `deliveries`, `incidents`, `work_order_approvals`) and extended 3 existing tables: `empleados` (+10 cols), `work_orders` (+10 cols — `supervisor_id` for P3.18b plus 9 form-extras for G-OT-2), `quotes` (+9 cols for Control-Ventas round-trip).

## Admin panel infra (2026-04-23 · Phase-5b)

New module 11 "Administración" — admin-role only. Two pestañas:

| Pestaña       | Qué hace                                                                                                  |
|---------------|-----------------------------------------------------------------------------------------------------------|
| Configuración | CRUD sobre `system_config`. 13 claves sembradas con los valores actualmente hardcoded (umbrales Pronóstico, matriz de roles por paso de aprobación, roles que pueden forzar conciliación, jefaturas por defecto, etc.). Editor JSON con validación de tipo. Cambios surten efecto ≤ 30 s (TTL de `configService`). |
| Bitácora      | Query sobre `audit_events` con filtros por usuario, acción, entidad, rango de fechas + búsqueda libre. Export XLSX. Modal "Ver" muestra JSON `antes`/`después` lado a lado. |

**Captura automática via Sequelize hooks** aplicada globalmente a 12 modelos (`WorkOrder`, `Quote`, `Supplier`, `Employee`, `PurchaseOrder`, `InventoryItem`, `SupplierInvoice`, `Delivery`, `Incident`, `WorkOrderApproval`, `User`, `SystemConfig`). Modelos de alto volumen (`MaterialCost`, `LaborCost`, `StockMovement`, `SupplierWorkOrder`) excluidos a propósito. Login / logout / login_failed / config_change / forzar_conciliacion / etc. se registran manualmente via `logAudit()`.

**Threading de contexto:** `AsyncLocalStorage` (middleware `requestContext`) pasa el `req.user + req.ip` a través de las llamadas async sin tener que añadir `options.user` a cada llamada de servicio. Los hooks de Sequelize leen `currentContext()` y denormalizan `usuario_nombre` + `usuario_rol` en `audit_events` (así borrar un usuario no borra quién hizo qué).

Nueva tabla: `system_config(key UNIQUE, value JSONB, category, data_type, updated_by, ...)`. Nueva tabla: `audit_events(id BIGSERIAL, usuario_id, usuario_nombre, usuario_rol, accion, entidad, entidad_id, descripcion, antes JSONB, despues JSONB, ip, metadatos JSONB, fecha)`. Índices por `(entidad, entidad_id, fecha)` para trails por entidad, `(usuario_id, fecha)` para bitácora por persona, y `(fecha)` para el listado global.

**Tratamiento de contraseñas:** `passwordHash` está en la lista `EXCLUDED_FIELDS` del `auditService` — nunca aparece en los snapshots `antes`/`después`.

### Phase-1 deferrals

**P1.7 (per-record supervisor ACL)** — ✅ **closed in Phase-3 P3.18b.** See table above.

## Soft-delete transversal (2026-05-22 · ADR-008)

Cliente solicitó poder borrar items en cualquier módulo. Hasta ese punto la SPA no hacía una sola llamada DELETE y solo 7 endpoints backend la soportaban. Resuelto en un work-item transversal post-Phase-3:

| Cambio                                                                                                       | Resolución |
|--------------------------------------------------------------------------------------------------------------|------------|
| Soft-delete en 16 modelos (`paranoid: true` + columna `deleted_at`). Migración `20260522-0007-soft-delete.js`. | ✅ |
| DELETE + restore endpoints para todas las entidades operativas (8 routes con DELETE nuevo, 3 actualizados, 13 endpoints restore). | ✅ |
| Cascade-soft-delete transaccional en `DELETE /api/work-orders/:id` (costos, OCPs, inventario, facturas, entregas, incidencias, aprobaciones). 409 si la OT está `Liberada` sin `?force=true`. | ✅ |
| `DELETE /api/suppliers/:id` devuelve 409 con lista de dependientes; `?cascade=true` (admin) borra OCPs/facturas/entregas/incidencias. | ✅ |
| Pantalla "Papelera" en módulo Admin (sub-tab nuevo). `GET /api/admin/recycle-bin` lista resumen + detalle por entidad. | ✅ |
| 14 funciones `deleteRow_*` en SPA + 2 helpers nuevos (`confirmDialog`, `toast`) + botones 🗑 por fila en 11 tablas. PERMS extendidas con 13 entradas `*.delete` + `admin.restore`. | ✅ |
| Roles: `admin` + `jefe_area` para borrar (por defecto). Excepciones: `employees` y `payroll/*` también permiten `rh`. Restore: solo `admin`. | ✅ |

Tablas **excluidas** del soft-delete por diseño: `usuarios`, `system_config`, `bitacora` (identidad / auditoría inmutable).

## Sesión correctiva 2026-06-12

Cambios aplicados fuera del roadmap de fases, en respuesta a auditoría rev. 2:

| Cambio | Resolución |
|--------|------------|
| **Cotizaciones tabla 20 → 85 columnas** | `<thead>` reemplazado por estructura 3 filas / 85 columnas con grupos de color: Labor Indirecta · Labor Directa Ing/Mnf/Aut · Materiales · Viáticos · Logística · Totales. `loadCotizaciones` genera las 85 celdas por fila. `Quote` model + migration ya tenían las columnas JSON necesarias (migración 20260424-0001). |
| **`POST /api/quotes/import` endpoint** | Nuevo endpoint multer+ExcelJS para carga masiva del workbook "Control Ventas 2026". Upsert por `quoteNumber`. Tolerante a multi-fila de headers, XLSX sparse metadata, y filas de sub-encabezado que el regex `HEADER_RE` descarta. |
| **Fix: import + paranoid soft-delete** | Cuando `Quote.create()` falla con `SequelizeUniqueConstraintError` (registro existe con `deleted_at IS NOT NULL`), el catch hace `findOne({ paranoid: false })` → `restore()` → `update()`. Cuenta como `updated`, no error. Causa raíz: PostgreSQL UNIQUE constraint se aplica incluso sobre rows soft-deleted. |
| **Fix: botón delete onclick con newline** | Cotización importada con `quoteNumber = 'COT ALENSTEC\n(COT-AL)'` generaba atributo `onclick` con LF literal, rompiendo el JS. Solución: import normaliza whitespace con `.replace(/\s+/g, ' ').trim()` + regex `HEADER_RE` descarta filas de cabecera. Botón delete migrado de `onclick="deleteRow_quote('id','label')"` a `data-id`/`data-label` + `onclick="deleteRow_quote(this.dataset.id,this.dataset.label)"`. |
| **Purga de datos mockup hardcodeados en HTML** | `<tbody id="cot-tbody">` contenía 9 filas + 1 fila de totales (22 KB) con datos reales de la hoja "Control Ventas 2026-03-17" incrustados directamente en el HTML. Eliminados. La tabla se rellena exclusivamente mediante `loadCotizaciones()` desde `GET /api/quotes`. |
| **Permisos — guardar real** | `savePermChanges()` ahora llama a `POST /api/admin/permissions/overrides` (ya no muestra alert mockup). |
| **Usuarios — crear real** | `showNewUserModal()` ahora POSTea a `POST /api/admin/users` (endpoint existe en `admin.js`). |
| **PERM_SAMPLE eliminado** | Array de 6 usuarios de muestra hardcoded eliminado del código. `loadAdminPermisos()` depende 100% de la API. |
| **XLSX export sub-tabs Entregas** | `btn-dl-ocp`, `btn-dl-inv`, `btn-dl-fact` ahora tienen `onclick` conectado a `purchase-orders/export`, `inventory/export`, `invoices/export` respectivamente. |

## Legend

| Symbol | Meaning                                                   |
|--------|-----------------------------------------------------------|
| ✅     | **Implemented** — backend + UI + wiring all exist.        |
| ⚠️     | **Partial** — some layer exists; at least one is missing. |
| ❌     | **Mockup** — HTML only; no backend, no wiring.            |

## Module-level summary

| Module                       | Visible features | Implemented ✅ | Partial ⚠️ | Mockup ❌ | Primary gap              |
|------------------------------|-----------------:|---------------:|-----------:|----------:|--------------------------|
| 1. Dashboard                 | 6                | 6              | 0          | 0         | **Module complete** — 4 KPIs + Recent OT + cost bars + proveedores timeline + OCs Abiertas + Empleados en Campo all wired |
| 2. Orden de Trabajo          | 7                | 7 (PDF, selector, form, Nueva OT, Flujo de Liberación, Datos Generales save, Presupuestos) | 0 | 0 | **Module complete** — only Horas Estimadas table remains on the "nice-to-have" backlog (separate `HoursEstimate` model, Phase-5 scope) |
| 3. Cotizaciones y Ventas     | 3                | 3              | 0          | 0         | **Module complete** — 85-col table (3-level header), KPIs, `+ Nueva cotización` modal, XLSX import (w/ paranoid-restore fix) + export; no mockup data in HTML |
| 4. Pronóstico del Costo      | 2                | 2              | 0          | 0         | **Module complete (Phase-5 P5.1–P5.3)** — rollup endpoint, KPIs, table, XLSX export, semáforo rules |
| 5. Costo de Material         | 2                | 2              | 0          | 0         | Module complete (P2.9 + P2.10) |
| 6. Entregas (5 sub-tabs)     | 12               | 12             | 0          | 0         | **Module complete (Phase-3)** — Proveedores / OCP / Inventario / Facturas / Entregas all wired with live CRUD + KPIs |
| 7. Horas de Mano de Obra     | 4                | 4 (Resumen, Capturar, Control de Empleados wired)      | 0    | 0         | Activity codes (G-HOR-4) — Phase-5 |
| 8. Nómina / CFDI             | 8                | 4 (Resumen, Nueva semana, CFDI handler separado, XLSX) | 3 (Captura grid + Nueva línea bloqueados por P4.1, CFDI parser) | 1 (Calculadoras IMSS/ISR) | **Skeleton listo (Phase-4 P4.2)** — backend completo, grid de captura bloqueado en plantilla cliente P4.1 |
| 9. Conciliación              | 15               | 12             | 1          | 2         | **Near-complete** — Ver detalle + Justificar/Forzar wired; remaining is proyectos-per-día drilldown (stretch) |
|10. Costo de Mano de Obra     | 2                | 0              | 0          | 2         | No activity rollup endpoint — Phase 5 |
| **Cross-cutting: Export**    | 15               | 14 (3 Phase-1 + 5 Phase-2 + 4 Phase-3 + 1 Phase-5 xlsx + Cotizaciones import) | 0 | 1 | Only Nómina + Costo-MO exports still disabled (blocked on Phase-4 models) |
| **Totals**                   | ~72 (grouped)    | **68**         | 1          | 3         | ~94 % features wired · Module 4 Pronóstico now complete |

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
| OCs Abiertas         | ✅      | Wired 2026-04-23 — `loadDashboardOCsAbiertas` filters `status IN (Pendiente, Parcial)`, sorts by `expectedDeliveryDate`; traffic-light dots (red=overdue / amber≤7d / green later) | ~~G-DASH-5~~ |
| Empleados en Campo   | ✅      | Wired 2026-04-23 — `loadDashboardEmpleadosEnCampo` fetches `/api/employees?activo=true`; renders initials avatar + puesto/departamento/ID | ~~G-DASH-6~~ |
| Pill-tab filtering   | ⚠️      | UI toggles class; no data filter            | —          |

### Orden de Trabajo (module 2)

| Feature                         | Status | Backing                                             | Gap     |
|---------------------------------|:------:|-----------------------------------------------------|---------|
| OT banner + selector            | ✅      | Wired in P2.7 — selector populated from `/api/work-orders`; change fires `loadOTDetail` | ~~G-OT-1~~ |
| Datos Generales form            | ✅      | 2026-04-23 — full round-trip: data-ot-field on 14 inputs incl. new `areaRequisitora`/`requisitorNombre`/`requisitorEmail`; 💾 Guardar button fires `PUT /api/work-orders/:id` | ~~G-OT-2~~ |
| Liberado a (Jefaturas) card     | ✅      | 2026-04-23 — `jefeIngenieria`/`jefeManufactura`/`jefeCompras`/`jefeOtros` columns + data-ot-field wiring; persisted via the same Save button | ~~G-OT-2~~ |
| Presupuestos card               | ✅      | 2026-04-23 — `pptoMaterialMxn`/`pptoMaterialUsd` columns + data-ot-field wiring; exchangeRate/quotedCost/currency already wired from Phase-1 | ~~G-OT-2~~ |
| Horas Estimadas table           | ❌      | No `HoursEstimate` table — separate from G-OT-2; tracked in Phase-5 analytics scope | —  |
| Flujo de Liberación             | ✅      | Wired in Phase-3 P3.19–P3.21 — `WorkOrderApproval` model auto-creates 5 pending rows per OT; per-row Approve/Reject buttons call `POST /api/approvals/:id/transition`; sequential step-order + role gating enforced; `liberacion_final = aprobada` flips OT `status` → `Liberada` | ~~G-OT-4~~ |
| PDF export                      | ✅      | `generateOTPDF()` fully wired                        | —       |
| `+ Nueva OT` button             | ✅      | Wired in P2.8 — reusable modal shell + `showNewOTModal`; POSTs then refreshes selector | ~~G-OT-3~~ |
| Supervisor ACL on list          | ✅      | Wired in Phase-3 P3.18b — `work_orders.supervisor_id` column; `filtrarPorSupervisor` restricts `GET /api/work-orders` for supervisor-role callers | ~~P1.7~~ |

### Cotizaciones y Ventas (module 3)

| Feature                        | Status | Backing                                 | Gap      |
|--------------------------------|:------:|-----------------------------------------|----------|
| KPI strip                      | ✅      | Wired in P2.6 — derived from `/api/quotes` list (count, USD sum, last FX, distinct clients) | ~~G-COT-4~~ |
| Control-de-Ventas table        | ✅      | Wired in P2.5 — `loadCotizaciones`; model carries full Control-Ventas column set (G-COT-5 + 9 more cols added 2026-04-23) | ~~G-COT-2~~ |
| `+ Nueva cotización`           | ✅      | Wired 2026-04-23 — `showNewCotizacionModal` captures full Control-Ventas cotización block, POSTs to `/api/quotes` | ~~G-COT-1~~ |
| `⬇ Descargar XLSX`             | ✅      | In-card `btn-cot-download` → `/api/quotes/export` (Control Ventas 2026 layout) | ~~G-COT-3~~ |
| `⬆ Subir XLSX`                 | ✅      | In-card `btn-cot-upload` → `POST /api/quotes/import` (upsert by `quoteNumber`); survives sparse-metadata XLSX (`actualRowCount` bound, 10k cap, 50-blank-row early-exit) | —        |

### Pronóstico del Costo (module 4)

| Feature                        | Status | Backing                           | Gap         |
|--------------------------------|:------:|-----------------------------------|-------------|
| KPI strip                      | ✅      | Wired 2026-04-23 — 4 aggregate KPIs from `/api/forecasting`: totalQuotedUsd, totalActualUsd, avgVariancePct, alertCount | ~~G-PRON-2~~ |
| Pronóstico table               | ✅      | Wired 2026-04-23 — `GET /api/forecasting` rolls up per-OT cost (material + labor) normalized to the OT's quoted currency; 11-col FE render with semáforo badges and row highlighting | ~~G-PRON-1~~ |
| Variance/semáforo rules        | ✅      | Codified in `backend/src/routes/forecasting.js`: real ≤ 70% cot → OK (green); 70–100% → Atención (amber); > 100% → Crítico (red); real = 0 + active status → En ejecución (blue). Thresholds named constants, easy to retune post-client-signoff. | ~~G-PRON-3~~ |
| XLSX export                    | ✅      | 2026-04-23 — `GET /api/forecasting/export` via shared `sendTableXlsx` helper; 14 cols incl. varianza % and semáforo | ~~G-EXP-1~~ |

### Costo de Material (module 5)

| Feature                 | Status | Backing                                        | Gap      |
|-------------------------|:------:|------------------------------------------------|----------|
| KPI strip               | ⚠️      | `/api/costs/kpi/material-transit` exists; rest unimplemented | G-MAT-3 |
| Requisición table       | ✅      | Wired in P2.9 — `loadMaterialCosts` renders 11 cols with subtotal/IVA/retención/total | ~~G-MAT-2~~ |
| Table columns (IVA/Ret.)| ✅      | Phase-1 migration added `subtotal`/`iva`/`retencion` cols; rendered by P2.9 | ~~G-MAT-4~~ |
| `+ Registrar material`  | ✅      | Wired in P2.10 — reuses shared modal; auto-fills subtotal + total | ~~G-MAT-1~~ |
| XLSX export             | ✅      | P2.17 — `GET /api/costs/material/export` via shared `sendTableXlsx` helper | ~~G-EXP-1~~ |

### Entregas de Material (module 6)

| Sub-tab / Feature              | Status | Backing                                     | Gap      |
|--------------------------------|:------:|---------------------------------------------|----------|
| 6.1 Proveedores table          | ✅      | Wired in P2.11 — `loadProveedores`; shows categories, contacto, saldo, OTs | ~~G-PROV-2~~ |
| 6.1 `+ Agregar proveedor`      | ✅      | Wired in P2.11 — reusable modal with OT checklist and comma-separated categories | ~~G-PROV-1~~ |
| 6.1 `Saldo pendiente` field    | ✅      | Phase-1 migration added `supplier.saldo_pendiente`; P2.11 renders it in the Proveedores table | ~~G-PROV-4~~ |
| 6.2 OCP table                  | ✅      | Phase-3 P3.1–P3.3 — `purchase_orders_alenstec` table + `PurchaseOrder` model; `loadOCP` renders 9 cols with traffic-light status badges | ~~G-OCA-1,2~~ |
| 6.2 `+ Capturar OCP`           | ✅      | Phase-3 P3.3 — `showNewOCPModal`; datalist from `/api/suppliers`, dropdown from `/api/work-orders`; POSTs to `/api/purchase-orders` | ~~G-OCA-3~~ |
| 6.3 Inventario table           | ✅      | Phase-3 P3.4–P3.6 — `inventory_items` + `stock_movements` tables; `loadInventory` renders clave/descripción/existencia/unit_cost/valor_total/OT/estado | ~~G-INV-1,2~~ |
| 6.3 `+ Agregar existencia`     | ✅      | Phase-3 P3.6 — `showNewInventoryModal`; initial `existencia > 0` logs an `entrada` StockMovement | ~~G-INV-3~~ |
| 6.3 Delivery → inventory rule  | ✅      | Phase-3 P3.7 — `POST /api/deliveries` with `inventoryItemId + status=Entregado` transactionally increments `existencia` and logs a `StockMovement` | ~~G-INV-4~~ |
| 6.4 Facturas table             | ✅      | Phase-3 P3.8 + P3.10 — `supplier_invoices` table indexed on `uuid_fiscal`; `loadInvoices` renders 20-col CFDI layout with validación-SAT badges | ~~G-FACT-2~~ |
| 6.4 `+ Agregar por XML` parse  | ✅      | Wired: `handleXMLUpload` parses via DOMParser **and** now POSTs to `/api/invoices/cfdi` (idempotent upsert by `uuidFiscal`; raw XML persisted) | —        |
| 6.4 Real SAT validation        | ❌      | No SAT webservice call yet — Phase-6 P6.1–P6.3   | G-FACT-1 |
| 6.4 `+ Agregar factura` manual | ✅      | Phase-3 P3.11 — `showNewInvoiceModal`; captures rfcEmisor/rfcReceptor/folio/concepto/totals/metodo/validacion + OT | ~~G-FACT-3~~ |
| 6.5 Entregas KPI strip         | ✅      | Phase-3 P3.15 — `GET /api/deliveries/kpi` returns entregadas/pendientes/conIncidencia/sinAsignarInv; `loadDeliveryKPIs` paints the 4 widgets | ~~G-ENTR-3~~ |
| 6.5 Entregas table             | ✅      | Phase-3 P3.12 + P3.14 — `deliveries` table + `Delivery` model; `loadDeliveries` renders 11 cols | ~~G-ENTR-1~~ |
| 6.5 Incidencias table          | ✅      | Phase-3 P3.12 + P3.14 — `incidents` table + `Incident` model; `loadIncidents` renders 7 cols | ~~G-ENTR-1~~ |
| 6.5 `+ Registrar entrega`      | ✅      | Phase-3 P3.13 + P3.14 — `showNewDeliveryModal` → `POST /api/deliveries` | ~~G-ENTR-2~~ |
| 6.5 `+ Ingresar incidencia`    | ✅      | Phase-3 P3.13 + P3.14 — `showNewIncidentModal` → `POST /api/deliveries/incidents` | ~~G-ENTR-2~~ |
| XLSX exports (all 5 sub-tabs)  | ✅      | P2.17 + Phase-3 — live exports for proveedores (P2.17), OCP, inventory, invoices, deliveries (Phase-3); only Pronóstico/Nómina/Costo-MO exports remain disabled | ~~G-EXP-1~~ |

### Horas de Mano de Obra (module 7)

| Feature                           | Status | Backing                                   | Gap     |
|-----------------------------------|:------:|-------------------------------------------|---------|
| KPI strip                         | ❌      | No aggregate endpoint — Phase-5           | —       |
| Resumen table                     | ✅      | Wired in P2.12 — `loadLaborCosts`; 8-col layout (OT, empleado, rol, hrs, tarifa, total, moneda, fecha) | ~~G-HOR-2~~ |
| Activity code colour map          | ❌      | Not codified in model — Phase-5 P5.4–P5.5 | G-HOR-4 |
| Control de Empleados table        | ✅      | Phase-3 P3.16–P3.18 — extended `empleados` table + `Employee` model; `loadEmpleados` renders 13-col roster (numeroLista, RFC, CURP, IMSS, puesto, depto, área, fecha ingreso, SD, SDI) | ~~G-HOR-3~~ |
| `+ Nuevo empleado`                | ✅      | Phase-3 P3.18 — `showNewEmpleadoModal` → `POST /api/employees` (role: admin/rh) | ~~G-HOR-3~~ |
| `+ Capturar horas`                | ✅      | Wired in P2.13 — reusable modal; auto-computes total until user overrides | ~~G-HOR-1~~ |

### Nómina / CFDI (module 8)

| Feature                    | Status | Backing                                  | Gap           |
|----------------------------|:------:|------------------------------------------|---------------|
| Captura table (86 cols)    | ⚠️      | Phase-4 P4.2 · `payroll_weeks` + `payroll_lines` + CRUD listos. Totales tipados + detalle JSONB. Grid UI aún bloqueado en firma cliente P4.1 | G-NOM-2,4 |
| `+ Nueva línea`            | ⚠️      | `POST /api/payroll/lines` listo (snapshot del empleado automático, unique por (week, empleado)). Botón UI deshabilitado hasta P4.1 | G-NOM-1 |
| Calculadoras IMSS/ISR/INFONAVIT/FONACOT | ❌ | Pendientes P4.3–P4.6 — requieren tablas fiscales + 20 escenarios de referencia del cliente | G-NOM-5 |
| CFDI sub-tab form          | ⚠️      | Placeholder                              | G-NOM-2       |
| `+ Cargar CFDI nómina`     | ✅      | 2026-04-23 — handler dedicado `handleNominaCfdiUpload` (ya no misrouted a Facturas). Parser real del complemento 1.2 en P4.11 | ~~G-NOM-3~~ |
| CFDI-nómina parsing        | ❌      | No complemento-nómina parser             | G-NOM-6       |
| Resumen KPI strip          | ✅      | 2026-04-23 — `GET /api/payroll/resumen?weekId=` con SUM agregados (percepciones, deducciones, pago neto, días, horas, empleados distintos); FE lee los KPIs + detalle de la semana seleccionada | — |
| Nueva semana               | ✅      | 2026-04-23 — modal + POST /api/payroll/weeks (roles admin/rh); semana cerrada no acepta nuevas líneas | — |
| XLSX export                | ✅      | 2026-04-23 — `GET /api/payroll/export?weekId=` 14 cols (identificación + totales) | ~~G-EXP-1~~ |

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
| Employee daily detail                | ✅      | 2026-04-23 — Resumen rows gained "Ver detalle" action; modal calls `GET /api/conciliacion/:semana/:empleado` (backend SQL bug fixed — nested SUM inside json_agg replaced with scalar sub-query) | ~~G-CONC-3~~ |
| Justificación + forzar flows         | ✅      | 2026-04-23 — inline per-día buttons inside the detail modal; role-gated (Forzar only visible to rh/admin); POSTs to `/justificar` or `/forzar` then refreshes | ~~G-CONC-4~~ |
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
| Facturas CFDI XML import    | ✅      | Parsed and persisted to `supplier_invoices` via `POST /api/invoices/cfdi` (Phase-3 P3.9/P3.10) |
| XLSX export buttons         | ✅      | **Majority live:** WO, quotes, material, labor, suppliers (P2.17) + OCP, inventory, invoices, deliveries, empleados (Phase-3) = **9 endpoints** + cotizaciones import. Only 3 exports still disabled (Pronóstico, Nómina, Costo-MO — those modules are mockup). | ~~G-EXP-1~~ |
| Cotizaciones XLSX upload    | ✅      | 2026-04-23 — `POST /api/quotes/import` (multer + ExcelJS); upsert by `quoteNumber`; round-trips the master Control Ventas 2026 workbook |
| Nómina CFDI handler        | ✅      | Separado de Facturas (G-NOM-3 · 2026-04-23). Parser real pendiente (G-NOM-6 · P4.11). |
| html2canvas loaded, unused  | ⚠️      | decision required |

---

## Consolidated gap list

Every gap mentioned above, grouped by recommended fix-before-regression-test priority.

> **Status legend:** bold = still open · ~~strikethrough~~ = closed. See the per-phase "closures" tables at the top of this doc for the landing commit.

### Priority 1 — Blocking the most mockups

- ~~**G-EXP-1** — Wire 11 XLSX no-op buttons.~~ **Mostly closed:** 9 live exports (Phase-2: WO/quotes/material/labor/suppliers; Phase-3: OCP/inventory/invoices/deliveries/empleados) + Cotizaciones XLSX import. Only Pronóstico/Nómina/Costo-MO exports remain disabled (modules still mockup).
- ~~**G-OT-2** — Extend `WorkOrder` schema to cover liberation-form fields.~~ **Closed 2026-04-23** — 9 more columns + FE `data-ot-field` wiring + Save button.
- ~~**G-CONC-6 / G-CONC-7** — Replace JWT dev fallback and default secret before production.~~ **Closed 2026-04-20.**
- **G-NOM-4** — Encode the 86-col nómina matrix into `PayrollLine` + `PayrollWeek` models. Blocks entire Module 8 — **Phase-4 work.**

### Priority 2 — New feature work, high visibility

- ~~**G-OT-3** — Wire `+ Nueva OT` creation modal.~~ **Closed 2026-04-21 (P2.8).**
- ~~**G-OT-4** — Implement approval state machine + transition endpoints.~~ **Closed 2026-04-23 (Phase-3 P3.19–P3.21).**
- ~~**G-OCA-1,2** — New `PurchaseOrderAlenstec` model + CRUD.~~ **Closed 2026-04-23 (Phase-3 P3.1–P3.3).**
- ~~**G-INV-1,2** — New `InventoryItem` model + CRUD.~~ **Closed 2026-04-23 (Phase-3 P3.4–P3.7).**
- ~~**G-FACT-2** — New `SupplierInvoice` model + XML persistence.~~ **Closed 2026-04-23 (Phase-3 P3.8–P3.10).**
- ~~**G-ENTR-1,2** — New `Delivery` + `Incident` models + CRUD.~~ **Closed 2026-04-23 (Phase-3 P3.12–P3.14).**
- ~~**G-HOR-3** — New `Employee` master model.~~ **Closed 2026-04-23 (Phase-3 P3.16–P3.18, extending the existing `empleados` table).**
- ~~**G-COT-1** — Wire `+ Nueva cotización` creation modal.~~ **Closed 2026-04-23.**
- ~~**G-NOM-3** — Separate CFDI-nómina upload handler from Facturas.~~ **Closed 2026-04-23.**

### Priority 3 — Wiring existing endpoints

- ~~**G-DASH-1…4** — Wire dashboard KPIs and tables to existing endpoints.~~ **Closed 2026-04-21 (P2.1–P2.4).**
- ~~**G-COT-2, G-COT-4** — Wire Cotizaciones table + KPI.~~ **Closed 2026-04-21 (P2.5–P2.6).**
- ~~**G-MAT-2** — Wire Requisición table.~~ **Closed 2026-04-21 (P2.9).**
- ~~**G-PROV-2** — Wire Proveedores table.~~ **Closed 2026-04-21 (P2.11).**
- ~~**G-HOR-2** — Wire Horas table.~~ **Closed 2026-04-21 (P2.12).**
- ~~**G-CONC-1** — Wire Alertas list to existing endpoint.~~ **Closed 2026-04-21 (P2.14).**
- ~~**G-CONC-2** — Wire Clasif form to existing endpoint.~~ **Closed 2026-04-21 (P2.15).**
- ~~**G-CONC-3,4** — Add UI for justificar/forzar and empleado-detail.~~ **Closed 2026-04-23** — Ver detalle modal + role-gated buttons; also fixed nested-aggregate SQL bug in the underlying endpoint.

### Priority 4 — New analytics

- ~~**G-PRON-1,2,3** — Pronóstico endpoint + rules.~~ **Closed 2026-04-23** — `/api/forecasting` rollup endpoint, codified semáforo thresholds, FE wired.
- **G-MO-1,2** — Costo-MO activity-rollup endpoint + Real-cost computation rule. **Phase-5.**
- **G-HOR-4** — Activity-code catalogue + colour map. **Phase-5.**
- ~~**G-DASH-5,6** — OCs Abiertas + Empleados en Campo endpoints.~~ **Closed 2026-04-23** (wired to `/api/purchase-orders` and `/api/employees?activo=true`). Phase-5 P5.9/P5.10 dedicated endpoints deferred — the live list endpoints serve the widget needs today.

### Priority 5 — External integrations

- **G-FACT-1** — Real SAT CFDI validation (PAC / SAT web service). **Phase-6.**
- **G-NOM-6** — CFDI complemento-nómina parser + persistence. **Phase-4 (calls into Phase-6 PAC).**

### Priority 6 — Housekeeping

- ~~**G-CONC-5** — Populate week selector from DB.~~ **Closed 2026-04-21 (P2.16).**
- ~~**G-CONC-8** — Decide: backend/src or asistencia-modulo as canonical.~~ **Closed 2026-04-20** (asistencia-modulo removed).
- ~~**G-MAT-4, G-COT-5, G-PROV-4** — Model-field audits and migrations.~~ **Closed 2026-04-20** (model migrations landed); FE now renders all three (Phase-2 + Phase-3 wiring).
- ~~**html2canvas removal or feature addition.**~~ **Closed 2026-04-23** — removed from CDN include list (no code referenced it).
- Reconcile legacy docs with current tree: the asistencia migration SQL now lives at [`backend/src/db/migrations/20260420-0003-asistencia-conciliacion.sql`](../backend/src/db/migrations/20260420-0003-asistencia-conciliacion.sql) and runs via umzug alongside the two JS migrations that land the cost-models + users tables.

---

## Risk summary

1. ~~**Dual-server architecture (`:3000` legacy + `:3001` conciliación)** is unconventional and likely to cause deployment confusion.~~ **Resolved 2026-04-20** — single Express app on `:3000`.
2. ~~**No foreign-key constraints** in the Sequelize models — everything references `otNumber` as a free string.~~ **Resolved 2026-04-20** — `work_order_id` FKs on `material_costs`/`labor_costs` and `supplier_work_orders` join table; `otNumber` retained as a redundant human column per ADR-006.
3. ~~**Two parallel conciliación implementations** (`backend/src/` + `asistencia-modulo/`).~~ **Resolved 2026-04-20** — `asistencia-modulo/` deleted.
4. ~~**No authentication** on the cost API~~ **Resolved 2026-04-20** — `app.use('/api', verificarJWT)` gates every resource route; per-role guards on writes.
5. ~~**Default JWT secret** in development mode leaks admin role silently.~~ **Resolved 2026-04-20** — `assertJwtSecret()` refuses to boot on unset / default / short secrets.
6. ~~**Static mockup data baked into HTML** confuses testers — a row in the Recent-OT table might look "wired" but is just HTML.~~ **Fully resolved** — Phases 2 + 3 swapped out mockup tables for live loaders; 2026-06-12 purged the last 22 KB of hardcoded rows from `#cot-tbody`. Only Costo-MO still shows a hardcoded placeholder message (Phase-5). No other table has static data.

---

## Remaining work (post Phase-3)

**Phase-4 (Nómina) — skeleton listo, calculadoras pendientes:**
- ~~G-NOM-4~~ — `PayrollWeek` + `PayrollLine` con detalle JSONB. **Closed 2026-04-23.**
- ~~G-NOM-3~~ — CFDI-nómina handler separado. **Closed 2026-04-23.**
- ~~G-NOM-2 (parcial)~~ — CRUD de weeks + lines + resumen KPIs + XLSX export. **Closed 2026-04-23.** UI grid de 86 columnas pendiente hasta P4.1.
- G-NOM-1 — Botón `+ Nueva línea` con formulario completo — **bloqueado en P4.1** (requiere plantilla firmada del cliente).
- G-NOM-5 — Calculadoras IMSS / ISR / INFONAVIT / FONACOT — **bloqueado en P4.3–P4.6** (requiere tablas fiscales + 20 escenarios de referencia).
- G-NOM-6 — Parser del complemento de nómina 1.2 — **bloqueado en P4.11**.

**Phase-5 (Analytics) — partial (Pronóstico done; Costo-MO pending):**
- ~~G-PRON-1,2,3~~ — Pronóstico endpoint + variance/semáforo rules. **Closed 2026-04-23.**
- G-MO-1,2 — Costo-MO activity-rollup + Real-cost rule. **Still open** — blocked on client signoff of Costo/Real rule (roadmap P5.7).
- G-HOR-4 — Activity-code catalogue + colour map. **Still open** — unlocks G-MO-1 rollup.

**Phase-6 (External integrations) — not started:**
- G-FACT-1 — Real SAT CFDI validation via PAC.
- G-NOM-6 — CFDI complemento-nómina parser persistence.

**Carry-overs from earlier phases:**
- ~~G-OT-2~~ — FE wiring of WorkOrder liberation-form fields. **Closed 2026-04-23.**
- ~~G-CONC-3,4~~ — Conciliación justificar/forzar UI + empleado-detail. **Closed 2026-04-23.**
- G-MAT-3 — Material-cost KPI strip extras (only `material-transit` endpoint exists). **Still open** (minor — Phase 5).
- ~~html2canvas~~ — Removed. **Closed 2026-04-23.**
