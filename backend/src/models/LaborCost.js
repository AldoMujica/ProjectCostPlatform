const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

const LaborCost = sequelize.define('LaborCost', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  workOrderId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'work_order_id',
    references: { model: 'work_orders', key: 'id' },
    onDelete: 'RESTRICT',
  },
  otNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'ot_number',
  },
  employeeName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'employee_name',
  },
  role: { type: DataTypes.STRING, allowNull: false },
  hoursWorked: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: false,
    field: 'hours_worked',
  },
  hourlyRate: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: false,
    field: 'hourly_rate',
  },
  totalCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'total_cost',
  },
  currency: { type: DataTypes.STRING(3), defaultValue: 'MXN' },
  date: { type: DataTypes.DATE, allowNull: false },
}, {
  tableName: 'labor_costs',
  timestamps: true,
  underscored: true,
});

module.exports = LaborCost;
