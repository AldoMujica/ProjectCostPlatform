const express = require('express');
const { Op } = require('sequelize');
const { MaterialCost, LaborCost, WorkOrder } = require('../models');
const { verificarRol } = require('../middleware/auth');

const router = express.Router();

async function resolveWorkOrderId(body) {
  if (body.workOrderId) return body.workOrderId;
  if (!body.otNumber) return null;
  const wo = await WorkOrder.findOne({ where: { otNumber: body.otNumber } });
  return wo ? wo.id : null;
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
    const cost = await LaborCost.create({ ...req.body, workOrderId });
    res.status(201).json(cost);
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

module.exports = router;
