const express = require('express');
const { Op } = require('sequelize');
const { WorkOrder } = require('../models');
const { verificarRol } = require('../middleware/auth');
const { sendTableXlsx } = require('../utils/xlsxTable');

const router = express.Router();

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

router.get('/', async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;
    const where = {};
    if (status && status !== 'Todas') where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
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
    const wo = await WorkOrder.create(req.body);
    res.status(201).json(wo);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', verificarRol('admin', 'ventas', 'jefe_area'), async (req, res) => {
  try {
    const wo = await WorkOrder.findByPk(req.params.id);
    if (!wo) return res.status(404).json({ error: 'Work order not found' });
    await wo.update(req.body);
    res.json(wo);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', verificarRol('admin'), async (req, res) => {
  try {
    const wo = await WorkOrder.findByPk(req.params.id);
    if (!wo) return res.status(404).json({ error: 'Work order not found' });
    await wo.destroy();
    res.json({ message: 'Work order deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
