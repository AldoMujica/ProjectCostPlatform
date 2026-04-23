const express = require('express');
const { Op } = require('sequelize');
const { SystemConfig, AuditEvent, User } = require('../models');
const { verificarRol } = require('../middleware/auth');
const { logAudit } = require('../services/auditService');
const configService = require('../services/configService');
const { sendTableXlsx } = require('../utils/xlsxTable');

const router = express.Router();

// Phase-5b — every route under /api/admin requires the admin role.
router.use(verificarRol('admin'));

// ─────────────── /api/admin/config ────────────────────────────────────

router.get('/config', async (req, res) => {
  try {
    const { category } = req.query;
    const where = {};
    if (category) where.category = category;
    const rows = await SystemConfig.findAll({ where, order: [['category', 'ASC'], ['key', 'ASC']] });
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/config/:key', async (req, res) => {
  try {
    const row = await SystemConfig.findOne({ where: { key: req.params.key } });
    if (!row) return res.status(404).json({ error: 'Config no encontrada' });
    res.json(row);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upsert a config value. Admins can create new keys (for future extensions)
// as well as update existing ones.
router.put('/config/:key', async (req, res) => {
  try {
    const { value, description, category, dataType } = req.body;
    if (value === undefined) return res.status(400).json({ error: '`value` es requerido' });

    // Capture previous value (for the manual "config_change" audit entry).
    const existing = await SystemConfig.findOne({ where: { key: req.params.key } });
    const previousValue = existing ? existing.value : null;

    const [row, created] = await SystemConfig.findOrCreate({
      where: { key: req.params.key },
      defaults: {
        value,
        description: description || null,
        category: category || 'general',
        dataType: dataType || 'string',
        updatedBy: req.user?.id || null,
      },
      // skipAudit on the auto-hook — we fire a more descriptive manual
      // `config_change` event below.
      skipAudit: true,
    });
    if (!created) {
      await row.update({
        value,
        ...(description !== undefined ? { description } : {}),
        ...(category !== undefined ? { category } : {}),
        ...(dataType !== undefined ? { dataType } : {}),
        updatedBy: req.user?.id || null,
      }, { skipAudit: true });
    }
    await logAudit({
      accion: 'config_change',
      entidad: 'system_config',
      entidadId: row.key,
      descripcion: `Config ${row.key} ${created ? 'creada' : 'actualizada'}`,
      antes: created ? null : { value: previousValue },
      despues: { value: row.value, category: row.category, dataType: row.dataType },
    });
    configService.invalidate();
    res.json(row);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/config/:key', async (req, res) => {
  try {
    const row = await SystemConfig.findOne({ where: { key: req.params.key } });
    if (!row) return res.status(404).json({ error: 'Config no encontrada' });
    await row.destroy();
    configService.invalidate();
    res.json({ message: 'Config eliminada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────── /api/admin/audit ─────────────────────────────────────

function buildAuditWhere(q) {
  const where = {};
  if (q.accion)     where.accion = q.accion;
  if (q.entidad)    where.entidad = q.entidad;
  if (q.entidadId)  where.entidadId = String(q.entidadId);
  if (q.usuarioId)  where.usuarioId = parseInt(q.usuarioId, 10);
  if (q.from || q.to) {
    where.fecha = {};
    if (q.from) where.fecha[Op.gte] = new Date(q.from);
    if (q.to)   where.fecha[Op.lte] = new Date(q.to);
  }
  if (q.q) {
    where[Op.or] = [
      { descripcion:    { [Op.iLike]: `%${q.q}%` } },
      { usuarioNombre:  { [Op.iLike]: `%${q.q}%` } },
    ];
  }
  return where;
}

router.get('/audit', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const offset = parseInt(req.query.offset, 10) || 0;
    const where = buildAuditWhere(req.query);
    const { rows, count } = await AuditEvent.findAndCountAll({
      where, limit, offset,
      order: [['fecha', 'DESC'], ['id', 'DESC']],
      include: [{ model: User, as: 'usuario', attributes: ['id', 'nombre', 'email', 'rol'], required: false }],
    });
    res.json({ rows, count, limit, offset });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Full trail for one entity (e.g. "everything that happened with OT-AL-1948").
router.get('/audit/entity/:entidad/:entidadId', async (req, res) => {
  try {
    const rows = await AuditEvent.findAll({
      where: { entidad: req.params.entidad, entidadId: String(req.params.entidadId) },
      order: [['fecha', 'DESC'], ['id', 'DESC']],
    });
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/audit/export', async (req, res) => {
  try {
    const where = buildAuditWhere(req.query);
    const rows = await AuditEvent.findAll({
      where,
      order: [['fecha', 'DESC']],
      limit: 10_000,
      raw: true,
    });
    await sendTableXlsx(res, {
      filename: `bitacora-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'Bitácora',
      columns: [
        { header: 'Fecha',        key: 'fecha',         width: 22 },
        { header: 'Usuario',      key: 'usuarioNombre', width: 24 },
        { header: 'Rol',          key: 'usuarioRol',    width: 14 },
        { header: 'Acción',       key: 'accion',        width: 16 },
        { header: 'Entidad',      key: 'entidad',       width: 22 },
        { header: 'ID entidad',   key: 'entidadId',     width: 40 },
        { header: 'Descripción',  key: 'descripcion',   width: 50 },
        { header: 'IP',           key: 'ip',            width: 18 },
        { header: 'Cambios',      key: 'metadatos',     width: 40, fmt: (v) => (v?.fields_changed || []).join(', ') },
      ],
      rows,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Distinct values to populate the filter dropdowns in the admin UI.
router.get('/audit/distinct/:field', async (req, res) => {
  try {
    const allowed = new Set(['accion', 'entidad', 'usuarioRol']);
    if (!allowed.has(req.params.field)) {
      return res.status(400).json({ error: 'Campo no permitido' });
    }
    const rows = await AuditEvent.findAll({
      attributes: [req.params.field],
      group: [req.params.field],
      order: [[req.params.field, 'ASC']],
      raw: true,
    });
    res.json(rows.map((r) => r[req.params.field]).filter(Boolean));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
