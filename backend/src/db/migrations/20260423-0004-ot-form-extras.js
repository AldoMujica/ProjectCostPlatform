const { DataTypes } = require('sequelize');

// G-OT-2 follow-up — extends `work_orders` with the business fields the
// Datos Generales / Liberado a (Jefaturas) / Presupuestos cards capture on
// the OT form. Phase-1 landed the liberation primitives (quote_ref,
// customer_po, exchange_rate, liberation_date, liberated_by, notes);
// this round adds the remaining 9 fields so the form round-trips cleanly.
//
// Idempotent — skips columns that already exist.

const NEW_COLUMNS = {
  area_requisitora:     { type: DataTypes.STRING,          allowNull: true },
  requisitor_nombre:    { type: DataTypes.STRING,          allowNull: true },
  requisitor_email:     { type: DataTypes.STRING,          allowNull: true },
  jefe_ingenieria:      { type: DataTypes.STRING,          allowNull: true },
  jefe_manufactura:     { type: DataTypes.STRING,          allowNull: true },
  jefe_compras:         { type: DataTypes.STRING,          allowNull: true },
  jefe_otros:           { type: DataTypes.STRING,          allowNull: true },
  ppto_material_mxn:    { type: DataTypes.DECIMAL(12, 2),  allowNull: true },
  ppto_material_usd:    { type: DataTypes.DECIMAL(12, 2),  allowNull: true },
};

async function columnExists(qi, table, column) {
  const desc = await qi.describeTable(table);
  return Object.prototype.hasOwnProperty.call(desc, column);
}

module.exports = {
  async up({ context: qi }) {
    for (const [name, spec] of Object.entries(NEW_COLUMNS)) {
      if (!(await columnExists(qi, 'work_orders', name))) {
        await qi.addColumn('work_orders', name, spec);
      }
    }
  },

  async down({ context: qi }) {
    for (const name of Object.keys(NEW_COLUMNS)) {
      if (await columnExists(qi, 'work_orders', name)) {
        await qi.removeColumn('work_orders', name);
      }
    }
  },
};
