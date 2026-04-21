const { DataTypes } = require('sequelize');

module.exports = {
  async up({ context: qi }) {
    await qi.createTable('usuarios', {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      nombre: { type: DataTypes.STRING(150), allowNull: false },
      email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
      password_hash: { type: DataTypes.STRING(255), allowNull: false },
      rol: {
        type: DataTypes.ENUM('supervisor', 'jefe_area', 'rh', 'admin', 'ventas', 'compras'),
        allowNull: false,
        defaultValue: 'supervisor',
      },
      activo: { type: DataTypes.BOOLEAN, defaultValue: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    await qi.addIndex('usuarios', ['rol']);
  },

  async down({ context: qi }) {
    await qi.dropTable('usuarios');
    await qi.sequelize.query('DROP TYPE IF EXISTS "enum_usuarios_rol"');
  },
};
