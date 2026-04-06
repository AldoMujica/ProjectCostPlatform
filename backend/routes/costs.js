const express = require('express');
const router = express.Router();
const MaterialCost = require('../models/MaterialCost');
const LaborCost = require('../models/LaborCost');
const { Op } = require('sequelize');

// Get material costs
router.get('/material', async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    let where = {};
    
    if (status) where.status = status;
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

// Get labor costs
router.get('/labor', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let where = {};
    
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

// Create material cost
router.post('/material', async (req, res) => {
  try {
    const cost = await MaterialCost.create(req.body);
    res.status(201).json(cost);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Create labor cost
router.post('/labor', async (req, res) => {
  try {
    const cost = await LaborCost.create(req.body);
    res.status(201).json(cost);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get material in transit summary
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
