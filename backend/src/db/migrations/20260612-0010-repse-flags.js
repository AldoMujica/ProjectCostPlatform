'use strict';
const { DataTypes } = require('sequelize');

module.exports = {
  async up({ context: qi }) {
    await qi.addColumn('work_orders', 'es_repse', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await qi.addColumn('labor_costs', 'es_repse', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await qi.addIndex('labor_costs', ['es_repse'], { where: { es_repse: true } });
  },
  async down({ context: qi }) {
    await qi.removeIndex('labor_costs', ['es_repse']);
    await qi.removeColumn('labor_costs', 'es_repse');
    await qi.removeColumn('work_orders', 'es_repse');
  },
};
