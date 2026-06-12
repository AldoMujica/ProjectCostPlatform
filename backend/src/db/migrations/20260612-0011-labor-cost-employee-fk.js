const { DataTypes } = require('sequelize');

module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.addColumn('labor_costs', 'employee_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'empleados', key: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
  },
  down: async ({ context: queryInterface }) => {
    await queryInterface.removeColumn('labor_costs', 'employee_id');
  },
};
