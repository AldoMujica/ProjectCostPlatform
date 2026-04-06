const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MaterialCost = sequelize.define('MaterialCost', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  otNumber: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  materialDescription: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  unitCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  totalCost: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'MXN',
  },
  supplier: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('Pendiente', 'En tránsito', 'Entregado'),
    defaultValue: 'Pendiente',
  },
  deliveryDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'material_costs',
  timestamps: true,
});

module.exports = MaterialCost;
