# Checklist de Pruebas Manuales — Alenstec

> **Audiencia:** QA / usuario final / cliente. Documento caminable, paso a paso, en lenguaje llano.
>
> **Qué NO es:** no es la referencia de desarrolladores — eso vive en [`regression-requirements.md`](./regression-requirements.md) con IDs `AC-<MODULE>-NN` para automatización.
>
> **Cómo usar:** marca cada escenario como `[x] Pasa`, `[!] Falla`, o anota observaciones en la columna "Notas". Reporta fallos al equipo técnico con: número del escenario + pasos + qué ves vs qué esperabas + captura si aplica.
>
> **Última actualización:** 2026-04-23 · corresponde al estado post-Phase 5b (panel de administración + migración de valores a `system_config`).

## Tabla de contenido

1. [Preparación del entorno](#1-preparación-del-entorno)
2. [Autenticación y roles](#2-autenticación-y-roles)
3. [Navegación global](#3-navegación-global)
4. [Módulo 1 · Dashboard](#4-módulo-1--dashboard)
5. [Módulo 2 · Orden de Trabajo](#5-módulo-2--orden-de-trabajo)
6. [Módulo 3 · Cotizaciones y Ventas](#6-módulo-3--cotizaciones-y-ventas)
7. [Módulo 4 · Pronóstico del Costo](#7-módulo-4--pronóstico-del-costo)
8. [Módulo 5 · Costo de Material](#8-módulo-5--costo-de-material)
9. [Módulo 6 · Entregas de Material](#9-módulo-6--entregas-de-material)
10. [Módulo 7 · Horas de Mano de Obra](#10-módulo-7--horas-de-mano-de-obra)
11. [Módulo 8 · Nómina / CFDI](#11-módulo-8--nómina--cfdi) *(pendiente Fase 4)*
12. [Módulo 9 · Conciliación](#12-módulo-9--conciliación)
13. [Módulo 10 · Costo de Mano de Obra](#13-módulo-10--costo-de-mano-de-obra) *(pendiente Fase 5)*
14. [Módulo 11 · Administración](#14-módulo-11--administración)
15. [Flujos transversales](#15-flujos-transversales)
16. [Hoja de firmas](#16-hoja-de-firmas)

---

## 1. Preparación del entorno

Antes de empezar:

- [ ] **URL del sistema** disponible (ej: `http://alenstec-costos.local:3000` o `http://localhost:3000`)
- [ ] **Usuarios semilla** creados (los 6 por defecto):

| Rol           | Email                          | Contraseña                |
|---------------|--------------------------------|---------------------------|
| admin         | admin@alenstec.mx              | alenstec_dev_2026_1       |
| jefe_area     | jefe.area@alenstec.mx          | alenstec_dev_2026_1       |
| rh            | rh@alenstec.mx                 | alenstec_dev_2026_1       |
| supervisor    | supervisor@alenstec.mx         | alenstec_dev_2026_1       |
| ventas        | ventas@alenstec.mx             | alenstec_dev_2026_1       |
| compras       | compras@alenstec.mx            | alenstec_dev_2026_1       |

> En producción la contraseña vendrá de la variable `SEED_DEFAULT_PASSWORD`; el cliente debe cambiarla en el primer login.

- [ ] **Datos semilla** cargados (6 OTs, 4 cotizaciones, 3 proveedores, 18 empleados, 6 OCPs, 7 items de inventario, 5 CFDIs, 8 entregas, 2 incidencias)
- [ ] **Navegador moderno** (Chrome / Edge / Firefox actualizado)
- [ ] **Hoja del Excel de control de ventas** disponible para la prueba de importación (opcional)

---

## 2. Autenticación y roles

### 2.1 Login exitoso

**Rol:** cualquiera · **Precondición:** sesión cerrada

1. Abrir la URL del sistema
2. Debe aparecer el overlay de login (fondo oscurecido, tarjeta central)
3. Ingresar email y contraseña del rol **admin**
4. Clic en "Iniciar sesión"

**Esperado:** el overlay desaparece; en la barra lateral inferior aparece nombre del usuario, iniciales "A" (avatar) y el rol "admin".

- [ ] Pasa · Notas: ________________________________________

### 2.2 Login fallido — credenciales incorrectas

**Rol:** n/a · **Precondición:** sesión cerrada

1. Ingresar `admin@alenstec.mx` + contraseña `incorrecta`
2. Clic en "Iniciar sesión"

**Esperado:** mensaje de error "Credenciales inválidas" visible en la tarjeta de login. No redirige.

- [ ] Pasa · Notas: ________________________________________

### 2.3 Login fallido — email inexistente

1. Ingresar `noexiste@alenstec.mx` + cualquier contraseña
2. Clic en "Iniciar sesión"

**Esperado:** mismo mensaje "Credenciales inválidas" (no debe decir explícitamente que el email no existe — es protección contra enumeración).

- [ ] Pasa · Notas: ________________________________________

### 2.4 Sesión persistente (refresh del navegador)

**Precondición:** login exitoso

1. Una vez dentro, presionar F5 (recargar página)

**Esperado:** NO vuelve al login; se mantiene la sesión y el dashboard se recarga.

- [ ] Pasa · Notas: ________________________________________

### 2.5 Logout

1. En la barra lateral inferior, clic en "salir"

**Esperado:** aparece el overlay de login; la URL sigue siendo la misma pero el contenido está oculto.

- [ ] Pasa · Notas: ________________________________________

### 2.6 Acceso denegado por rol (escritura sin permiso)

**Rol:** `supervisor`

1. Login como supervisor
2. Ir al módulo "Costo de Material"
3. Clic en "+ Registrar material", llenar el formulario
4. Clic en "Registrar"

**Esperado:** error "Acceso denegado. Roles permitidos: admin, compras, jefe_area" (o similar). El registro NO se crea.

- [ ] Pasa · Notas: ________________________________________

---

## 3. Navegación global

### 3.1 Sidebar muestra todos los módulos

**Rol:** admin

1. Verificar que aparecen en orden: Dashboard, Orden de Trabajo, Cotizaciones, Pronóstico, Costo de Material, Entregas, Horas, Nómina, Conciliación, Costo de Mano de Obra, **Administración**.

**Esperado:** 11 items visibles para rol admin.

- [ ] Pasa · Notas: ________________________________________

### 3.2 Sidebar oculta "Administración" para no-admins

**Rol:** cualquiera que no sea admin (ej. ventas)

1. Login como ventas

**Esperado:** en el sidebar aparecen los 10 módulos regulares — "Administración" NO es visible.

- [ ] Pasa · Notas: ________________________________________

### 3.3 Cambio entre módulos

1. Clic en cada módulo del sidebar
2. Verificar que el título en la parte superior cambia con el nombre del módulo
3. Verificar que sólo uno está resaltado a la vez

- [ ] Pasa · Notas: ________________________________________

### 3.4 Responsive (ventana angosta)

1. Reducir el ancho del navegador a ~700 px

**Esperado:** el sidebar colapsa a solo iconos (se oculta el texto). Grids de KPI se reorganizan.

- [ ] Pasa · Notas: ________________________________________

---

## 4. Módulo 1 · Dashboard

### 4.1 4 KPIs muestran números reales

**Rol:** admin

1. Abrir Dashboard

**Esperado:** las 4 tarjetas KPI (Órdenes activas, Cotizaciones pendientes, Material en tránsito, Cotizado total) muestran números, no guiones ni "—".

- [ ] Pasa · Notas: ________________________________________

### 4.2 Tabla de "Últimas OT" tiene filas

**Esperado:** la tabla muestra 6 OTs (OT-AL-1936 hasta OT-AL-1948) con columnas cliente, descripción, estado, avance.

- [ ] Pasa · Notas: ________________________________________

### 4.3 Barras de "Costo por OT"

**Esperado:** gráfico de barras horizontal con al menos 4 barras, la más alta primero (ordenadas por costo cotizado descendente).

- [ ] Pasa · Notas: ________________________________________

### 4.4 Timeline "Proveedores recientes"

**Esperado:** lista con 3 proveedores semilla (Ecosy, Misumi, CORTELASER) con categorías y OTs asociadas.

- [ ] Pasa · Notas: ________________________________________

### 4.5 Widget "OCs Abiertas"

**Esperado:** lista de OCPs con estado Pendiente o Parcial, con indicador de color (rojo/ámbar/verde según fecha de entrega comprometida).

- [ ] Pasa · Notas: ________________________________________

### 4.6 Widget "Empleados en Campo"

**Esperado:** lista de empleados con iniciales + puesto/departamento/ID.

- [ ] Pasa · Notas: ________________________________________

---

## 5. Módulo 2 · Orden de Trabajo

### 5.1 Selector de OT

**Rol:** admin

1. Abrir módulo "Orden de Trabajo"
2. Desplegar el combo "OT" en la barra superior
3. Elegir una OT distinta

**Esperado:** el banner, descripción y todos los campos del formulario se actualizan al seleccionar la OT.

- [ ] Pasa · Notas: ________________________________________

### 5.2 Crear nueva OT

1. En la barra superior, clic en "+ Nueva OT"
2. Llenar: No. OT = `OT-TEST-001`, Cliente = `Cliente Prueba`, Descripción = `Escenario 5.2`, Tipo = `Servicio`, Costo cotizado = `5000`
3. Clic en "Crear OT"

**Esperado:** el modal cierra, el selector de OT ahora incluye OT-TEST-001 y está seleccionada.

- [ ] Pasa · Notas: ________________________________________

### 5.3 Editar Datos Generales y guardar

1. En la OT recién creada (o cualquier otra), editar "Área Requisitora" = `Producción`
2. Editar "Requisitor" = `Juan Pérez`, E-mail = `juan.perez@adient.mx`
3. Clic en "💾 Guardar cambios"

**Esperado:** el botón cambia a "✓ Guardado" por ~1.5 s. Al recargar el módulo los datos persisten.

- [ ] Pasa · Notas: ________________________________________

### 5.4 Jefaturas pre-rellenadas automáticamente en OT nueva

**Precondición:** escenario 5.2 (OT recién creada) · [`ot.jefaturas_default`](./implementation-audit.md) tiene valores.

1. Seleccionar la OT-TEST-001
2. Revisar las 4 casillas en "Liberado a (Jefaturas)"

**Esperado:** precargados con los nombres configurados por defecto (Cristian Durán, Jesús Lara, Jessica Fuentes, N/A) sin que el operador los haya escrito.

- [ ] Pasa · Notas: ________________________________________

### 5.5 Flujo de Liberación — aprobar paso Cotización

**Rol:** ventas (o admin/jefe_area)

1. Login como ventas
2. Seleccionar cualquier OT
3. En "Flujo de Liberación" buscar la fila "Cotización"
4. Clic en "Aprobar"
5. Escribir comentario opcional y aceptar

**Esperado:** la fila cambia a badge verde "aprobada" con fecha/hora y nombre del usuario.

- [ ] Pasa · Notas: ________________________________________

### 5.6 Flujo de Liberación — secuencialidad

1. Con la OT anterior (solo "cotizacion" aprobada), intentar aprobar "produccion" (saltándose "compras")

**Esperado:** error `Paso previo "compras" aún no está aprobado`.

- [ ] Pasa · Notas: ________________________________________

### 5.7 Flujo de Liberación — liberación final cambia OT a Liberada

**Rol:** admin o jefe_area

1. Aprobar los 5 pasos en orden (cotizacion → compras → produccion → calidad → liberacion_final)

**Esperado:** al aprobar el último, el estado general de la OT cambia de "En ejecución" a "Liberada".

- [ ] Pasa · Notas: ________________________________________

### 5.8 Rol no autorizado para un paso

**Rol:** compras

1. Intentar aprobar el paso "calidad" (default roles = admin, jefe_area)

**Esperado:** error `Rol compras no puede decidir el paso calidad. Roles permitidos: admin, jefe_area`.

- [ ] Pasa · Notas: ________________________________________

### 5.9 Exportar PDF de OT

1. Seleccionar una OT
2. Clic en "Generar PDF" (o botón similar)

**Esperado:** descarga un archivo `OT-<numero>.pdf` con el formato de la OT.

- [ ] Pasa · Notas: ________________________________________

---

## 6. Módulo 3 · Cotizaciones y Ventas

### 6.1 Tabla Control de Ventas carga

**Rol:** admin

1. Abrir "Cotizaciones y Ventas"

**Esperado:** las 4 KPIs en la parte superior tienen valores; la tabla lista las cotizaciones con columnas Item, Cliente, COT Ref., COT Alenstec, Fecha, Costo USD, OC Cliente, T/C, OT, Tipo, Estado.

- [ ] Pasa · Notas: ________________________________________

### 6.2 Crear nueva cotización

1. Clic en "+ Nueva cotización"
2. Llenar: COT Alenstec = `TEST-001`, Cliente = `Cliente Prueba`, Descripción = `Test`, Costo = `10000`, Tipo = `Nuevo`

**Esperado:** aparece la nueva fila al tope de la tabla.

- [ ] Pasa · Notas: ________________________________________

### 6.3 Descargar XLSX de Control de Ventas

1. Clic en "⬇ Descargar XLSX" (en la cabecera de la tarjeta)

**Esperado:** se descarga `control-ventas-YYYY-MM-DD.xlsx` con 20 columnas en el formato del cliente (CLIENTE · PROYECTO / PROGRAMA · CELDA · RFQ · MECR · COT REF. ALENSTEC · ... · DESCRIPCION DE PROYECTO · TIPO · ESTADO).

- [ ] Pasa · Notas: ________________________________________

### 6.4 Subir XLSX del cliente

**Precondición:** tener el Excel master "20260317 VENTAS TOTALES CON RESUMEN POR ORDEN DE COMPRA.xlsx" o un archivo equivalente.

1. Clic en "⬆ Subir XLSX"
2. Seleccionar el archivo

**Esperado:** alerta con `Importación completa. Creadas: X · Actualizadas: Y · Omitidas: Z`. La tabla se recarga con las filas importadas.

- [ ] Pasa · Notas: ________________________________________

### 6.5 Rol ventas puede crear; rol compras no

1. Login como compras
2. Intentar "+ Nueva cotización"

**Esperado:** el botón puede estar visible pero al enviar devuelve `Acceso denegado. Roles permitidos: admin, ventas`.

- [ ] Pasa · Notas: ________________________________________

---

## 7. Módulo 4 · Pronóstico del Costo

### 7.1 4 KPIs agregados

**Rol:** admin

1. Abrir "Pronóstico del Costo"

**Esperado:** las 4 tarjetas muestran: Cotizado total (USD), Real acumulado (USD), Varianza promedio (%), OTs en alerta.

- [ ] Pasa · Notas: ________________________________________

### 7.2 Tabla con semáforos

**Esperado:** cada OT tiene una columna "Semáforo" con badge coloreado: verde `OK` / ámbar `Atención` / rojo `Crítico` / azul `En ejecución` / neutro `Sin iniciar`. El color de fondo de la fila también cambia.

- [ ] Pasa · Notas: ________________________________________

### 7.3 Descargar XLSX

1. Clic en "⬇ Descargar XLSX"

**Esperado:** descarga `pronostico-YYYY-MM-DD.xlsx` con 14 columnas incluyendo Varianza % y Semáforo.

- [ ] Pasa · Notas: ________________________________________

### 7.4 Cambio de umbral afecta el semáforo en caliente *(requiere admin)*

1. Login como admin
2. Ir a "Administración" → "Configuración"
3. Editar clave `forecasting.semaforo.ok_max`, cambiar su valor de `0.7` a `0.05`, guardar
4. Volver a "Pronóstico del Costo" y esperar ~30 s o refrescar

**Esperado:** OTs que antes estaban en `OK` (verde) ahora muestran `Atención` (ámbar), incluso las que apenas tienen costos.

5. Restaurar el valor a `0.7`

**Esperado:** los semáforos vuelven a la clasificación original.

- [ ] Pasa · Notas: ________________________________________

---

## 8. Módulo 5 · Costo de Material

### 8.1 Tabla de Requisición de Material

**Rol:** admin

1. Abrir "Costo de Material"

**Esperado:** tabla con 11 columnas (Proveedor · Moneda · Descripción · OT · Pzas · P. Unit · Subtotal · IVA · Retención · Total · Estado).

- [ ] Pasa · Notas: ________________________________________

### 8.2 Registrar material nuevo

**Rol:** admin o compras

1. Clic en "+ Registrar material"
2. Llenar: OT existente, Proveedor = `Prueba`, Descripción = `Test`, Cantidad = `2`, Precio unitario = `50`
3. Verificar que Subtotal y Total se autocalculan (100 y 100 respectivamente si IVA=0)
4. Clic en "Registrar"

**Esperado:** nueva fila aparece al tope de la tabla.

- [ ] Pasa · Notas: ________________________________________

### 8.3 Descargar XLSX de material

1. Clic en "⬇ Descargar XLSX"

**Esperado:** descarga `costo-material-YYYY-MM-DD.xlsx` con las columnas IVA/retención/subtotal/total separadas.

- [ ] Pasa · Notas: ________________________________________

---

## 9. Módulo 6 · Entregas de Material

Este módulo tiene 5 pestañas. Verifica cada una.

### 9.1 Sub-pestaña 6.1 · Proveedores

1. Abrir "Entregas" (abre en 6.1 por defecto)

**Esperado:** tabla con 3 proveedores, columna "Saldo pendiente" visible.

- [ ] Pasa · Notas: ________________________________________

#### 9.1.b · Agregar proveedor

**Rol:** admin o compras

1. Clic en "+ Agregar proveedor"
2. Llenar nombre, categorías (separadas por coma), marcar 1-2 OTs

**Esperado:** nueva fila en la tabla.

- [ ] Pasa · Notas: ________________________________________

### 9.2 Sub-pestaña 6.2 · OCP (Órdenes de Compra a Proveedores)

1. Clic en la pestaña "Órdenes de Compra"

**Esperado:** tabla con las 6 OCPs semilla (OCA-2026-001 a 006) con badges de estado.

- [ ] Pasa · Notas: ________________________________________

#### 9.2.b · Capturar OCP

**Rol:** admin, compras o jefe_area

1. Clic en "+ Capturar OCP"
2. Llenar No. OC, Proveedor (del datalist), OT asociada, Descripción, Monto, Moneda, Estado

**Esperado:** nueva OCP en la tabla.

- [ ] Pasa · Notas: ________________________________________

#### 9.2.c · Descargar XLSX OCP

**Esperado:** descarga `ocp-YYYY-MM-DD.xlsx`.

- [ ] Pasa · Notas: ________________________________________

### 9.3 Sub-pestaña 6.3 · Inventario

1. Clic en la pestaña "Inventario"

**Esperado:** tabla con 7 items (clave, descripción, existencia, OT asignada, etc.).

- [ ] Pasa · Notas: ________________________________________

#### 9.3.b · Agregar existencia

1. Clic en "+ Agregar existencia"
2. Llenar clave única, descripción, existencia = `10`, costo unitario = `100`, asignar a una OT

**Esperado:** nuevo item; si la asignaste a una OT su estado es "Asignado".

- [ ] Pasa · Notas: ________________________________________

### 9.4 Sub-pestaña 6.4 · Facturas (CFDI)

1. Clic en la pestaña "Facturas"

**Esperado:** tabla con 5 CFDIs semilla, columnas con RFC emisor/receptor, UUID, folio, totales, validación SAT con badge coloreado.

- [ ] Pasa · Notas: ________________________________________

#### 9.4.b · Agregar factura manual

1. Clic en "+ Agregar factura"
2. Llenar UUID (único), RFC emisor, RFC receptor, Total, Moneda

**Esperado:** nueva fila.

- [ ] Pasa · Notas: ________________________________________

#### 9.4.c · Importar CFDI desde XML

**Precondición:** archivo XML CFDI válido disponible

1. Clic en "+ Agregar por XML"
2. Seleccionar un archivo `.xml` de CFDI

**Esperado:** alerta `✓ Factura importada y persistida` con UUID y total; la tabla se actualiza automáticamente.

- [ ] Pasa · Notas: ________________________________________

#### 9.4.d · CFDI duplicado (idempotencia)

1. Subir el MISMO archivo XML dos veces

**Esperado:** la segunda vez NO duplica la fila; se actualiza la existente.

- [ ] Pasa · Notas: ________________________________________

### 9.5 Sub-pestaña 6.5 · Entregas + Incidencias

1. Clic en la pestaña "Entregas"

**Esperado:** 4 KPIs (Entregadas, Pendientes, Con incidencia, Sin asignar) con valores numéricos. Tabla de entregas + tabla de incidencias debajo.

- [ ] Pasa · Notas: ________________________________________

#### 9.5.b · Registrar entrega con auto-actualización de inventario

1. Clic en "+ Registrar entrega"
2. Llenar datos, elegir estado `Entregado`, asignar a OT y piezas `5`

**Esperado:** la entrega aparece. Si vinculaste la entrega a un item de inventario, la existencia de ese item aumenta en 5.

- [ ] Pasa · Notas: ________________________________________

#### 9.5.c · Ingresar incidencia

1. Clic en "+ Ingresar incidencia"
2. Folio único, OT, descripción, fecha

**Esperado:** la incidencia aparece en la tabla "Últimas Incidencias".

- [ ] Pasa · Notas: ________________________________________

---

## 10. Módulo 7 · Horas de Mano de Obra

### 10.1 Resumen de horas

1. Abrir "Horas" (abre en Resumen)

**Esperado:** tabla con 8 columnas (OT · Empleado · Rol · Horas · Tarifa · Total · Moneda · Fecha).

- [ ] Pasa · Notas: ________________________________________

### 10.2 Capturar horas

**Rol:** admin, jefe_area, rh o supervisor

1. Clic en "+ Capturar horas"
2. Elegir OT, llenar nombre empleado, rol, horas = `4`, tarifa = `250`
3. El total se autocalcula a `1000`
4. Clic en "Capturar"

**Esperado:** nueva fila en la tabla.

- [ ] Pasa · Notas: ________________________________________

### 10.3 Control de Empleados

1. Cambiar a la sub-pestaña "Control de Empleados"

**Esperado:** tabla con 13 columnas (numero_lista, RFC, CURP, IMSS, nivel estudios, puesto, departamento, área, fecha ingreso, S.D, S.D.I, etc.); 18 empleados semilla.

- [ ] Pasa · Notas: ________________________________________

### 10.4 Nuevo empleado

**Rol:** admin o rh

1. Clic en "+ Nuevo empleado"
2. Llenar: No. listado = `TEST-001`, Nombre = `Empleado Prueba`, Área = `Producción`, opcional RFC/CURP/puesto

**Esperado:** nueva fila; si no especificaste turno, queda el default configurado (`08:00-17:00`).

- [ ] Pasa · Notas: ________________________________________

---

## 11. Módulo 8 · Nómina / CFDI

> ⏳ **Módulo pendiente** — Fase 4 del roadmap. Sólo se muestra la estructura mockup. Pruebas limitadas:

### 11.1 Estructura visible

1. Abrir "Nómina"

**Esperado:** se muestran las 3 sub-pestañas (Captura · CFDI · Resumen). La tabla de Captura tiene 86 columnas (scrolleable horizontalmente). Los valores son todos ceros / hardcoded.

- [ ] Pasa · Notas: ________________________________________

> Las pruebas funcionales de nómina se agregarán cuando el cliente apruebe el esquema en la sesión P4.1. Ver [docs/implementation-roadmap.md](./implementation-roadmap.md) § Phase 4.

---

## 12. Módulo 9 · Conciliación

### 12.1 Selector de semana

**Rol:** admin (o cualquiera con sesión)

1. Abrir "Conciliación"

**Esperado:** combo con al menos una semana disponible (ej. "13/04/2026–17/04/2026 · Semana 16 · 13-17 Abr 2026").

- [ ] Pasa · Notas: ________________________________________

### 12.2 Cargar checador CSV

**Precondición:** tener `backend/fixtures/checador-sample.csv` o un archivo similar.

1. Ir a sub-pestaña "Carga de Checador"
2. Arrastrar o seleccionar archivo CSV/XLSX

**Esperado:** aparece la vista previa con los primeros registros.

- [ ] Pasa · Notas: ________________________________________

### 12.3 Importar a BD

1. Tras la vista previa, clic en botón de importar (si aplica)

**Esperado:** alerta con cantidad de registros importados.

- [ ] Pasa · Notas: ________________________________________

### 12.4 Resumen semanal con empleados

1. Ir a sub-pestaña "Conciliación Semanal"

**Esperado:** tabla con cada empleado, horas checador, horas clasificadas, diferencia, estado, **botón "Ver detalle"**.

- [ ] Pasa · Notas: ________________________________________

### 12.5 Ver detalle de empleado

1. Clic en "Ver detalle" de un empleado con estado `conflicto`

**Esperado:** modal con breakdown diario (7 días). Cada día muestra fecha, horas checador, clasificadas, diferencia, estado, justificación y botones de acción.

- [ ] Pasa · Notas: ________________________________________

### 12.6 Justificar un día

**Rol:** supervisor, jefe_area, rh o admin

1. En el modal de detalle, clic en "Justificar" de un día con conflicto
2. Escribir "Retardo justificado por salud"

**Esperado:** el día cambia a estado `justificado`, con la justificación visible.

- [ ] Pasa · Notas: ________________________________________

### 12.7 Forzar conciliación

**Rol:** rh o admin (por default)

1. En el modal, clic en "Forzar"
2. Escribir motivo
3. Confirmar

**Esperado:** el día cambia a estado `forzado`.

- [ ] Pasa · Notas: ________________________________________

### 12.8 Forzar denegado para rol no autorizado

**Rol:** supervisor

1. Intentar usar "Forzar"

**Esperado:** el botón "Forzar" NO aparece en el modal (sólo se ve "Justificar"), o si aparece el POST falla con error de rol.

- [ ] Pasa · Notas: ________________________________________

### 12.9 Alertas

1. Sub-pestaña "Alertas"

**Esperado:** lista de tarjetas con tipo, empleado y mensaje; o mensaje "Sin alertas para esta semana. ✓".

- [ ] Pasa · Notas: ________________________________________

### 12.10 Clasificación de horas

1. Sub-pestaña "Clasificación de Horas"
2. Llenar el formulario (empleado, proyecto, actividad, horas)
3. Enviar

**Esperado:** registro guardado; aparece en el historial.

- [ ] Pasa · Notas: ________________________________________

### 12.11 Cierre de semana y exportación

**Rol:** rh o admin

1. Sub-pestaña "Cierre de Semana"
2. Revisar los 3 resúmenes (Estatus, Alertas activas, Conflictos)
3. Clic en "Exportar Excel"

**Esperado:** descarga el XLSX de la semana.

- [ ] Pasa · Notas: ________________________________________

---

## 13. Módulo 10 · Costo de Mano de Obra

> ⏳ **Módulo pendiente** — Fase 5 del roadmap. Bloqueado en definición de regla Costo/Real con cliente (P5.7).

### 13.1 Estructura visible

1. Abrir "Costo de Mano de Obra"

**Esperado:** tabla con 13 actividades (A = Ing./Diseño ... M = Instalación en Campo) con valores mockup. La columna "Costo/Real" muestra `$0.00`.

- [ ] Pasa · Notas: ________________________________________

---

## 14. Módulo 11 · Administración

> Sólo visible para rol `admin`.

### 14.1 Pestaña Configuración — ver todas las claves

**Rol:** admin

1. Abrir "Administración"
2. Verificar que está en pestaña "Configuración"

**Esperado:** tabla con 14 filas semilla (forecasting, approval, conciliacion, ot, system).

- [ ] Pasa · Notas: ________________________________________

### 14.2 Filtrar por categoría

1. En el combo "Categoría", elegir `forecasting`

**Esperado:** sólo muestran 2-3 claves con category=forecasting.

- [ ] Pasa · Notas: ________________________________________

### 14.3 Editar un valor numérico

1. Clic en "Editar" de `forecasting.semaforo.ok_max`
2. Cambiar el JSON de `0.7` a `0.65`
3. Clic en "Guardar"

**Esperado:** la tabla muestra el nuevo valor; la columna "Actualizado" muestra la fecha de hoy.

- [ ] Pasa · Notas: ________________________________________

### 14.4 Editar un array (lista de roles)

1. Clic en "Editar" de `conciliacion.forzar.roles`
2. Cambiar el JSON de `["rh","admin"]` a `["rh","admin","jefe_area"]`
3. Clic en "Guardar"

**Esperado:** valor actualizado. Verificar que jefe_area ahora puede usar "Forzar" en Conciliación (caminar por el escenario 12.7 con ese rol).

- [ ] Pasa · Notas: ________________________________________

### 14.5 JSON inválido se rechaza

1. Editar cualquier clave
2. Escribir `no es json válido`
3. Guardar

**Esperado:** error `JSON inválido: ...`. No se guarda.

- [ ] Pasa · Notas: ________________________________________

### 14.6 Validación de tipo

1. Editar `forecasting.semaforo.ok_max` (tipo `number`)
2. Escribir `["array", "no", "número"]`

**Esperado:** error `Se esperaba un number pero se recibió un array`.

- [ ] Pasa · Notas: ________________________________________

### 14.7 Pestaña Bitácora — lista de eventos

1. Clic en la pestaña "Bitácora"

**Esperado:** tabla con eventos recientes (login, config_change, create, update, etc.). Cada uno con fecha, usuario, rol, acción con badge coloreado, entidad, descripción, IP.

- [ ] Pasa · Notas: ________________________________________

### 14.8 Filtrar bitácora por usuario

1. En el filtro "Búsqueda", escribir el nombre de un usuario
2. Clic en "Filtrar"

**Esperado:** sólo muestran eventos donde el nombre o descripción contiene el texto.

- [ ] Pasa · Notas: ________________________________________

### 14.9 Filtrar por acción

1. En combo "Acción", elegir `login`
2. Clic en "Filtrar"

**Esperado:** sólo eventos de login.

- [ ] Pasa · Notas: ________________________________________

### 14.10 Filtrar por rango de fechas

1. Elegir "Desde" = ayer, "Hasta" = hoy
2. Clic en "Filtrar"

**Esperado:** sólo eventos en ese rango.

- [ ] Pasa · Notas: ________________________________________

### 14.11 Ver detalle de un evento

1. En cualquier fila con el botón "Ver", clic

**Esperado:** modal con metadatos del evento + 2 cajas JSON lado a lado (Antes / Después). Valores completos legibles.

- [ ] Pasa · Notas: ________________________________________

### 14.12 Exportar bitácora a XLSX

1. Con filtros aplicados, clic en "⬇ Descargar XLSX"

**Esperado:** descarga `bitacora-YYYY-MM-DD.xlsx` con los eventos filtrados.

- [ ] Pasa · Notas: ________________________________________

### 14.13 Contraseñas NO aparecen en la bitácora

1. Crear un usuario nuevo (si hay módulo) o editar uno existente
2. En la bitácora, ver el detalle del evento

**Esperado:** el snapshot `antes`/`después` NO contiene `passwordHash` ni `password_hash`.

- [ ] Pasa · Notas: ________________________________________

---

## 15. Flujos transversales

### 15.1 Cambio de config se refleja sin reiniciar

1. Login admin
2. En Administración → Configuración, cambiar `conciliacion.turno_default` de `08:00-17:00` a `07:00-16:00`
3. Ir a Módulo 7 → Control de Empleados → "+ Nuevo empleado"
4. NO especificar turno, guardar con resto de datos

**Esperado:** el empleado creado tiene `turno = 07:00-16:00`.

- [ ] Pasa · Notas: ________________________________________

### 15.2 Supervisor solo ve sus OTs (ACL)

**Precondición:** al menos una OT tiene `supervisor_id` asignado a un usuario con rol supervisor; otras OTs tienen `supervisor_id = NULL`.

1. Login como supervisor (que NO tiene OTs asignadas)
2. Abrir "Orden de Trabajo", desplegar el combo

**Esperado:** sólo aparecen las OTs con `supervisor_id = NULL` (visibles para todos) + las asignadas a ese supervisor específico.

- [ ] Pasa · Notas: ________________________________________

### 15.3 Todos los botones "⬇ Descargar XLSX" funcionan

Para cada módulo con export activo, verificar que el XLSX se descarga correctamente con datos (no vacío):

- [ ] OT (`ordenes-trabajo-YYYY-MM-DD.xlsx`)
- [ ] Cotizaciones (`control-ventas-YYYY-MM-DD.xlsx`)
- [ ] Material (`costo-material-YYYY-MM-DD.xlsx`)
- [ ] Proveedores (`proveedores-YYYY-MM-DD.xlsx`)
- [ ] OCP (`ocp-YYYY-MM-DD.xlsx`)
- [ ] Inventario (`inventario-YYYY-MM-DD.xlsx`)
- [ ] Facturas (`facturas-YYYY-MM-DD.xlsx`)
- [ ] Entregas (`entregas-YYYY-MM-DD.xlsx`)
- [ ] Horas (`horas-mo-YYYY-MM-DD.xlsx`)
- [ ] Empleados (`empleados-YYYY-MM-DD.xlsx`)
- [ ] Pronóstico (`pronostico-YYYY-MM-DD.xlsx`)
- [ ] Conciliación (cierre de semana XLSX)
- [ ] Bitácora (`bitacora-YYYY-MM-DD.xlsx`)

### 15.4 Login queda registrado en bitácora

1. Logout, login con ventas
2. Logout, login con compras
3. Como admin, ir a Bitácora y filtrar por acción `login`

**Esperado:** los 2 logins aparecen con timestamps, usuario, IP.

- [ ] Pasa · Notas: ________________________________________

### 15.5 Intento de login fallido queda registrado

1. Logout
2. Intentar login con contraseña incorrecta
3. Login como admin, Bitácora, filtrar acción = `login_failed`

**Esperado:** fila con descripción `Login fallido · contraseña incorrecta` (o `usuario no existe`), timestamp e IP.

- [ ] Pasa · Notas: ________________________________________

### 15.6 Persistencia de CFDI XML

1. Login admin, importar un CFDI XML (escenario 9.4.c)
2. Reiniciar el navegador / salir y entrar
3. Revisar la tabla de Facturas

**Esperado:** la factura importada sigue ahí.

- [ ] Pasa · Notas: ________________________________________

### 15.7 Operación concurrente no rompe

1. Dos sesiones en paralelo (dos ventanas del navegador, dos cuentas distintas)
2. Ambas crean OTs al mismo tiempo

**Esperado:** ambas OTs se crean sin error; los números de OT son únicos (si uno ingresa mismo número, el segundo recibe error de unicidad).

- [ ] Pasa · Notas: ________________________________________

---

## 16. Hoja de firmas

| Campo                    | Valor                         |
|--------------------------|-------------------------------|
| Versión del sistema      | ______________________________ |
| Fecha de prueba          | ______________________________ |
| Nombre del tester        | ______________________________ |
| Rol del tester           | ______________________________ |
| Total escenarios         | 90+                           |
| Escenarios pasados       | _____ / _____                 |
| Escenarios fallados      | _____ / _____                 |
| Escenarios no aplicables | _____                         |
| Firma                    | ______________________________ |

### Resumen de fallos encontrados

| # escenario | Módulo | Descripción del fallo | Severidad (crítica / alta / media / baja) |
|-------------|--------|-----------------------|-------------------------------------------|
|             |        |                       |                                           |
|             |        |                       |                                           |
|             |        |                       |                                           |

---

## Apéndice · Mapeo escenario → requirement técnico

Cuando necesites rastrear un escenario a código / tests automatizados, consulta:

- [`regression-requirements.md`](./regression-requirements.md) — IDs `AC-<MODULE>-NN` para tests de automatización
- [`implementation-audit.md`](./implementation-audit.md) — matriz feature/estado con gap IDs `G-<MODULE>-N`
- [`implementation-roadmap.md`](./implementation-roadmap.md) — work items `PN.M` por fase
- [`modules/`](./modules/) — especificación detallada por módulo

**Módulos que aún NO se pueden probar funcionalmente** (sólo estructura visible):

| Módulo                  | Estado     | Desbloqueante                                      |
|-------------------------|------------|----------------------------------------------------|
| 8. Nómina / CFDI        | mockup     | Revisión P4.1 con cliente (plantilla 86 cols)      |
| 10. Costo de Mano de Obra | mockup   | Firma cliente sobre regla Costo/Real (P5.7)        |
| 6.4 Validación SAT real | mockup     | Integración con PAC (Fase 6)                       |
