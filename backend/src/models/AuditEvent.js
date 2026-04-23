const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

// Phase-5b — general-purpose audit trail. Populated by:
//  - Global Sequelize hooks on a curated set of "audited" models
//    (see services/auditService.attachAuditHooks).
//  - Manual logAudit() calls for login/logout/config_change/etc.
//
// The usuario_* fields are denormalized so that deleting a user doesn't
// erase who did what (FK is ON DELETE SET NULL).
const AuditEvent = sequelize.define('AuditEvent', {
  id:             { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  usuarioId:      { type: DataTypes.INTEGER, allowNull: true, field: 'usuario_id' },
  usuarioNombre:  { type: DataTypes.STRING(150), allowNull: true, field: 'usuario_nombre' },
  usuarioRol:     { type: DataTypes.STRING(40),  allowNull: true, field: 'usuario_rol' },
  accion:         { type: DataTypes.STRING(40),  allowNull: false },
  entidad:        { type: DataTypes.STRING(60),  allowNull: false },
  entidadId:      { type: DataTypes.STRING(64),  allowNull: true, field: 'entidad_id' },
  descripcion:    { type: DataTypes.STRING(300), allowNull: true },
  antes:          { type: DataTypes.JSONB, allowNull: true },
  despues:        { type: DataTypes.JSONB, allowNull: true },
  ip:             { type: DataTypes.STRING(45),  allowNull: true },
  metadatos:      { type: DataTypes.JSONB, allowNull: true },
  fecha:          { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'audit_events',
  timestamps: false,
});

module.exports = AuditEvent;
