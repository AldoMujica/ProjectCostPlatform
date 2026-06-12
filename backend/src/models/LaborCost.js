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
  employeeId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'employee_id',
    references: { model: 'empleados', key: 'id' },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
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

  // Módulo 10 (Costo MO) — letra A–M de la taxonomía de labor directa
  // (ver backend/src/utils/laborActivities.js). Nullable: registros viejos
  // anteriores a esta columna no se desglosan por actividad.
  activityCode: {
    type: DataTypes.CHAR(1),
    allowNull: true,
    field: 'activity_code',
  },

  // REPSE — línea de MO prestada por empresa REPSE; requiere tratamiento diferenciado
  esRepse: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: false, field: 'es_repse' },
}, {
  tableName: 'labor_costs',
  timestamps: true,
  underscored: true,
  paranoid: true,
  deletedAt: 'deleted_at',
});

module.exports = LaborCost;
