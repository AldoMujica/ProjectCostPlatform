# Auditoría de Hallazgos Negativos — Alenstec Costos
> **Fecha de auditoría:** 2026-06-12 (rev. 2 — post sesión correctiva)
> **Alcance:** 100 % de módulos y funciones visibles en `alenstec_app.html` + rutas backend
> **Método:** inspección de código + grep sistemático de indicadores (`alert(`, `mockup`, `disabled`, `hardcoded`, `Phase 4/5`, `pendiente`) + revisión de cada handler de botón contra el endpoint backend correspondiente
> **Propósito:** Lista completa de lo que NO funciona, está en mockup, o tiene comportamiento incorrecto. Solo hallazgos negativos. Los hallazgos cerrados desde la rev. 1 se mueven a la tabla de cierres al final.

---

## Tabla de hallazgos abiertos

| ID | Módulo | Sub-módulo / Pestaña | Elemento | Descripción del hallazgo | Evidencia | Severidad | Fase roadmap | Visible al cliente |
|----|--------|----------------------|----------|--------------------------|-----------|-----------|--------------|-------------------|
| F-03 | Nómina / CFDI | Captura | Grid de captura (86 columnas) + botón "+ Nueva línea" | El botón "+ Nueva línea" está deshabilitado con `title="Se habilita cuando el cliente apruebe el layout (P4.1)"`. La tabla muestra solo placeholder. El módulo de captura es inoperable. | `alenstec_app.html` L1157 — `disabled hardcoded`; backend `POST /api/payroll/lines` existe pero la UI no lo expone | **CRÍTICO** | Phase-4 P4.1 (bloqueado por firma cliente) | ✅ SÍ |
| F-04 | Nómina / CFDI | CFDI Nómina | Carga de XML (complemento 1.2) | Al seleccionar archivo aparece `alert()` con "Carga de CFDI de nómina pendiente (Fase 4 · P4.11)". No existe parser para el complemento de nómina 1.2. | `alenstec_app.html` L3455–3456 | **CRÍTICO** | Phase-4 P4.11 | ✅ SÍ |
| F-05 | Nómina / CFDI | Calculadoras | IMSS / ISR / INFONAVIT / FONACOT | No existe ningún servicio de cálculo fiscal. El backend guarda totales "tal cual" sin validación ni cómputo. Requiere tablas ISR 2026, cuotas IMSS y 20 escenarios de referencia del cliente. | Sin `payrollCalculator.js`; `backend/src/routes/payroll.js` sin lógica de cálculo | **CRÍTICO** | Phase-4 P4.3–P4.6 | ✅ SÍ |
| F-06 | Costo de Mano de Obra | — (módulo completo) | Tabla principal + KPIs | Módulo completo en mockup. La tabla muestra texto hardcoded `"Sin datos · módulo Costo MO pendiente de implementación (Phase 5)"`. Los 4 KPIs muestran `"—"` permanentemente. No existe endpoint `/api/costs/labor/rollup`. | `alenstec_app.html` L1005; `XLSX_EXPORTS` sin entrada `costomo` | **ALTO** | Phase-5 | ✅ SÍ |
| F-07 | Costo de Mano de Obra | — | Botón XLSX (descarga global topbar) | Al presionar "⬇ Descargar XLSX" en este módulo muestra `alert('Descarga XLSX no disponible para este módulo (módulo en mockup).')`. | `alenstec_app.html` L2911; `XLSX_EXPORTS` sin `costomo` | **ALTO** | Phase-5 | ✅ SÍ |
| F-08 | Dashboard | — | Botón XLSX (descarga global topbar) | Al presionar "⬇ Descargar XLSX" en Dashboard muestra el mismo `alert` de módulo no disponible. No existe endpoint de export para dashboard. | `alenstec_app.html` L2911; `XLSX_EXPORTS` sin `dashboard` | **ALTO** | Sin fase | ✅ SÍ |
| F-09 | Nómina / CFDI | — | Botón XLSX (descarga global topbar) | "⬇ Descargar XLSX" en Nómina muestra alert de mockup. El endpoint `/api/payroll/export?weekId=` existe pero no está registrado en `XLSX_EXPORTS` (que requeriría pasar el weekId dinámico). | `alenstec_app.html` L2911; XLSX_EXPORTS sin `nomina`. El botón inline dentro del módulo sí funciona. | **ALTO** | Phase-4 | ✅ SÍ (confuso: un botón funciona, el otro no) |
| F-10 | Topbar global | — | Botón "+" (acción nueva) | `handleNewAction()` solo enruta a OT y Conciliación. Para todos los demás módulos (Material, Horas, Entregas, Costo MO, etc.) ejecuta `alert('Funcionalidad no disponible para este módulo.')`. Nota: Cotizaciones tiene su propio botón inline "+ Nueva Cotización" en la tarjeta y no depende del "+". | `alenstec_app.html` L5786–5791 | **ALTO** | Múltiples fases | ✅ SÍ |
| F-11 | Administración | Permisos | KPI "Usuarios activos" — código incorrecto | El KPI muestra `cargados desde /api/auth/users`. El endpoint real es `/api/admin/users`. Si alguien inspecciona el DOM o hace debugging, ve un path inexistente. | `alenstec_app.html` L1537 — texto del `<code>` | **ALTO** | Phase-5c | ❌ solo si inspecciona el DOM |
| F-13 | Orden de Trabajo | Datos Generales | Tabla "Horas Estimadas del Proyecto" | Muestra `"Sin datos. Selecciona una OT para ver sus horas estimadas."` permanentemente. No existe modelo `HoursEstimate` ni endpoint `/api/hours-estimates`. La tabla HTML existe con 13 columnas pero nunca se rellena. | `alenstec_app.html` L613; sin modelo en `backend/src/models/` | **MEDIO** | Phase-5 nice-to-have | ✅ SÍ |
| F-14 | Horas de Mano de Obra | Resumen | Columna "Código Actividad" | `activity_code` existe en la base de datos y en el modelo (`LaborCost.activityCode`) pero no se muestra en la tabla ni en el formulario "+ Capturar horas". El catálogo de actividades (A–M) nunca se expone al usuario. | `alenstec_app.html` modal de captura sin campo activityCode; `LaborCost.js` L49 | **MEDIO** | Phase-5 G-HOR-4 | ✅ SÍ |
| F-15 | Costo de Material | — | KPIs adicionales sin implementar | Solo el KPI "Material en Tránsito" tiene endpoint (`/api/costs/kpi/material-transit`). Los demás slots de KPI del módulo están vacíos o muestran `"—"` permanentemente. | `backend/src/routes/costs.js` L127; gap G-MAT-3 | **MEDIO** | Pendiente | ✅ SÍ |
| F-17 | Orden de Trabajo / Dashboard | Topbar pill-tabs | Pill-tabs "Todas / Activas / Cerradas" | Los 3 tabs alternan clase `active` visualmente pero no filtran los datos. Hacer clic en "Activas" o "Cerradas" no cambia el contenido de la tabla de OTs. | `alenstec_app.html` L471–474; sin handler `onclick` en los tabs | **MEDIO** | Pendiente | ✅ SÍ |
| F-18 | Dashboard | Widget "Empleados en Campo" | Semántica incorrecta | El widget muestra empleados con `activo = true` como "en campo". No existe tracking real de sesión de trabajo o presencia en sitio. La etiqueta "en campo" promete información que el sistema no tiene capacidad de calcular hoy. | `alenstec_app.html` — `loadDashboardEmpleadosEnCampo` llama a `GET /api/employees?activo=true` | **MEDIO** | Phase-4 / v2 | ✅ SÍ |
| F-20 | Administración | Apariencia | Preferencias guardadas en localStorage | Las preferencias de apariencia (tema, fuente, color) se guardan en `localStorage` del navegador, no en el servidor. Si el usuario cambia de dispositivo o borra caché, pierde su configuración. | `alenstec_app.html` — `saveUserPrefs` usa `localStorage.setItem` | **BAJO** | Phase-5c — diseño conocido | ❌ comportamiento limitado pero esperado |
| F-21 | Administración | Apariencia | Color primario — paleta limitada | Solo 5 colores disponibles en `SWATCH_PALETTE`. Cualquier hex fuera de esa paleta cae al verde por defecto sin aviso al usuario. | `alenstec_app.html` — `SWATCH_PALETTE` | **BAJO** | Phase-5c | ✅ SÍ si el usuario elige "custom" |
| F-23 | (Todos los módulos) | — | Uso generalizado de `alert()` nativo | Múltiples operaciones usan `window.alert()` del navegador para errores y confirmaciones. El título del browser alert muestra el origen del servidor (ej. `10.147.10.202:3000 dice`), lo cual es técnico e improfesional. Afecta 26 llamadas, incluyendo la nueva notificación de resultado del import XLSX de cotizaciones (L5319). | `alenstec_app.html` L2696, 2802, 2891, 2911, 3455, 5319, 5322, 5790, 5845, 5888, 5901, 5904, 5935, 6029, 6053, 6092, 6196, 6221, 6234, 6374, 6380, 6385 (22 ocurrencias) | **BAJO** | Cross-cutting | ✅ SÍ |
| F-24 | Administración | Permisos | KPI "Roles definidos" — texto hardcoded | El subtexto del KPI lista los roles `admin · jefe_area · rh · supervisor · ventas · compras` directamente en el HTML estático. Si se agregan roles en el futuro, no se actualiza automáticamente. | `alenstec_app.html` — HTML del KPI | **BAJO** | Phase-5c | ❌ interno |
| F-25 | Administración | Permisos | "Última edición" KPI — usuario hardcoded | El KPI "Última edición" ahora muestra la fecha real del último override (desde `updatedAt`), pero el nombre del usuario siempre dice `"por admin"` en lugar del nombre real del usuario que hizo el cambio. | `alenstec_app.html` L2569 — `textContent = 'por admin'` hardcoded | **BAJO** | Phase-5c | ✅ SÍ |
| F-26 | Nómina / CFDI | Captura | Tabla de 86 columnas visible aunque sin datos | Aunque el módulo está deshabilitado operacionalmente, un admin que navegue al módulo ve la tabla de 86 columnas con placeholder `"Registros de nómina disponibles para capturar aquí."` sin ninguna funcionalidad activa. | `alenstec_app.html` L1157 y tabla de captura | **BAJO** | Phase-4 | ❌ solo admin |
| F-27 | Horas MO | Captura — modal | Campo "Total" — inconsistencia cliente/servidor | El total se calcula en el cliente (`horas × tarifa`) pero el servidor acepta `totalCost` arbitrario. Si el usuario edita el campo total manualmente antes de enviar, el cálculo queda inconsistente sin re-validación server-side. | `backend/src/routes/costs.js` POST /labor sin validación de totalCost | **BAJO** | Phase-2 (diseño conocido) | ❌ edge case |
| F-28 | Dashboard | Notificaciones | Varianza > 100% — edge case OTs sin costo | El detector de "varianza crítica" usa `actualCost / quotedCost > 100%`. OTs con `actualCost = 0` y `quotedCost > 0` no se detectan como críticas, aunque deberían marcarse como "sin costo capturado". La notificación separada `ot_sin_costo_real` existe pero no cruza datos con la alerta de varianza. | `backend/src/services/notificationService.js` L215 | **BAJO** | Phase-5 | ❌ lógica interna |

---

## Resumen ejecutivo por severidad

| Severidad | Cantidad | Descripción general |
|-----------|----------|---------------------|
| **CRÍTICO** | 3 | Nómina completa inoperable (P4.1 bloqueado), CFDI parser faltante, calculadoras fiscales pendientes |
| **ALTO** | 6 | Costo MO módulo completo en mockup, botones XLSX no disponibles en 3 módulos, botón "+" global sin soporte en mayoría de módulos |
| **MEDIO** | 5 | Tablas sin modelo backend, campos sin exponer en UI, filtrado de tabs no implementado |
| **BAJO** | 8 | Preferencias en localStorage, paleta de colores limitada, uso de alert() nativo, textos hardcoded |
| **TOTAL** | **22** | — (era 28 en rev. 1 — 6 hallazgos cerrados) |

---

## Hallazgos críticos a atender antes del próximo cliente demo

1. **F-04** — Reemplazar el `alert()` de CFDI nómina con un mensaje inline no intrusivo (el texto técnico de "Fase 4" no debería ser visible al cliente)
2. **F-06** — El módulo Costo MO muestra texto hardcoded directamente en la UI del cliente; al menos ocultar el módulo o mostrar un placeholder más neutral
3. **F-10** — El botón "+" global en topbar debe estar deshabilitado/oculto en módulos donde no hay acción disponible, en lugar de mostrar alert
4. **F-09** — El botón de descarga XLSX en topbar Nómina muestra un alert de "mockup" aunque el módulo tiene funcionalidad parcial real (botón inline dentro del módulo sí funciona — inconsistente)
5. **F-23** — Migrar al menos los alerts de operaciones exitosas e infomativas a toasts no bloqueantes (el origen del servidor aparece en el título del alert del browser)

---

## Hallazgos cerrados desde rev. 1 (2026-06-12)

| ID (rev.1) | Descripción | Cierre |
|------------|-------------|--------|
| F-01 | `savePermChanges` ejecutaba `alert()` mockup en lugar de llamar al API | Cerrado — ahora llama a `POST /api/admin/permissions/overrides` real |
| F-02 | "+ Agregar usuario" ejecutaba `alert('Mockup...')` | Cerrado — `showNewUserModal()` ahora llama a `POST /api/admin/users` (endpoint existe en `admin.js`) |
| F-12 | Array `PERM_SAMPLE_USERS` hardcoded en el código | Cerrado — eliminado del código; `loadAdminPermisos()` depende 100% de la API |
| F-16 | KPIs de Nómina mostraban `"—"` permanentemente | Cerrado — `GET /api/payroll/resumen?weekId=` implementado; KPIs se actualizan al seleccionar semana |
| F-19 | `<tbody id="cot-tbody">` contenía 9 filas + totales hardcodeados del Excel Q1-2026 (22 KB de datos ficticios en el HTML) | Cerrado — filas eliminadas; tabla se rellena exclusivamente vía `loadCotizaciones()` desde la API |
| F-22 | Botones XLSX de sub-tabs OCP/Inventario/Facturas sin `onclick` conectado a sus endpoints | Cerrado — `btn-dl-ocp`, `btn-dl-inv`, `btn-dl-fact` tienen `onclick` conectado a sus endpoints respectivos |

---

## Módulos que funcionan correctamente (referencia)

| Módulo | Estado |
|--------|--------|
| Dashboard (KPIs + tablas + widgets) | ✅ Implementado |
| Órdenes de Trabajo (CRUD + Liberación + PDF) | ✅ Implementado |
| Cotizaciones (tabla 85 cols + KPIs + import/export XLSX + soft-delete fix) | ✅ Implementado |
| Pronóstico del Costo (rollup + semáforo + XLSX) | ✅ Implementado |
| Costo de Material (tabla + modal + XLSX) | ✅ Implementado |
| Entregas — Proveedores | ✅ Implementado |
| Entregas — OCP (Órdenes de Compra) | ✅ Implementado |
| Entregas — Inventario | ✅ Implementado |
| Entregas — Facturas CFDI (proveedor) | ✅ Implementado |
| Entregas — Entrega de Material | ✅ Implementado |
| Horas de Mano de Obra (tabla + modal) | ✅ Implementado |
| Control de Empleados | ✅ Implementado |
| Flujo de Liberación OT (5 pasos secuenciales + role gating) | ✅ Implementado |
| Administración — Configuración (CRUD system_config) | ✅ Implementado |
| Administración — Bitácora (audit_events + XLSX) | ✅ Implementado |
| Administración — Papelera (soft-delete + restore) | ✅ Implementado |
| Administración — Permisos (overrides por usuario, guardar real) | ✅ Implementado |
| Administración — Agregar / Editar usuarios | ✅ Implementado |
| Notificaciones (híbrido DB + computado) | ✅ Implementado |
| Conciliación de Nómina (checador, semanal, alertas, cierre, justificar/forzar) | ✅ Implementado |

---

*Auditoría rev. 2 — Alenstec Costos · 2026-06-12*
*Cambios desde rev. 1: cerrados F-01, F-02, F-12, F-16, F-19, F-22 (6 hallazgos). Total abiertos: 22 → 28 anterior.*
