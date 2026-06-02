/**
 * reset-transactional.js
 *
 * Borra TODOS los datos transaccionales del sistema Alenstec y deja
 * la base de datos en blanco lista para producción.
 *
 * CONSERVA:
 *   - usuarios (los 6 roles del sistema)
 *   - system_config (configuración del panel admin)
 *   - Historial de migraciones (umzug / SequelizeMeta)
 *
 * Uso:
 *   cd backend
 *   node src/scripts/reset-transactional.js
 *
 * ⚠️  IRREVERSIBLE — haz pg_dump antes si necesitas respaldar.
 */

require('dotenv').config();
const sequelize = require('../db/sequelize');

// Tablas transaccionales en orden de borrado (respetando FKs hoja → raíz).
// TRUNCATE … CASCADE cubre referencias cruzadas, pero este orden es más explícito.
const TRANSACTIONAL_TABLES = [
  // --- Auditoría (no tiene FKs salientes) ---
  'audit_events',
  'auditoria_conciliacion',

  // --- Aprobaciones / flujos dependientes de OTs ---
  'work_order_approvals',

  // --- Nómina Sequelize ---
  'payroll_lines',
  'payroll_weeks',

  // --- Entregas e incidencias (Phase 3) ---
  'incidents',
  'deliveries',

  // --- Inventario ---
  'stock_movements',
  'inventory_items',

  // --- Facturas y OCs ---
  'supplier_invoices',
  'purchase_orders_alenstec',

  // --- Costos de MO y materiales ---
  'labor_costs',
  'material_costs',

  // --- Cotizaciones ---
  'quotes',

  // --- Proveedores y pivote OT-proveedor ---
  'supplier_work_orders',
  'suppliers',

  // --- Órdenes de trabajo ---
  'work_orders',

  // --- Conciliación (tablas SQL raw) ---
  'conciliacion_detalle',
  'horas_clasificadas',
  'cierres_semana',
  'incidencias',        // tabla raw de conciliación (distinta de incidents)
  'registros_checador',
  'semanas_nomina',
  'proyectos',
  'empleados',
];

async function resetTransactional() {
  await sequelize.authenticate();
  console.log('✓ Conectado a la base de datos');

  // Deshabilita FK checks temporalmente para el TRUNCATE sin depender del orden.
  await sequelize.transaction(async (t) => {
    // PostgreSQL permite TRUNCATE … RESTART IDENTITY CASCADE dentro de una tx.
    const tableList = TRANSACTIONAL_TABLES.map((t) => `"${t}"`).join(', ');

    // Verificamos cuáles tablas existen antes de truncar (evita errores si
    // alguna migración no corrió o el nombre cambió).
    const nameList = TRANSACTIONAL_TABLES.map((n) => `'${n}'`).join(', ');
    const existingRows = await sequelize.query(
      `SELECT tablename FROM pg_tables
       WHERE schemaname = 'public'
         AND tablename IN (${nameList})`,
      { type: sequelize.QueryTypes.SELECT, transaction: t }
    );
    const existing = existingRows.map((r) => r.tablename);
    const missing  = TRANSACTIONAL_TABLES.filter((n) => !existing.includes(n));

    if (missing.length > 0) {
      console.warn(`⚠  Tablas no encontradas (se omiten): ${missing.join(', ')}`);
    }

    if (existing.length === 0) {
      console.log('ℹ  No hay tablas transaccionales que borrar.');
      return;
    }

    const safeList = existing.map((n) => `"${n}"`).join(', ');
    await sequelize.query(
      `TRUNCATE TABLE ${safeList} RESTART IDENTITY CASCADE`,
      { transaction: t }
    );

    console.log(`✓ TRUNCATE completado sobre ${existing.length} tablas`);
    console.log(`  Tablas limpiadas:\n  • ${existing.join('\n  • ')}`);
  });

  // Verificación rápida: contar filas en tablas críticas.
  const checks = ['work_orders', 'suppliers', 'empleados', 'quotes'];
  console.log('\nVerificación post-reset:');
  for (const tbl of checks) {
    try {
      const [[{ count }]] = await sequelize.query(`SELECT COUNT(*) AS count FROM "${tbl}"`);
      console.log(`  ${tbl}: ${count} filas`);
    } catch {
      console.log(`  ${tbl}: (tabla no existe)`);
    }
  }

  // Usuarios conservados.
  const [[{ userCount }]] = await sequelize.query('SELECT COUNT(*) AS "userCount" FROM usuarios');
  console.log(`\n✓ Usuarios conservados: ${userCount}`);
  console.log('\n✅  Reset transaccional completo. El sistema está en blanco.');
}

resetTransactional()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('✗ Error durante el reset:', err.message);
    console.error(err);
    process.exit(1);
  });
