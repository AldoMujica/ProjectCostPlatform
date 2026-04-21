const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

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
    field: 'ot_number',
  },
  client: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  type: {
    type: DataTypes.ENUM('Nuevo', 'Refurbish', 'Servicio'),
    allowNull: false,
  },
  progress: { type: DataTypes.INTEGER, defaultValue: 0 },
  status: {
    type: DataTypes.ENUM('En ejecución', 'Liberada', 'En revisión', 'Cerrada'),
    defaultValue: 'En ejecución',
  },
  quotedCost: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    field: 'quoted_cost',
  },
  actualCost: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
    field: 'actual_cost',
  },
  currency: { type: DataTypes.STRING(3), defaultValue: 'USD' },
  startDate: { type: DataTypes.DATE, allowNull: true, field: 'start_date' },
  endDate: { type: DataTypes.DATE, allowNull: true, field: 'end_date' },

  // Liberation form (G-OT-2)
  quoteRef: { type: DataTypes.STRING, allowNull: true, field: 'quote_ref' },
  customerPO: { type: DataTypes.STRING, allowNull: true, field: 'customer_po' },
  exchangeRate: { type: DataTypes.DECIMAL(10, 4), allowNull: true, field: 'exchange_rate' },
  liberationDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'liberation_date' },
  liberatedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'liberated_by' },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'work_orders',
  timestamps: true,
  underscored: true,
});

module.exports = WorkOrder;
