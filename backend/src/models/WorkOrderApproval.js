const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

// Phase-3 P3.19 — Flujo de liberación (5 pasos) para órdenes de trabajo.
const WorkOrderApproval = sequelize.define('WorkOrderApproval', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  workOrderId: { type: DataTypes.UUID, allowNull: false, field: 'work_order_id' },
  step:        { type: DataTypes.ENUM('cotizacion', 'compras', 'produccion', 'calidad', 'liberacion_final'), allowNull: false },
  status:      { type: DataTypes.ENUM('pendiente', 'aprobada', 'rechazada'), defaultValue: 'pendiente' },
  decidedBy:   { type: DataTypes.INTEGER, allowNull: true, field: 'decided_by' },
  decidedAt:   { type: DataTypes.DATE, allowNull: true, field: 'decided_at' },
  comments:    { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'work_order_approvals',
  timestamps: true,
  underscored: true,
});

module.exports = WorkOrderApproval;
