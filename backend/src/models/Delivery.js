const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

// Phase-3 P3.12 — Registro de Entregas de Material (recepción en almacén).
const Delivery = sequelize.define('Delivery', {
  id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  deliveryNumber:   { type: DataTypes.STRING(40), allowNull: true, field: 'delivery_number' },
  supplierId:       { type: DataTypes.UUID, allowNull: true, field: 'supplier_id' },
  supplierName:     { type: DataTypes.STRING, allowNull: false, field: 'supplier_name' },
  workOrderId:      { type: DataTypes.UUID, allowNull: true, field: 'work_order_id' },
  otNumber:         { type: DataTypes.STRING, allowNull: true, field: 'ot_number' },
  producto:         { type: DataTypes.STRING(200), allowNull: false },
  piezas:           { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  unitCost:         { type: DataTypes.DECIMAL(12, 4), allowNull: true, field: 'unit_cost' },
  currency:         { type: DataTypes.STRING(3), defaultValue: 'MXN' },
  entregadoPor:     { type: DataTypes.STRING(120), allowNull: true, field: 'entregado_por' },
  fechaRecibido:    { type: DataTypes.DATEONLY, allowNull: true, field: 'fecha_recibido' },
  fechaAutorizado:  { type: DataTypes.DATEONLY, allowNull: true, field: 'fecha_autorizado' },
  inventoryItemId:  { type: DataTypes.UUID, allowNull: true, field: 'inventory_item_id' },
  incidencia:       { type: DataTypes.STRING(240), allowNull: true },
  status:           { type: DataTypes.ENUM('Pendiente', 'Entregado', 'Con incidencia'), defaultValue: 'Pendiente' },
}, {
  tableName: 'deliveries',
  timestamps: true,
  underscored: true,
  paranoid: true,
  deletedAt: 'deleted_at',
});

module.exports = Delivery;
