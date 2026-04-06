const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LaborCost = sequelize.define('LaborCost', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  otNumber: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  employeeName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  hoursWorked: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: false,
  },
  hourlyRate: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: false,
  },
  totalCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'MXN',
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
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
  tableName: 'labor_costs',
  timestamps: true,
});

module.exports = LaborCost;
