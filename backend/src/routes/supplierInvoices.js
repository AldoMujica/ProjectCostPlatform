const express = require('express');
const { SupplierInvoice, Supplier, WorkOrder } = require('../models');
const { verificarRol } = require('../middleware/auth');
const { sendTableXlsx } = require('../utils/xlsxTable');

const router = express.Router();

async function resolveRefs(body) {
  const out = { ...body };
  if (!out.supplierId && out.rfcEmisor) {
    const s = await Supplier.findOne({ where: { /* best-effort RFC match via description is out-of-scope */ supplierName: out.supplierName || '' } });
    if (s) out.supplierId = s.id;
  }
  if (!out.workOrderId && out.otNumber) {
    const wo = await WorkOrder.findOne({ where: { otNumber: out.otNumber } });
    if (wo) out.workOrderId = wo.id;
  }
  return out;
}

router.get('/export', async (req, res) => {
  try {
    const rows = await SupplierInvoice.findAll({ order: [['fechaEmision', 'DESC'], ['createdAt', 'DESC']], raw: true });
    await sendTableXlsx(res, {
      filename: `facturas-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'Facturas CFDI',
      columns: [
        { header: 'RFC Emisor',     key: 'rfcEmisor',    width: 14 },
        { header: 'RFC Receptor',   key: 'rfcReceptor',  width: 14 },
        { header: 'UUID / Folio',   key: 'uuidFiscal',   width: 40 },
        { header: 'Serie',          key: 'serie',        width: 8 },
        { header: 'Folio',          key: 'folio',        width: 14 },
        { header: 'F. Emisión',     key: 'fechaEmision', width: 20 },
        { header: 'F. Cert.',       key: 'fechaCertificacion', width: 20 },
        { header: 'Régimen Fiscal', key: 'regimenFiscal', width: 22 },
        { header: 'Concepto',       key: 'concepto',     width: 32 },
        { header: 'Cantidad',       key: 'cantidad',     width: 10, fmt: (v) => (v == null ? '' : Number(v)) },
        { header: 'P. Unit.',       key: 'precioUnitario', width: 12, fmt: (v) => (v == null ? '' : Number(v)) },
        { header: 'Subtotal',       key: 'subtotal',     width: 14, fmt: (v) => (v == null ? '' : Number(v)) },
        { header: 'IVA',            key: 'iva',          width: 12, fmt: (v) => Number(v || 0) },
        { header: 'Ret. ISR',       key: 'retencionIsr', width: 12, fmt: (v) => Number(v || 0) },
        { header: 'Ret. IVA',       key: 'retencionIva', width: 12, fmt: (v) => Number(v || 0) },
        { header: 'Total',          key: 'total',        width: 14, fmt: (v) => Number(v) },
        { header: 'Moneda',         key: 'moneda',       width: 10 },
        { header: 'T/C',            key: 'tipoCambio',   width: 10, fmt: (v) => (v == null ? '' : Number(v)) },
        { header: 'Método',         key: 'metodoPago',   width: 10 },
        { header: 'Validación SAT', key: 'validacionSat', width: 16 },
      ],
      rows,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { validacionSat, rfcEmisor, otNumber } = req.query;
    const where = {};
    if (validacionSat) where.validacionSat = validacionSat;
    if (rfcEmisor) where.rfcEmisor = rfcEmisor;
    if (otNumber) where.otNumber = otNumber;
    const rows = await SupplierInvoice.findAll({ where, order: [['fechaEmision', 'DESC'], ['createdAt', 'DESC']] });
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:uuid', async (req, res) => {
  try {
    const inv = await SupplierInvoice.findOne({ where: { uuidFiscal: req.params.uuid } });
    if (!inv) return res.status(404).json({ error: 'Factura no encontrada' });
    res.json(inv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', verificarRol('admin', 'compras', 'jefe_area'), async (req, res) => {
  try {
    const payload = await resolveRefs(req.body);
    if (!payload.uuidFiscal) return res.status(400).json({ error: 'uuidFiscal requerido' });
    const inv = await SupplierInvoice.create(payload);
    res.status(201).json(inv);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// CFDI XML upload — accepts the already-parsed payload from the SPA (the
// DOMParser path). Persists the raw XML for later re-processing if needed.
// Phase-6 P6.2 will add the real PAC/SAT validation call.
router.post('/cfdi', verificarRol('admin', 'compras', 'jefe_area'), async (req, res) => {
  try {
    const payload = await resolveRefs(req.body);
    if (!payload.uuidFiscal) return res.status(400).json({ error: 'uuidFiscal requerido' });
    const [inv, created] = await SupplierInvoice.findOrCreate({
      where: { uuidFiscal: payload.uuidFiscal },
      defaults: payload,
    });
    if (!created) {
      await inv.update(payload);
    }
    res.status(created ? 201 : 200).json(inv);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', verificarRol('admin', 'compras', 'jefe_area'), async (req, res) => {
  try {
    const inv = await SupplierInvoice.findByPk(req.params.id);
    if (!inv) return res.status(404).json({ error: 'Factura no encontrada' });
    await inv.update(req.body);
    res.json(inv);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', verificarRol('admin', 'jefe_area'), async (req, res) => {
  try {
    const inv = await SupplierInvoice.findByPk(req.params.id);
    if (!inv) return res.status(404).json({ error: 'Factura no encontrada' });
    await inv.destroy();
    res.json({ message: 'Factura eliminada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/restore', verificarRol('admin'), async (req, res) => {
  try {
    const inv = await SupplierInvoice.findByPk(req.params.id, { paranoid: false });
    if (!inv) return res.status(404).json({ error: 'Factura no encontrada' });
    await inv.restore();
    res.json({ message: 'Factura restaurada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
