const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

const SupplierWorkOrder = sequelize.define('SupplierWorkOrder', {
  supplierId: {
    type: DataTypes.UUID,
    primaryKey: true,
    field: 'supplier_id',
    references: { model: 'suppliers', key: 'id' },
    onDelete: 'CASCADE',
  },
  workOrderId: {
    type: DataTypes.UUID,
    primaryKey: true,
    field: 'work_order_id',
    references: { model: 'work_orders', key: 'id' },
    onDelete: 'CASCADE',
  },
}, {
  tableName: 'supplier_work_orders',
  timestamps: true,
  underscored: true,
});

module.exports = SupplierWorkOrder;
