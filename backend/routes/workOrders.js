const express = require('express');
const router = express.Router();
const WorkOrder = require('../models/WorkOrder');
const { Op } = require('sequelize');

// Get all work orders
router.get('/', async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;
    let where = {};
    
    if (status && status !== 'Todas') {
      where.status = status;
    }
    
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

// Get single work order
router.get('/:id', async (req, res) => {
  try {
    const workOrder = await WorkOrder.findByPk(req.params.id);
    if (!workOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    res.json(workOrder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create work order
router.post('/', async (req, res) => {
  try {
    const workOrder = await WorkOrder.create(req.body);
    res.status(201).json(workOrder);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update work order
router.put('/:id', async (req, res) => {
  try {
    const workOrder = await WorkOrder.findByPk(req.params.id);
    if (!workOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    await workOrder.update(req.body);
    res.json(workOrder);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete work order
router.delete('/:id', async (req, res) => {
  try {
    const workOrder = await WorkOrder.findByPk(req.params.id);
    if (!workOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    await workOrder.destroy();
    res.json({ message: 'Work order deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get KPI data
router.get('/kpi/summary', async (req, res) => {
  try {
    const activeCount = await WorkOrder.count({ where: { status: 'En ejecución' } });
    const total = await WorkOrder.sum('quotedCost', { where: {} });
    res.json({ activeCount, totalCost: total || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
