const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

// Phase-3 P3.4 — Inventario (existencias físicas en almacén).
const InventoryItem = sequelize.define('InventoryItem', {
  id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  clave:         { type: DataTypes.STRING(60), allowNull: false, unique: true },
  description:   { type: DataTypes.STRING(200), allowNull: false },
  supplierName:  { type: DataTypes.STRING, allowNull: true, field: 'supplier_name' },
  currency:      { type: DataTypes.STRING(3), defaultValue: 'MXN' },
  existencia:    { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  unidad:        { type: DataTypes.STRING(20), defaultValue: 'pza' },
  unitCost:      { type: DataTypes.DECIMAL(12, 4), allowNull: false, defaultValue: 0, field: 'unit_cost' },
  assignedWorkOrderId: { type: DataTypes.UUID, allowNull: true, field: 'assigned_work_order_id' },
  assignedOtNumber:    { type: DataTypes.STRING, allowNull: true, field: 'assigned_ot_number' },
  status:        { type: DataTypes.ENUM('Asignado', 'Sin asignar', 'Agotado'), defaultValue: 'Sin asignar' },
}, {
  tableName: 'inventory_items',
  timestamps: true,
  underscored: true,
  paranoid: true,
  deletedAt: 'deleted_at',
});

module.exports = InventoryItem;
