const express = require('express');
const { Op } = require('sequelize');
const { Employee, User } = require('../models');
const { verificarRol } = require('../middleware/auth');
const { sendTableXlsx } = require('../utils/xlsxTable');
const configService = require('../services/configService');

const router = express.Router();

router.get('/export', async (req, res) => {
  try {
    const rows = await Employee.findAll({ order: [['numeroLista', 'ASC']], raw: true });
    await sendTableXlsx(res, {
      filename: `empleados-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'Empleados',
      columns: [
        { header: 'No. listado',     key: 'numeroLista',  width: 12 },
        { header: 'Nombre Rep Proc', key: 'nombreRepProc', width: 36 },
        { header: 'Nombre',          key: 'nombre',       width: 30 },
        { header: 'RFC',             key: 'rfc',          width: 16 },
        { header: 'CURP',            key: 'curp',         width: 20 },
        { header: 'No. IMSS',        key: 'imss',         width: 14 },
        { header: 'Nivel estudios',  key: 'nivelEstudios', width: 18 },
        { header: 'Puesto',          key: 'puesto',       width: 28 },
        { header: 'Departamento',    key: 'departamento', width: 20 },
        { header: 'Área',            key: 'area',         width: 20 },
        { header: 'Turno',           key: 'turno',        width: 14 },
        { header: 'Fecha ingreso',   key: 'fechaIngreso', width: 14 },
        { header: 'S.D',             key: 'salarioDiario', width: 10, fmt: (v) => (v == null ? '' : Number(v)) },
        { header: 'S.D.I',           key: 'salarioDiarioIntegrado', width: 10, fmt: (v) => (v == null ? '' : Number(v)) },
        { header: 'Activo',          key: 'activo',       width: 8 },
      ],
      rows,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { area, departamento, activo, q } = req.query;
    const where = {};
    if (area) where.area = area;
    if (departamento) where.departamento = departamento;
    if (activo === 'true')  where.activo = true;
    if (activo === 'false') where.activo = false;
    if (q) {
      where[Op.or] = [
        { nombre: { [Op.iLike]: `%${q}%` } },
        { numeroLista: { [Op.iLike]: `%${q}%` } },
        { rfc: { [Op.iLike]: `%${q}%` } },
      ];
    }
    const employees = await Employee.findAll({
      where,
      order: [['numeroLista', 'ASC']],
      include: [{ model: User, as: 'supervisor', attributes: ['id', 'nombre', 'email'] }],
    });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const e = await Employee.findByPk(req.params.id, {
      include: [{ model: User, as: 'supervisor', attributes: ['id', 'nombre', 'email'] }],
    });
    if (!e) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json(e);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', verificarRol('admin', 'rh'), async (req, res) => {
  try {
    // Phase-5b — default turno comes from config if the operator didn't set one.
    const payload = { ...req.body };
    if (payload.turno == null || payload.turno === '') {
      payload.turno = await configService.get('conciliacion.turno_default', '08:00-17:00');
    }
    const e = await Employee.create(payload);
    res.status(201).json(e);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', verificarRol('admin', 'rh'), async (req, res) => {
  try {
    const e = await Employee.findByPk(req.params.id);
    if (!e) return res.status(404).json({ error: 'Empleado no encontrado' });
    await e.update(req.body);
    res.json(e);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Soft-delete vía paranoid (deleted_at). `activo` se reserva para "inactivo
// pero existente" (pausa temporal); destroy() lo marca como borrado y lo
// excluye de todos los listados.
router.delete('/:id', verificarRol('admin', 'rh'), async (req, res) => {
  try {
    const e = await Employee.findByPk(req.params.id);
    if (!e) return res.status(404).json({ error: 'Empleado no encontrado' });
    await e.destroy();
    res.json({ message: 'Empleado eliminado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/restore', verificarRol('admin'), async (req, res) => {
  try {
    const e = await Employee.findByPk(req.params.id, { paranoid: false });
    if (!e) return res.status(404).json({ error: 'Empleado no encontrado' });
    await e.restore();
    res.json({ message: 'Empleado restaurado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
