# Module 9 — Conciliación

> **Source of truth:** [`alenstec_app.html` lines 790–920](./alenstec_app.html), wired by `#mod-conciliacion` / `data-mod="conciliacion"`. This is the **only module integrated into the main HTML that has a substantial backend** (`backend/src/routes/conciliacionRoutes.js`, 13 endpoints).
>
> **Supersedes:** `CONCILIACION_README.md` (retained for historical/setup context but this document is the Phase-2 requirements source).

## Purpose

Weekly reconciliation of three hour sources before payroll close:

1. **Checador** — raw time-clock CSV/XLSX import.
2. **Horas clasificadas** — supervisor-entered allocation per employee/OT/activity.
3. **Incidencias** — validated absences (vacation, incapacidad, festivo).

Result: per-employee state (`ok` / `alerta` / `conflicto` / `justificado` / `forzada`) plus an irreversible weekly close with Excel export.

## Entry point

- Sidebar: "Conciliación" (sixth item, Costos).
- Top-bar title: `Conciliación`
- Top-bar breadcrumb: `· Gestión de checador y horas`
- Top-bar `+ Nueva OT` button label is **overridden** to `+ Cerrar Semana` while this module is active (`CFG.conciliacion.newLabel`, HTML 1075). Clicking it fires `handleNewAction` → `cerrarSemana()` (HTML 1387–1393).
- Top-bar controls: OT selector hidden (HTML 1331), date-filter hidden, pill-tabs hidden. A module-level **week selector** `<select id="conciliacion-week">` + `Actualizar` button is rendered as an inline top card (HTML 800–815). Four week options hardcoded for March 2026.

## Sub-module structure

Five sub-tabs (`.sntab`, HTML 792–798):

| # | Slug          | Label                      | Default? |
|---|---------------|----------------------------|----------|
| 9.1 | `checador`   | Carga de Checador          | ✅        |
| 9.2 | `semanal`    | Conciliación Semanal       |          |
| 9.3 | `alertas`    | Alertas                    |          |
| 9.4 | `horas`      | Clasificación de Horas     |          |
| 9.5 | `cierre`     | Cierre de Semana           |          |

---

## 9.1 — Carga de Checador

HTML 817–843. Contains:

- **Drop-zone** `#checador-dropzone` with emoji `📤`, accepts drag-drop and click.
- **Hidden input** `#checador-file` — accepts `.csv,.xlsx`.
- **Vista previa card** with:
  - `#checador-preview-summary` line (hidden until preview requested) showing `Registros leídos · Válidos · Errores`.
  - `#checador-preview-table` with 5 columns: **Empleado · Fecha · Entrada · Salida · Estado**. First 20 rows of the parsed file.
  - `#checador-preview-btn` (`Previsualizar`) — calls `previewChecador()` (HTML 1444).
  - `#checador-import-btn` (`Importar registros`) — disabled until a file is chosen; calls `importarChecador()` (HTML 1486).
  - `#checador-preview-error` for error display.

### Wired API calls

| UI action           | Request                                                            | Expected response                             |
|---------------------|--------------------------------------------------------------------|-----------------------------------------------|
| Previsualizar       | `POST /api/conciliacion/checador/preview` (multipart, field `archivo`) | `{exitoso, preview:{total_leidos, total_validos, total_errores, registros[{empleado,fecha,entrada,salida,estado}], errores[]}, temp_file}` |
| Importar registros  | `POST /api/conciliacion/checador/importar` with `{temp_file, semana_id}` | `{exitoso, importacion, conciliacion}`        |

On import success the UI shows a browser `alert('Importación exitosa. Revisa el resumen semanal.')` then calls `loadConciliacionSemana()`.

## 9.2 — Conciliación Semanal

HTML 846–862. Contains:

- **Mini-KPI strip** (`.conciliacion-mini`) with 4 cards:
  - `Total empleados` (`#resumen-total-empleados`)
  - `Horas checador` (`#resumen-horas-checador`)
  - `Horas clasificadas` (`#resumen-horas-clasificadas`)
  - `Incidencias` (`#resumen-incidencias`)
- **Table** `#conciliacion-table` with 5 columns: **Empleado · Total Checador · Total Clasif. · Diferencia · Estado**. Placeholder row until `loadConciliacionSemana()` resolves.

### Wired API call

`GET /api/conciliacion/:semana_id` → `{semana:{cerrada}, resumen:{total_empleados, total_horas_checador, total_horas_clasificadas, total_incidencias, estado_alerta, estado_conflicto}, empleados:[{nombre, total_horas_checador, total_horas_clasificadas, diferencia, estado}]}`.

Rendered by `renderConciliacionRows(empleados)` (HTML 1508). Also updates cierre-panel `status / alertas / conflictos` counters (HTML 1546–1548).

## 9.3 — Alertas

HTML 864–873. Static `.alerts-list` container `#alertas-list` with **3 hardcoded sample cards**:

| Card class         | Title                  | Body                                              |
|--------------------|------------------------|---------------------------------------------------|
| `alert-card danger`| Conflicto de entrada   | `Empleado no tiene registro de salida en fecha 2026-03-21.` |
| `alert-card warn`  | Diferencia de horas    | `Hay 3 empleados con más de 2 horas de diferencia.` |
| `alert-card`       | Falta justificante     | `Pendientes 4 justificantes de ausencia.`         |

Backend endpoint exists (`GET /api/conciliacion/:semana_id/alertas`) returning `{total_alertas, alertas_criticas, alertas_medias, alertas[]}` — **not wired** in the HTML. **Gap G-CONC-1.**

## 9.4 — Clasificación de Horas

HTML 875–902. Two-card layout:

### Left card — Form

6 inputs + 1 select + 1 submit button:

| Input id             | Label        | Type      |
|----------------------|--------------|-----------|
| `clasif-empleado`    | Empleado     | text (placeholder `Nombre / ID`) |
| `clasif-proyecto`    | Proyecto / OT| text (placeholder `OT-AL-1948`)  |
| `clasif-fecha`       | Fecha        | date      |
| `clasif-horas`       | Horas        | number, min 0, step 0.25         |
| `clasif-actividad`   | Actividad    | text (placeholder `Maquinado, Ensamble`) |
| `clasif-tipo`        | Tipo         | select: `Normal` / `Extra` / `Vacaciones` |
| `clasif-add-btn`     | —            | button `Agregar clasificación`   |
| `clasif-result`      | —            | feedback div                     |

### Right card — Horas clasificadas table

`#clasif-table` columns: **Empleado · Fecha · Proyecto · Horas · Tipo**.

### Critical behavior note

`addClasificacion()` (HTML 1560) **does NOT call the backend**. It appends to a local `conciliacionState.clasificacionRecords` array and re-renders the table. The success message reads:

> *"Registro guardado localmente. No se envía a backend en esta vista integrada."*

**Gap G-CONC-2** — the backend has `POST /api/conciliacion/horas-clasificadas` (plus GET/PUT/DELETE), but the integrated HTML bypasses it. Wire it for persistence.

## 9.5 — Cierre de Semana

HTML 904–918. Contains:

- **Mini-KPI strip** with 3 cards:
  - `Estatus de cierre` (`#cierre-status`) — initial text `Pendiente`.
  - `Alertas activas` (`#cierre-alertas`)
  - `Conflictos` (`#cierre-conflictos`)
- **Primary button** `Cerrar Semana` (`#cierre-btn`) → `cerrarSemana()` (HTML 1589).
- **Secondary button** `Exportar Excel` (`#export-btn`) → `exportConciliacionExcel()` (HTML 1605).
- **Message region** `#cierre-message`.

### Wired API calls

| Button / Action   | Request                                                    | Notes                                   |
|-------------------|------------------------------------------------------------|-----------------------------------------|
| `Cerrar Semana`   | `POST /api/conciliacion/:semana_id/cerrar`                 | On success: `#cierre-message` = "Semana cerrada correctamente." and reloads semana |
| `Exportar Excel`  | `GET /api/conciliacion/:semana_id/exportar`                | Streams XLSX, triggers browser download `conciliacion_semana_<id>.xlsx` |

---

## Backend endpoints (complete list)

All under `/api/conciliacion/*`, require `verificarJWT` middleware. In development, missing JWT falls back to `{id:1, rol:'admin'}`.

| Method | Path                                                  | Roles                          | UI-wired? |
|--------|-------------------------------------------------------|--------------------------------|-----------|
| POST   | `/checador/preview`                                   | any                            | ✅ 9.1    |
| POST   | `/checador/importar`                                  | any                            | ✅ 9.1    |
| GET    | `/:semana_id`                                         | any                            | ✅ 9.2    |
| GET    | `/:semana_id/:empleado_id`                            | any                            | ❌        |
| POST   | `/justificar`                                         | supervisor/jefe_area/rh/admin  | ❌        |
| POST   | `/forzar`                                             | rh/admin                       | ❌        |
| GET    | `/:semana_id/alertas`                                 | any                            | ❌ G-CONC-1 |
| POST   | `/horas-clasificadas`                                 | supervisor/jefe_area/rh/admin  | ❌ G-CONC-2 |
| GET    | `/horas-clasificadas/:semana_id/:empleado_id`         | any                            | ❌        |
| PUT    | `/horas-clasificadas/:id`                             | supervisor/jefe_area/rh/admin  | ❌        |
| DELETE | `/horas-clasificadas/:id`                             | supervisor/jefe_area/rh/admin  | ❌        |
| POST   | `/:semana_id/cerrar`                                  | rh/admin                       | ✅ 9.5    |
| GET    | `/:semana_id/exportar`                                | jefe_area/rh/admin             | ✅ 9.5    |

### Reconciliation rules (from `backend/src/services/conciliacionService.js`)

For each `(empleado, fecha)`:

1. Sum `horas_checador` (time-clock durations).
2. Sum `horas_clasificadas` (supervisor-entered).
3. Check for valid `incidencia` (vacación / incapacidad / festivo).

```
if incidencia_valida → estado = ok, diferencia = 0
else:
  diferencia = |checador − clasificadas|
  if diferencia ≤ TOLERANCIA_HORAS (0.5h)  → estado = ok
  elif diferencia ≤ UMBRAL_ALERTA (2.0h)   → estado = alerta
  else                                      → estado = conflicto  (requires justificación)
```

Final states: `ok`, `alerta`, `conflicto`, `justificado` (conflict resolved via `POST /justificar`), `forzada` (admin override via `POST /forzar`).

### Checador parser (`parserChecadorService.js`)

- Accepts CSV and XLSX. Auto-detects columns: `id_empleado`/`numero_lista`, `fecha`, `primer_checada`/`check_in`, `ultima_checada`/`check_out`.
- Time formats: `HH:mm:ss`, `HH:mm`, `HHmm`, `h:mm A`, `hh:mm A`.
- Date formats: `DD/MM/YYYY`, `YYYY-MM-DD`, and variants.
- Anomaly detection: missing check-out, duration <30 min, duration >14 h, employee-id not in DB.

## Gaps summary

| ID       | Description                                                 |
|----------|-------------------------------------------------------------|
| G-CONC-1 | Alertas sub-tab renders 3 hardcoded cards; endpoint not wired |
| G-CONC-2 | `Clasificación de Horas` form saves locally only; endpoint not wired |
| G-CONC-3 | Employee-daily-detail view (`GET /:semana_id/:empleado_id`) unused in UI |
| G-CONC-4 | Justificación and forzar-conciliación flows unused in UI    |
| G-CONC-5 | Week selector hardcoded to 4 Mar 2026 weeks; should query `semanas_nomina` table |
| G-CONC-6 | JWT auth falls back to admin in dev — production must enforce |
| G-CONC-7 | Demo default JWT secret `'tu_secret_key'` must be replaced  |
| G-CONC-8 | `asistencia-modulo/` parallel implementation — decide canonical path |

## Acceptance criteria

### Cross-cutting

AC-CONC-01. `#ttitle` reads `Conciliación`; `#tcrumb` reads `· Gestión de checador y horas`.
AC-CONC-02. Top-bar `#ctrl-new` displays label `+ Cerrar Semana` (not `+ Nueva OT`).
AC-CONC-03. Week selector `#conciliacion-week` renders 4 options.
AC-CONC-04. Five sub-tabs in the order listed, `Carga de Checador` active by default.

### 9.1 — Carga de Checador

AC-CONC-11. Drop-zone accepts a `.csv` file via click or drag-drop.
AC-CONC-12. `Importar registros` is disabled until a file is chosen.
AC-CONC-13. Clicking `Previsualizar` fires `POST /api/conciliacion/checador/preview` with multipart body `archivo`.
AC-CONC-14. When preview returns `total_leidos=N`, the summary renders `Registros leídos: N · Válidos: <validos> · Errores: <errores>`.
AC-CONC-15. Preview table renders at most 20 rows (HTML 1473 `slice(0, 20)`).
AC-CONC-16. Clicking `Importar registros` fires `POST /api/conciliacion/checador/importar` with `{temp_file, semana_id}`.
AC-CONC-17. On import error the `#checador-preview-error` div becomes visible with the error text.

### 9.2 — Conciliación Semanal

AC-CONC-21. On clicking `Actualizar`, `GET /api/conciliacion/:semana_id` is fired with the selected `semana_id`.
AC-CONC-22. Mini-KPI values populate from `resumen.total_empleados`, `total_horas_checador`, `total_horas_clasificadas`, `total_incidencias`.
AC-CONC-23. `#conciliacion-table` renders one row per returned empleado with 5 cells.
AC-CONC-24. If `semana.cerrada=true`, `#cierre-status` reads `Cerrada`; `#cierre-message` reads `La semana ya está cerrada.`.

### 9.3 — Alertas

AC-CONC-31. Alertas list contains 3 hardcoded `.alert-card` elements today (baseline).

*Post-G-CONC-1:* Alertas list reflects response of `GET /api/conciliacion/:semana_id/alertas`.

### 9.4 — Clasificación de Horas

AC-CONC-41. Form renders 6 inputs + 1 select + 1 submit button with the IDs listed in §9.4.
AC-CONC-42. Clicking `Agregar clasificación` with any empty required field shows "Completa todos los campos antes de guardar." in `#clasif-result`.
AC-CONC-43. Clicking `Agregar clasificación` with complete values appends a row to `#clasif-table` and clears the result message to "Registro guardado localmente. No se envía a backend en esta vista integrada."

*Post-G-CONC-2:* clicking the button fires `POST /api/conciliacion/horas-clasificadas` and persists.

### 9.5 — Cierre de Semana

AC-CONC-51. Three mini-KPIs present: `Estatus de cierre` (default `Pendiente`), `Alertas activas`, `Conflictos`.
AC-CONC-52. Clicking `Cerrar Semana` fires `POST /api/conciliacion/:semana_id/cerrar`.
AC-CONC-53. On success `#cierre-message` reads `Semana cerrada correctamente.`.
AC-CONC-54. Clicking `Exportar Excel` fires `GET /api/conciliacion/:semana_id/exportar` and triggers a browser download with filename `conciliacion_semana_<id>.xlsx`.

### Backend contract

AC-CONC-61. All 13 endpoints listed above respond to the method + path in the table.
AC-CONC-62. Role-protected endpoints return 403 for insufficient role (once JWT is required).
AC-CONC-63. `POST /checador/preview` with an invalid file extension (e.g. `.txt`) returns 4xx with descriptive error.
AC-CONC-64. Reconciliation algorithm returns the expected state per the rule table above, given a seeded fixture.

## Regression test candidates

- **UI today:** AC-CONC-01 … AC-CONC-04, -11, -12, -31, -41, -42, -43, -51.
- **Integration today:** -13…-17, -21…-24, -52, -53, -54 — with a real backend instance and seeded `semanas_nomina` / `empleados`.
- **API contract today:** all 13 endpoints via Jest + supertest.
- **Blocked:** Alertas wire-up (G-CONC-1); Clasif form persistence (G-CONC-2); justificar / forzar flows (G-CONC-4).

## Out of scope for Phase 1 (mockup only)

Biometric clock integration, mobile-app capture, real-time dashboards, email notifications on weekly close, scheduled exports, multi-plant comparison, shift-pattern auto-detection.
