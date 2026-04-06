const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WorkOrder = sequelize.define('WorkOrder', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  otNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  client: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('Nuevo', 'Refurbish', 'Servicio'),
    allowNull: false,
  },
  progress: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('En ejecución', 'Liberada', 'En revisión', 'Cerrada'),
    defaultValue: 'En ejecución',
  },
  quotedCost: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  actualCost: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'USD',
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  endDate: {
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
  tableName: 'work_orders',
  timestamps: true,
});

module.exports = WorkOrder;
