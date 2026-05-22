const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

// Phase-3 P3.12 — Incidencias (retrasos / faltantes / rechazos de entregas).
const Incident = sequelize.define('Incident', {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  folio:          { type: DataTypes.STRING(40), allowNull: false, unique: true },
  workOrderId:    { type: DataTypes.UUID, allowNull: true, field: 'work_order_id' },
  otNumber:       { type: DataTypes.STRING, allowNull: true, field: 'ot_number' },
  supplierId:     { type: DataTypes.UUID, allowNull: true, field: 'supplier_id' },
  supplierName:   { type: DataTypes.STRING, allowNull: true, field: 'supplier_name' },
  descripcion:    { type: DataTypes.TEXT, allowNull: false },
  registradoPor:  { type: DataTypes.STRING(120), allowNull: true, field: 'registrado_por' },
  fecha:          { type: DataTypes.DATEONLY, allowNull: false },
  status:         { type: DataTypes.ENUM('Abierta', 'En revisión', 'Cerrada'), defaultValue: 'Abierta' },
}, {
  tableName: 'incidents',
  timestamps: true,
  underscored: true,
  paranoid: true,
  deletedAt: 'deleted_at',
});

module.exports = Incident;
