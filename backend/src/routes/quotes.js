const express = require('express');
const { Quote } = require('../models');
const { verificarRol } = require('../middleware/auth');
const { sendTableXlsx } = require('../utils/xlsxTable');

const router = express.Router();

router.get('/export', async (req, res) => {
  try {
    const rows = await Quote.findAll({ order: [['createdAt', 'DESC']], raw: true });
    await sendTableXlsx(res, {
      filename: `cotizaciones-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'Cotizaciones',
      columns: [
        { header: 'No. Cotización', key: 'quoteNumber', width: 20 },
        { header: 'COT Ref.', key: 'cotRef', width: 18 },
        { header: 'Cliente', key: 'client', width: 24 },
        { header: 'Descripción', key: 'description', width: 40 },
        { header: 'Monto', key: 'amount', width: 14, fmt: (v) => Number(v) },
        { header: 'Moneda', key: 'currency', width: 10 },
        { header: 'T/C', key: 'exchangeRate', width: 10, fmt: (v) => (v == null ? '' : Number(v)) },
        { header: 'OC Cliente', key: 'ocCliente', width: 18 },
        { header: 'No. OT', key: 'otNumber', width: 14 },
        { header: 'Tipo', key: 'tipo', width: 12 },
        { header: 'Estado', key: 'status', width: 12 },
        { header: 'Vigencia', key: 'validUntil', width: 14 },
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
