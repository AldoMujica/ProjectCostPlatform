const express = require('express');
const { Op } = require('sequelize');
const {
  WorkOrder,
  MaterialCost,
  LaborCost,
  PurchaseOrder,
  InventoryItem,
  SupplierInvoice,
  Delivery,
  Incident,
  WorkOrderApproval,
  sequelize,
} = require('../models');
const { verificarRol, filtrarPorSupervisor } = require('../middleware/auth');
const { sendTableXlsx } = require('../utils/xlsxTable');
const configService = require('../services/configService');
const notifSvc = require('../services/notificationService');

const router = express.Router();

// Phase-5b — precarga de Jefaturas desde config. Operator values win;
// defaults only fill fields the operator left blank.
const JEFATURA_FIELD_MAP = {
  ingenieria:  'jefeIngenieria',
  manufactura: 'jefeManufactura',
  compras:     'jefeCompras',
  otros:       'jefeOtros',
};

async function applyJefaturasDefaults(payload) {
  const defaults = await configService.get('ot.jefaturas_default', null);
  if (!defaults || typeof defaults !== 'object') return payload;
  const out = { ...payload };
  for (const [configKey, modelField] of Object.entries(JEFATURA_FIELD_MAP)) {
    if ((out[modelField] === undefined || out[modelField] === null || out[modelField] === '')
        && defaults[configKey] != null) {
      out[modelField] = defaults[configKey];
    }
  }
  return out;
}

router.get('/export', async (req, res) => {
  try {
    const rows = await WorkOrder.findAll({ order: [['createdAt', 'DESC']], raw: true });
    await sendTableXlsx(res, {
      filename: `ordenes-trabajo-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'Órdenes de Trabajo',
      columns: [
        { header: 'No. OT', key: 'otNumber', width: 16 },
        { header: 'Cliente', key: 'client', width: 24 },
        { header: 'Descripción', key: 'description', width: 48 },
        { header: 'Tipo', key: 'type', width: 12 },
        { header: 'Estado', key: 'status', width: 14 },
        { header: 'Avance (%)', key: 'progress', width: 12 },
        { header: 'Costo cotizado', key: 'quotedCost', width: 16, fmt: (v) => Number(v) },
        { header: 'Costo real', key: 'actualCost', width: 16, fmt: (v) => Number(v) },
        { header: 'Moneda', key: 'currency', width: 10 },
        { header: 'Fecha inicio', key: 'startDate', width: 14 },
        { header: 'Fecha fin', key: 'endDate', width: 14 },
        { header: 'Creado', key: 'createdAt', width: 20 },
      ],
      rows,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', filtrarPorSupervisor, async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;
    const where = {};
    if (status && status !== 'Todas') where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }
    // P3.18b — supervisors only see their own OTs (or unassigned ones).
    if (req.supervisor_id) {
      where[Op.or] = [{ supervisorId: req.supervisor_id }, { supervisorId: null }];
    }
    const workOrders = await WorkOrder.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json(workOrders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/kpi/summary', async (req, res) => {
  try {
    const activeCount = await WorkOrder.count({ where: { status: 'En ejecución' } });
    const total = await WorkOrder.sum('quotedCost');
    res.json({ activeCount, totalCost: total || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const wo = await WorkOrder.findByPk(req.params.id);
    if (!wo) return res.status(404).json({ error: 'Work order not found' });
    res.json(wo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', verificarRol('admin', 'ventas', 'jefe_area'), async (req, res) => {
  try {
    const payload = await applyJefaturasDefaults(req.body);
    const wo = await WorkOrder.create(payload);
    res.status(201).json(wo);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', verificarRol('admin', 'ventas', 'jefe_area'), async (req, res) => {
  try {
    const wo = await WorkOrder.findByPk(req.params.id);
    if (!wo) return res.status(404).json({ error: 'Work order not found' });
    const wasRepse = wo.esRepse;
    await wo.update(req.body);
    if (!wasRepse && wo.esRepse) {
      notifSvc.onRepseFlag({
        entidad: 'work_order', entidadId: wo.id,
        otNumber: wo.otNumber, actorNombre: req.user?.nombre || req.user?.email,
        linkModulo: 'ot',
      }).catch(() => {});
    }
    res.json(wo);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Cascade-soft-delete de la OT y todos sus registros dependientes (costos,
// OCPs, inventario asignado, facturas, entregas, incidencias, aprobaciones).
// Una OT Liberada se considera cerrada y solo se borra con ?force=true (admin).
router.delete('/:id', verificarRol('admin', 'jefe_area'), async (req, res) => {
  const force = req.query.force === 'true';
  const t = await sequelize.transaction();
  try {
    const wo = await WorkOrder.findByPk(req.params.id, { transaction: t });
    if (!wo) { await t.rollback(); return res.status(404).json({ error: 'Work order not found' }); }
    if (wo.status === 'Liberada' && !force) {
      await t.rollback();
      return res.status(409).json({
        error: 'No se puede eliminar una OT Liberada. Use ?force=true (admin) para forzar.',
      });
    }
    if (force && req.user?.rol !== 'admin') {
      await t.rollback();
      return res.status(403).json({ error: 'force=true requiere rol admin' });
    }
    await Promise.all([
      MaterialCost.destroy({ where: { workOrderId: wo.id }, transaction: t }),
      LaborCost.destroy({ where: { workOrderId: wo.id }, transaction: t }),
      PurchaseOrder.destroy({ where: { workOrderId: wo.id }, transaction: t }),
      InventoryItem.destroy({ where: { assignedWorkOrderId: wo.id }, transaction: t }),
      SupplierInvoice.destroy({ where: { workOrderId: wo.id }, transaction: t }),
      Delivery.destroy({ where: { workOrderId: wo.id }, transaction: t }),
      Incident.destroy({ where: { workOrderId: wo.id }, transaction: t }),
      WorkOrderApproval.destroy({ where: { workOrderId: wo.id }, transaction: t }),
    ]);
    await wo.destroy({ transaction: t });
    await t.commit();
    res.json({ message: 'Work order deleted (cascade)' });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/restore', verificarRol('admin'), async (req, res) => {
  const cascade = req.query.cascade !== 'false';
  const t = await sequelize.transaction();
  try {
    const wo = await WorkOrder.findByPk(req.params.id, { paranoid: false, transaction: t });
    if (!wo) { await t.rollback(); return res.status(404).json({ error: 'Work order not found' }); }
    await wo.restore({ transaction: t });
    if (cascade) {
      await Promise.all([
        MaterialCost.restore({ where: { workOrderId: wo.id }, transaction: t }),
        LaborCost.restore({ where: { workOrderId: wo.id }, transaction: t }),
        PurchaseOrder.restore({ where: { workOrderId: wo.id }, transaction: t }),
        InventoryItem.restore({ where: { assignedWorkOrderId: wo.id }, transaction: t }),
        SupplierInvoice.restore({ where: { workOrderId: wo.id }, transaction: t }),
        Delivery.restore({ where: { workOrderId: wo.id }, transaction: t }),
        Incident.restore({ where: { workOrderId: wo.id }, transaction: t }),
        WorkOrderApproval.restore({ where: { workOrderId: wo.id }, transaction: t }),
      ]);
    }
    await t.commit();
    res.json({ message: 'Work order restaurada', cascade });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
