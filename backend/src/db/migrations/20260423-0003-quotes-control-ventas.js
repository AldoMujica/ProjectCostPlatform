const { DataTypes } = require('sequelize');

// Align the `quotes` table with the "Control Ventas 2026" workbook
// (client-supplied master) so the Cotizaciones module can round-trip
// uploads and downloads without lossy mapping.
//
// Adds the nine cotización-level columns from the first 19 columns of
// the Control Ventas sheet that weren't already captured by G-COT-5:
//   proyecto, celda, rfq, mecr, fecha_cotizacion, tipo_contrato,
//   fecha_oc, costo_oc, fecha_compromiso.
//
// Idempotent: skips columns that already exist so re-running against a
// partially-migrated DB is safe.

const NEW_COLUMNS = {
  proyecto:         { type: DataTypes.STRING,        allowNull: true },
  celda:            { type: DataTypes.STRING,        allowNull: true },
  rfq:              { type: DataTypes.STRING,        allowNull: true },
  mecr:             { type: DataTypes.STRING,        allowNull: true },
  fecha_cotizacion: { type: DataTypes.DATEONLY,      allowNull: true },
  tipo_contrato:    { type: DataTypes.STRING,        allowNull: true },
  fecha_oc:         { type: DataTypes.DATEONLY,      allowNull: true },
  costo_oc:         { type: DataTypes.DECIMAL(12, 2),allowNull: true },
  fecha_compromiso: { type: DataTypes.DATEONLY,      allowNull: true },
};

async function columnExists(qi, table, column) {
  const desc = await qi.describeTable(table);
  return Object.prototype.hasOwnProperty.call(desc, column);
}

module.exports = {
  async up({ context: qi }) {
    for (const [name, spec] of Object.entries(NEW_COLUMNS)) {
      if (!(await columnExists(qi, 'quotes', name))) {
        await qi.addColumn('quotes', name, spec);
      }
    }
  },

  async down({ context: qi }) {
    for (const name of Object.keys(NEW_COLUMNS)) {
      if (await columnExists(qi, 'quotes', name)) {
        await qi.removeColumn('quotes', name);
      }
    }
  },
};
