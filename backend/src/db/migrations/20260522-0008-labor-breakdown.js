const { DataTypes } = require('sequelize');

// Labor cost breakdown — Módulos 7 (Horas) y 10 (Costo MO).
//
// 1) `quotes.labor_breakdown JSONB` guarda el desglose COTIZADO por las 13
//    actividades A–M (estructura: [{ code, label?, hours, rate }]). El
//    cliente lo captura manualmente desde la UI (modal por OT).
//
// 2) `labor_costs.activity_code CHAR(1)` permite agrupar las horas REALES
//    por la misma taxonomía A–M (nullable — registros viejos quedan en el
//    total general sin desglose).
//
// Ambos cambios son aditivos y nullable, sin migración de datos.

async function columnExists(qi, table, column) {
  const desc = await qi.describeTable(table);
  return Object.prototype.hasOwnProperty.call(desc, column);
}

module.exports = {
  async up({ context: qi }) {
    if (!(await columnExists(qi, 'quotes', 'labor_breakdown'))) {
      await qi.addColumn('quotes', 'labor_breakdown', {
        type: DataTypes.JSONB,
        allowNull: true,
      });
    }
    if (!(await columnExists(qi, 'labor_costs', 'activity_code'))) {
      await qi.addColumn('labor_costs', 'activity_code', {
        type: DataTypes.CHAR(1),
        allowNull: true,
      });
      await qi.sequelize.query(
        `CREATE INDEX IF NOT EXISTS idx_labor_costs_activity_code
           ON labor_costs (activity_code) WHERE activity_code IS NOT NULL`,
      );
    }
  },

  async down({ context: qi }) {
    if (await columnExists(qi, 'labor_costs', 'activity_code')) {
      await qi.sequelize.query('DROP INDEX IF EXISTS idx_labor_costs_activity_code');
      await qi.removeColumn('labor_costs', 'activity_code');
    }
    if (await columnExists(qi, 'quotes', 'labor_breakdown')) {
      await qi.removeColumn('quotes', 'labor_breakdown');
    }
  },
};
