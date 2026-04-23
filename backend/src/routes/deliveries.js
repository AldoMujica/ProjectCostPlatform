const express = require('express');
const { Op } = require('sequelize');
const { Delivery, Incident, InventoryItem, StockMovement, Supplier, WorkOrder, sequelize } = require('../models');
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
    const rows = await Delivery.findAll({ order: [['fechaRecibido', 'DESC'], ['createdAt', 'DESC']], raw: true });
    await sendTableXlsx(res, {
      filename: `entregas-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'Entregas',
      columns: [
        { header: 'No. Prov.',    key: 'deliveryNumber', width: 12 },
        { header: 'Proveedor',    key: 'supplierName',   width: 28 },
        { header: 'Producto',     key: 'producto',       width: 32 },
        { header: 'OT',           key: 'otNumber',       width: 12 },
        { header: 'Pzas',         key: 'piezas',         width: 10, fmt: (v) => Number(v) },
        { header: 'Precio Unit.', key: 'unitCost',       width: 14, fmt: (v) => (v == null ? '' : Number(v)) },
        { header: 'Moneda',       key: 'currency',       width: 10 },
        { header: 'Entregado por',key: 'entregadoPor',   width: 20 },
        { header: 'F. Recibido',  key: 'fechaRecibido',  width: 14 },
        { header: 'F. Autorizado',key: 'fechaAutorizado', width: 14 },
        { header: 'Incidencia',   key: 'incidencia',     width: 28 },
        { header: 'Estado',       key: 'status',         width: 14 },
      ],
      rows,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/kpi', async (req, res) => {
  try {
    const [entregadas, pendientes, conIncidencia, sinAsignarInv] = await Promise.all([
      Delivery.count({ where: { status: 'Entregado' } }),
      Delivery.count({ where: { status: 'Pendiente' } }),
      Delivery.count({ where: { status: 'Con incidencia' } }),
      InventoryItem.count({ where: { status: 'Sin asignar' } }),
    ]);
    res.json({ entregadas, pendientes, conIncidencia, sinAsignarInv });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { status, otNumber, supplierId, startDate, endDate } = req.query;
    const where = {};
    if (status) where.status = status;
    if (otNumber) where.otNumber = otNumber;
    if (supplierId) where.supplierId = supplierId;
    if (startDate || endDate) {
      where.fechaRecibido = {};
      if (startDate) where.fechaRecibido[Op.gte] = startDate;
      if (endDate)   where.fechaRecibido[Op.lte] = endDate;
    }
    const rows = await Delivery.findAll({ where, order: [['fechaRecibido', 'DESC'], ['createdAt', 'DESC']] });
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const d = await Delivery.findByPk(req.params.id);
    if (!d) return res.status(404).json({ error: 'Entrega no encontrada' });
    res.json(d);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// P3.7 — Creating a Delivery with status=Entregado increments the linked
// inventory item's existencia (if inventoryItemId is given) and logs a
// StockMovement. Otherwise it's a plain record.
router.post('/', verificarRol('admin', 'compras', 'jefe_area'), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const payload = await resolveRefs(req.body);
    const d = await Delivery.create(payload, { transaction: t });
    if (payload.inventoryItemId && payload.status === 'Entregado' && Number(payload.piezas) > 0) {
      const item = await InventoryItem.findByPk(payload.inventoryItemId, { transaction: t });
      if (item) {
        const next = Number(item.existencia) + Number(payload.piezas);
        await item.update({ existencia: next, status: next > 0 ? item.status : 'Agotado' }, { transaction: t });
        await StockMovement.create({
          inventoryItemId: item.id,
          movementType: 'entrada',
          quantity: payload.piezas,
          reason: `Entrega ${d.deliveryNumber || d.id}`,
          referenceType: 'delivery',
          referenceId: d.id,
          performedBy: req.user?.id || null,
        }, { transaction: t });
      }
    }
    await t.commit();
    res.status(201).json(d);
  } catch (error) {
    await t.rollback();
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', verificarRol('admin', 'compras', 'jefe_area'), async (req, res) => {
  try {
    const d = await Delivery.findByPk(req.params.id);
    if (!d) return res.status(404).json({ error: 'Entrega no encontrada' });
    const payload = await resolveRefs(req.body);
    await d.update(payload);
    res.json(d);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Incidents live under the Entregas module too.
router.get('/incidents/all', async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;
    const rows = await Incident.findAll({ where, order: [['fecha', 'DESC']] });
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/incidents', verificarRol('admin', 'compras', 'jefe_area', 'supervisor'), async (req, res) => {
  try {
    const payload = await resolveRefs(req.body);
    if (!payload.folio || !payload.descripcion || !payload.fecha) {
      return res.status(400).json({ error: 'folio, descripcion y fecha son requeridos' });
    }
    const inc = await Incident.create(payload);
    res.status(201).json(inc);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
