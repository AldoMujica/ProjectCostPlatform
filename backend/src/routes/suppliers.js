const express = require('express');
const { Supplier, WorkOrder } = require('../models');
const { verificarRol } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;
    const suppliers = await Supplier.findAll({
      where,
      order: [['createdAt', 'DESC']],
      include: [{ model: WorkOrder, as: 'workOrders', attributes: ['id', 'otNumber'], through: { attributes: [] } }],
    });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const s = await Supplier.findByPk(req.params.id, {
      include: [{ model: WorkOrder, as: 'workOrders', attributes: ['id', 'otNumber'], through: { attributes: [] } }],
    });
    if (!s) return res.status(404).json({ error: 'Supplier not found' });
    res.json(s);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', verificarRol('admin', 'compras'), async (req, res) => {
  try {
    const { workOrderNumbers, ...rest } = req.body;
    const s = await Supplier.create(rest);
    if (Array.isArray(workOrderNumbers) && workOrderNumbers.length) {
      const wos = await WorkOrder.findAll({ where: { otNumber: workOrderNumbers } });
      await s.setWorkOrders(wos);
    }
    res.status(201).json(s);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', verificarRol('admin', 'compras'), async (req, res) => {
  try {
    const s = await Supplier.findByPk(req.params.id);
    if (!s) return res.status(404).json({ error: 'Supplier not found' });
    const { workOrderNumbers, ...rest } = req.body;
    await s.update(rest);
    if (Array.isArray(workOrderNumbers)) {
      const wos = await WorkOrder.findAll({ where: { otNumber: workOrderNumbers } });
      await s.setWorkOrders(wos);
    }
    res.json(s);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
