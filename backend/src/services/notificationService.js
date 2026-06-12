'use strict';
/**
 * notificationService — hybrid notification engine
 *
 * PERSISTENT notifications (stored in `notifications` table):
 *   - Approval step ready / approved / rejected / OT liberada
 *
 * COMPUTED notifications (derived at query time, never stored):
 *   - OCP vencida sin entrega
 *   - Pronóstico varianza crítica (>100%)
 *   - Inventario bajo mínimo
 *   - Conciliación semanal pendiente de cierre (viernes+)
 *   - Cotización sin OC del cliente después de 30 días
 *   - Factura CFDI sin validar
 *   - Empleado con datos incompletos (RFC/CURP/IMSS)
 *   - OT liberada sin costo real
 */

const { Op, literal } = require('sequelize');
const Notification = require('../models/Notification');

// ── TIPO catalogue ──────────────────────────────────────────────────────────
const TIPOS = {
  APROBACION_PENDIENTE: 'aprobacion_pendiente',
  PASO_APROBADO:        'paso_aprobado',
  PASO_RECHAZADO:       'paso_rechazado',
  OT_LIBERADA:          'ot_liberada',
  OCP_VENCIDA:          'ocp_vencida',
  PRONOSTICO_CRITICO:   'pronostico_critico',
  INVENTARIO_BAJO:      'inventario_bajo',
  CONCILIACION_PENDIENTE: 'conciliacion_pendiente',
  COT_SIN_OC:           'cot_sin_oc',
  CFDI_SIN_VALIDAR:     'cfdi_sin_validar',
  EMPLEADO_INCOMPLETO:  'empleado_incompleto',
  OT_SIN_COSTO_REAL:    'ot_sin_costo_real',
  REPSE_FLAGGED:        'repse_flagged',
};

// ── Icono y color por tipo (usado en el frontend) ──────────────────────────
const TIPO_META = {
  aprobacion_pendiente: { icono: '⏳', color: '#f59e0b', badge: 'amber' },
  paso_aprobado:        { icono: '✅', color: '#22c55e', badge: 'green' },
  paso_rechazado:       { icono: '❌', color: '#ef4444', badge: 'red'   },
  ot_liberada:          { icono: '🚀', color: '#3b82f6', badge: 'blue'  },
  ocp_vencida:          { icono: '📦', color: '#ef4444', badge: 'red'   },
  pronostico_critico:   { icono: '📊', color: '#ef4444', badge: 'red'   },
  inventario_bajo:      { icono: '🏭', color: '#f59e0b', badge: 'amber' },
  conciliacion_pendiente:{ icono:'📋', color: '#f59e0b', badge: 'amber' },
  cot_sin_oc:           { icono: '📄', color: '#6b7280', badge: 'gray'  },
  cfdi_sin_validar:     { icono: '🧾', color: '#f59e0b', badge: 'amber' },
  empleado_incompleto:  { icono: '👤', color: '#6b7280', badge: 'gray'  },
  ot_sin_costo_real:    { icono: '💰', color: '#f59e0b', badge: 'amber' },
  repse_flagged:        { icono: '🔴', color: '#dc2626', badge: 'red'   },
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function enrichTipo(n) {
  const meta = TIPO_META[n.tipo] || { icono: '🔔', color: '#6b7280', badge: 'gray' };
  return { ...n, ...meta };
}

/** Create a persistent approval notification targeting a role bucket */
async function createApprovalNotif({ tipo, titulo, mensaje, workOrderId, workOrderNumber, step, targetRole }) {
  return Notification.create({
    targetRole,
    tipo,
    titulo,
    mensaje,
    entidad:    'work_order',
    entidadId:  workOrderId,
    linkModulo: 'ot',
    metadatos:  { step, workOrderNumber },
  });
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Called when an OT or labor-cost line is flagged as REPSE.
 * Creates a persistent notification targeting the RH role.
 */
async function onRepseFlag({ entidad, entidadId, otNumber, actorNombre, linkModulo = 'horas' }) {
  const label = entidad === 'work_order' ? `OT ${otNumber}` : `línea MO en ${otNumber}`;
  return Notification.create({
    targetRole: 'rh',
    tipo:        TIPOS.REPSE_FLAGGED,
    titulo:      `REPSE — ${label}`,
    mensaje:     `${actorNombre || 'Sistema'} marcó ${label} como REPSE. Requiere revisión y tratamiento diferenciado.`,
    entidad,
    entidadId,
    linkModulo,
    metadatos: { otNumber },
  });
}

/**
 * Called after a successful approval transition.
 * Creates persistent notifications for the relevant parties.
 */
async function onApprovalTransition({ row, status, workOrder, nextStep, nextStepRoles, steps, actor }) {
  const otNum = workOrder.otNumber || workOrder.id;
  const stepLabel = row.step.replace(/_/g, ' ');

  if (status === 'aprobada') {
    // Notify: actor approved
    await createApprovalNotif({
      tipo:            TIPOS.PASO_APROBADO,
      titulo:          `Paso "${stepLabel}" aprobado — ${otNum}`,
      mensaje:         `${actor.nombre || actor.email} aprobó el paso "${stepLabel}" de la OT ${otNum}.`,
      workOrderId:     workOrder.id,
      workOrderNumber: otNum,
      step:            row.step,
      targetRole:      'jefe_area',
    });

    // Notify next step roles (if not final)
    if (nextStep && nextStepRoles?.length) {
      for (const role of nextStepRoles) {
        await createApprovalNotif({
          tipo:            TIPOS.APROBACION_PENDIENTE,
          titulo:          `Aprobación pendiente — ${otNum}`,
          mensaje:         `El paso "${nextStep.replace(/_/g, ' ')}" de la OT ${otNum} está listo para tu revisión.`,
          workOrderId:     workOrder.id,
          workOrderNumber: otNum,
          step:            nextStep,
          targetRole:      role,
        });
      }
    }

    // Final step approved → OT liberada
    const finalStep = steps[steps.length - 1];
    if (row.step === finalStep) {
      await createApprovalNotif({
        tipo:            TIPOS.OT_LIBERADA,
        titulo:          `OT ${otNum} liberada`,
        mensaje:         `La Orden de Trabajo ${otNum} completó todos los pasos y fue liberada.`,
        workOrderId:     workOrder.id,
        workOrderNumber: otNum,
        step:            finalStep,
        targetRole:      'admin',
      });
    }
  }

  if (status === 'rechazada') {
    await createApprovalNotif({
      tipo:            TIPOS.PASO_RECHAZADO,
      titulo:          `Paso "${stepLabel}" rechazado — ${otNum}`,
      mensaje:         `${actor.nombre || actor.email} rechazó el paso "${stepLabel}" de la OT ${otNum}. Se requiere revisión.`,
      workOrderId:     workOrder.id,
      workOrderNumber: otNum,
      step:            row.step,
      targetRole:      'jefe_area',
    });
  }
}

/**
 * Fetch persistent notifications visible to a user:
 * - Rows targeting their user_id directly
 * - Rows targeting their rol
 */
async function getPersistentForUser(user, { limit = 50, onlyUnread = false } = {}) {
  const where = {
    [Op.or]: [{ userId: user.id }, { targetRole: user.rol }],
  };
  if (onlyUnread) where.leida = false;
  const rows = await Notification.findAll({
    where,
    order: [['created_at', 'DESC']],
    limit,
    raw: true,
  });
  return rows.map(enrichTipo);
}

/**
 * Compute dynamic notifications from existing data.
 * Returns an array of plain objects (same shape as DB rows but no `id` PK).
 * Only computes the categories relevant to the caller's role.
 */
async function getComputedForUser(user) {
  const rol = user.rol;
  const items = [];
  const now = new Date();

  try {
    // Lazy-load models inside function to avoid circular deps at startup
    const {
      PurchaseOrder, WorkOrder, InventoryItem,
      SupplierInvoice, Employee, Quote,
    } = require('../models');

    // 1. OCP vencida sin entrega (compras, jefe_area, admin)
    if (['compras', 'jefe_area', 'admin'].includes(rol)) {
      const vencidas = await PurchaseOrder.findAll({
        where: {
          status: { [Op.in]: ['Pendiente', 'Parcial'] },
          expectedDeliveryDate: { [Op.lt]: now },
        },
        attributes: ['id', 'orderNumber', 'expectedDeliveryDate', 'supplierName'],
        limit: 10,
        raw: true,
      });
      for (const ocp of vencidas) {
        items.push(enrichTipo({
          id: `computed-ocp-${ocp.id}`,
          tipo: TIPOS.OCP_VENCIDA,
          titulo: `OCP vencida — ${ocp.orderNumber || ocp.id}`,
          mensaje: `La orden de compra de "${ocp.supplierName || 'proveedor'}" venció el ${new Date(ocp.expectedDeliveryDate).toLocaleDateString('es-MX')} y sigue pendiente.`,
          entidad: 'purchase_order',
          entidadId: ocp.id,
          linkModulo: 'entregas',
          leida: false,
          createdAt: now,
          metadatos: ocp,
        }));
      }
    }

    // 2. OTs con varianza crítica en Pronóstico (jefe_area, admin)
    if (['jefe_area', 'admin'].includes(rol)) {
      const criticas = await WorkOrder.findAll({
        where: {
          status: { [Op.notIn]: ['Cancelada', 'Liberada'] },
          quotedCost: { [Op.gt]: 0 },
        },
        attributes: ['id', 'otNumber', 'quotedCost', 'actualCost', 'status'],
        limit: 10,
        raw: true,
      });
      for (const ot of criticas) {
        if (!ot.actualCost || !ot.quotedCost) continue;
        const varianza = (ot.actualCost / ot.quotedCost) * 100;
        if (varianza > 100) {
          items.push(enrichTipo({
            id: `computed-crit-${ot.id}`,
            tipo: TIPOS.PRONOSTICO_CRITICO,
            titulo: `Varianza crítica — ${ot.otNumber}`,
            mensaje: `La OT ${ot.otNumber} tiene costo real ${varianza.toFixed(0)}% del cotizado (>${100}%).`,
            entidad: 'work_order',
            entidadId: ot.id,
            linkModulo: 'pronostico',
            leida: false,
            createdAt: now,
            metadatos: { varianza: varianza.toFixed(1) },
          }));
        }
      }
    }

    // 3. Inventario bajo mínimo (compras, supervisor, admin)
    if (['compras', 'supervisor', 'admin'].includes(rol)) {
      const bajos = await InventoryItem.findAll({
        where: literal('"existencia" <= "stock_minimo" AND "stock_minimo" > 0'),
        attributes: ['id', 'clave', 'descripcion', 'existencia', 'stockMinimo'],
        limit: 10,
        raw: true,
      }).catch(() => []);
      for (const item of bajos) {
        items.push(enrichTipo({
          id: `computed-inv-${item.id}`,
          tipo: TIPOS.INVENTARIO_BAJO,
          titulo: `Inventario bajo — ${item.clave || item.descripcion}`,
          mensaje: `Existencia: ${item.existencia} (mínimo: ${item.stockMinimo}).`,
          entidad: 'inventory_item',
          entidadId: item.id,
          linkModulo: 'entregas',
          leida: false,
          createdAt: now,
          metadatos: item,
        }));
      }
    }

    // 4. Facturas CFDI sin validar (compras, admin)
    if (['compras', 'admin'].includes(rol)) {
      const sinValidar = await SupplierInvoice.findAll({
        where: { validacionSat: { [Op.in]: ['Pendiente', null] } },
        attributes: ['id', 'folio', 'rfcEmisor', 'total'],
        limit: 10,
        raw: true,
      }).catch(() => []);
      for (const inv of sinValidar) {
        items.push(enrichTipo({
          id: `computed-cfdi-${inv.id}`,
          tipo: TIPOS.CFDI_SIN_VALIDAR,
          titulo: `CFDI sin validar — ${inv.folio || inv.id}`,
          mensaje: `La factura de ${inv.rfcEmisor || 'RFC desconocido'} por $${inv.total || '—'} no ha sido validada con el SAT.`,
          entidad: 'supplier_invoice',
          entidadId: inv.id,
          linkModulo: 'entregas',
          leida: false,
          createdAt: now,
          metadatos: inv,
        }));
      }
    }

    // 5. Empleados con datos incompletos (rh, admin)
    if (['rh', 'admin'].includes(rol)) {
      const incompletos = await Employee.findAll({
        where: {
          [Op.or]: [
            { rfc:  { [Op.is]: null } },
            { curp: { [Op.is]: null } },
            { imss: { [Op.is]: null } },
          ],
          activo: true,
        },
        attributes: ['id', 'nombre', 'rfc', 'curp', 'imss'],
        limit: 10,
        raw: true,
      }).catch(() => []);
      for (const emp of incompletos) {
        const faltantes = ['rfc','curp','imss'].filter(f => !emp[f]).join(', ');
        items.push(enrichTipo({
          id: `computed-emp-${emp.id}`,
          tipo: TIPOS.EMPLEADO_INCOMPLETO,
          titulo: `Empleado incompleto — ${emp.nombre || emp.id}`,
          mensaje: `Faltan datos: ${faltantes.toUpperCase()}.`,
          entidad: 'employee',
          entidadId: emp.id,
          linkModulo: 'horas',
          leida: false,
          createdAt: now,
          metadatos: { faltantes },
        }));
      }
    }

    // 6. Cotizaciones sin OC del cliente después de 30 días (ventas, jefe_area, admin)
    if (['ventas', 'jefe_area', 'admin'].includes(rol)) {
      const cutoff = new Date(now - 30 * 24 * 3600 * 1000);
      const sinOC = await Quote.findAll({
        where: {
          ocCliente: { [Op.is]: null },
          fechaCotizacion: { [Op.lt]: cutoff },
        },
        attributes: ['id', 'quoteNumber', 'cliente', 'fechaCotizacion', 'costoCotAl'],
        limit: 10,
        raw: true,
      }).catch(() => []);
      for (const q of sinOC) {
        items.push(enrichTipo({
          id: `computed-cot-${q.id}`,
          tipo: TIPOS.COT_SIN_OC,
          titulo: `Sin OC — ${q.quoteNumber}`,
          mensaje: `La cotización de ${q.cliente || '—'} lleva más de 30 días sin OC del cliente.`,
          entidad: 'quote',
          entidadId: q.id,
          linkModulo: 'cotizaciones',
          leida: false,
          createdAt: now,
          metadatos: { dias: Math.floor((now - new Date(q.fechaCotizacion)) / 86400000) },
        }));
      }
    }

    // 7b. REPSE pendiente de revisión — resumen para RH
    if (['rh', 'admin'].includes(rol)) {
      const { LaborCost: LC } = require('../models');
      const [repseOTs, repseLines] = await Promise.all([
        WorkOrder.count({ where: { esRepse: true, status: { [Op.notIn]: ['Cerrada'] } } }).catch(() => 0),
        LC.count({ where: { esRepse: true } }).catch(() => 0),
      ]);
      const total = repseOTs + repseLines;
      if (total > 0) {
        items.push(enrichTipo({
          id: 'computed-repse-summary',
          tipo: TIPOS.REPSE_FLAGGED,
          titulo: `REPSE — ${total} elemento${total !== 1 ? 's' : ''} pendiente${total !== 1 ? 's' : ''}`,
          mensaje: `${repseOTs} OT${repseOTs !== 1 ? 's' : ''} y ${repseLines} línea${repseLines !== 1 ? 's' : ''} de MO marcadas como REPSE requieren revisión de RH.`,
          entidad: 'repse',
          entidadId: null,
          linkModulo: 'horas',
          leida: false,
          createdAt: now,
          metadatos: { repseOTs, repseLines },
        }));
      }
    }

    // 7. OT liberada sin costo real (supervisor, jefe_area, admin)
    if (['supervisor', 'jefe_area', 'admin'].includes(rol)) {
      const sinCosto = await WorkOrder.findAll({
        where: {
          status: 'Liberada',
          [Op.or]: [{ actualCost: { [Op.is]: null } }, { actualCost: 0 }],
        },
        attributes: ['id', 'otNumber'],
        limit: 10,
        raw: true,
      });
      for (const ot of sinCosto) {
        items.push(enrichTipo({
          id: `computed-ots-${ot.id}`,
          tipo: TIPOS.OT_SIN_COSTO_REAL,
          titulo: `Sin costo real — ${ot.otNumber}`,
          mensaje: `La OT ${ot.otNumber} está liberada pero no tiene costo real capturado.`,
          entidad: 'work_order',
          entidadId: ot.id,
          linkModulo: 'pronostico',
          leida: false,
          createdAt: now,
          metadatos: {},
        }));
      }
    }
  } catch (e) {
    console.warn('[notificationService] computed error:', e.message);
  }

  return items;
}

/** Combined: persistent (DB) + computed (dynamic) */
async function getAllForUser(user, { onlyUnread = false } = {}) {
  const [persistent, computed] = await Promise.all([
    getPersistentForUser(user, { onlyUnread }),
    getComputedForUser(user),
  ]);
  // Merge: persistent first (they have actions), then computed
  return [...persistent, ...computed];
}

/** Unread count used by the topbar badge */
async function unreadCount(user) {
  const persistentCount = await Notification.count({
    where: {
      [Op.or]: [{ userId: user.id }, { targetRole: user.rol }],
      leida: false,
    },
  });
  // Computed are always "unread" from DB perspective — count them too
  const computed = await getComputedForUser(user);
  return persistentCount + computed.length;
}

async function markRead(id, user) {
  // Only persistent rows can be marked read
  if (id.startsWith('computed-')) return null;
  const row = await Notification.findOne({
    where: {
      id,
      [Op.or]: [{ userId: user.id }, { targetRole: user.rol }],
    },
  });
  if (!row) return null;
  return row.update({ leida: true, leidaAt: new Date() });
}

async function markAllRead(user) {
  return Notification.update(
    { leida: true, leidaAt: new Date() },
    {
      where: {
        [Op.or]: [{ userId: user.id }, { targetRole: user.rol }],
        leida: false,
      },
    }
  );
}

module.exports = {
  TIPOS,
  TIPO_META,
  onApprovalTransition,
  onRepseFlag,
  getAllForUser,
  getPersistentForUser,
  getComputedForUser,
  unreadCount,
  markRead,
  markAllRead,
};
