const express = require('express');
const { Op } = require('sequelize');
const { MaterialCost, LaborCost, WorkOrder, Employee } = require('../models');
const { verificarRol } = require('../middleware/auth');
const { sendTableXlsx } = require('../utils/xlsxTable');
const notifSvc = require('../services/notificationService');

const router = express.Router();

router.get('/material/export', async (req, res) => {
  try {
    const rows = await MaterialCost.findAll({ order: [['createdAt', 'DESC']], raw: true });
    await sendTableXlsx(res, {
      filename: `costo-material-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'Costo de Material',
      columns: [
        { header: 'No. OT', key: 'otNumber', width: 14 },
        { header: 'Proveedor', key: 'supplier', width: 28 },
        { header: 'Descripción', key: 'materialDescription', width: 40 },
        { header: 'Cantidad', key: 'quantity', width: 10, fmt: (v) => Number(v) },
        { header: 'Precio unit.', key: 'unitCost', width: 14, fmt: (v) => Number(v) },
        { header: 'Subtotal', key: 'subtotal', width: 14, fmt: (v) => (v == null ? '' : Number(v)) },
        { header: 'IVA', key: 'iva', width: 12, fmt: (v) => (v == null ? '' : Number(v)) },
        { header: 'Retención', key: 'retencion', width: 12, fmt: (v) => (v == null ? '' : Number(v)) },
        { header: 'Total', key: 'totalCost', width: 14, fmt: (v) => Number(v) },
        { header: 'Moneda', key: 'currency', width: 10 },
        { header: 'Estado', key: 'status', width: 14 },
        { header: 'Fecha entrega', key: 'deliveryDate', width: 16 },
      ],
      rows,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/labor/export', async (req, res) => {
  try {
    const rows = await LaborCost.findAll({ order: [['date', 'DESC']], raw: true });
    await sendTableXlsx(res, {
      filename: `horas-mo-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'Horas de Mano de Obra',
      columns: [
        { header: 'No. OT', key: 'otNumber', width: 14 },
        { header: 'Empleado', key: 'employeeName', width: 26 },
        { header: 'Rol', key: 'role', width: 22 },
        { header: 'Actividad', key: 'activityCode', width: 10 },
        { header: 'Horas', key: 'hoursWorked', width: 10, fmt: (v) => Number(v) },
        { header: 'Tarifa/hr', key: 'hourlyRate', width: 12, fmt: (v) => Number(v) },
        { header: 'Total', key: 'totalCost', width: 14, fmt: (v) => Number(v) },
        { header: 'Moneda', key: 'currency', width: 10 },
        { header: 'Fecha', key: 'date', width: 14 },
      ],
      rows,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function resolveWorkOrderId(body) {
  if (body.workOrderId) return body.workOrderId;
  if (!body.otNumber) return null;
  const wo = await WorkOrder.findOne({ where: { otNumber: body.otNumber } });
  return wo ? wo.id : null;
}

async function resolveEmployee(body) {
  const out = { ...body };
  if (!out.employeeId) return out;
  const emp = await Employee.findByPk(out.employeeId);
  if (!emp) return out;
  out.employeeName = emp.nombre;
  if (!out.role && emp.puesto) out.role = emp.puesto;
  if ((!out.hourlyRate || out.hourlyRate === '') && emp.salarioDiario) {
    out.hourlyRate = Number(emp.salarioDiario);
  }
  return out;
}

router.get('/material', async (req, res) => {
  try {
    const { startDate, endDate, status, otNumber } = req.query;
    const where = {};
    if (status) where.status = status;
    if (otNumber) where.otNumber = otNumber;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }
    const costs = await MaterialCost.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json(costs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/material', verificarRol('admin', 'compras', 'jefe_area'), async (req, res) => {
  try {
    const workOrderId = await resolveWorkOrderId(req.body);
    if (!workOrderId) {
      return res.status(400).json({ error: 'workOrderId u otNumber válido es requerido' });
    }
    const cost = await MaterialCost.create({ ...req.body, workOrderId });
    res.status(201).json(cost);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/labor', async (req, res) => {
  try {
    const { startDate, endDate, otNumber } = req.query;
    const where = {};
    if (otNumber) where.otNumber = otNumber;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date[Op.gte] = new Date(startDate);
      if (endDate) where.date[Op.lte] = new Date(endDate);
    }
    const costs = await LaborCost.findAll({ where, order: [['date', 'DESC']] });
    res.json(costs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/labor', verificarRol('admin', 'rh', 'jefe_area', 'supervisor'), async (req, res) => {
  try {
    const workOrderId = await resolveWorkOrderId(req.body);
    if (!workOrderId) {
      return res.status(400).json({ error: 'workOrderId u otNumber válido es requerido' });
    }
    const payload = await resolveEmployee(req.body);
    if (!payload.employeeName) {
      return res.status(400).json({ error: 'employeeId válido o employeeName es requerido' });
    }
    const cost = await LaborCost.create({ ...payload, workOrderId });
    if (cost.esRepse) {
      notifSvc.onRepseFlag({
        entidad: 'labor_cost', entidadId: cost.id,
        otNumber: cost.otNumber, actorNombre: req.user?.nombre || req.user?.email,
        linkModulo: 'horas',
      }).catch(() => {});
    }
    res.status(201).json(cost);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/labor/:id', verificarRol('admin', 'rh', 'jefe_area', 'supervisor'), async (req, res) => {
  try {
    const row = await LaborCost.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: 'Hora MO no encontrada' });
    const wasRepse = row.esRepse;
    await row.update(req.body);
    if (!wasRepse && row.esRepse) {
      notifSvc.onRepseFlag({
        entidad: 'labor_cost', entidadId: row.id,
        otNumber: row.otNumber, actorNombre: req.user?.nombre || req.user?.email,
        linkModulo: 'horas',
      }).catch(() => {});
    }
    res.json(row);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/kpi/material-transit', async (req, res) => {
  try {
    const total = await MaterialCost.sum('totalCost', { where: { status: 'En tránsito' } });
    const count = await MaterialCost.count({ where: { status: 'En tránsito' } });
    res.json({ total: total || 0, count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/material/:id', verificarRol('admin', 'jefe_area'), async (req, res) => {
  try {
    const row = await MaterialCost.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: 'Costo de material no encontrado' });
    await row.destroy();
    res.json({ message: 'Costo de material eliminado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/material/:id/restore', verificarRol('admin'), async (req, res) => {
  try {
    const row = await MaterialCost.findByPk(req.params.id, { paranoid: false });
    if (!row) return res.status(404).json({ error: 'Costo de material no encontrado' });
    await row.restore();
    res.json({ message: 'Costo de material restaurado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/labor/:id', verificarRol('admin', 'jefe_area'), async (req, res) => {
  try {
    const row = await LaborCost.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: 'Hora MO no encontrada' });
    await row.destroy();
    res.json({ message: 'Hora MO eliminada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/labor/:id/restore', verificarRol('admin'), async (req, res) => {
  try {
    const row = await LaborCost.findByPk(req.params.id, { paranoid: false });
    if (!row) return res.status(404).json({ error: 'Hora MO no encontrada' });
    await row.restore();
    res.json({ message: 'Hora MO restaurada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
