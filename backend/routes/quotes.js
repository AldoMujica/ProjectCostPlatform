const express = require('express');
const router = express.Router();
const Quote = require('../models/Quote');

// Get all quotes
router.get('/', async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;
    let where = {};
    
    if (status) where.status = status;
    
    const quotes = await Quote.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json(quotes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single quote
router.get('/:id', async (req, res) => {
  try {
    const quote = await Quote.findByPk(req.params.id);
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    res.json(quote);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create quote
router.post('/', async (req, res) => {
  try {
    const quote = await Quote.create(req.body);
    res.status(201).json(quote);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update quote
router.put('/:id', async (req, res) => {
  try {
    const quote = await Quote.findByPk(req.params.id);
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    await quote.update(req.body);
    res.json(quote);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get count of open quotes
router.get('/kpi/open-count', async (req, res) => {
  try {
    const count = await Quote.count({ where: { status: 'Pendiente' } });
    res.json({ openCount: count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
