'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId:      { type: DataTypes.INTEGER, allowNull: true,  field: 'user_id' },
  targetRole:  { type: DataTypes.STRING(50), allowNull: true, field: 'target_role' },
  tipo:        { type: DataTypes.STRING(60), allowNull: false },
  titulo:      { type: DataTypes.STRING(200), allowNull: false },
  mensaje:     { type: DataTypes.TEXT,    allowNull: true },
  entidad:     { type: DataTypes.STRING(60), allowNull: true },
  entidadId:   { type: DataTypes.STRING(100), allowNull: true, field: 'entidad_id' },
  linkModulo:  { type: DataTypes.STRING(50), allowNull: true, field: 'link_modulo' },
  leida:       { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: false },
  leidaAt:     { type: DataTypes.DATE,    allowNull: true,  field: 'leida_at' },
  metadatos:   { type: DataTypes.JSONB,   allowNull: true },
}, {
  tableName: 'notifications',
  underscored: true,
});

module.exports = Notification;
