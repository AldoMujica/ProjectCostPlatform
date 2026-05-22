const express = require('express');
const { InventoryItem, StockMovement, WorkOrder, sequelize } = require('../models');
const { verificarRol } = require('../middleware/auth');
const { sendTableXlsx } = require('../utils/xlsxTable');

const router = express.Router();

async function resolveRefs(body) {
  const out = { ...body };
  if (!out.assignedWorkOrderId && out.assignedOtNumber) {
    const wo = await WorkOrder.findOne({ where: { otNumber: out.assignedOtNumber } });
    if (wo) out.assignedWorkOrderId = wo.id;
  }
  return out;
}

router.get('/export', async (req, res) => {
  try {
    const rows = await InventoryItem.findAll({ order: [['clave', 'ASC']], raw: true });
    await sendTableXlsx(res, {
      filename: `inventario-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'Inventario',
      columns: [
        { header: 'Clave',       key: 'clave',           width: 18 },
        { header: 'Descripción', key: 'description',     width: 32 },
        { header: 'Proveedor',   key: 'supplierName',    width: 24 },
        { header: 'Moneda',      key: 'currency',        width: 10 },
        { header: 'Existencia',  key: 'existencia',      width: 12, fmt: (v) => Number(v) },
        { header: 'Unidad',      key: 'unidad',          width: 10 },
        { header: 'Costo Unit.', key: 'unitCost',        width: 14, fmt: (v) => Number(v) },
        { header: 'Valor Total', key: 'unitCost',        width: 14, fmt: (v, r) => Number(r.unitCost) * Number(r.existencia) },
        { header: 'OT',          key: 'assignedOtNumber', width: 14 },
        { header: 'Estado',      key: 'status',          width: 14 },
      ],
      rows,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { status, otNumber } = req.query;
    const where = {};
    if (status) where.status = status;
    if (otNumber) where.assignedOtNumber = otNumber;
    const rows = await InventoryItem.findAll({ where, order: [['clave', 'ASC']] });
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const i = await InventoryItem.findByPk(req.params.id, {
      include: [{ model: StockMovement, as: 'movements', separate: true, order: [['createdAt', 'DESC']] }],
    });
    if (!i) return res.status(404).json({ error: 'Existencia no encontrada' });
    res.json(i);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', verificarRol('admin', 'compras', 'jefe_area'), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const payload = await resolveRefs(req.body);
    const item = await InventoryItem.create(payload, { transaction: t });
    if (Number(payload.existencia) > 0) {
      await StockMovement.create({
        inventoryItemId: item.id,
        movementType: 'entrada',
        quantity: payload.existencia,
        reason: 'Alta inicial',
        performedBy: req.user?.id || null,
      }, { transaction: t });
    }
    await t.commit();
    res.status(201).json(item);
  } catch (error) {
    await t.rollback();
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', verificarRol('admin', 'compras', 'jefe_area'), async (req, res) => {
  try {
    const i = await InventoryItem.findByPk(req.params.id);
    if (!i) return res.status(404).json({ error: 'Existencia no encontrada' });
    const payload = await resolveRefs(req.body);
    await i.update(payload);
    res.json(i);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Adjust stock (+/-) and log a StockMovement. P3.7 also calls this internally
// when a Delivery is created to increment existencia.
router.post('/:id/movements', verificarRol('admin', 'compras', 'jefe_area'), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const i = await InventoryItem.findByPk(req.params.id, { transaction: t });
    if (!i) { await t.rollback(); return res.status(404).json({ error: 'Existencia no encontrada' }); }
    const { movementType, quantity, reason, referenceType, referenceId } = req.body;
    const qty = Number(quantity);
    if (!['entrada', 'salida', 'ajuste'].includes(movementType) || !Number.isFinite(qty)) {
      await t.rollback();
      return res.status(400).json({ error: 'movementType/quantity inválidos' });
    }
    const delta = movementType === 'salida' ? -Math.abs(qty) : Math.abs(qty);
    const next = Number(i.existencia) + delta;
    if (next < 0) { await t.rollback(); return res.status(400).json({ error: 'Existencia no puede quedar negativa' }); }
    await i.update({ existencia: next, status: next === 0 ? 'Agotado' : i.status }, { transaction: t });
    const m = await StockMovement.create({
      inventoryItemId: i.id,
      movementType,
      quantity: Math.abs(qty),
      reason: reason || null,
      referenceType: referenceType || null,
      referenceId: referenceId || null,
      performedBy: req.user?.id || null,
    }, { transaction: t });
    await t.commit();
    res.status(201).json({ item: i, movement: m });
  } catch (error) {
    await t.rollback();
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', verificarRol('admin', 'jefe_area'), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const item = await InventoryItem.findByPk(req.params.id, { transaction: t });
    if (!item) { await t.rollback(); return res.status(404).json({ error: 'Existencia no encontrada' }); }
    if (Number(item.existencia) > 0) {
      await t.rollback();
      return res.status(409).json({ error: `No se puede eliminar: existencia actual = ${item.existencia}. Ajuste a 0 primero.` });
    }
    // Cascade-soft-delete los movimientos históricos para que no aparezcan
    // en futuros reportes del item ya borrado.
    await StockMovement.destroy({ where: { inventoryItemId: item.id }, transaction: t });
    await item.destroy({ transaction: t });
    await t.commit();
    res.json({ message: 'Item de inventario eliminado' });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/restore', verificarRol('admin'), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const item = await InventoryItem.findByPk(req.params.id, { paranoid: false, transaction: t });
    if (!item) { await t.rollback(); return res.status(404).json({ error: 'Existencia no encontrada' }); }
    await item.restore({ transaction: t });
    await StockMovement.restore({ where: { inventoryItemId: item.id }, transaction: t });
    await t.commit();
    res.json({ message: 'Item de inventario restaurado' });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
