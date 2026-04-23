const { SystemConfig } = require('../models');

// Phase-5b — initial values for `system_config`. These are the same
// numbers that are currently hardcoded across the codebase; seeding
// them preserves today's behavior while giving ops a knob to tune.
// Whenever a new tunable is introduced, add it here AND update
// whichever module reads it.
//
// Idempotent: upsert by `key`, so re-running the seed won't clobber
// values the admin has already changed.

const DEFAULTS = [
  // ── Pronóstico ─────────────────────────────────────────────────
  {
    key: 'forecasting.semaforo.ok_max',
    value: 0.70,
    dataType: 'number',
    category: 'forecasting',
    description: 'Umbral superior para semáforo "OK" en Pronóstico. Real ≤ (este × cotizado) → verde. Default 0.70 (70%).',
  },
  {
    key: 'forecasting.semaforo.atencion_max',
    value: 1.00,
    dataType: 'number',
    category: 'forecasting',
    description: 'Umbral superior para semáforo "Atención". Real ≤ (este × cotizado) → amarillo. Por encima → "Crítico". Default 1.00 (100%).',
  },

  // ── Aprobación de OT (Flujo de Liberación) ────────────────────
  {
    key: 'approval.steps',
    value: ['cotizacion', 'compras', 'produccion', 'calidad', 'liberacion_final'],
    dataType: 'array',
    category: 'approval',
    description: 'Orden secuencial de los pasos del flujo de liberación de OT. Cada paso requiere que el anterior esté "aprobada".',
  },
  {
    key: 'approval.roles.cotizacion',
    value: ['admin', 'ventas', 'jefe_area'],
    dataType: 'array',
    category: 'approval',
    description: 'Roles autorizados a decidir el paso "cotizacion" del flujo de liberación.',
  },
  {
    key: 'approval.roles.compras',
    value: ['admin', 'compras', 'jefe_area'],
    dataType: 'array',
    category: 'approval',
    description: 'Roles autorizados a decidir el paso "compras" del flujo de liberación.',
  },
  {
    key: 'approval.roles.produccion',
    value: ['admin', 'jefe_area', 'supervisor'],
    dataType: 'array',
    category: 'approval',
    description: 'Roles autorizados a decidir el paso "produccion" del flujo de liberación.',
  },
  {
    key: 'approval.roles.calidad',
    value: ['admin', 'jefe_area'],
    dataType: 'array',
    category: 'approval',
    description: 'Roles autorizados a decidir el paso "calidad" del flujo de liberación.',
  },
  {
    key: 'approval.roles.liberacion_final',
    value: ['admin', 'jefe_area'],
    dataType: 'array',
    category: 'approval',
    description: 'Roles autorizados a liberar la OT (último paso). Aprobarlo cambia OT.status → "Liberada".',
  },

  // ── Conciliación ──────────────────────────────────────────────
  {
    key: 'conciliacion.forzar.roles',
    value: ['rh', 'admin'],
    dataType: 'array',
    category: 'conciliacion',
    description: 'Roles autorizados a "forzar" la conciliación de un día (sobrescribe el estado sin justificación). Default: sólo rh + admin.',
  },
  {
    key: 'conciliacion.justificar.roles',
    value: ['supervisor', 'jefe_area', 'rh', 'admin'],
    dataType: 'array',
    category: 'conciliacion',
    description: 'Roles autorizados a "justificar" una diferencia en la conciliación diaria.',
  },
  {
    key: 'conciliacion.turno_default',
    value: '08:00-17:00',
    dataType: 'string',
    category: 'conciliacion',
    description: 'Turno por defecto al dar de alta un empleado nuevo.',
  },

  // ── Órdenes de Trabajo ────────────────────────────────────────
  {
    key: 'ot.jefaturas_default',
    value: {
      ingenieria: 'Cristian Durán',
      manufactura: 'Jesús Lara',
      compras: 'Jessica Fuentes',
      otros: 'N/A',
    },
    dataType: 'object',
    category: 'ot',
    description: 'Nombres precargados en la tarjeta "Liberado a (Jefaturas)" al crear una nueva OT. El operador puede editarlos por OT.',
  },

  // ── Sistema ───────────────────────────────────────────────────
  {
    key: 'system.currency_default',
    value: 'USD',
    dataType: 'string',
    category: 'system',
    description: 'Moneda por defecto para nuevas cotizaciones y OTs.',
  },
  {
    key: 'system.exchange_rate_fallback',
    value: 0,
    dataType: 'number',
    category: 'system',
    description: 'T/C de respaldo (USD→MXN) usado por Pronóstico cuando una OT en MXN no tiene tipo de cambio propio. 0 = excluir esas OTs del sumatorio USD (comportamiento actual). Pon un valor > 0 si quieres que Pronóstico use Banxico-like promedio mensual.',
  },
];

async function seedSystemConfigDefaults() {
  for (const entry of DEFAULTS) {
    await SystemConfig.findOrCreate({
      where: { key: entry.key },
      defaults: entry,
    });
  }
  return DEFAULTS.length;
}

module.exports = { seedSystemConfigDefaults, DEFAULTS };
