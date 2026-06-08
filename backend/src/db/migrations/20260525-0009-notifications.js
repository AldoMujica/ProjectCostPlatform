'use strict';
const { DataTypes } = require('sequelize');

module.exports = {
  async up({ context: qi }) {
    await qi.createTable('notifications', {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      user_id: {
        type: DataTypes.INTEGER, allowNull: true,
        references: { model: 'usuarios', key: 'id' }, onDelete: 'CASCADE',
      },
      target_role:  { type: DataTypes.STRING(50), allowNull: true },
      tipo:         { type: DataTypes.STRING(60),  allowNull: false },
      titulo:       { type: DataTypes.STRING(200), allowNull: false },
      mensaje:      { type: DataTypes.TEXT,        allowNull: true },
      entidad:      { type: DataTypes.STRING(60),  allowNull: true },
      entidad_id:   { type: DataTypes.STRING(100), allowNull: true },
      link_modulo:  { type: DataTypes.STRING(50),  allowNull: true },
      leida:        { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: false },
      leida_at:     { type: DataTypes.DATE,    allowNull: true },
      metadatos:    { type: DataTypes.JSONB,   allowNull: true },
      created_at:   { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: false },
      updated_at:   { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: false },
    });
    await qi.addIndex('notifications', ['user_id', 'leida', 'created_at']);
    await qi.addIndex('notifications', ['target_role', 'leida', 'created_at']);
    await qi.addIndex('notifications', ['entidad', 'entidad_id']);
  },

  async down({ context: qi }) {
    await qi.dropTable('notifications');
  },
};
