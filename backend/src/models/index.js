const sequelize = require('../db/sequelize');

const User = require('./User');
const WorkOrder = require('./WorkOrder');
const Quote = require('./Quote');
const MaterialCost = require('./MaterialCost');
const LaborCost = require('./LaborCost');
const Supplier = require('./Supplier');
const SupplierWorkOrder = require('./SupplierWorkOrder');
const Employee = require('./Employee');
const PurchaseOrder = require('./PurchaseOrder');
const InventoryItem = require('./InventoryItem');
const StockMovement = require('./StockMovement');
const SupplierInvoice = require('./SupplierInvoice');
const Delivery = require('./Delivery');
const Incident = require('./Incident');
const WorkOrderApproval = require('./WorkOrderApproval');
const SystemConfig = require('./SystemConfig');
const AuditEvent = require('./AuditEvent');
const PayrollWeek = require('./PayrollWeek');
const PayrollLine = require('./PayrollLine');
const Notification = require('./Notification');

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

// Phase-3 P3.16 / P3.18b — Employee ↔ User (supervisor) and WorkOrder ↔ User
// (supervisor). Both are nullable so unassigned OTs / empleados stay valid.
User.hasMany(Employee, { foreignKey: 'supervisorId', as: 'empleadosSupervisados' });
Employee.belongsTo(User, { foreignKey: 'supervisorId', as: 'supervisor' });

User.hasMany(WorkOrder, { foreignKey: 'supervisorId', as: 'otsSupervisadas' });
WorkOrder.belongsTo(User, { foreignKey: 'supervisorId', as: 'supervisor' });

// Phase-3 associations
Supplier.hasMany(PurchaseOrder, { foreignKey: 'supplierId', as: 'purchaseOrders' });
PurchaseOrder.belongsTo(Supplier, { foreignKey: 'supplierId', as: 'supplierObj' });
WorkOrder.hasMany(PurchaseOrder, { foreignKey: 'workOrderId', as: 'purchaseOrders' });
PurchaseOrder.belongsTo(WorkOrder, { foreignKey: 'workOrderId', as: 'workOrder' });

WorkOrder.hasMany(InventoryItem, { foreignKey: 'assignedWorkOrderId', as: 'inventoryItems' });
InventoryItem.belongsTo(WorkOrder, { foreignKey: 'assignedWorkOrderId', as: 'assignedWorkOrder' });

InventoryItem.hasMany(StockMovement, { foreignKey: 'inventoryItemId', as: 'movements' });
StockMovement.belongsTo(InventoryItem, { foreignKey: 'inventoryItemId', as: 'item' });

Supplier.hasMany(SupplierInvoice, { foreignKey: 'supplierId', as: 'invoices' });
SupplierInvoice.belongsTo(Supplier, { foreignKey: 'supplierId', as: 'supplierObj' });
WorkOrder.hasMany(SupplierInvoice, { foreignKey: 'workOrderId', as: 'invoices' });
SupplierInvoice.belongsTo(WorkOrder, { foreignKey: 'workOrderId', as: 'workOrder' });

Supplier.hasMany(Delivery, { foreignKey: 'supplierId', as: 'deliveries' });
Delivery.belongsTo(Supplier, { foreignKey: 'supplierId', as: 'supplierObj' });
WorkOrder.hasMany(Delivery, { foreignKey: 'workOrderId', as: 'deliveries' });
Delivery.belongsTo(WorkOrder, { foreignKey: 'workOrderId', as: 'workOrder' });
InventoryItem.hasMany(Delivery, { foreignKey: 'inventoryItemId', as: 'deliveries' });
Delivery.belongsTo(InventoryItem, { foreignKey: 'inventoryItemId', as: 'inventoryItem' });

Supplier.hasMany(Incident, { foreignKey: 'supplierId', as: 'incidents' });
Incident.belongsTo(Supplier, { foreignKey: 'supplierId', as: 'supplierObj' });
WorkOrder.hasMany(Incident, { foreignKey: 'workOrderId', as: 'incidents' });
Incident.belongsTo(WorkOrder, { foreignKey: 'workOrderId', as: 'workOrder' });

WorkOrder.hasMany(WorkOrderApproval, { foreignKey: 'workOrderId', as: 'approvals' });
WorkOrderApproval.belongsTo(WorkOrder, { foreignKey: 'workOrderId', as: 'workOrder' });
User.hasMany(WorkOrderApproval, { foreignKey: 'decidedBy', as: 'approvalsDecided' });
WorkOrderApproval.belongsTo(User, { foreignKey: 'decidedBy', as: 'decidedByUser' });

User.hasMany(AuditEvent, { foreignKey: 'usuarioId', as: 'auditEvents' });
AuditEvent.belongsTo(User, { foreignKey: 'usuarioId', as: 'usuario' });

// Phase-4 Nómina · PayrollWeek 1→N PayrollLine; PayrollLine N→1 Employee.
PayrollWeek.hasMany(PayrollLine, { foreignKey: 'payrollWeekId', as: 'lines' });
PayrollLine.belongsTo(PayrollWeek, { foreignKey: 'payrollWeekId', as: 'week' });
PayrollLine.belongsTo(Employee, { foreignKey: 'empleadoId', as: 'empleado' });
Employee.hasMany(PayrollLine, { foreignKey: 'empleadoId', as: 'payrollLines' });

// Phase-5b — attach global audit hooks. Must happen AFTER every model is
// registered on the sequelize instance, but BEFORE the first request runs.
// Failing silently here would leave the bitácora empty, so we keep the
// require at the bottom of this file and let it crash-hard on misconfig.
require('../services/auditService').attachAuditHooks(sequelize);

module.exports = {
  sequelize,
  User,
  WorkOrder,
  Quote,
  MaterialCost,
  LaborCost,
  Supplier,
  SupplierWorkOrder,
  Employee,
  PurchaseOrder,
  InventoryItem,
  StockMovement,
  SupplierInvoice,
  Delivery,
  Incident,
  WorkOrderApproval,
  SystemConfig,
  AuditEvent,
  PayrollWeek,
  PayrollLine,
  Notification,
};
