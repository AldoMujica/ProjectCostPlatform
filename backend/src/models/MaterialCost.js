const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

const MaterialCost = sequelize.define('MaterialCost', {
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
  materialDescription: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'material_description',
  },
  quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  unitCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'unit_cost',
  },

  // G-MAT-4: subtotal / IVA / retención split
  subtotal: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  iva: { type: DataTypes.DECIMAL(12, 2), allowNull: true, defaultValue: 0 },
  retencion: { type: DataTypes.DECIMAL(12, 2), allowNull: true, defaultValue: 0 },
  totalCost: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    field: 'total_cost',
  },

  currency: { type: DataTypes.STRING(3), defaultValue: 'MXN' },
  supplier: { type: DataTypes.STRING, allowNull: false },
  status: {
    type: DataTypes.ENUM('Pendiente', 'En tránsito', 'Entregado'),
    defaultValue: 'Pendiente',
  },
  deliveryDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'delivery_date',
  },
}, {
  tableName: 'material_costs',
  timestamps: true,
  underscored: true,
});

module.exports = MaterialCost;
