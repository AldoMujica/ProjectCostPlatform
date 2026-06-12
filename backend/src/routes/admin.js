const express = require('express');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const {
  SystemConfig, AuditEvent, User,
  WorkOrder, Quote, MaterialCost, LaborCost,
  Supplier, SupplierInvoice, PurchaseOrder,
  InventoryItem, StockMovement, Delivery, Incident,
  Employee, WorkOrderApproval, PayrollWeek, PayrollLine,
} = require('../models');
const { verificarRol } = require('../middleware/auth');
const { logAudit } = require('../services/auditService');
const configService = require('../services/configService');
const { sendTableXlsx } = require('../utils/xlsxTable');

const router = express.Router();

// Phase-5b — every route under /api/admin requires the admin role.
router.use(verificarRol('admin'));

// ─────────────── /api/admin/users ─────────────────────────────────────

router.get('/users', async (req, res) => {
  try {
    const { all } = req.query;
    const where = all === '1' ? {} : { activo: true };
    const users = await User.findAll({
      where,
      attributes: ['id', 'nombre', 'email', 'rol', 'activo', 'permissionOverrides', 'updatedAt'],
      order: [['nombre', 'ASC']],
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/users', async (req, res) => {
  try {
    const { nombre, email, rol, password } = req.body;
    if (!nombre || !email || !rol || !password) {
      return res.status(400).json({ error: 'nombre, email, rol y password son requeridos' });
    }
    if (!User.ROLES.includes(rol)) {
      return res.status(400).json({ error: `Rol inválido. Valores permitidos: ${User.ROLES.join(', ')}` });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ nombre, email: email.toLowerCase(), rol, passwordHash });
    await logAudit({
      accion: 'user_created', entidad: 'usuarios', entidadId: String(user.id),
      descripcion: `Usuario creado: ${user.nombre} (${user.rol})`,
      user: req.user,
    });
    res.status(201).json({ id: user.id, nombre: user.nombre, email: user.email, rol: user.rol, activo: user.activo });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
    }
    res.status(400).json({ error: error.message });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (user.id === req.user.id && req.body.rol && req.body.rol !== user.rol) {
      return res.status(400).json({ error: 'No puedes cambiar tu propio rol' });
    }
    const updates = {};
    if (req.body.nombre)   updates.nombre = req.body.nombre;
    if (req.body.email)    updates.email  = req.body.email.toLowerCase();
    if (req.body.rol && User.ROLES.includes(req.body.rol)) updates.rol = req.body.rol;
    if (req.body.password) updates.passwordHash = await bcrypt.hash(req.body.password, 12);
    await user.update(updates);
    await logAudit({
      accion: 'user_updated', entidad: 'usuarios', entidadId: String(user.id),
      descripcion: `Usuario actualizado: ${user.nombre} — campos: ${Object.keys(updates).join(', ')}`,
      user: req.user,
    });
    res.json({ id: user.id, nombre: user.nombre, email: user.email, rol: user.rol, activo: user.activo });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
    }
    res.status(400).json({ error: error.message });
  }
});

router.patch('/users/:id/toggle-active', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (user.id === req.user.id) {
      return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta' });
    }
    await user.update({ activo: !user.activo });
    await logAudit({
      accion: user.activo ? 'user_activated' : 'user_deactivated',
      entidad: 'usuarios', entidadId: String(user.id),
      descripcion: `Usuario ${user.activo ? 'activado' : 'desactivado'}: ${user.nombre}`,
      user: req.user,
    });
    res.json({ id: user.id, activo: user.activo });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ─────────────── /api/admin/permissions ───────────────────────────────

router.post('/permissions/overrides', async (req, res) => {
  try {
    const changes = req.body;
    if (!Array.isArray(changes) || !changes.length) {
      return res.status(400).json({ error: 'Se espera un array de cambios' });
    }
    await Promise.all(changes.map(async ({ userId, overrides }) => {
      const user = await User.findByPk(userId);
      if (!user) return;
      const merged = { ...(user.permissionOverrides || {}) };
      for (const { permiso, allow } of overrides) {
        merged[permiso] = allow;
      }
      await user.update({ permissionOverrides: merged });
    }));
    await logAudit({
      accion: 'permission_overrides_saved',
      entidad: 'usuarios',
      entidadId: changes.map((c) => c.userId).join(','),
      descripcion: `Overrides de permisos guardados para ${changes.length} usuario(s)`,
      user: req.user,
    });
    res.json({ ok: true, saved: changes.length });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

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

// ─────────────── /api/admin/recycle-bin ───────────────────────────────
// Lista los registros soft-deleted (deleted_at IS NOT NULL) por entidad.
// El restore vive en cada router por entidad (POST /api/<recurso>/:id/restore).

const RECYCLE_ENTITIES = {
  'work-orders':       { model: WorkOrder,         label: 'Órdenes de Trabajo', restorePath: 'work-orders' },
  quotes:              { model: Quote,             label: 'Cotizaciones',       restorePath: 'quotes' },
  'material-costs':    { model: MaterialCost,      label: 'Costos de Material', restorePath: 'costs/material' },
  'labor-costs':       { model: LaborCost,         label: 'Horas MO',           restorePath: 'costs/labor' },
  suppliers:           { model: Supplier,          label: 'Proveedores',        restorePath: 'suppliers' },
  'purchase-orders':   { model: PurchaseOrder,     label: 'OCP',                restorePath: 'purchase-orders' },
  'supplier-invoices': { model: SupplierInvoice,   label: 'Facturas',           restorePath: 'supplier-invoices' },
  deliveries:          { model: Delivery,          label: 'Entregas',           restorePath: 'deliveries' },
  incidents:           { model: Incident,          label: 'Incidencias',        restorePath: 'deliveries/incidents' },
  inventory:           { model: InventoryItem,     label: 'Inventario',         restorePath: 'inventory' },
  employees:           { model: Employee,          label: 'Empleados',          restorePath: 'employees' },
  'payroll-weeks':     { model: PayrollWeek,       label: 'Semanas de Nómina',  restorePath: 'payroll/weeks' },
  'payroll-lines':     { model: PayrollLine,       label: 'Líneas de Nómina',   restorePath: 'payroll/lines' },
};

router.get('/recycle-bin', async (req, res) => {
  try {
    const { entity, limit, offset } = req.query;
    const lim = Math.min(parseInt(limit, 10) || 100, 500);
    const off = parseInt(offset, 10) || 0;

    if (!entity) {
      // Resumen: cuántos borrados hay por entidad.
      const summary = await Promise.all(
        Object.entries(RECYCLE_ENTITIES).map(async ([key, { model, label, restorePath }]) => {
          const count = await model.count({
            paranoid: false,
            where: { deletedAt: { [Op.ne]: null } },
          });
          return { entity: key, label, restorePath, count };
        }),
      );
      return res.json({ summary });
    }

    const cfg = RECYCLE_ENTITIES[entity];
    if (!cfg) return res.status(400).json({ error: `Entidad desconocida: ${entity}` });

    const { rows, count } = await cfg.model.findAndCountAll({
      paranoid: false,
      where: { deletedAt: { [Op.ne]: null } },
      order: [['deletedAt', 'DESC']],
      limit: lim,
      offset: off,
    });
    res.json({ entity, label: cfg.label, restorePath: cfg.restorePath, rows, count, limit: lim, offset: off });
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
