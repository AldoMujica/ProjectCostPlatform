# Flujo de Trabajo del Sistema — Alenstec Gestión de Costos

> Descripción operativa del proceso completo: cómo entra un proyecto al sistema, cómo se mueve entre módulos y qué produce en cada etapa.

---

## Visión general

El sistema gira en torno a la **Orden de Trabajo (OT)** — la unidad central de proyecto. Todo dato que se captura se asocia a una OT: costos de material, horas de mano de obra, nómina, facturas de proveedores, y el flujo de liberación. La pregunta que responde el sistema en cada momento es:

> **¿Cuánto costó este proyecto vs. cuánto se cotizó?**

```
COTIZACIÓN ──► OT creada ──► Compras / Material ──► Horas MO
                  │                                       │
                  ▼                                       ▼
          Flujo de liberación             Conciliación + Nómina
                  │                                       │
                  └───────────────────────────────────────┘
                                    │
                                    ▼
                          Dashboard (KPIs de costo real vs. cotizado)
```

---

## Etapa 1 — Cotización (Comercial)

**Módulo:** `Cotizaciones y Ventas`

### Qué pasa aquí

El área comercial emite una **Cotización (COT)** al cliente. Si el cliente aprueba, emite una **OC de cliente** y Alenstec abre una **OT**.

### Inputs

| Dato | Fuente |
|---|---|
| No. de cotización (`COT-AL-NNNXXX-YYT`) | Área comercial (manual) |
| Cliente | Manual |
| Monto cotizado (USD sin IVA) | Cotización |
| OC del cliente | Documento del cliente |
| Tipo de cambio (T/C USD → MXN) | Diario Oficial de la Federación |
| Tipo de proyecto (`Nuevo / Refurbish / MECR`) | Área comercial |

### Outputs

| Resultado | Destino |
|---|---|
| Registro en tabla Control de Ventas | Base de datos → alimenta dashboard |
| Vínculo COT ↔ OT | Trazabilidad hacia módulo OT |
| KPIs: monto cotizado acumulado, clientes activos | Dashboard |

---

## Etapa 2 — Orden de Trabajo (Arranque del Proyecto)

**Módulo:** `Orden de Trabajo`

### Qué pasa aquí

Se crea y libera formalmente el proyecto. El **Flujo de Liberación** requiere firma (aprobación secuencial) de 5 áreas antes de que la OT quede en estado `Liberada` y la planta pueda empezar a trabajar.

### Inputs

| Dato | Fuente |
|---|---|
| No. OT (`OT-AL-XXXX`) | Sistema (autogenerado) |
| Datos del cliente, requisitor, e-mail | Área comercial |
| # OC Cliente | Documento del cliente |
| COT Ref. Alenstec | Etapa 1 |
| Tipo de cambio | Diario Oficial |
| Presupuesto MO (MXN y USD) | Cotización |
| Presupuesto Material (MXN y USD) | Cotización |
| Horas estimadas por área y disciplina | Ingeniería |
| Aprobaciones de: Ingeniería, Compras, Manufactura, Ventas, RH | Cada jefatura |

### Outputs

| Resultado | Destino |
|---|---|
| **PDF "Formato para Inicio y/o Liberación"** | Impresión física para firma en planta |
| OT en estado `Liberada` | Habilita captura de costos reales |
| Presupuestos de MO y Material (base de comparación) | Módulos de costo, Dashboard |

---

## Etapa 3 — Compras y Materiales

**Módulo:** `Entregas de Material` (5 sub-tabs)

### Qué pasa aquí

Compras emite **Órdenes de Compra Alenstec (OCP)** a proveedores. Los materiales llegan, se reciben y se registran. Los proveedores timbran CFDIs que el sistema importa vía XML.

### Sub-flujo

```
Proveedor activo
     │
     ▼
Orden de Compra (OCP) emitida ──► Material llega ──► Entrada a inventario
                                        │
                                        ▼
                               Factura CFDI (XML) importada
                                        │
                                        ▼
                               Entrega registrada en OT
```

### Inputs

| Dato | Fuente / Formato |
|---|---|
| Catálogo de proveedores | Manual (nombre, moneda, contacto) |
| OCP: proveedor, descripción, monto, fechas | Compras (manual) |
| Entradas a inventario: clave, existencia, costo unitario | Almacén (manual) |
| Facturas CFDI | **Archivo XML del SAT** (drag-drop o carga) |
| Entregas: cantidad recibida, fecha, incidencias | Almacén (manual) |

### Outputs

| Resultado | Destino |
|---|---|
| Costo real de material por OT | Módulo Costo de Material, Dashboard |
| Inventario disponible / asignado | Control de stock |
| CFDI almacenado (UUID fiscal, timbrado) | Nómina y contabilidad |
| XLSX de OCP / Inventario / Facturas / Entregas | Descarga directa |

---

## Etapa 4 — Horas de Mano de Obra

**Módulo:** `Horas de Mano de Obra`

### Qué pasa aquí

Los supervisores capturan las horas que cada empleado trabajó en cada OT, clasificadas por **actividad** (Maquinado, Ensamble, Eléctrica, etc.). Esto alimenta tanto el costo real de MO como la base de la nómina.

### Inputs

| Dato | Fuente |
|---|---|
| ID empleado, nombre | Control de Empleados (maestro) |
| OT a la que se imputan las horas | Selector de OT en topbar |
| Actividad / categoría (código A–M + subcódigo) | Catálogo de actividades |
| Horas capturadas | Supervisor (manual) |
| Fecha y autorizador | Sistema (timestamp del usuario en sesión) |

### Outputs

| Resultado | Destino |
|---|---|
| Registro de horas reales por OT / empleado / actividad | Costo de MO, Dashboard |
| Base de horas para conciliación | Módulo Conciliación |
| XLSX de horas | Descarga directa |

---

## Etapa 5 — Conciliación Semanal (Checador)

**Módulo:** `Conciliación`

### Qué pasa aquí

Cada semana, RH/Nómina reconcilia tres fuentes de información de asistencia:
1. **Checador** — reloj marcador digital (CSV o XLSX del sistema de control de acceso)
2. **Horas clasificadas** — lo que el supervisor capturó en Etapa 4
3. **Incidencias** — vacaciones, incapacidades, faltas justificadas

Si las tres fuentes coinciden → empleado queda en `ok`. Si no → genera `alerta` o `conflicto` que debe resolverse antes del **Cierre de Semana** (irreversible).

### Inputs

| Dato | Fuente / Formato |
|---|---|
| Archivo del checador | **CSV / XLSX** (drag-drop al sistema) |
| Semana de nómina seleccionada | Selector en módulo |
| Horas clasificadas por supervisor | Etapa 4 |
| Incidencias: vacaciones, incapacidad, festivo | RH (manual en sub-tab Clasificación de Horas) |

### Outputs

| Resultado | Destino |
|---|---|
| Resumen semanal: registros leídos / válidos / errores | Vista previa antes de importar |
| Estado por empleado: `ok / alerta / conflicto / justificado / forzada` | Sub-tab Conciliación Semanal |
| Alertas de inconsistencias | Sub-tab Alertas |
| **Cierre de semana** (irreversible) → datos congelados | Base para nómina |
| XLSX del cierre semanal | Descarga — Contabilidad / Nómina |

---

## Etapa 6 — Nómina / CFDI

**Módulo:** `Nómina / CFDI`

### Qué pasa aquí

Con los datos del cierre de conciliación, se captura o verifica la nómina semanal con todos los cálculos fiscales mexicanos (IMSS, ISR, INFONAVIT, FONACOT). La tabla de captura tiene **86 columnas** que cubren el formato oficial de nómina. Adicionalmente se gestionan los CFDI de nómina timbrados por el SAT.

### Inputs

| Dato | Fuente |
|---|---|
| Empleados: RFC, CURP, No. IMSS, SD, SDI | Control de Empleados (Etapa 4 / maestro) |
| Horas laboradas por turno (normal, vespertino, matutino) | Cierre de conciliación (Etapa 5) |
| Tiempo extra (dobles / triples) | Conciliación |
| Días trabajados, festivos, vacaciones, faltas, incapacidades | Conciliación |
| Semana de nómina | Selector del módulo |
| CFDI XML de nómina (timbrado por SAT) | **Archivo XML** — importación |

### Outputs

| Resultado | Destino |
|---|---|
| Nómina capturada con todos los cálculos (sueldo gravado/exento, IMSS, ISR, INFONAVIT, FONACOT) | Base de datos |
| Costo de MO real semanal por empleado | Módulo Costo MO |
| CFDI de nómina almacenados (UUID fiscal) | Contabilidad |
| XLSX de nómina semanal | Descarga — Contabilidad |

---

## Etapa 7 — Análisis de Costos y Dashboard

**Módulos:** `Dashboard`, `Costo de Material`, `Costo de Mano de Obra`, `Pronóstico del Costo`

### Qué pasa aquí

Con todos los datos reales capturados, el sistema compara **cotizado vs. real**. El Dashboard muestra KPIs ejecutivos; los módulos de costo dan el detalle por OT.

### Inputs (consolidados de etapas anteriores)

| Dato | Origen |
|---|---|
| Presupuesto MO y Material (USD/MXN) | OT → Cotización |
| Costo real de material | Etapa 3 (Entregas) |
| Horas reales y costo MO real | Etapas 4–6 (Horas + Nómina) |
| Tipo de cambio vigente | Manual / Diario Oficial |

### Outputs — Dashboard KPIs

| KPI | Qué mide |
|---|---|
| OTs Activas | Proyectos en ejecución |
| Costo Total Cotizado | USD acumulado de presupuestos |
| Material en Tránsito | MXN en OCP pendientes de recibir |
| Cotizaciones Abiertas | COTs en estado "pendiente" |
| Gráfica Costo Real vs. Cotizado | Variación % por OT |
| OTs recientes + estado | Pipeline de proyectos activos |
| Proveedores activos y saldo | Deuda con proveedores |

### Outputs — Módulos de costo

| Reporte | Contenido |
|---|---|
| **Costo de Material** | Precio cotizado vs. precio real por línea de material, por OT |
| **Costo de MO** | Horas cotizadas vs. reales, precio/hr, costo MO cotizado vs. real |
| **Pronóstico del Costo** | Proyección de cierre vs. presupuesto (Phase 5 — en desarrollo) |

---

## Resumen: Inputs del sistema

| Categoría | Dato | Formato |
|---|---|---|
| **Comercial** | Cotización, OC de cliente, T/C | Manual en interfaz |
| **Proyecto** | Datos de OT, presupuestos, horas estimadas | Manual en formulario |
| **Compras** | Proveedores, OCP, entregas | Manual en interfaz |
| **Facturas** | CFDI de proveedores y de nómina | **XML del SAT** (importación) |
| **Asistencia** | Marcaciones del checador | **CSV / XLSX** (importación) |
| **MO** | Horas por empleado, actividad, OT | Manual (supervisor) |
| **Empleados** | RFC, CURP, IMSS, SD, SDI, puesto | Manual (RH) |
| **T/C** | Tipo de cambio diario | Manual (referencia DOF) |

---

## Resumen: Outputs del sistema

| Output | Módulo origen | Consumidor |
|---|---|---|
| **PDF Formato OT** | OT | Planta (firma física) |
| **XLSX por módulo** | Todos | Contabilidad, Compras, RH |
| **Dashboard KPIs** | Dashboard | Dirección / Gerencia |
| **Alertas de conciliación** | Conciliación | RH / Nómina |
| **Cierre semanal de nómina** | Conciliación + Nómina | Nómina / Contabilidad |
| **Costo real vs. cotizado** | Material + MO + Dashboard | Dirección de proyecto |

---

## Roles y quién hace qué

| Rol | Etapas en las que actúa |
|---|---|
| **Ventas / Compras** | 1 — Cotización; 3 — OCP a proveedores |
| **Ingeniería** | 2 — Horas estimadas, aprobación OT |
| **Jefe de Área / Manufactura** | 2 — Aprobación OT; 4 — Captura de horas |
| **Supervisor** | 4 — Captura y autoriza horas por OT |
| **RH** | 2 — Aprobación OT; 5 — Incidencias; 6 — Nómina |
| **Admin** | Configuración, bitácora, papelera, permisos |

---

## Entidad central: OT (Orden de Trabajo)

```
OT
├── Datos generales (cliente, fechas, tipo)
├── Presupuestos (MO y Material en USD/MXN)
├── Horas estimadas (por área y disciplina)
├── Flujo de liberación (5 pasos de aprobación)
├── ── Materiales ──► OCP → Entrega → Factura CFDI
├── ── Horas MO ───► Captura → Actividad → Costo MO
└── ── Nómina ─────► Conciliación → Cierre semanal
```

Todo gira alrededor del número de OT. El filtro "Seleccione OT" en la topbar es el pivote que conecta todos los módulos de costo.
