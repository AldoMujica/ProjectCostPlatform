const { DataTypes } = require('sequelize');

// Phase-5b — Admin panel infrastructure.
//
// `system_config` — single source of truth for business-rule constants that
// ops can tune without touching code (semáforo thresholds, default turno,
// forzar-roles, fiscal parameters once Phase-4 lands). The `value` column is
// JSONB so it can hold numbers, strings, arrays, or objects; the `data_type`
// column drives the admin-panel input widget.
//
// `audit_events` — general-purpose bitácora. Populated automatically by
// Sequelize hooks (attached in models/index.js) and manually via
// services/auditService.logAudit() for login/logout/config-change/etc.

module.exports = {
  async up({ context: qi }) {
    await qi.createTable('system_config', {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      key:         { type: DataTypes.STRING(120), allowNull: false, unique: true },
      value:       { type: DataTypes.JSONB, allowNull: false },
      description: { type: DataTypes.STRING(500), allowNull: true },
      category:    { type: DataTypes.STRING(60),  allowNull: false, defaultValue: 'general' },
      data_type:   { type: DataTypes.ENUM('number', 'string', 'boolean', 'array', 'object'),
                     allowNull: false, defaultValue: 'string' },
      updated_by:  { type: DataTypes.INTEGER, allowNull: true,
                     references: { model: 'usuarios', key: 'id' }, onDelete: 'SET NULL' },
      created_at:  { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at:  { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    await qi.addIndex('system_config', ['category']);

    await qi.createTable('audit_events', {
      id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
      usuario_id:     { type: DataTypes.INTEGER, allowNull: true,
                        references: { model: 'usuarios', key: 'id' }, onDelete: 'SET NULL' },
      usuario_nombre: { type: DataTypes.STRING(150), allowNull: true },
      usuario_rol:    { type: DataTypes.STRING(40),  allowNull: true },
      accion:         { type: DataTypes.STRING(40),  allowNull: false },
      entidad:        { type: DataTypes.STRING(60),  allowNull: false },
      entidad_id:     { type: DataTypes.STRING(64),  allowNull: true },
      descripcion:    { type: DataTypes.STRING(300), allowNull: true },
      antes:          { type: DataTypes.JSONB, allowNull: true },
      despues:        { type: DataTypes.JSONB, allowNull: true },
      ip:             { type: DataTypes.STRING(45),  allowNull: true },
      metadatos:      { type: DataTypes.JSONB, allowNull: true },
      fecha:          { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    await qi.addIndex('audit_events', ['entidad', 'entidad_id', 'fecha']);
    await qi.addIndex('audit_events', ['usuario_id', 'fecha']);
    await qi.addIndex('audit_events', ['fecha']);
    await qi.addIndex('audit_events', ['accion']);
  },

  async down({ context: qi }) {
    await qi.dropTable('audit_events');
    await qi.dropTable('system_config');
    await qi.sequelize.query('DROP TYPE IF EXISTS "enum_system_config_data_type"');
  },
};
