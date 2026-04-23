const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

// Phase-5b — key/value config store editable from the admin panel.
// See services/configService.js for the caching layer (30 s TTL, invalidates
// on write) and services/auditService.js for change tracking.
const SystemConfig = sequelize.define('SystemConfig', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  key:         { type: DataTypes.STRING(120), allowNull: false, unique: true },
  value:       { type: DataTypes.JSONB, allowNull: false },
  description: { type: DataTypes.STRING(500), allowNull: true },
  category:    { type: DataTypes.STRING(60),  allowNull: false, defaultValue: 'general' },
  dataType:    { type: DataTypes.ENUM('number', 'string', 'boolean', 'array', 'object'),
                 allowNull: false, defaultValue: 'string', field: 'data_type' },
  updatedBy:   { type: DataTypes.INTEGER, allowNull: true, field: 'updated_by' },
}, {
  tableName: 'system_config',
  timestamps: true,
  underscored: true,
});

module.exports = SystemConfig;
