const express = require('express');
const { Quote } = require('../models');
const { verificarRol } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;
    const quotes = await Quote.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json(quotes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/kpi/open-count', async (req, res) => {
  try {
    const count = await Quote.count({ where: { status: 'Pendiente' } });
    res.json({ openCount: count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const q = await Quote.findByPk(req.params.id);
    if (!q) return res.status(404).json({ error: 'Quote not found' });
    res.json(q);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', verificarRol('admin', 'ventas'), async (req, res) => {
  try {
    const q = await Quote.create(req.body);
    res.status(201).json(q);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', verificarRol('admin', 'ventas'), async (req, res) => {
  try {
    const q = await Quote.findByPk(req.params.id);
    if (!q) return res.status(404).json({ error: 'Quote not found' });
    await q.update(req.body);
    res.json(q);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
