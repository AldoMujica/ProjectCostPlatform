const { DataTypes } = require('sequelize');

// Soft-delete transversal — añade `deleted_at TIMESTAMP NULL` + índice parcial
// a todas las tablas operativas. Excluye `usuarios`, `system_config` y
// `bitacora` por ser registros de auditoría / identidad (inmutables por
// diseño). Sequelize paranoid mode (config en cada modelo) usa este campo
// para soft-delete + restore.
const TABLES = [
  'work_orders',
  'material_costs',
  'labor_costs',
  'purchase_orders_alenstec',
  'quotes',
  'suppliers',
  'supplier_invoices',
  'deliveries',
  'inventory_items',
  'stock_movements',
  'incidents',
  'supplier_work_orders',
  'empleados',
  'work_order_approvals',
  'payroll_weeks',
  'payroll_lines',
];

module.exports = {
  async up({ context: qi }) {
    for (const table of TABLES) {
      await qi.addColumn(table, 'deleted_at', {
        type: DataTypes.DATE,
        allowNull: true,
      });
      // Índice parcial: solo registros borrados. Mantiene chico el índice
      // y acelera la pantalla de Papelera (Admin > Recycle Bin).
      await qi.sequelize.query(
        `CREATE INDEX IF NOT EXISTS idx_${table}_deleted_at ON ${table} (deleted_at) WHERE deleted_at IS NOT NULL`,
      );
    }
  },

  async down({ context: qi }) {
    for (const table of TABLES) {
      await qi.sequelize.query(`DROP INDEX IF EXISTS idx_${table}_deleted_at`);
      await qi.removeColumn(table, 'deleted_at');
    }
  },
};
