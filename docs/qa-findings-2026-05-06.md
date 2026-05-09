# QA findings — pase 2026-05-06

> Bitácora de investigación del pase QA del cliente sobre [docs/checklist-pruebas-usuario.md](checklist-pruebas-usuario.md). Cada entrada queda como **Open** mientras espero info externa, **Diag** cuando ya hay causa raíz, **Fix** cuando se cerró en código.
>
> Cuando un ítem cierre y haya un `G-<MOD>-N` asociado se aplica la regla de [CLAUDE.md](../CLAUDE.md#update-discipline) — sync con [implementation-audit.md](implementation-audit.md) e [implementation-roadmap.md](implementation-roadmap.md).

---

## P0.1 · 6.2 — Crear cotización falla con notNull violation

**Estado:** Open · esperando DevTools del reportador.

**Reporte:** Módulo 6 → `+ Nueva cotización` → llenar todos los campos required → submit → server responde 400 con notNull violation sobre `quoteNumber / client / description / amount`.

**Hipótesis original (en checklist):** el form marca `required` pero el server recibe null.

**Investigación realizada (lectura de código, sin repro):**

| Capa | Archivo · líneas | Hallazgo |
|---|---|---|
| Form HTML | [alenstec_app.html:3942-3985](../alenstec_app.html#L3942-L3985) | `<form id="new-cot-form">` con `<input name="quoteNumber" required>`, `<input name="client" required>`, `<textarea name="description" required>`, `<input name="amount" type="number" required>`. Los 4 nombres coinciden con campos del modelo. |
| Submit handler | [alenstec_app.html:3990-4014](../alenstec_app.html#L3990-L4014) | `new FormData(form)` → `Object.fromEntries([...fd.entries()].map(([k,v])=>[k, v===''?null:v]))` → `payload.amount = Number(payload.amount)` → POST JSON. Patrón **idéntico** a `showNewOTModal` ([2548](../alenstec_app.html#L2548)) y `showNewProveedorModal` ([2647](../alenstec_app.html#L2647)) que sí funcionan. |
| Modal shell | [alenstec_app.html:2413-2421](../alenstec_app.html#L2413-L2421) | `openModal()` setea `innerHTML` y abre overlay. Sin `<form>` anidado, sin `novalidate`. |
| Modal CSS | [alenstec_app.html:201](../alenstec_app.html#L201) | `.modal-card input,.modal-card select,.modal-card textarea{width:100%...}` aplica al markup nuevo. |
| JSON middleware | [backend/src/server.js:60](../backend/src/server.js#L60) | `app.use(express.json({limit:'50mb'}))` activo. |
| Route | [backend/src/routes/quotes.js:282-289](../backend/src/routes/quotes.js#L282-L289) | `router.post('/', verificarRol('admin','ventas'), async (req,res)=>{ const q = await Quote.create(req.body); ... })` — sin transformación previa. |
| Modelo | [backend/src/models/Quote.js:10-18](../backend/src/models/Quote.js#L10-L18) | `quoteNumber/client/description/amount` con `allowNull: false`. Coincide con el origen del error reportado. |

**Por qué no concluyo:** el código frontend y backend lucen correctos en isolation. Hay 3 hipótesis vivas:

1. **JS error global** rompe `addEventListener` antes de que el handler se cablee → submit hace POST default form-encoded → `req.body` queda vacío en server. Soporta la hipótesis del reportador de "un error JS que rompe varios handlers" (probable en 9.2.b–9.5.c también).
2. **Payload llega correcto** pero algún hook/validación adicional lo aplana en server (poco probable, no veo hooks en `Quote.js`).
3. **Stale build cacheado** en navegador (irrelevante a código).

**Acción solicitada al reportador (mensaje anterior):**
- Console: primer error rojo al abrir el módulo y al hacer submit.
- Network → `POST /api/quotes` fallido → **Request Payload** y **Response body**.

**Próximo paso:** decidir según output del Network. Si Request Payload tiene los 4 campos llenos pero el server contesta 400 → el bug es en server. Si Request Payload llega vacío o con los 4 campos null → el bug es en FE (probablemente la hipótesis 1).

**G-<MOD>-N afectado:** ninguno cerrado. Es regresión potencial sobre `G-COT-1` (que se documenta como ✅ en audit).

---

## P0.2 · 7.3 — Botón "Descargar XLSX Pronóstico" no descarga

**Estado:** Open · esperando console + network del reportador.

**Investigación realizada:**

| Capa | Ubicación | Hallazgo |
|---|---|---|
| Botón | [alenstec_app.html:596](../alenstec_app.html#L596) | `<button id="btn-dl-pron" onclick="downloadXlsx(\`${API_URL}/forecasting/export\`, 'pronostico.xlsx')">⬇ Descargar XLSX</button>` — onclick directo al helper. |
| Helper FE | [alenstec_app.html:2365-2388](../alenstec_app.html#L2365-L2388) | `downloadXlsx(url, fallbackName)`: `apiFetch` (Bearer), si !ok → `throw new Error(\`${status}: ${body}\`)` → catch → `alert('No se pudo descargar: ${err.message}')`. Si ok → `blob` → `URL.createObjectURL` → `<a download>` → `click()`. |
| Mount | [backend/src/server.js:84](../backend/src/server.js#L84) | `app.use('/api/forecasting', forecastingRoutes)` — montado correctamente. |
| Route | [backend/src/routes/forecasting.js:239-267](../backend/src/routes/forecasting.js#L239-L267) | `GET /export` llama `fetchRollup` + `sendTableXlsx`. Las 14 columnas referencian keys que `fetchRollup` produce ([line 132-180](../backend/src/routes/forecasting.js#L132-L180)). |
| Helper backend | [backend/src/utils/xlsxTable.js:16-49](../backend/src/utils/xlsxTable.js#L16-L49) | `sendTableXlsx`: stream de ExcelJS con `Content-Type` y `Content-Disposition` correctos. |
| Auth | [backend/src/server.js:73](../backend/src/server.js#L73) | `app.use('/api', verificarJWT, requestContext)` — el endpoint requiere Bearer. `apiFetch` lo agrega; si refresh falla, redirige a login. |

**Por qué no concluyo:** wiring end-to-end correcto. Tres modos posibles de fallo silencioso:

1. **Server 500** durante `fetchRollup` (corrupción de datos / FK rota / config faltante). `downloadXlsx` haría alert "No se pudo descargar: 500: ...". Si el reportador descartó el alert sin leerlo o el alert no se mostró, percibe "no descargó nada".
2. **Browser bloquea `a.click()`** (popup blocker / `Save Picker`). Sin error visible → "no descarga".
3. **Sesión expirada** silente: `apiFetch` recibe 401, intenta refresh, falla, llama `showLogin()`. Si ya estaba logueado el flicker es invisible.

**Acción solicitada al reportador:**
- Console: pega cualquier rojo después de click.
- Network → `GET /api/forecasting/export` → status code + headers + (si 5xx) body de respuesta.
- Si status es 200 y se ve el blob de ExcelJS pero no se descarga → ya es problema de browser/popup blocker (workaround: agregar tooltip + abrir tab nueva).

**G-<MOD>-N afectado:** `G-EXP-1` documenta la vinculación XLSX como ✅ en audit. Si bug se confirma, se reabre.

---

## P0.3 · 9.4.d — CFDI duplicado al subir 2 veces

**Estado:** Diag · hipótesis del reportador descartada · pendiente repro DB para confirmar causa real.

**Reporte original + hipótesis:** "subir mismo XML 2x duplica filas; cambios no persisten al refresh. Sospecha: el botón 'Importar CFDI' llama POST `/` en vez del upsert, o el XML no extrae uuidFiscal."

**Investigación realizada:**

| Capa | Ubicación | Hallazgo |
|---|---|---|
| FE upload | [alenstec_app.html:5069](../alenstec_app.html#L5069) | Llama **`POST /api/invoices/cfdi`** (el path con upsert), **no** `POST /api/invoices/`. Hipótesis #1 del reportador descartada. |
| FE extracción uuid | [alenstec_app.html:4955-4957](../alenstec_app.html#L4955-L4957) | `tfd ? tfd.getAttribute('UUID') : (comprobante.getAttribute('Folio') \|\| 'xxx')`. Para CFDIs timbrados (con TFD) → uuid real estable; para CFDIs sin TFD → fallback al Folio o `'xxx'`. |
| Backend upsert | [backend/src/routes/supplierInvoices.js:94-109](../backend/src/routes/supplierInvoices.js#L94-L109) | `findOrCreate({ where: { uuidFiscal } })`; si existe, hace `inv.update(payload)`. Correcto. |
| Modelo + migración | [backend/src/models/SupplierInvoice.js:8](../backend/src/models/SupplierInvoice.js#L8) · [migration:82](../backend/src/db/migrations/20260423-0002-phase3-new-models.js#L82) | `uuidFiscal: STRING(64) NOT NULL UNIQUE` a nivel modelo y migración. La constraint UNIQUE garantiza que duplicados a nivel DB no son posibles. |
| FE refresh | [alenstec_app.html:5077](../alenstec_app.html#L5077) · [3133](../alenstec_app.html#L3133) | Tras success → `loadInvoices()` reescribe `tbody.innerHTML` desde la API. No queda DOM "fantasma". |
| FE on failure | [alenstec_app.html:5080-5084](../alenstec_app.html#L5080-L5084) | Si POST falla, prepend optimista `nuevaFila`. **Esa fila no se persiste** y muere al siguiente `loadInvoices()` o refresh — esto explica directamente "cambios no persisten al refresh". |

**Hipótesis viva (la que sí cuadra con el reporte):**

El reportador uploadeó **2 XMLs distintos pero similares** (ej. mismo proveedor, distinto folio) que producen distintos `uuidFiscal` → 2 rows reales en DB. Visualmente "se ven iguales" por RFC/total/fecha → reporta como duplicado. **No es un bug** — el upsert funciona, pero la columna UUID en la tabla está renderizada con `font-size:9px` ([3142](../alenstec_app.html#L3142)) y es difícil distinguir UUIDs distintos.

**Hipótesis alterna (poco probable):**

Si el XML tiene `'xxx'` como fallback (sin TFD ni Folio), 2 uploads de XMLs distintos colapsarían a uuidFiscal=`'xxx'` y harían `update` sobre la misma row — eso _no_ duplica, pero confunde porque sobreescribe la primera con datos de la segunda.

**Acción solicitada al reportador:**
1. ¿Los XMLs subidos son **literalmente el mismo archivo** o son distintas facturas del mismo proveedor?
2. Después del segundo upload, query SQL: `SELECT id, uuid_fiscal, folio, fecha_emision, created_at FROM supplier_invoices ORDER BY created_at DESC LIMIT 5;` para ver si hay 2 rows con mismo uuid o 2 rows con uuids distintos.
3. ¿"cambios no persisten al refresh" se refiere a las filas que aparecen en el `catch` (path de fallo) o a algo más?

**Posibles fixes (a aplicar según diagnóstico final):**
- Si es duplicación legítima visualmente confusa → agregar columna "Folio" más prominente y badge "duplicado de proveedor" cuando rfcEmisor + total + fecha coinciden.
- Si el upload está fallando silenciosamente y la fila optimista del catch confunde → quitar el insertBefore del catch y mostrar error claro en su lugar.

**G-<MOD>-N afectado:** ninguno cerrado se reabre directo, pero `G-FACT-2` (CFDI persistencia idempotente) podría requerir UI hint.

---

## P0.4 · 9.2.b/9.2.c/9.3.b/9.4.b/9.5.b/9.5.c — Bundle Entregas "no funciona"

**Estado:** Bloqueado · esperando console output (instrucción explícita del plan QA).

Handlers existen y están cableados correctamente:

| Ítem | Handler | Línea |
|---|---|---|
| 9.2.b/9.2.c | `showNewOCPModal` | [alenstec_app.html:2905+](../alenstec_app.html#L2905) |
| 9.3.b | `showNewInventoryModal` | (modulo Entregas) |
| 9.4.b | `showNewInvoiceModal` | (modulo Entregas) |
| 9.5.b/9.5.c | `showNewDeliveryModal` / `showNewIncidentModal` | (modulo Entregas) |

Hipótesis fuerte (del reportador): un único error JS en orden temprano del archivo está rompiendo `addEventListener` de varios botones a la vez.

**Pendiente:** primer error rojo de Console al abrir la app + click en cualquiera de los botones afectados.

---

## P0.5 · 12.3/12.11 — Conciliación Importar a BD / Cierre semana

**Estado:** Diag (probablemente UX, no bug) · pendiente confirmación del reportador.

### 12.3 · "Importar a BD" no responde

| Capa | Ubicación | Hallazgo |
|---|---|---|
| Botón | [alenstec_app.html:checador-import-btn](../alenstec_app.html) (search en módulo conciliación) | Existe, **arranca disabled**. |
| Habilitación | [alenstec_app.html:4534-4543](../alenstec_app.html#L4534-L4543) | `handleChecadorFileSelected`: solo habilita botón después de seleccionar archivo. |
| Handler | [alenstec_app.html:4590-4610](../alenstec_app.html#L4590-L4610) | `importarChecador()` requiere `conciliacionState.previewData` previo (sale con alert "Primero realiza la previsualización" si no hay). Llama POST `/conciliacion/checador/importar`. |
| Endpoint backend | [backend/src/routes/conciliacionRoutes.js:93](../backend/src/routes/conciliacionRoutes.js#L93) | Existe, espera `temp_file` + `semana_id`. |
| Wiring | [alenstec_app.html:4528](../alenstec_app.html#L4528) | `addEventListener('click', importarChecador)` correcto. |

**Hipótesis:** el reportador no hizo "Previsualizar" antes de "Importar a BD" → el alert "Primero realiza la previsualización" se muestra y se interpreta como "no hace nada".

### 12.11 · Falta botón "Cierre de semana + XLSX"

| Botón | Ubicación |
|---|---|
| Cerrar Semana | [alenstec_app.html:959](../alenstec_app.html#L959) — `<button id="cierre-btn">Cerrar Semana</button>` |
| Exportar Excel | [alenstec_app.html:960](../alenstec_app.html#L960) — `<button id="export-btn">Exportar Excel</button>` |

**Hipótesis:** los 2 botones existen pero **separados**. El reportador esperaba 1 botón combinado "Cierre de semana + XLSX". Es etiqueta/UX, no bug funcional.

**Acción solicitada al reportador:**
1. Para 12.3: ¿qué pasa exactamente al hacer click en "Importar a BD"? ¿hay alert? ¿el botón está deshabilitado (gris)?
2. Para 12.11: ¿necesitas un botón único "Cerrar + descargar" o separados está bien con etiquetas más claras?

---

---

## P3 · doc-only — checklist refinements

**Estado:** Fix aplicado · cerrado.

Cambios en [docs/checklist-pruebas-usuario.md](checklist-pruebas-usuario.md):

| Ítem | Antes | Ahora |
|---|---|---|
| **1.d** Navegadores | "Navegador moderno (Chrome/Edge/Firefox actualizado)" — vago. | Versión mínima específica: **Chrome ≥ 120, Edge ≥ 120, Firefox ≥ 120**. Safari excluido del scope salvo pedido cliente. Comando para verificar versión incluido. |
| **2.6** Acceso denegado | Solo describía error server-side. | Ahora valida **dos capas**: (a) FE — botón disabled + tooltip _"Tu rol no permite…"_ por el helper P1.3; (b) Backend — error 403 si se fuerza el click vía DevTools. Útil para regresión del helper `canActAs`. |
| **3.4** Responsive | "Reducir el ancho del navegador" — ambiguo, intrusivo. | Instrucciones explícitas con DevTools: F12 → device toolbar (`Ctrl+Shift+M`) → viewport `700×900`. Aclaración de cuándo NO es bug (tablas con `min-width:2400px` por diseño desktop). |
| **7.4** Umbral pronóstico | Decía "Administración → Configuración" — esa pestaña ya no existe en FE (removida 2026-05). | Reescrito para usar `curl PUT /api/admin/config/:key` con el access token de `localStorage`. Incluye verificación cruzada en Bitácora (`config_change` event). |

**Nota colateral importante (relacionada con la pestaña Configuración removida):** el endpoint backend `PUT /api/admin/config/:key` sigue activo y los cambios siguen propagándose vía `configService`. Solo se removió la UI. Si el cliente termina pidiendo de vuelta el editor JSON visual, la regresión es ~30 minutos (rehabilitar el sub-tab que existía pre-2026-05).

---

## P2.2 · 6.4 — Subir XLSX más visible

**Estado:** Fix aplicado (parte 6.4) · 9.2.c queda abierto.

**Hallazgo sobre la cita "9.2.c":** en el [checklist actual](checklist-pruebas-usuario.md#L481), el ítem `9.2.c` es **"Descargar XLSX OCP"** (descarga, no subida). No existe un botón Subir XLSX en sub-tab 9.2 (OCP). Asumo que la referencia es errónea o se refiere a algo distinto — pendiente confirmación.

**Fix aplicado (6.4 — Cotizaciones):**
- [alenstec_app.html:550](../alenstec_app.html#L550): `class="btn sm"` → `class="btn p sm"` (primario verde) y `title="Sube el master 'Control Ventas 2026' — el server hace upsert por COT Alenstec (quoteNumber)"` agregado.
- Ahora el botón compite visualmente con `+ Nueva cotización` en lugar de pasar desapercibido como un control terciario.

**Acción pendiente:** confirmar si la referencia a "9.2.c" fue typo, o si querías que también el OCP tenga un botón Subir XLSX (sería feature nueva, no "hacer más visible").

---

## P2.1 · 1.e — Grid editable estilo MS Lists para Cotizaciones (scope proposal)

**Estado:** Open · esperando aprobación de scope antes de implementar.

**Petición del cliente:** que la tabla de Cotizaciones/Ventas se comporte como MS Lists / Excel — clic en celda y editar inline, sin abrir modal.

**Estado actual:**
- Tabla read-only de 20 columnas en [alenstec_app.html:3878-3911](../alenstec_app.html#L3878-L3911).
- CRUD por modal: `+ Nueva cotización` ([3946](../alenstec_app.html#L3946)) y reupload XLSX ([3017](../alenstec_app.html#L3017)).
- Round-trip XLSX import/export ya cubre el caso "ediciones masivas en Excel".

**Tres opciones de scope, costos estimados:**

### Opción A — _Inline edit minimalista_ (~1.5 días)

- Doble-click en celda → input nativo en el lugar; Enter persiste, Esc cancela.
- Solo las columnas escalares (no proyecto/celda/fecha/dropdowns).
- PUT `/api/quotes/:id` con el campo modificado.
- Indicador de "guardando…" → "✓".

**Pros:** entrega rápida, mínimo cambio en el HTML, no rompe funcionalidad existente.
**Contras:** no es "MS Lists" — sigue siendo una tabla simple con celdas editables. No bulk edit, no undo.

### Opción B — _MS Lists-like real_ (~5–7 días)

- Selección de celdas con click + arrastre, copy-paste con Ctrl+C/V.
- Edición tipo Excel: doble-click → input, Enter avanza fila, Tab avanza columna.
- Bulk edit (cambiar varias celdas a la vez).
- Undo/redo (Ctrl+Z) con stack local.
- Validación inline (rojo en celda inválida + tooltip).
- Lock de filas que el server pone (status=Aprobada → solo admin edita).

**Pros:** experiencia de MS Lists genuina, productividad alta para data entry.
**Contras:** complejidad alta. Implica reescribir el render de la tabla (probablemente integrar una lib tipo [Handsontable](https://handsontable.com/) free CE o [tabulator.js](https://tabulator.info/)). Riesgo de regresar bugs en otras tablas si se generaliza la lib.

### Opción C — _Status quo + atajos_ (~0.5 día)

- Editar = doble-click en fila → abre el modal pre-llenado con los valores actuales.
- Botón "Editar" en cada fila (en vez de inline).
- Round-trip XLSX para edición masiva, ya existe.

**Pros:** más cercano a la convención del resto del sistema; mantiene validación server-side fuerte.
**Contras:** no resuelve la petición del cliente _per se_; cliente probablemente lo rechace si esperaba "MS Lists".

**Recomendación:**

Opción **A** como primer paso — entrega valor rápido y deja la puerta abierta a B si el cliente lo pide después. Opción B requiere conversación previa para presupuestar y validar la elección de librería (introduce dependencia frontend, lo cual rompe ADR de SPA "no framework" en [designs/00-architecture-decisions.md](../designs/00-architecture-decisions.md)). Confirmá scope antes de tocar código.

---

## P1.5 · 12.5–12.9 — Conciliación sin datos visibles (precondición faltante)

**Estado:** Diag confirmado · cerrado por update al checklist.

**Hallazgo:** El reportador asumió que `npm run seed` carga datos suficientes para ver tablas en 12.4–12.10. **No es así.**

| Componente | ¿Qué siembra? |
|---|---|
| `seedDatabase()` ([backend/src/seed/index.js](../backend/src/seed/index.js)) | OTs, cotizaciones, OCP, inventario, facturas, empleados |
| `seedConciliacionDemo()` ([backend/src/seed/conciliacion-demo.js:38-101](../backend/src/seed/conciliacion-demo.js#L38-L101)) | empleados (upsert) + **1 fila** en `semanas_nomina` (`Semana 16 · 13-17 Abr 2026`). **Ninguna fila de checador ni horas_clasificadas.** |

El comentario explícito en el seed lo dice: _"3. Upload backend/fixtures/checador-sample.csv in sub-tab 9.1"_ ([conciliacion-demo.js:110](../backend/src/seed/conciliacion-demo.js#L110)). Es decir, el flujo correcto **siempre** ha requerido la importación manual del CSV. La fixture vive en [backend/fixtures/checador-sample.csv](../backend/fixtures/checador-sample.csv).

**Endpoints FE — verificados sanos:**
- `GET /api/conciliacion/semanas` → llena el selector de semana.
- `GET /api/conciliacion/:semana_id` → resumen semanal con empleados.
- `GET /api/conciliacion/:semana_id/:empleado_id` → detalle por empleado (modal "Ver detalle").
- Todos cableados en [alenstec_app.html:4396-4480](../alenstec_app.html#L4396-L4480) y consumidos por `loadConciliacionSemana()`.

**Fix aplicado:**
- [docs/checklist-pruebas-usuario.md:659](checklist-pruebas-usuario.md#L659) ahora tiene un block ⚠ visible al inicio de 12.4 explicando la precondición:
  > **Precondición obligatoria para 12.4–12.10:** completar **12.2 + 12.3** primero. El `npm run seed` carga empleados + 1 semana vacía pero **NO importa el checador automáticamente** — la tabla aparecerá en blanco hasta que subas el CSV (`backend/fixtures/checador-sample.csv`) e importes a BD.

**Mejora opcional NO aplicada (lo dejo para discutir):**
Auto-importar el CSV durante `npm run seed` para ahorrar 2 clicks al QA. Costo: agregar parser CSV al seed (no usa el endpoint, accede directo a la DB) → ~50-80 líneas en `conciliacion-demo.js`. Beneficio: menor fricción onboarding QA. Riesgo: el auto-import oculta el flujo manual que el cliente probablemente quiere ver.

---

## P1.4 · 10.4 — Botón "+ Nuevo empleado" visibilidad por rol

**Estado:** Verificado · cerrado por el fix de 5.8/6.5.

- Botón vive en [alenstec_app.html:795](../alenstec_app.html#L795), sub-tab Control de Empleados del módulo Horas (`#sub-horas-empleados`).
- Tras P1.3 quedó marcado con `data-perm-required="employee.create"` (admin + rh).
- Comportamiento esperado: visible enabled para admin/rh, visible disabled (opacity .45 + tooltip "Tu rol no permite…") para los otros 4 roles.

**Sin código adicional** — el helper `applyRolePermissions()` lo cubre automáticamente.

---

## P1.3 · 5.8/6.5 — Helper `canActAs` + visibilidad por rol

**Estado:** Fix aplicado · cerrado para los 11 botones "+ Nuevo X" identificados.

**Cambios aplicados ([alenstec_app.html](../alenstec_app.html)):**

1. Tabla `PERMS` (línea ~1490) que mirroreza los `verificarRol(...)` del backend:

   | Permiso clave | Roles permitidos | Endpoint backend |
   |---|---|---|
   | `ot.create` | admin, ventas, jefe_area | `POST /work-orders` |
   | `ot.delete` | admin | `DELETE /work-orders/:id` |
   | `quote.create` | admin, ventas | `POST /quotes` |
   | `supplier.create` | admin, compras | `POST /suppliers` |
   | `material.create` | admin, compras, jefe_area | `POST /costs/material` |
   | `labor.create` | admin, rh, jefe_area, supervisor | `POST /costs/labor` |
   | `employee.create` | admin, rh | `POST /employees` |
   | `purchaseorder.create` | admin, compras, jefe_area | `POST /purchase-orders` |
   | `inventory.create` | admin, compras, jefe_area | `POST /inventory` |
   | `invoice.create` | admin, compras, jefe_area | `POST /invoices` |
   | `delivery.create` | admin, compras, jefe_area | `POST /deliveries` |
   | `incident.create` | admin, compras, jefe_area, supervisor | `POST /deliveries/incidents` |
   | `payroll.create` | admin, rh | `POST /payroll/weeks` |
   | `conciliacion.cerrar` | rh, admin | `POST /conciliacion/:id/cerrar` |

2. **Helpers nuevos:**
   - `canActAs(...roles)` — chequea si `AUTH.user().rol` está en la lista (acepta varargs o array).
   - `canPerm(perm)` — atajo basado en la tabla `PERMS`.
   - `applyRolePermissions()` — recorre todos los `[data-perm-required]`, los disable + opacity .45 + tooltip "Tu rol no permite esta acción (requiere: …)" cuando el usuario no califica. Restaura el estado original cuando sí califica (preservando el `title` previo en `data-perm-original-title`).

3. `applyRolePermissions()` se llama desde `renderUserChip()` para que se ejecute en cada login/refresh de sesión.

4. **Botones marcados con `data-perm-required` (11 en total):**

   | Botón | Línea | Permiso |
   |---|---|---|
   | `+ Nueva OT` | [413](../alenstec_app.html#L413) | `ot.create` |
   | `+ Nueva cotización` | [552](../alenstec_app.html#L552) | `quote.create` |
   | `+ Registrar material` | [616](../alenstec_app.html#L616) | `material.create` |
   | `+ Agregar proveedor` | [642](../alenstec_app.html#L642) | `supplier.create` |
   | `+ Capturar OCP` | [665](../alenstec_app.html#L665) | `purchaseorder.create` |
   | `+ Agregar existencia` | [688](../alenstec_app.html#L688) | `inventory.create` |
   | `+ Agregar factura` | [711](../alenstec_app.html#L711) | `invoice.create` |
   | `+ Ingresar incidencia` (×2) | [742](../alenstec_app.html#L742) · [759](../alenstec_app.html#L759) | `incident.create` |
   | `+ Registrar entrega` | [743](../alenstec_app.html#L743) | `delivery.create` |
   | `+ Nuevo empleado` | [795](../alenstec_app.html#L795) | `employee.create` |
   | `+ Nueva semana` | [981](../alenstec_app.html#L981) | `payroll.create` |

**Decisión de diseño:** opté por **disable+tooltip** en vez de **hide** — el reportador en 5.8/6.5 pidió tooltip explícito ("Tu rol no permite…"). Hide pierde visibilidad para QA. Si querés esconder en un rol específico, agregamos un `data-perm-mode="hide"` en una iteración posterior.

**Nota sobre seguridad:** esto es UX cosmético, **no** un boundary. El backend sigue siendo source of truth con `verificarRol`. Si alguien edita el HTML con DevTools, el server lo va a 403.

---

## P1.2 · 5.3 — Feedback "✓ Guardado" (ya existía, lo hago más visible)

**Estado:** Fix aplicado · cerrado.

**Hallazgo:** el feedback ya estaba implementado en [alenstec_app.html:2538-2539](../alenstec_app.html#L2538-L2539) — el botón cambia a `✓ Guardado` por 1.5 s. Probable que el reportador no lo notó: la ventana era muy corta y el botón sólo cambiaba de texto, sin color.

**Cambios aplicados:**
- Duración subida 1.5 s → 2 s.
- Botón se pinta verde mientras dura el feedback (clase `.btn.p` agregada y removida) — visible incluso de reojo.

---

## P1.1 · 5.2 — OT pattern OT-AL-#### (no era bug)

**Estado:** Fix aplicado · cerrado.

Cambios:
- [alenstec_app.html:2553](../alenstec_app.html#L2553): el input `<input name="otNumber" required>` ahora tiene `pattern="OT-AL-\d{4}"` y `title="Formato esperado: OT-AL-#### (ej. OT-AL-0042). Solo se permiten 4 dígitos al final."`. Browser bloquea submit con tooltip claro si el formato no coincide — antes solo fallaba en el server con mensaje genérico.
- [docs/checklist-pruebas-usuario.md](checklist-pruebas-usuario.md): caso 5.2 reemplazado `OT-TEST-001` por `OT-AL-9001` (el rango ≥ 9000 evita colisión con la data sembrada 1936-1948), agregada nota explicando el formato como decisión intencional, y un caso negativo opcional para validar el pattern bloquea correctamente.

---

# Próximos pasos (orden propuesto)

1. **Esperar al reportador** para los 5 P0 (un dump de Console + Network y unas respuestas en este doc resuelven todo).
2. Mientras tanto, avanzar con los P1 que **no requieren input externo**:
   - 5.2 (OT pattern) — solo HTML + checklist update.
   - 5.3 (feedback ✓ Guardado) — solo FE.
   - 5.8/6.5 (`canActAs` helper) — solo FE.
   - 10.4 (verificar visibilidad +Nuevo empleado por rol).
3. P3 doc-only — actualizables sin código.
4. P2 abrir scope con el cliente antes de implementar.

---

> P1, P2, P3 se anexan abajo conforme avance.
