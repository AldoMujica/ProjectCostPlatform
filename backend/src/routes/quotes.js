const express = require('express');
const multer  = require('multer');
const ExcelJS = require('exceljs');
const { Quote } = require('../models');
const { verificarRol } = require('../middleware/auth');
const { sendTableXlsx } = require('../utils/xlsxTable');
const { normalizeBreakdown } = require('../utils/laborActivities');

const router = express.Router();

// multer en memoria (límite 20 MB — los XLSX del Control de Ventas pueden ser grandes)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// Helpers para extraer sub-campos de columnas JSON
const jn = (obj, key) => { const v = obj && obj[key]; return v == null ? '' : Number(v); };

// Columns exported — alineadas con "Control de Ventas 2026" + secciones
// expandidas (Labor Indirecta / Labor Directa / Materiales / Viáticos /
// Logística / Totales Finales).
const EXPORT_COLUMNS = [
  // ── Sección 1: Datos básicos (20 col) ──
  { header: 'Item',                          key: 'item',            width: 6 },
  { header: 'CLIENTE',                       key: 'client',          width: 22 },
  { header: 'PROYECTO / PROGRAMA',           key: 'proyecto',        width: 22 },
  { header: 'CELDA',                         key: 'celda',           width: 10 },
  { header: 'RFQ',                           key: 'rfq',             width: 12 },
  { header: 'MECR',                          key: 'mecr',            width: 12 },
  { header: 'COT REF. ALENSTEC',             key: 'cotRef',          width: 22 },
  { header: 'COT ALENSTEC (COT-AL)',          key: 'quoteNumber',     width: 22 },
  { header: 'FECHA (COT-AL)',                key: 'fechaCotizacion', width: 14, fmt: fmtDate },
  { header: 'COSTO COT-AL (USD) (Sin IVA)', key: 'amount',          width: 16, fmt: (v) => (v == null ? '' : Number(v)) },
  { header: 'ORDEN DE COMPRA (CLIENTE)',     key: 'ocCliente',       width: 22 },
  { header: 'TIPO DE CONTRATO',              key: 'tipoContrato',    width: 20 },
  { header: 'FECHA O.C.',                   key: 'fechaOC',         width: 14, fmt: fmtDate },
  { header: 'COSTO O.C. (USD) (Sin IVA)',   key: 'costoOC',         width: 16, fmt: (v) => (v == null ? '' : Number(v)) },
  { header: 'FECHA COMPROMISO ENTREGA',     key: 'fechaCompromiso', width: 20, fmt: fmtDate },
  { header: 'TIPO DE CAMBIO (USD)',          key: 'exchangeRate',    width: 12, fmt: (v) => (v == null ? '' : Number(v)) },
  { header: 'OT. ALENSTEC (OT-AL-)',         key: 'otNumber',        width: 16 },
  { header: 'DESCRIPCION DE PROYECTO',      key: 'description',     width: 60 },
  { header: 'TIPO',                          key: 'tipo',            width: 12 },
  { header: 'ESTADO',                        key: 'status',          width: 12 },

  // ── Sección 2: Labor Indirecta (3 col — suma de actividades) ──
  { header: 'LI · HRS COT',   key: '_liCotHrs',  width: 10,
    fmt: (_, r) => { const li = Array.isArray(r.laborIndirecta) ? r.laborIndirecta : []; return li.reduce((s, x) => s + (Number(x.cotHrs) || 0), 0) || ''; } },
  { header: 'LI · HRS REAL',  key: '_liRealHrs', width: 10,
    fmt: (_, r) => { const li = Array.isArray(r.laborIndirecta) ? r.laborIndirecta : []; return li.reduce((s, x) => s + (Number(x.realHrs) || 0), 0) || ''; } },
  { header: 'LI · COSTO (USD)', key: '_liCost',  width: 12,
    fmt: (_, r) => { const li = Array.isArray(r.laborIndirecta) ? r.laborIndirecta : []; return li.reduce((s, x) => s + (Number(x.totalCost) || 0), 0) || ''; } },

  // ── Sección 3: Labor Directa — Ingeniería (4 col) ──
  { header: 'ING · HRS COT',    key: '_ingCotHrs',   width: 10, fmt: (_, r) => jn(r.laborDirectaIngenieria, 'cotHrs')   || '' },
  { header: 'ING · HRS REAL',   key: '_ingRealHrs',  width: 10, fmt: (_, r) => jn(r.laborDirectaIngenieria, 'realHrs')  || '' },
  { header: 'ING · $/HR',       key: '_ingCostPerHr',width: 10, fmt: (_, r) => jn(r.laborDirectaIngenieria, 'costPerHr')|| '' },
  { header: 'ING · COSTO (USD)',key: '_ingTotal',     width: 12, fmt: (_, r) => jn(r.laborDirectaIngenieria, 'totalCost')|| '' },

  // ── Sección 4: Labor Directa — Manufactura — Proc COT (10 col) ──
  { header: 'MNF-CP [B] Corte',    key: '_mnfCpCorte',  width: 10, fmt: (_, r) => jn((r.laborDirectaManufactura||{}).cotProcesses, 'corte')          || '' },
  { header: 'MNF-CP [C] Fab.',     key: '_mnfCpFab',    width: 10, fmt: (_, r) => jn((r.laborDirectaManufactura||{}).cotProcesses, 'fabricacion')     || '' },
  { header: 'MNF-CP [E] Maq.',     key: '_mnfCpMaq',    width: 10, fmt: (_, r) => jn((r.laborDirectaManufactura||{}).cotProcesses, 'maquinado')       || '' },
  { header: 'MNF-CP [F] Hilo',     key: '_mnfCpHilo',   width: 10, fmt: (_, r) => jn((r.laborDirectaManufactura||{}).cotProcesses, 'hiloErosion')     || '' },
  { header: 'MNF-CP [G] Ens.',     key: '_mnfCpEns',    width: 10, fmt: (_, r) => jn((r.laborDirectaManufactura||{}).cotProcesses, 'ensamble')        || '' },
  { header: 'MNF-CP [H] Elec.',    key: '_mnfCpElec',   width: 10, fmt: (_, r) => jn((r.laborDirectaManufactura||{}).cotProcesses, 'laborElectrica')  || '' },
  { header: 'MNF-CP [D] Otros',    key: '_mnfCpOtros',  width: 10, fmt: (_, r) => jn((r.laborDirectaManufactura||{}).cotProcesses, 'otrosProc')       || '' },
  { header: 'MNF-CP [J] Shop.',    key: '_mnfCpShop',   width: 10, fmt: (_, r) => jn((r.laborDirectaManufactura||{}).cotProcesses, 'shopper')         || '' },
  { header: 'MNF-CP [K] Cert.',    key: '_mnfCpCert',   width: 10, fmt: (_, r) => jn((r.laborDirectaManufactura||{}).cotProcesses, 'certDimensional') || '' },
  { header: 'MNF-CP [L] Emp.',     key: '_mnfCpEmp',    width: 10, fmt: (_, r) => jn((r.laborDirectaManufactura||{}).cotProcesses, 'empaque')         || '' },

  // Inst COT (5 col)
  { header: 'MNF-CI Sup.',   key: '_mnfCiSup',   width: 10, fmt: (_, r) => jn((r.laborDirectaManufactura||{}).cotInstall, 'supervisor')      || '' },
  { header: 'MNF-CI TecMec.',key: '_mnfCiTec',   width: 10, fmt: (_, r) => jn((r.laborDirectaManufactura||{}).cotInstall, 'tecnicoMecanico') || '' },
  { header: 'MNF-CI Eléc.',  key: '_mnfCiElec',  width: 10, fmt: (_, r) => jn((r.laborDirectaManufactura||{}).cotInstall, 'electrico')       || '' },
  { header: 'MNF-CI Prog.',  key: '_mnfCiProg',  width: 10, fmt: (_, r) => jn((r.laborDirectaManufactura||{}).cotInstall, 'programador')     || '' },
  { header: 'MNF-CI Total',  key: '_mnfCiTotal', width: 10, fmt: (_, r) => jn((r.laborDirectaManufactura||{}).cotInstall, 'total')           || '' },

  // Proc REAL (9 col)
  { header: 'MNF-RP [B] Corte',  key: '_mnfRpCorte',  width: 10, fmt: (_, r) => jn((r.laborDirectaManufactura||{}).realProcesses, 'corte')         || '' },
  { header: 'MNF-RP [C] Fab.',   key: '_mnfRpFab',    width: 10, fmt: (_, r) => jn((r.laborDirectaManufactura||{}).realProcesses, 'fabricacion')    || '' },
  { header: 'MNF-RP [E] Maq.',   key: '_mnfRpMaq',    width: 10, fmt: (_, r) => jn((r.laborDirectaManufactura||{}).realProcesses, 'maquinado')      || '' },
  { header: 'MNF-RP [F] Hilo',   key: '_mnfRpHilo',   width: 10, fmt: (_, r) => jn((r.laborDirectaManufactura||{}).realProcesses, 'hiloErosion')    || '' },
  { header: 'MNF-RP [G] Ens.',   key: '_mnfRpEns',    width: 10, fmt: (_, r) => jn((r.laborDirectaManufactura||{}).realProcesses, 'ensamble')       || '' },
  { header: 'MNF-RP [H] Elec.',  key: '_mnfRpElec',   width: 10, fmt: (_, r) => jn((r.laborDirectaManufactura||{}).realProcesses, 'laborElectrica') || '' },
  { header: 'MNF-RP [D] Otros',  key: '_mnfRpOtros',  width: 10, fmt: (_, r) => jn((r.laborDirectaManufactura||{}).realProcesses, 'otrosProc')      || '' },
  { header: 'MNF-RP [J] Shop.',  key: '_mnfRpShop',   width: 10, fmt: (_, r) => jn((r.laborDirectaManufactura||{}).realProcesses, 'shopper')        || '' },
  { header: 'MNF-RP [K] Cert.',  key: '_mnfRpCert',   width: 10, fmt: (_, r) => jn((r.laborDirectaManufactura||{}).realProcesses, 'certDimensional')|| '' },

  // Inst REAL (5 col)
  { header: 'MNF-RI Diseño', key: '_mnfRiDis',   width: 10, fmt: (_, r) => jn((r.laborDirectaManufactura||{}).realInstall, 'diseno')     || '' },
  { header: 'MNF-RI Tec.',   key: '_mnfRiTec',   width: 10, fmt: (_, r) => jn((r.laborDirectaManufactura||{}).realInstall, 'tecnico')    || '' },
  { header: 'MNF-RI Eléc.',  key: '_mnfRiElec',  width: 10, fmt: (_, r) => jn((r.laborDirectaManufactura||{}).realInstall, 'electrico')  || '' },
  { header: 'MNF-RI Prog.',  key: '_mnfRiProg',  width: 10, fmt: (_, r) => jn((r.laborDirectaManufactura||{}).realInstall, 'programador')|| '' },
  { header: 'MNF-RI Total',  key: '_mnfRiTotal', width: 10, fmt: (_, r) => jn((r.laborDirectaManufactura||{}).realInstall, 'total')      || '' },

  // MNF $/HR + Costo (2 col)
  { header: 'MNF $/HR',        key: '_mnfCostPerHr', width: 10, fmt: (_, r) => jn(r.laborDirectaManufactura, 'costPerHr') || '' },
  { header: 'MNF COSTO (USD)', key: '_mnfTotal',     width: 12, fmt: (_, r) => jn(r.laborDirectaManufactura, 'totalCost') || '' },

  // ── Sección 5: Labor Directa — Automatización (4 col) ──
  { header: 'AUT · HRS COT',    key: '_autCotHrs',   width: 10, fmt: (_, r) => jn(r.laborDirectaAutomatizacion, 'cotHrs')   || '' },
  { header: 'AUT · HRS REAL',   key: '_autRealHrs',  width: 10, fmt: (_, r) => jn(r.laborDirectaAutomatizacion, 'realHrs')  || '' },
  { header: 'AUT · $/HR',       key: '_autCostPerHr',width: 10, fmt: (_, r) => jn(r.laborDirectaAutomatizacion, 'costPerHr')|| '' },
  { header: 'AUT · COSTO (USD)',key: '_autTotal',     width: 12, fmt: (_, r) => jn(r.laborDirectaAutomatizacion, 'totalCost')|| '' },

  // ── Sección 6: Materiales (10 col) ──
  { header: 'MAT Aceros',        key: '_matAceros',  width: 12, fmt: (_, r) => jn(r.materiales, 'aceros')        || '' },
  { header: 'MAT Plásticos',     key: '_matPlas',    width: 12, fmt: (_, r) => jn(r.materiales, 'plasticos')     || '' },
  { header: 'MAT Recubrimientos',key: '_matRecub',   width: 14, fmt: (_, r) => jn(r.materiales, 'recubrimientos')|| '' },
  { header: 'MAT Tratamientos',  key: '_matTrat',    width: 14, fmt: (_, r) => jn(r.materiales, 'tratamientos')  || '' },
  { header: 'MAT Componentes',   key: '_matComp',    width: 12, fmt: (_, r) => jn(r.materiales, 'componentes')   || '' },
  { header: 'MAT Certificados',  key: '_matCert',    width: 12, fmt: (_, r) => jn(r.materiales, 'certificados')  || '' },
  { header: 'MAT Sub-total',     key: '_matSub',     width: 12, fmt: (_, r) => jn(r.materiales, 'subtotal')      || '' },
  { header: 'MAT % Utilidad',    key: '_matPct',     width: 10, fmt: (_, r) => jn(r.materiales, 'profitPct')     || '' },
  { header: 'MAT Utilidad USD',  key: '_matProfitUsd',width:12, fmt: (_, r) => jn(r.materiales, 'profitUsd')     || '' },
  { header: 'MAT Total USD',     key: '_matTotal',   width: 12, fmt: (_, r) => jn(r.materiales, 'total')         || '' },

  // ── Sección 7: Viáticos (5 col) ──
  { header: 'VIA Comida',   key: '_viaComida',   width: 10, fmt: (_, r) => jn(r.viaticos, 'comida')   || '' },
  { header: 'VIA Estancia', key: '_viaEstancia', width: 10, fmt: (_, r) => jn(r.viaticos, 'estancia') || '' },
  { header: 'VIA Peaje',    key: '_viaPeaje',    width: 10, fmt: (_, r) => jn(r.viaticos, 'peaje')    || '' },
  { header: 'VIA Gasolina', key: '_viaGasolina', width: 10, fmt: (_, r) => jn(r.viaticos, 'gasolina') || '' },
  { header: 'VIA Total',    key: '_viaTotal',    width: 10, fmt: (_, r) => jn(r.viaticos, 'total')    || '' },

  // ── Sección 8: Logística (3 col) ──
  { header: 'LOG Envío',   key: '_logEnvio',   width: 10, fmt: (_, r) => jn(r.logistica, 'envio')    || '' },
  { header: 'LOG Embalaje',key: '_logEmbalaje',width: 10, fmt: (_, r) => jn(r.logistica, 'embalaje') || '' },
  { header: 'LOG Total',   key: '_logTotal',   width: 10, fmt: (_, r) => jn(r.logistica, 'total')    || '' },

  // ── Sección 9: Totales Finales (3 col) + Notas ──
  { header: 'UTILIDAD / PROFIT (USD)', key: 'utilidadFinal', width: 14, fmt: (v) => (v == null ? '' : Number(v)) },
  { header: 'IVA EMPRESA (USD)',        key: 'ivaEmpresa',    width: 14, fmt: (v) => (v == null ? '' : Number(v)) },
  { header: 'TOTAL FINAL (USD)',        key: 'totalFinal',    width: 14, fmt: (v) => (v == null ? '' : Number(v)) },
  { header: 'NOTAS',                    key: 'notas',         width: 40 },
];

function fmtDate(v) {
  if (!v) return '';
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d;
}

// ══════════════════════════════════════════════════════════════════
// POST /import — Upsert masivo desde el XLSX "Control de Ventas 2026"
// El upsert usa quoteNumber (COT Alenstec) como clave. Columnas que no
// existan en la hoja se omiten (null). Devuelve { created, updated,
// skipped, errors[] }.
// ══════════════════════════════════════════════════════════════════
router.post('/import', verificarRol('admin', 'ventas'), upload.single('archivo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Archivo no recibido. Campo multipart esperado: "archivo".' });

  // ── Helpers de conversión de celda ExcelJS ──
  const toStr = (v) => {
    if (v == null) return null;
    if (typeof v === 'object' && v.richText) return v.richText.map((r) => r.text || '').join('').trim() || null;
    if (typeof v === 'object' && v.text != null) return String(v.text).trim() || null;
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    return String(v).trim() || null;
  };
  const toNum = (v) => {
    if (v == null || v === '') return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  };
  const toDate = (v) => {
    if (!v) return null;
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  };

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    // Buscar la hoja: prefiere "Control Ventas 2026" o la primera disponible
    const sheet =
      workbook.getWorksheet('Control Ventas 2026') ||
      workbook.getWorksheet('Control de Ventas 2026') ||
      workbook.getWorksheet('Cotizaciones') ||
      workbook.worksheets[0];

    if (!sheet) return res.status(400).json({ error: 'No se encontró ninguna hoja en el archivo XLSX.' });

    // ── Construir mapa header-normalizado → número de columna ──
    // Maneja multi-fila de cabeceras: toma la última fila con valor en col 1
    // o la fila 1 si no hay multi-cabecera. Normaliza a mayúsculas sin espacios
    // extra para matching flexible.
    const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim().toUpperCase();
    const headerMap = {};  // { NORMALIZED_HEADER: colNumber }

    // Escanear las primeras 4 filas buscando los encabezados de columna
    // (la tabla puede tener multi-fila de headers con grupos)
    for (let r = 1; r <= Math.min(4, sheet.rowCount); r++) {
      sheet.getRow(r).eachCell({ includeEmpty: false }, (cell, col) => {
        const key = norm(toStr(cell.value));
        if (key && !headerMap[key]) headerMap[key] = col;
      });
    }

    // Detectar fila de datos (primera fila después de cabeceras que tenga
    // datos numéricos o string en las primeras columnas)
    let dataStartRow = 2;
    for (let r = 2; r <= Math.min(6, sheet.rowCount); r++) {
      const firstCell = toStr(sheet.getRow(r).getCell(1).value);
      if (firstCell && !isNaN(Number(firstCell))) { dataStartRow = r; break; }
      if (firstCell && firstCell.length > 0 && !/^(CLIENTE|PROYECTO|ITEM)/i.test(firstCell)) {
        dataStartRow = r; break;
      }
    }

    // Función para obtener valor de celda por nombre de header (prueba varios alias)
    const getByHeaders = (row, ...aliases) => {
      for (const alias of aliases) {
        const col = headerMap[norm(alias)];
        if (col) return row.getCell(col).value;
      }
      return undefined;
    };

    let created = 0, updated = 0, skipped = 0;
    const errors = [];

    for (let rowNum = dataStartRow; rowNum <= sheet.rowCount; rowNum++) {
      const row = sheet.getRow(rowNum);

      // Saltar filas completamente vacías
      let rowEmpty = true;
      row.eachCell({ includeEmpty: false }, () => { rowEmpty = false; });
      if (rowEmpty) continue;

      // quoteNumber es la clave de upsert (obligatoria).
      // Normalizar whitespace: colapsar saltos de línea / tabs a espacio simple.
      let quoteNumber = toStr(
        getByHeaders(row,
          'COT ALENSTEC (COT-AL)', 'COT ALENSTEC', 'COTIZACION', 'COT-AL',
          'COT REF. ALENSTEC (COT-AL)', 'NUMERO DE COTIZACION')
      );
      if (quoteNumber) quoteNumber = quoteNumber.replace(/\s+/g, ' ').trim();
      if (!quoteNumber) { skipped++; continue; }

      // Saltar filas que son cabeceras disfrazadas de datos (el excel puede
      // tener el texto del header repetido en la primera celda de datos).
      const HEADER_RE = /^(COT[\s-]ALENSTEC|CLIENTE|PROYECTO|ITEM|N[oO]\.?[\s#]|DESCRIPCI[OÓ]N|COSTO|FECHA|ESTADO)/i;
      if (HEADER_RE.test(quoteNumber)) { skipped++; continue; }

      // ── Campos escalares básicos ──
      const payload = {
        quoteNumber,
        client: toStr(getByHeaders(row, 'CLIENTE', 'CLIENT')) || 'Sin nombre',
        description: toStr(getByHeaders(row,
          'DESCRIPCION DE PROYECTO', 'DESCRIPCION', 'DESCRIPTION', 'PROYECTO')) || '',
        amount: toNum(getByHeaders(row,
          'COSTO COT-AL (USD) (SIN IVA)', 'COSTO COT-AL (USD)', 'COSTO COT-AL', 'MONTO')) || 0,
        currency: 'USD',
        status: toStr(getByHeaders(row, 'ESTADO', 'STATUS')) || 'Pendiente',
        tipo: toStr(getByHeaders(row, 'TIPO', 'TYPE')) || null,
        proyecto: toStr(getByHeaders(row, 'PROYECTO / PROGRAMA', 'PROYECTO', 'PROGRAMA')) || null,
        celda: toStr(getByHeaders(row, 'CELDA')) || null,
        rfq: toStr(getByHeaders(row, 'RFQ')) || null,
        mecr: toStr(getByHeaders(row, 'MECR')) || null,
        cotRef: toStr(getByHeaders(row,
          'COT REF. ALENSTEC', 'COT REF. ALENSTEC (COT-AL)', 'COT REF')) || null,
        fechaCotizacion: toDate(getByHeaders(row,
          'FECHA (COT-AL)', 'FECHA COT-AL', 'FECHA COT', 'FECHA')) || null,
        ocCliente: toStr(getByHeaders(row,
          'ORDEN DE COMPRA (CLIENTE)', 'OC CLIENTE', 'OC')) || null,
        tipoContrato: toStr(getByHeaders(row, 'TIPO DE CONTRATO', 'TIPO CONTRATO')) || null,
        fechaOC: toDate(getByHeaders(row, 'FECHA O.C.', 'FECHA OC')) || null,
        costoOC: toNum(getByHeaders(row,
          'COSTO O.C. (USD) (SIN IVA)', 'COSTO O.C. (USD)', 'COSTO O.C.', 'COSTO OC')) || null,
        fechaCompromiso: toDate(getByHeaders(row,
          'FECHA COMPROMISO ENTREGA', 'FECHA COMPROMISO')) || null,
        exchangeRate: toNum(getByHeaders(row,
          'TIPO DE CAMBIO (USD)', 'TIPO DE CAMBIO', 'T/C')) || null,
        otNumber: toStr(getByHeaders(row,
          'OT. ALENSTEC (OT-AL-)', 'OT ALENSTEC', 'OT-AL')) || null,
        // Campos extendidos (presentes en nuestro export; ignorados si no existen)
        utilidadFinal: toNum(getByHeaders(row, 'UTILIDAD / PROFIT (USD)', 'UTILIDAD')) || null,
        ivaEmpresa:    toNum(getByHeaders(row, 'IVA EMPRESA (USD)', 'IVA EMPRESA')) || null,
        totalFinal:    toNum(getByHeaders(row, 'TOTAL FINAL (USD)', 'TOTAL FINAL')) || null,
        notas:         toStr(getByHeaders(row, 'NOTAS', 'OBSERVACIONES')) || null,
      };

      // Validar status permitido
      const validStatus = ['Pendiente', 'Aprobada', 'Rechazada', 'Expirada'];
      if (payload.status && !validStatus.includes(payload.status)) payload.status = 'Pendiente';
      const validTipo = ['Nuevo', 'Refurbish', 'Servicio'];
      if (payload.tipo && !validTipo.includes(payload.tipo)) payload.tipo = null;

      try {
        const existing = await Quote.findOne({ where: { quoteNumber } });
        if (existing) {
          await existing.update(payload);
          updated++;
        } else {
          await Quote.create(payload);
          created++;
        }
      } catch (rowErr) {
        // Violación de UNIQUE: el registro existe pero está soft-deleted (paranoid:true).
        // Recuperarlo con paranoid:false, restaurarlo y actualizar.
        if (rowErr.name === 'SequelizeUniqueConstraintError') {
          try {
            const softDeleted = await Quote.findOne({ where: { quoteNumber }, paranoid: false });
            if (softDeleted) {
              await softDeleted.restore();
              await softDeleted.update(payload);
              updated++;
            } else {
              errors.push({ row: rowNum, quoteNumber, error: rowErr.message });
            }
          } catch (restoreErr) {
            errors.push({ row: rowNum, quoteNumber, error: restoreErr.message });
          }
        } else {
          errors.push({ row: rowNum, quoteNumber, error: rowErr.message });
        }
      }
    }

    return res.json({ created, updated, skipped, errors });
  } catch (err) {
    console.error('quotes/import error:', err);
    return res.status(500).json({ error: err.message });
  }
});

router.get('/export', async (req, res) => {
  try {
    const rows = await Quote.findAll({ order: [['createdAt', 'DESC']], raw: true });
    const withItem = rows.map((r, i) => ({ ...r, item: i + 1 }));
    await sendTableXlsx(res, {
      filename: `cotizaciones-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'Cotizaciones',
      columns: EXPORT_COLUMNS,
      rows: withItem,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;
    const quotes = await Quote.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json(quotes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/kpi/open-count', async (req, res) => {
  try {
    const count = await Quote.count({ where: { status: 'Pendiente' } });
    res.json({ openCount: count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const q = await Quote.findByPk(req.params.id);
    if (!q) return res.status(404).json({ error: 'Quote not found' });
    res.json(q);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', verificarRol('admin', 'ventas'), async (req, res) => {
  try {
    const q = await Quote.create(req.body);
    res.status(201).json(q);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', verificarRol('admin', 'ventas'), async (req, res) => {
  try {
    const q = await Quote.findByPk(req.params.id);
    if (!q) return res.status(404).json({ error: 'Quote not found' });
    await q.update(req.body);
    res.json(q);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', verificarRol('admin', 'jefe_area'), async (req, res) => {
  try {
    const q = await Quote.findByPk(req.params.id);
    if (!q) return res.status(404).json({ error: 'Cotización no encontrada' });
    await q.destroy();
    res.json({ message: 'Cotización eliminada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/restore', verificarRol('admin'), async (req, res) => {
  try {
    const q = await Quote.findByPk(req.params.id, { paranoid: false });
    if (!q) return res.status(404).json({ error: 'Cotización no encontrada' });
    await q.restore();
    res.json({ message: 'Cotización restaurada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
