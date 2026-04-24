const express = require('express');
const { Op } = require('sequelize');
const { PayrollWeek, PayrollLine, Employee, sequelize } = require('../models');
const { verificarRol } = require('../middleware/auth');
const { sendTableXlsx } = require('../utils/xlsxTable');

const router = express.Router();

// Phase-4 · Nómina skeleton (P4.2 · G-NOM-4).
//
// Este router expone la estructura de datos. Las calculadoras (IMSS, ISR,
// INFONAVIT, FONACOT) aún no corren — los totales que vengan en el body se
// guardan tal cual. Cuando el cliente entregue las tablas fiscales y los
// 20 escenarios de referencia (P4.1 → P4.6), se agregará un servicio
// `payrollCalculator.js` que se invocará antes de PayrollLine.create/update.

// ─── PayrollWeek ─────────────────────────────────────────────────────

router.get('/weeks', async (req, res) => {
  try {
    const { anio, cerrada } = req.query;
    const where = {};
    if (anio) where.anio = parseInt(anio, 10);
    if (cerrada === 'true')  where.cerrada = true;
    if (cerrada === 'false') where.cerrada = false;
    const weeks = await PayrollWeek.findAll({ where, order: [['anio', 'DESC'], ['semana', 'DESC']] });
    res.json(weeks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/weeks', verificarRol('admin', 'rh'), async (req, res) => {
  try {
    const week = await PayrollWeek.create(req.body);
    res.status(201).json(week);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/weeks/:id', async (req, res) => {
  try {
    const week = await PayrollWeek.findByPk(req.params.id, {
      include: [{
        model: PayrollLine,
        as: 'lines',
        order: [['numeroLista', 'ASC']],
      }],
    });
    if (!week) return res.status(404).json({ error: 'Semana no encontrada' });
    res.json(week);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/weeks/:id', verificarRol('admin', 'rh'), async (req, res) => {
  try {
    const week = await PayrollWeek.findByPk(req.params.id);
    if (!week) return res.status(404).json({ error: 'Semana no encontrada' });
    const { cerrada, ...rest } = req.body;
    const patch = { ...rest };
    if (cerrada === true && !week.cerrada) {
      patch.cerrada = true;
      patch.cerradaPor = req.user?.id || null;
      patch.cerradaAt = new Date();
    } else if (cerrada === false && week.cerrada) {
      patch.cerrada = false;
      patch.cerradaPor = null;
      patch.cerradaAt = null;
    }
    await week.update(patch);
    res.json(week);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/weeks/:id', verificarRol('admin'), async (req, res) => {
  try {
    const week = await PayrollWeek.findByPk(req.params.id);
    if (!week) return res.status(404).json({ error: 'Semana no encontrada' });
    if (week.cerrada) return res.status(400).json({ error: 'No se puede eliminar una semana cerrada' });
    await week.destroy();
    res.json({ message: 'Semana eliminada (incluye todas sus líneas)' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── PayrollLine ─────────────────────────────────────────────────────

router.get('/lines', async (req, res) => {
  try {
    const { weekId, empleadoId } = req.query;
    const where = {};
    if (weekId) where.payrollWeekId = weekId;
    if (empleadoId) where.empleadoId = parseInt(empleadoId, 10);
    const lines = await PayrollLine.findAll({
      where,
      order: [['numeroLista', 'ASC']],
    });
    res.json(lines);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function snapshotFromEmployee(empleadoId) {
  const emp = await Employee.findByPk(empleadoId);
  if (!emp) return null;
  return {
    numeroLista:  emp.numeroLista,
    nombre:       emp.nombre,
    rfc:          emp.rfc,
    curp:         emp.curp,
    imss:         emp.imss,
    puesto:       emp.puesto,
    area:         emp.area,
    departamento: emp.departamento,
    turno:        emp.turno,
    fechaIngreso: emp.fechaIngreso,
    sd:           emp.salarioDiario,
    sdi:          emp.salarioDiarioIntegrado,
  };
}

router.post('/lines', verificarRol('admin', 'rh'), async (req, res) => {
  try {
    const { payrollWeekId, empleadoId } = req.body;
    if (!payrollWeekId || !empleadoId) {
      return res.status(400).json({ error: 'payrollWeekId y empleadoId son requeridos' });
    }
    const week = await PayrollWeek.findByPk(payrollWeekId);
    if (!week) return res.status(400).json({ error: 'Semana inexistente' });
    if (week.cerrada) return res.status(400).json({ error: 'La semana está cerrada, no se pueden agregar líneas' });

    // Snapshot del empleado al momento de la captura.
    const snap = await snapshotFromEmployee(empleadoId);
    if (!snap) return res.status(400).json({ error: 'Empleado inexistente' });

    const line = await PayrollLine.create({ ...snap, ...req.body });
    res.status(201).json(line);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Ya existe una línea para ese empleado en esa semana' });
    }
    res.status(400).json({ error: error.message });
  }
});

router.put('/lines/:id', verificarRol('admin', 'rh'), async (req, res) => {
  try {
    const line = await PayrollLine.findByPk(req.params.id, { include: [{ model: PayrollWeek, as: 'week' }] });
    if (!line) return res.status(404).json({ error: 'Línea no encontrada' });
    if (line.week?.cerrada) return res.status(400).json({ error: 'La semana está cerrada' });
    // No permitimos cambiar el empleado ni la semana — eso sería borrar y recrear.
    const rest = { ...req.body };
    delete rest.payrollWeekId;
    delete rest.empleadoId;
    await line.update(rest);
    res.json(line);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/lines/:id', verificarRol('admin', 'rh'), async (req, res) => {
  try {
    const line = await PayrollLine.findByPk(req.params.id, { include: [{ model: PayrollWeek, as: 'week' }] });
    if (!line) return res.status(404).json({ error: 'Línea no encontrada' });
    if (line.week?.cerrada) return res.status(400).json({ error: 'La semana está cerrada' });
    await line.destroy();
    res.json({ message: 'Línea eliminada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Resumen / KPIs ──────────────────────────────────────────────────

router.get('/resumen', async (req, res) => {
  try {
    const { weekId, anio } = req.query;
    const whereLines = {};
    const whereWeeks = {};

    if (weekId) {
      whereLines.payrollWeekId = weekId;
    } else if (anio) {
      whereWeeks.anio = parseInt(anio, 10);
      const weeks = await PayrollWeek.findAll({ where: whereWeeks, attributes: ['id'] });
      whereLines.payrollWeekId = { [Op.in]: weeks.map((w) => w.id) };
    }

    const [count, totals] = await Promise.all([
      PayrollLine.count({ where: whereLines }),
      PayrollLine.findAll({
        where: whereLines,
        attributes: [
          [sequelize.fn('SUM', sequelize.col('total_percepciones')),    'totalPercepciones'],
          [sequelize.fn('SUM', sequelize.col('total_deducciones')),     'totalDeducciones'],
          [sequelize.fn('SUM', sequelize.col('pago_nomina')),           'pagoNomina'],
          [sequelize.fn('SUM', sequelize.col('dias_nomina')),           'totalDias'],
          [sequelize.fn('SUM', sequelize.col('hrs_laboradas')),         'totalHoras'],
          [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('empleado_id'))), 'empleadosDistintos'],
        ],
        raw: true,
      }),
    ]);

    const row = totals[0] || {};
    res.json({
      lineasCapturadas: count,
      empleadosDistintos: Number(row.empleadosDistintos) || 0,
      totalPercepciones: Number(row.totalPercepciones) || 0,
      totalDeducciones:  Number(row.totalDeducciones)  || 0,
      pagoNomina:        Number(row.pagoNomina)        || 0,
      totalDias:         Number(row.totalDias)         || 0,
      totalHoras:        Number(row.totalHoras)        || 0,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── XLSX export ─────────────────────────────────────────────────────

router.get('/export', async (req, res) => {
  try {
    const { weekId } = req.query;
    const where = weekId ? { payrollWeekId: weekId } : {};
    const rows = await PayrollLine.findAll({
      where,
      order: [['numeroLista', 'ASC']],
      raw: true,
    });
    await sendTableXlsx(res, {
      filename: `nomina-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'Nómina',
      columns: [
        { header: 'No. lista',     key: 'numeroLista',  width: 12 },
        { header: 'Nombre',        key: 'nombre',       width: 30 },
        { header: 'RFC',           key: 'rfc',          width: 16 },
        { header: 'Puesto',        key: 'puesto',       width: 28 },
        { header: 'Área',          key: 'area',         width: 18 },
        { header: 'Turno',         key: 'turno',        width: 14 },
        { header: 'S.D',           key: 'sd',           width: 10, fmt: (v) => (v == null ? '' : Number(v)) },
        { header: 'S.D.I',         key: 'sdi',          width: 10, fmt: (v) => (v == null ? '' : Number(v)) },
        { header: 'Días nómina',   key: 'diasNomina',   width: 10, fmt: (v) => Number(v) },
        { header: 'Hrs laboradas', key: 'hrsLaboradas', width: 12, fmt: (v) => Number(v) },
        { header: 'Total percep.', key: 'totalPercepciones', width: 14, fmt: (v) => Number(v) },
        { header: 'Total deduc.',  key: 'totalDeducciones',  width: 14, fmt: (v) => Number(v) },
        { header: 'Pago neto',     key: 'pagoNomina',        width: 14, fmt: (v) => Number(v) },
        { header: 'Notas',         key: 'notas',             width: 32 },
      ],
      rows,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
