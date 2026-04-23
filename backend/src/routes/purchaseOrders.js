const express = require('express');
const { Op } = require('sequelize');
const { PurchaseOrder, Supplier, WorkOrder } = require('../models');
const { verificarRol } = require('../middleware/auth');
const { sendTableXlsx } = require('../utils/xlsxTable');

const router = express.Router();

async function resolveRefs(body) {
  const out = { ...body };
  if (!out.supplierId && out.supplierName) {
    const s = await Supplier.findOne({ where: { supplierName: out.supplierName } });
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
    const rows = await PurchaseOrder.findAll({ order: [['issueDate', 'DESC'], ['createdAt', 'DESC']], raw: true });
    await sendTableXlsx(res, {
      filename: `ocp-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'Órdenes de Compra',
      columns: [
        { header: 'No. OC',      key: 'ocNumber',    width: 18 },
        { header: 'Proveedor',   key: 'supplierName', width: 28 },
        { header: 'OT',          key: 'otNumber',     width: 14 },
        { header: 'Descripción', key: 'description',  width: 44 },
        { header: 'Moneda',      key: 'currency',     width: 10 },
        { header: 'Monto',       key: 'amount',       width: 14, fmt: (v) => Number(v) },
        { header: 'F. Emisión',  key: 'issueDate',    width: 14 },
        { header: 'F. Entrega',  key: 'expectedDeliveryDate', width: 14 },
        { header: 'Estado',      key: 'status',       width: 14 },
      ],
      rows,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/kpi/summary', async (req, res) => {
  try {
    const pending = await PurchaseOrder.count({ where: { status: { [Op.in]: ['Pendiente', 'Parcial'] } } });
    const total = await PurchaseOrder.sum('amount', { where: { status: { [Op.in]: ['Pendiente', 'Parcial'] } } });
    res.json({ openCount: pending, openAmount: total || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { status, otNumber, supplierId } = req.query;
    const where = {};
    if (status) where.status = status;
    if (otNumber) where.otNumber = otNumber;
    if (supplierId) where.supplierId = supplierId;
    const rows = await PurchaseOrder.findAll({ where, order: [['issueDate', 'DESC'], ['createdAt', 'DESC']] });
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const p = await PurchaseOrder.findByPk(req.params.id);
    if (!p) return res.status(404).json({ error: 'OCP no encontrada' });
    res.json(p);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', verificarRol('admin', 'compras', 'jefe_area'), async (req, res) => {
  try {
    const payload = await resolveRefs(req.body);
    if (!payload.supplierName) return res.status(400).json({ error: 'supplierName es requerido' });
    const p = await PurchaseOrder.create(payload);
    res.status(201).json(p);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', verificarRol('admin', 'compras', 'jefe_area'), async (req, res) => {
  try {
    const p = await PurchaseOrder.findByPk(req.params.id);
    if (!p) return res.status(404).json({ error: 'OCP no encontrada' });
    const payload = await resolveRefs(req.body);
    await p.update(payload);
    res.json(p);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
