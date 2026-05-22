const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

// Phase-3 P3.1 — Órdenes de Compra a Proveedores (OCP / OCA-######).
const PurchaseOrder = sequelize.define('PurchaseOrder', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  ocNumber:     { type: DataTypes.STRING(40), allowNull: false, unique: true, field: 'oc_number' },
  supplierId:   { type: DataTypes.UUID, allowNull: true, field: 'supplier_id' },
  supplierName: { type: DataTypes.STRING, allowNull: false, field: 'supplier_name' },
  workOrderId:  { type: DataTypes.UUID, allowNull: true, field: 'work_order_id' },
  otNumber:     { type: DataTypes.STRING, allowNull: true, field: 'ot_number' },
  description:  { type: DataTypes.TEXT, allowNull: false },
  currency:     { type: DataTypes.STRING(3), defaultValue: 'MXN' },
  amount:       { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  issueDate:    { type: DataTypes.DATEONLY, allowNull: true, field: 'issue_date' },
  expectedDeliveryDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'expected_delivery_date' },
  status:       { type: DataTypes.ENUM('Pendiente', 'Parcial', 'Recibido', 'Cancelada'), defaultValue: 'Pendiente' },
}, {
  tableName: 'purchase_orders_alenstec',
  timestamps: true,
  underscored: true,
  paranoid: true,
  deletedAt: 'deleted_at',
});

module.exports = PurchaseOrder;
