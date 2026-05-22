const express = require('express');
const { Supplier, WorkOrder, PurchaseOrder, SupplierInvoice, Delivery, Incident, sequelize } = require('../models');
const { verificarRol } = require('../middleware/auth');
const { sendTableXlsx } = require('../utils/xlsxTable');

const router = express.Router();

router.get('/export', async (req, res) => {
  try {
    const suppliers = await Supplier.findAll({
      order: [['createdAt', 'DESC']],
      include: [{ model: WorkOrder, as: 'workOrders', attributes: ['otNumber'], through: { attributes: [] } }],
    });
    const rows = suppliers.map((s) => {
      const json = s.toJSON();
      json.otsList = (json.workOrders || []).map((w) => w.otNumber).join(', ');
      json.categoriesList = Array.isArray(json.categories) ? json.categories.join(', ') : '';
      return json;
    });
    await sendTableXlsx(res, {
      filename: `proveedores-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'Proveedores',
      columns: [
        { header: 'Nombre', key: 'supplierName', width: 32 },
        { header: 'Descripción', key: 'description', width: 40 },
        { header: 'Categorías', key: 'categoriesList', width: 30 },
        { header: 'Email', key: 'contactEmail', width: 24 },
        { header: 'Teléfono', key: 'contactPhone', width: 18 },
        { header: 'Saldo pendiente', key: 'saldoPendiente', width: 18, fmt: (v) => (v == null ? 0 : Number(v)) },
        { header: 'Estado', key: 'status', width: 14 },
        { header: 'OTs asociadas', key: 'otsList', width: 24 },
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

// `?cascade=true` (admin only) borra también OCPs/facturas/entregas/incidencias
// activas del proveedor. Sin `cascade`, devuelve 409 con la lista de dependientes
// para que el operador decida qué hacer.
router.delete('/:id', verificarRol('admin', 'jefe_area'), async (req, res) => {
  const cascade = req.query.cascade === 'true';
  const t = await sequelize.transaction();
  try {
    const s = await Supplier.findByPk(req.params.id, { transaction: t });
    if (!s) { await t.rollback(); return res.status(404).json({ error: 'Proveedor no encontrado' }); }

    const [ocpCount, invoiceCount, deliveryCount, incidentCount] = await Promise.all([
      PurchaseOrder.count({ where: { supplierId: s.id }, transaction: t }),
      SupplierInvoice.count({ where: { supplierId: s.id }, transaction: t }),
      Delivery.count({ where: { supplierId: s.id }, transaction: t }),
      Incident.count({ where: { supplierId: s.id }, transaction: t }),
    ]);
    const total = ocpCount + invoiceCount + deliveryCount + incidentCount;

    if (total > 0 && !cascade) {
      await t.rollback();
      return res.status(409).json({
        error: 'El proveedor tiene dependencias activas',
        dependientes: { ocp: ocpCount, facturas: invoiceCount, entregas: deliveryCount, incidencias: incidentCount },
        hint: 'Agregue ?cascade=true (requiere admin) para borrar todo lo asociado',
      });
    }
    if (cascade) {
      if (req.user?.rol !== 'admin') {
        await t.rollback();
        return res.status(403).json({ error: 'cascade=true requiere rol admin' });
      }
      await PurchaseOrder.destroy({ where: { supplierId: s.id }, transaction: t });
      await SupplierInvoice.destroy({ where: { supplierId: s.id }, transaction: t });
      await Delivery.destroy({ where: { supplierId: s.id }, transaction: t });
      await Incident.destroy({ where: { supplierId: s.id }, transaction: t });
    }
    await s.destroy({ transaction: t });
    await t.commit();
    res.json({ message: 'Proveedor eliminado', cascade, dependientesBorrados: cascade ? total : 0 });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/restore', verificarRol('admin'), async (req, res) => {
  const cascade = req.query.cascade === 'true';
  const t = await sequelize.transaction();
  try {
    const s = await Supplier.findByPk(req.params.id, { paranoid: false, transaction: t });
    if (!s) { await t.rollback(); return res.status(404).json({ error: 'Proveedor no encontrado' }); }
    await s.restore({ transaction: t });
    if (cascade) {
      await PurchaseOrder.restore({ where: { supplierId: s.id }, transaction: t });
      await SupplierInvoice.restore({ where: { supplierId: s.id }, transaction: t });
      await Delivery.restore({ where: { supplierId: s.id }, transaction: t });
      await Incident.restore({ where: { supplierId: s.id }, transaction: t });
    }
    await t.commit();
    res.json({ message: 'Proveedor restaurado', cascade });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
