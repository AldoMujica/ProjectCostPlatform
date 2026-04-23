const express = require('express');
const multer = require('multer');
const ExcelJS = require('exceljs');
const { Quote } = require('../models');
const { verificarRol } = require('../middleware/auth');
const { sendTableXlsx } = require('../utils/xlsxTable');

const router = express.Router();

// In-memory upload — the XLSX is parsed once and discarded; no need to
// persist it on disk (unlike the checador flow which keeps it for a preview).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB — the master workbook is ~108KB
  fileFilter: (req, file, cb) => {
    const ok = /\.xlsx$/i.test(file.originalname || '');
    cb(ok ? null : new Error('Solo se aceptan archivos .xlsx'), ok);
  },
});

// Columns exported, in the same order as the "Control Ventas 2026"
// workbook's cotización block (first 19 columns, minus the blank C1
// column and the ITEM counter which we regenerate from array index).
const EXPORT_COLUMNS = [
  { header: 'Item', key: 'item', width: 6 },
  { header: 'CLIENTE', key: 'client', width: 22 },
  { header: 'PROYECTO / PROGRAMA', key: 'proyecto', width: 22 },
  { header: 'CELDA', key: 'celda', width: 10 },
  { header: 'RFQ', key: 'rfq', width: 12 },
  { header: 'MECR', key: 'mecr', width: 12 },
  { header: 'COT REF. ALENSTEC (COT-AL)', key: 'cotRef', width: 22 },
  { header: 'COT ALENSTEC (COT-AL)', key: 'quoteNumber', width: 22 },
  { header: 'FECHA (COT-AL)', key: 'fechaCotizacion', width: 14, fmt: fmtDate },
  { header: 'COSTO COT-AL (USD) (Sin IVA)', key: 'amount', width: 16, fmt: (v) => (v == null ? '' : Number(v)) },
  { header: 'ORDEN DE COMPRA (CLIENTE)', key: 'ocCliente', width: 22 },
  { header: 'TIPO DE CONTRATO', key: 'tipoContrato', width: 22 },
  { header: 'FECHA O.C.', key: 'fechaOC', width: 14, fmt: fmtDate },
  { header: 'COSTO O.C. (USD) (Sin IVA)', key: 'costoOC', width: 16, fmt: (v) => (v == null ? '' : Number(v)) },
  { header: 'FECHA COMPROMISO ENTREGA', key: 'fechaCompromiso', width: 20, fmt: fmtDate },
  { header: 'TIPO DE CAMBIO (USD)', key: 'exchangeRate', width: 12, fmt: (v) => (v == null ? '' : Number(v)) },
  { header: 'OT. ALENSTEC (OT-AL-)', key: 'otNumber', width: 16 },
  { header: 'DESCRIPCION DE PROYECTO', key: 'description', width: 60 },
  { header: 'TIPO', key: 'tipo', width: 12 },
  { header: 'ESTADO', key: 'status', width: 12 },
];

function fmtDate(v) {
  if (!v) return '';
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d;
}

router.get('/export', async (req, res) => {
  try {
    const rows = await Quote.findAll({ order: [['createdAt', 'DESC']], raw: true });
    const withItem = rows.map((r, i) => ({ ...r, item: i + 1 }));
    await sendTableXlsx(res, {
      filename: `control-ventas-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'Control Ventas 2026',
      columns: EXPORT_COLUMNS,
      rows: withItem,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Header-string → model field. Matches are case-insensitive and whitespace/
// line-break insensitive so the same mapping handles both the workbook's
// multi-line rich-text headers and whatever the user types manually.
const HEADER_MAP = new Map([
  ['cliente', 'client'],
  ['proyecto/programa', 'proyecto'],
  ['celda', 'celda'],
  ['rfq', 'rfq'],
  ['mecr', 'mecr'],
  ['cotref.alenstec', 'cotRef'],
  ['cotref.alenstec(cot-al)', 'cotRef'],
  ['cotalenstec', 'quoteNumber'],
  ['cotalenstec(cot-al)', 'quoteNumber'],
  ['fecha(cot-al)', 'fechaCotizacion'],
  ['fecha(cot-al)(dd/mm/aaaa)', 'fechaCotizacion'],
  ['costocot-al', 'amount'],
  ['costocot-al(usd)', 'amount'],
  ['costocot-al(usd)(siniva)', 'amount'],
  ['ordendecompra', 'ocCliente'],
  ['ordendecompra(cliente)', 'ocCliente'],
  ['tipodecontrato', 'tipoContrato'],
  ['fechao.c.', 'fechaOC'],
  ['fechao.c.(dd/mm/aaaa)', 'fechaOC'],
  ['costoo.c.', 'costoOC'],
  ['costoo.c.(usd)', 'costoOC'],
  ['costoo.c.(usd)(siniva)', 'costoOC'],
  ['fechacompromisoentrega', 'fechaCompromiso'],
  ['fechacompromisoentrega(dd/mm/aaaa)', 'fechaCompromiso'],
  ['tipodecambio', 'exchangeRate'],
  ['tipodecambio(usd)', 'exchangeRate'],
  ['ot.alenstec', 'otNumber'],
  ['ot.alenstec(ot-al-)', 'otNumber'],
  ['descripciondeproyecto', 'description'],
  ['tipo', 'tipo'],
  ['estado', 'status'],
]);

const DATE_FIELDS = new Set(['fechaCotizacion', 'fechaOC', 'fechaCompromiso']);
const NUMBER_FIELDS = new Set(['amount', 'costoOC', 'exchangeRate']);

function normalizeHeader(raw) {
  if (raw == null) return '';
  let s;
  if (typeof raw === 'object') {
    if (Array.isArray(raw.richText)) s = raw.richText.map((t) => t.text).join('');
    else if (raw.text) s = raw.text;
    else s = '';
  } else {
    s = String(raw);
  }
  return s.toLowerCase().replace(/\s+/g, '').replace(/[\n\r\t]/g, '');
}

function cellValue(cell) {
  const v = cell && cell.value;
  if (v == null) return null;
  if (typeof v === 'object') {
    if (v instanceof Date) return v;
    if (Array.isArray(v.richText)) return v.richText.map((t) => t.text).join('');
    if (v.text) return v.text;
    if (v.result !== undefined) return v.result;
    if (v.formula) return null; // formula with no cached result
  }
  return v;
}

function coerce(field, value) {
  if (value == null || value === '' || value === 'N/A') return null;
  if (DATE_FIELDS.has(field)) {
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (NUMBER_FIELDS.has(field)) {
    const n = typeof value === 'number' ? value : Number(String(value).replace(/[,\s]/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return typeof value === 'string' ? value.trim() : String(value);
}

// Scan the first 10 rows for a row whose cells collectively match the
// most known headers. The workbook's header lives on row 3 but hand-made
// uploads may start on row 1 — this stays tolerant without hardcoding.
// Uses actualColumnCount (sparse bound) instead of columnCount (nominal
// max) because XLSX files often report columnCount as the sheet's
// theoretical 16k limit even when only a handful of cells are populated.
function locateHeaderRow(ws) {
  const colBound = Math.max(ws.actualColumnCount || 0, 1);
  const maxScan = Math.min(10, Math.max(ws.actualRowCount || 0, 1));
  let best = { rowNum: null, map: null, score: 0 };
  for (let r = 1; r <= maxScan; r++) {
    const row = ws.getRow(r);
    const map = {};
    let score = 0;
    for (let c = 1; c <= colBound; c++) {
      const key = normalizeHeader(row.getCell(c).value);
      if (!key) continue;
      const field = HEADER_MAP.get(key);
      if (field && map[field] == null) {
        map[field] = c;
        score += 1;
      }
    }
    if (score > best.score) best = { rowNum: r, map, score };
  }
  return best;
}

router.post('/import', verificarRol('admin', 'ventas'), upload.single('archivo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se envió archivo' });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(req.file.buffer);

    const preferred = wb.getWorksheet('Control Ventas 2026');
    const sheet = preferred || wb.worksheets[0];
    if (!sheet) return res.status(400).json({ error: 'El libro no contiene hojas' });

    const header = locateHeaderRow(sheet);
    if (!header.map || header.map.quoteNumber == null) {
      return res.status(400).json({
        error: 'No se encontró la columna "COT ALENSTEC" — revise la plantilla.',
      });
    }

    const results = { created: 0, updated: 0, skipped: 0, errors: [] };
    // Use actualRowCount (sparse bound) not rowCount — XLSX files often
    // report rowCount = 1,048,576 (the XLSX row limit) even when only a
    // handful of cells are populated. Looping to that number OOMs Node.
    // Hard cap to 10_000 data rows as a defensive upper bound.
    const MAX_DATA_ROWS = 10_000;
    const actualLast = Math.max(sheet.actualRowCount || 0, header.rowNum);
    const lastRow = Math.min(actualLast, header.rowNum + MAX_DATA_ROWS);
    const quoteNumberCol = header.map.quoteNumber;

    let consecutiveBlank = 0;
    for (let r = header.rowNum + 1; r <= lastRow; r++) {
      const row = sheet.getRow(r);

      // The workbook repeats compound/sub-headers on the row after the main
      // one (e.g. "COT ALENSTEC\n(COT-AL)" again). Skip any row whose
      // quoteNumber cell is itself a header label instead of a real value.
      const qnKey = normalizeHeader(row.getCell(quoteNumberCol).value);
      if (qnKey && HEADER_MAP.get(qnKey) === 'quoteNumber') { results.skipped += 1; continue; }

      const record = {};
      for (const [field, col] of Object.entries(header.map)) {
        record[field] = coerce(field, cellValue(row.getCell(col)));
      }
      if (!record.quoteNumber) {
        results.skipped += 1;
        consecutiveBlank += 1;
        // Early-exit if we hit a long blank tail — protects against runaway
        // iteration if actualRowCount was miscomputed.
        if (consecutiveBlank >= 50) break;
        continue;
      }
      consecutiveBlank = 0;
      if (!record.client) record.client = 'SIN CLIENTE';
      if (!record.description) record.description = record.proyecto || record.quoteNumber;
      if (record.amount == null) record.amount = 0;

      try {
        const existing = await Quote.findOne({ where: { quoteNumber: record.quoteNumber } });
        if (existing) {
          await existing.update(record);
          results.updated += 1;
        } else {
          await Quote.create(record);
          results.created += 1;
        }
      } catch (err) {
        results.errors.push({ row: r, quoteNumber: record.quoteNumber, message: err.message });
      }
    }

    res.json({ exitoso: true, ...results });
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

module.exports = router;
