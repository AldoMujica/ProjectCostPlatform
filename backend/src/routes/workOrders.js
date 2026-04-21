const express = require('express');
const { Op } = require('sequelize');
const { WorkOrder } = require('../models');
const { verificarRol } = require('../middleware/auth');

const router = express.Router();

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
