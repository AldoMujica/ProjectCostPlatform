# Cross-cutting — Reporting & Export Surface

> **Source of truth:** [`alenstec_app.html`](../../alenstec_app.html). This document catalogues every export / reporting control present in the mockup across all 10 modules. It is a sister document to the per-module feature specs and focuses on test-ability of the export surface itself.

## Overview

The application has **three actual export / import mechanisms**:

1. **OT PDF export** — `jspdf`, client-side, fully wired.
2. **Conciliación Excel export** — `exceljs`, server-side via `GET /api/conciliacion/:semana_id/exportar`, fully wired.
3. **CFDI XML import** — native `DOMParser`, client-side, fully wired for Facturas sub-tab.

All other `⬇ Descargar XLSX` buttons in the app are **visual only** — their handler (`handleGlobalAction` and per-tab equivalents) currently only reacts in the Conciliación module. This is tracked as **Gap G-EXP-1**.

## Export surface inventory

| # | Module                 | Control                              | Mechanism              | Status     | Scope               |
|---|------------------------|--------------------------------------|------------------------|------------|---------------------|
| 1 | OT (Module 2)          | `⬇ Imprimir PDF` banner button       | `jspdf` client-side    | ✅ Wired    | Single OT liberation form |
| 2 | Cotizaciones (3)       | `⬇ Descargar XLSX` topbar            | none                   | ❌ G-EXP-1  | Control de Ventas rows  |
| 3 | Pronóstico (4)         | `⬇ Descargar XLSX` topbar            | none                   | ❌ G-EXP-1  | Pronóstico table        |
| 4 | Material (5)           | `⬇ Descargar XLSX` topbar            | none                   | ❌ G-EXP-1  | Requisición table       |
| 5 | Entregas (6) / Proveedores | `⬇ Descargar XLSX` #btn-dl-prov | none                   | ❌ G-EXP-1  | Proveedores table       |
| 6 | Entregas / OCP         | `⬇ Descargar XLSX` #btn-dl-ocp       | none                   | ❌ G-EXP-1  | OCA table               |
| 7 | Entregas / Inventario  | `⬇ Descargar XLSX` #btn-dl-inv       | none                   | ❌ G-EXP-1  | Inventario table        |
| 8 | Entregas / Facturas    | `⬇ Descargar XLSX` #btn-dl-fact      | none                   | ❌ G-EXP-1  | Facturas table          |
| 9 | Entregas / Facturas    | `+ Agregar por XML`                  | `DOMParser` client-side | ✅ Wired   | Parse + insert row      |
|10 | Entregas / Entregas    | `⬇ Descargar XLSX` #btn-dl-entr      | none                   | ❌ G-EXP-1  | Entregas table          |
|11 | Horas (7)              | `⬇ Descargar XLSX` topbar            | none                   | ❌ G-EXP-1  | Horas capturadas        |
|12 | Nómina (8)             | `⬇ Descargar XLSX` topbar            | none                   | ❌ G-EXP-1  | 86-col matrix           |
|13 | Nómina / CFDI          | `+ Cargar CFDI`                      | `DOMParser` client-side | ⚠️ Misrouted (G-NOM-3) | Reuses Facturas handler |
|14 | Conciliación / Cierre  | `Exportar Excel`                     | `exceljs` server-side  | ✅ Wired    | Weekly reconciliation   |
|15 | Costo MO (10)          | `⬇ Descargar XLSX` topbar            | none                   | ❌ G-EXP-1  | Cost roll-up            |

**Gap G-EXP-1:** the topbar `#btn-dl-global` and the per-tab `#btn-dl-<prefix>` buttons all share the no-op `handleGlobalAction` (HTML 1379). Enable wiring must decide: generate XLSX client-side (e.g. SheetJS / exceljs in-browser) or server-side (new endpoint per table).

---

## 1. OT PDF Export (Detailed spec)

### Implementation reference

- HTML lines **1115–1311**.
- Libraries: `jspdf` 2.5.1 (CDN).
- Invocation: `<button onclick="generateOTPDF()">⬇ Imprimir PDF</button>` in the OT banner.
- Output: A letter-format PDF saved as `OT-<otNumber>.pdf`.

### Template structure

| Zone                    | Content                                                      |
|-------------------------|--------------------------------------------------------------|
| Title band              | "ALENSTEC SA DE CV" left · "FORMATO PARA INICIO V/O LIBERACION" right |
| Header data rows        | Fecha, Cantidad, # OT, Cliente, Área Requisitor, Requisitor, E-mail, Programa, Fechas Liberación/Entrega, # OC Cliente / # COT |
| Descripción block       | Multi-line, wrapped to content width                         |
| Observaciones           | Single-line (fixed text "SE ANEXA CARATULA DE COTIZACION.")  |
| Tipo de Cambio          | Value + "(REF. DIARIO OFICIAL)" suffix                       |
| Presupuesto MO table    | MXN/USD cells for labor                                      |
| Presupuesto Material    | MXN/USD cells for material                                   |
| Horas Estimadas table   | 8 columns × 2 rows (header + values)                         |
| Horas Reales table      | 8 columns × 2 rows (placeholders `—`)                        |
| Firma footer            | 6 labelled boxes: `VENTAS · R.H · INGENIERIA · CONTABILIDAD · MANUFACTURA · COMPRAS` |

### Input reading

```js
document.querySelectorAll('#mod-ot .fi').forEach(input => {
  const label = input.parentElement?.querySelector('.fl')?.textContent || '';
  if (label) formData[label.trim()] = input.value;
});
```

All `#mod-ot .fi` inputs contribute to `formData` keyed by their `.fl` label. Missing fields fall back to hardcoded defaults (e.g. `'10 de marzo de 2026'`).

### Regression candidates

- AC-REP-01. Clicking `⬇ Imprimir PDF` triggers a browser download.
- AC-REP-02. Downloaded filename matches `/^OT-.*\.pdf$/`.
- AC-REP-03. PDF contains the six footer labels from the firma zone.
- AC-REP-04. PDF title text contains `ALENSTEC SA DE CV` and `FORMATO PARA INICIO V/O LIBERACION`.
- AC-REP-05. When the OT banner number is set to `OT-AL-1947`, the downloaded PDF is named `OT-OT-AL-1947.pdf` and the "No. DE OT ASIGNADA" cell contains `OT-AL-1947`.
- AC-REP-06. When a Datos Generales input (e.g. `Cliente`) is edited in the DOM and the PDF is regenerated, the new value appears.

Use a library such as `pdf-parse` in Jest or Playwright's `context.on('download')` to retrieve the file, then re-parse its text for assertions.

---

## 2. Conciliación Excel Export

### Implementation reference

- Trigger: `#export-btn` in sub-tab 9.5, and `#btn-dl-global` when module = `conciliacion`.
- Client: `exportConciliacionExcel()` (HTML 1605).
- Server: `GET /api/conciliacion/:semana_id/exportar` → `backend/src/utils/excelExporter.js`.
- Output: browser download `conciliacion_semana_<id>.xlsx`.
- Format: ExcelJS workbook, `generarReporte` (summary by weekday) + `generarReporteDetallado` (daily). Styling: blue header, white/green/yellow/red rows by reconciliation state.

### Regression candidates

- AC-REP-11. Clicking `Exportar Excel` triggers a download whose filename matches `/^conciliacion_semana_\d+\.xlsx$/`.
- AC-REP-12. The workbook parses (via `exceljs` or `xlsx` in Jest) and has ≥ 1 worksheet.
- AC-REP-13. First worksheet's header row matches the fixed template (TBD by architecture — pick the exceljs cell addresses).
- AC-REP-14. Export respects role-guard `jefe_area`/`rh`/`admin` (403 for `supervisor`).

---

## 3. CFDI XML Import

### Implementation reference

- Trigger A: `+ Agregar por XML` in sub-tab 6.4.
- Trigger B: `+ Cargar CFDI` in sub-tab 8.2 (misrouted, G-NOM-3).
- Handler: `handleXMLUpload(event)` (HTML 1636–1784).
- Fields extracted: RFC emisor/receptor, UUID (from TimbreFiscalDigital), Serie, Folio, Fecha, FechaTimbrado, SubTotal, IVA (TotalImpuestosTrasladados), Total, Moneda, TipoCambio, Cantidad, Descripción, ValorUnitario, MetodoPago (with FormaPago → PUE fallback).
- Output: new `<tr>` prepended to `#sub-entregas-facturas table tbody`.

### Regression candidates

- AC-REP-21. Uploading a valid CFDI 4.0 XML fixture prepends exactly one row to the Facturas tbody.
- AC-REP-22. That row contains the extracted UUID, RFC emisor, RFC receptor, and formatted Total.
- AC-REP-23. Uploading a non-CFDI XML alerts `❌ Error: No es un CFDI válido` and no row is added.
- AC-REP-24. Uploading a corrupt file alerts `❌ Error: Archivo XML inválido`.
- AC-REP-25. CFDI with `MetodoPago="PPD"` → imported row's Método de Pago cell is a badge reading `PPD`.
- AC-REP-26. CFDI missing `MetodoPago` with `FormaPago` in the PUE-mapped table → Método de Pago reads `PUE`.
- AC-REP-27. Post G-NOM-3 fix: uploading CFDI-nómina from sub-tab 8.2 inserts into the nómina CFDI table, not Facturas.

---

## Libraries currently loaded

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
```

- `jspdf` — used.
- `html2canvas` — loaded but **never invoked**. Intended for future "screenshot a card to PDF" functionality. Can be removed if that feature is dropped (small network win).

## Recommended architecture decisions (Phase 2 kickoff)

1. **XLSX export strategy:** either (a) each module wires to a per-table `GET /api/<module>/export` returning an XLSX stream (consistent with conciliación), or (b) generate client-side with SheetJS reading the current `<table>`. Recommend (a) for auditability.
2. **CFDI import strategy:** move beyond client-side parsing. A backend `POST /api/invoices/cfdi` that (i) re-parses for security, (ii) calls SAT VerificaCFDI or the PAC webservice, (iii) persists the invoice with `validacion_sat = valida/invalida/pendiente`.
3. **`html2canvas` removal or activation:** decide in architecture whether it stays. If it stays, specify where (e.g. "screenshot a module's cards to attach to an email").

## Out of scope for Phase 1 (aspirational only)

Drag-and-drop report builder, scheduled report generation, cloud storage integration, multi-format export beyond XLSX/PDF/XML, webhook notifications, data-synchronization with external ERPs, automated compliance monitoring, SOX / GDPR audit trail tooling. Not in mockup; not testable.
