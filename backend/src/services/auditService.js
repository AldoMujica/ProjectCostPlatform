const AuditEvent = require('../models/AuditEvent');
const { currentContext } = require('../middleware/requestContext');

// Models we audit via global Sequelize hooks. High-volume cost tables
// (MaterialCost, LaborCost, StockMovement) are intentionally OFF — they
// can be re-derived from the OT and auditing every row would drown the
// bitácora. The join table SupplierWorkOrder is also skipped.
//
// For high-value actions that aren't Sequelize CRUD (login, config change,
// force-conciliate, etc.), call logAudit() manually.
const AUDITED_MODELS = new Set([
  'WorkOrder',
  'Quote',
  'Supplier',
  'Employee',
  'PurchaseOrder',
  'InventoryItem',
  'SupplierInvoice',
  'Delivery',
  'Incident',
  'WorkOrderApproval',
  'User',
  'SystemConfig',
]);

// Fields excluded from `antes`/`despues` snapshots. Avoids accidentally
// logging password hashes and reduces noise.
const EXCLUDED_FIELDS = new Set(['passwordHash', 'password_hash']);

function sanitize(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (EXCLUDED_FIELDS.has(k)) continue;
    out[k] = v;
  }
  return out;
}

function changedKeys(before, after) {
  if (!before || !after) return [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changed = [];
  for (const k of keys) {
    if (EXCLUDED_FIELDS.has(k)) continue;
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) changed.push(k);
  }
  return changed;
}

/**
 * Record an audit event.
 *
 * @param {object} params
 * @param {string} params.accion        e.g. 'create' | 'update' | 'delete' | 'login' | 'config_change' | 'forzar_conciliacion'
 * @param {string} params.entidad       e.g. 'work_order' | 'quote' | 'system_config' | 'auth'
 * @param {string} [params.entidadId]   id of the affected row (stringified UUID or int)
 * @param {string} [params.descripcion] short human-readable label shown in the Bitácora
 * @param {object} [params.antes]       previous state snapshot (pre-update / pre-delete)
 * @param {object} [params.despues]     new state snapshot (post-create / post-update)
 * @param {object} [params.metadatos]   extra context (route, method, reason…)
 * @param {object} [params.user]        override for non-request contexts
 * @param {string} [params.ip]          override for non-request contexts
 */
async function logAudit({
  accion, entidad, entidadId, descripcion, antes, despues, metadatos,
  user: overrideUser, ip: overrideIp,
} = {}) {
  try {
    const ctx = currentContext();
    const user = overrideUser || ctx.user || null;
    const ip = overrideIp || ctx.ip || null;
    await AuditEvent.create({
      usuarioId: user?.id || null,
      usuarioNombre: user?.nombre || null,
      usuarioRol: user?.rol || null,
      accion,
      entidad,
      entidadId: entidadId == null ? null : String(entidadId),
      descripcion: descripcion || null,
      antes: sanitize(antes),
      despues: sanitize(despues),
      ip,
      metadatos: metadatos
        ? { ...metadatos, route: ctx.path, method: ctx.method }
        : { route: ctx.path, method: ctx.method },
    });
  } catch (err) {
    // Never throw from the audit path — losing a CRUD because audit is
    // down is worse than losing a log line. Surface to the server console.
    // eslint-disable-next-line no-console
    console.warn('⚠ logAudit failed:', err.message);
  }
}

/**
 * Attach create/update/destroy hooks to every model whose name is in
 * AUDITED_MODELS. Must be called AFTER models are registered.
 */
function attachAuditHooks(sequelize) {
  for (const [name, model] of Object.entries(sequelize.models)) {
    if (!AUDITED_MODELS.has(name)) continue;

    model.addHook('afterCreate', async (instance, options) => {
      if (options?.skipAudit) return;
      await logAudit({
        accion: 'create',
        entidad: model.tableName || name,
        entidadId: instance.id,
        descripcion: describeInstance(name, instance),
        despues: instance.toJSON(),
      });
    });

    model.addHook('afterUpdate', async (instance, options) => {
      if (options?.skipAudit) return;
      const before = {};
      const after = instance.toJSON();
      for (const k of Object.keys(instance._previousDataValues || {})) {
        before[k] = instance._previousDataValues[k];
      }
      const changed = changedKeys(before, after);
      if (changed.length === 0) return; // touch-update with no diff
      await logAudit({
        accion: 'update',
        entidad: model.tableName || name,
        entidadId: instance.id,
        descripcion: describeInstance(name, instance),
        antes: before,
        despues: after,
        metadatos: { fields_changed: changed },
      });
    });

    model.addHook('afterDestroy', async (instance, options) => {
      if (options?.skipAudit) return;
      await logAudit({
        accion: 'delete',
        entidad: model.tableName || name,
        entidadId: instance.id,
        descripcion: describeInstance(name, instance),
        antes: instance.toJSON(),
      });
    });
  }
}

// Short human-readable label per model. Shown in the Bitácora list so ops
// don't have to open every row to see what happened.
function describeInstance(modelName, inst) {
  try {
    const v = inst.dataValues || inst;
    switch (modelName) {
      case 'WorkOrder':       return `OT ${v.otNumber || v.ot_number || v.id} · ${v.client || ''}`;
      case 'Quote':           return `Cotización ${v.quoteNumber || v.quote_number || v.id}`;
      case 'Supplier':        return `Proveedor ${v.supplierName || v.supplier_name || v.id}`;
      case 'Employee':        return `Empleado ${v.numeroLista || v.numero_lista || ''} · ${v.nombre || ''}`;
      case 'PurchaseOrder':   return `OCP ${v.ocNumber || v.oc_number || v.id}`;
      case 'InventoryItem':   return `Inv ${v.clave || v.id}`;
      case 'SupplierInvoice': return `CFDI ${v.uuidFiscal || v.uuid_fiscal || v.id}`;
      case 'Delivery':        return `Entrega ${v.deliveryNumber || v.delivery_number || v.id} · ${v.producto || ''}`;
      case 'Incident':        return `Incidencia ${v.folio || v.id}`;
      case 'WorkOrderApproval': return `Paso ${v.step} → ${v.status}`;
      case 'User':            return `Usuario ${v.email || v.id}`;
      case 'SystemConfig':    return `Config ${v.key}`;
      default:                return `${modelName} · ${v.id}`;
    }
  } catch {
    return modelName;
  }
}

module.exports = { logAudit, attachAuditHooks, AUDITED_MODELS };
