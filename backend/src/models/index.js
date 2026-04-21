const sequelize = require('../db/sequelize');

const User = require('./User');
const WorkOrder = require('./WorkOrder');
const Quote = require('./Quote');
const MaterialCost = require('./MaterialCost');
const LaborCost = require('./LaborCost');
const Supplier = require('./Supplier');
const SupplierWorkOrder = require('./SupplierWorkOrder');

// Associations (ADR-006: FK enforced, otNumber kept redundant)
WorkOrder.hasMany(MaterialCost, { foreignKey: 'workOrderId', as: 'materialCosts' });
MaterialCost.belongsTo(WorkOrder, { foreignKey: 'workOrderId', as: 'workOrder' });

WorkOrder.hasMany(LaborCost, { foreignKey: 'workOrderId', as: 'laborCosts' });
LaborCost.belongsTo(WorkOrder, { foreignKey: 'workOrderId', as: 'workOrder' });

Supplier.belongsToMany(WorkOrder, {
  through: SupplierWorkOrder,
  foreignKey: 'supplierId',
  otherKey: 'workOrderId',
  as: 'workOrders',
});
WorkOrder.belongsToMany(Supplier, {
  through: SupplierWorkOrder,
  foreignKey: 'workOrderId',
  otherKey: 'supplierId',
  as: 'suppliers',
});

module.exports = {
  sequelize,
  User,
  WorkOrder,
  Quote,
  MaterialCost,
  LaborCost,
  Supplier,
  SupplierWorkOrder,
};
