const { DataTypes } = require('sequelize');

module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.addColumn('usuarios', 'permission_overrides', {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    });
  },
  down: async ({ context: queryInterface }) => {
    await queryInterface.removeColumn('usuarios', 'permission_overrides');
  },
};
