const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

const ROLES = ['supervisor', 'jefe_area', 'rh', 'admin', 'ventas', 'compras'];

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  nombre: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  passwordHash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'password_hash',
  },
  rol: {
    type: DataTypes.ENUM(...ROLES),
    allowNull: false,
    defaultValue: 'supervisor',
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'usuarios',
  timestamps: true,
  underscored: true,
});

User.ROLES = ROLES;

module.exports = User;
