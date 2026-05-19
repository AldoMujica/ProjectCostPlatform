# Estructura Completa: Modal Nueva Cotización

Este documento define la estructura HTML y campos para el modal de creación/edición de cotizaciones en el módulo "Cotizaciones y Ventas".

## Jerarquía de campos

### SECCIÓN 1: Datos Básicos (Top-level)

```
ITEM (auto)
CLIENTE *
PROYECTO / PROGRAMA
CELDA
RFQ
MECR
COT REF. ALENSTEC (COT-AL) [manual entry]
FECHA (COT-AL) [date dd/mm/yyyy] *
COSTO COT-AL (USD) (Sin IVA) [calculated]
ORDEN DE COMPRA (CLIENTE)
TIPO DE CONTRATO [dropdown]
FECHA O.C. [date dd/mm/yyyy]
COSTO O.C. (USD) (Sin IVA)
FECHA COMPROMISO ENTREGA [date dd/mm/yyyy]
TIPO DE CAMBIO (USD) [sub-label: MXN-USD] [decimal]
OT. ALENSTEC (OT-AL-) [link/select to WorkOrder]
DESCRIPCION DE PROYECTO [textarea]
```

---

### SECCIÓN 2: LABOR INDIRECTA [1, 2, 3…13]

**Group Container:** Repeatable section or single row with activity type selector

For each activity (select one from dropdown):
- **Actividad no especificada**
- **Desarrollo y preventa**
- **Compras**
- **Planeacion y Ctrl prod (procesos)**
- **Seguridad Industrial**
- **Gestion de calidad (ISO)**
- **Almacen**
- **Control de Costo**
- **Supervicion**
- **Mantenimiento**
- **Actividades administrativas/contables/RH**
- **Juntas**
- **Curso/capacitacion**

**Columns for each activity:**
- `[COTIZADO] (HRS)` — hours quoted
- `[REAL] (HRS)` — hours actual
- `COSTO X HR [COTIZADO] (USD)` — per-unit cost
- `COSTO VENTA. [COTIZADO] (USD)` — total labor indirect cost

---

### SECCIÓN 3: LABOR DIRECTA — INGENIERIA/DISEÑO

```
INGENIERIA/DISEÑO [COTIZADO] (HRS) [A]
INGENIERIA/DISEÑO [REAL] (HRS) [A]
COSTO X HR [COTIZADO] (USD)
COSTO ING. [COTIZADO] (USD)
```

---

### SECCIÓN 4: LABOR DIRECTA — MANUFACTURA

**Sub-processes (columns for COTIZADO hours):**

```
[B] CORTE
[C] FABRICACION
[E] MAQUINADO
[F] HILOEROSION
[G] ENSAMBLE
[H] LABOR ELECTRICA
[D] OTROS PROC. (PAV., PINT., TEMPLE)
[J] SHOPPER/PICKER (LLEVAR/TRAER)
[K] CERT. DIMENSIONAL
[L] EMPAQUE / EMBALAJE
```

**Installation (COTIZADO) [M]:**
- SUPERVISOR (hrs)
- TÉCNICO MECANICO (hrs)
- ELÉCTRICO (hrs)
- PROGRAMADOR (hrs)
- TOTAL [COTIZADO] (HRS)

**Manufcatura REAL (hrs):**
```
[B] CORTE
[C] FABRICACION
[E] MAQUINADO
[F] HILOEROSION
[G] ENSAMBLE
[H] LABOR ELECTRICA
[D] OTROS PROC. (PAV., PINT., TEMPLE)
[J] SHOPPER/PICKER (LLEVAR/TRAER)
[K] CERT. DIMENSIONAL
```

**Installation (REAL) [L]:**
- DISEÑO (hrs)
- TÉCNICO (hrs)
- ELÉCTRICO (hrs)
- PROGRAMADOR (hrs)
- TOTAL [REAL] (HRS)

**Cost summary:**
- COSTO X HR [COTIZADO] (USD)
- COSTO MNF. [COTIZADO] (USD)

---

### SECCIÓN 5: LABOR DIRECTA — AUTOMATIZACION

```
AUTOMATIZACION [COTIZADO] (HRS) [I]
AUTOMATIZACION [REAL] (HRS) [I]
COSTO X HR [COTIZADO] (USD)
COSTO AUT. [COTIZADO] (USD)
```

---

### SECCIÓN 6: MATERIALES (standalone rows, all COTIZADO)

```
MAT. ACEROS (ALUMINO, FENE, BRONCE, C.R., AMUTIT, INOX) [COTIZADO] (USD)
MAT. PLASTICOS (NYLAMID, ACETAL, PVC, ULTEM, RENSHAPE, POLICARBONATO, ACRILICO) [COTIZADO] (USD)
PROC. RECUBRIMIENTOS (ELECTROLESS, PAVONADO, PINTURA, GALVANIZADO, ZINCADO, TITANIO) [COTIZADO] (USD)
TRATAMIENTOS TERMICOS (TEMPLE, NORMALIZADO, R.F, RECOCIDO, REVENIDO, CEMENTADO) [COTIZADO] (USD)
MAT. COMPONENTES (ELECTRICO, MECANICO, CONTROL, CONSUMIBLES) [COTIZADO] (USD)
CERTIFICADOS (DUREZA, DIMENSIONAL) [COTIZADO] (USD)

SUB-TOTAL MATERIALES [COTIZADO] (USD) — calculated sum
%UTILIDAD {PROFIT} [COTIZADO] (%)
UTILIDAD {PROFIT} [COTIZADO] (USD) — calculated
TOTAL MAT. COMERCIALES [COTIZADO] (USD) — calculated
```

---

### SECCIÓN 7: VIATICOS [COTIZADO] (USD) — Group

**Sub-columns:**
```
COMIDA (USD)
ESTANCIA (USD)
PEAJE (USD)
GASOLINA (USD)
TOTAL [COTIZADO] (USD) — calculated
```

---

### SECCIÓN 8: LOGISTICA

```
ENVIO [COTIZADO] (USD)
EMBALAJE [COTIZADO] (USD)
TOTAL [COTIZADO] (USD) — calculated
```

---

### SECCIÓN 9: Finales (standalone)

```
UTILIDAD / PROFIT [COTIZADO] (USD)
PARTIDA DE IVA P/ EMPRESA US (USD)
TOTAL [COTIZADO] (USD) — **Final grand total**
NOTAS [textarea]
```

---

## HTML Layout Hints

- **Repeatable sections** (LABOR INDIRECTA, MANUFACTURA sub-processes) → Use collapsible accordion or inline grid-repeat
- **Calculated fields** → Mark with `[calculated]` or `readonly`; update on blur of prerequisite fields
- **Dropdown selectors** → Provide option lists as specified
- **Date fields** → Format validation (dd/mm/yyyy)
- **Currency fields** → USD always; MXN only in T/C and final sums if required
- **Grouped sections** → Use `<fieldset>` or styled `.fg-group` divs for visual hierarchy

---

## Backend Model Implications

The expanded `Quote` model will need (Sequelize):
- All top-level scalars (strings, dates, decimals)
- **Labor Indirect:** JSON array of activity objects `[ { activity, cotHrs, realHrs, costPerHr, totalCost }, ... ]`
- **Labor Direct - Eng:** scalar fields
- **Labor Direct - Manuf:** nested object with sub-process hours + installation breakdown
- **Labor Direct - Auto:** scalar fields
- **Materials:** JSON array or separate table with line items
- **Viaticos/Logistics:** separate fields or JSON
- **Calculated totals:** Virtual fields (Sequelize getters) or computed on save

---

## Phase & Acceptance Criteria

**Phase 3 (Future):** Full wiring of this modal + backend schema expansion (P3.9–P3.12 est.).

**Current status (Phase 2):** G-COT-1 (modal creation flow) remains open. This structure is the **detailed design** to close that gap.
