const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

const Supplier = sequelize.define('Supplier', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  supplierName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'supplier_name',
  },
  description: { type: DataTypes.TEXT, allowNull: true },
  categories: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
  },
  status: {
    type: DataTypes.ENUM('Activo', 'Inactivo'),
    defaultValue: 'Activo',
  },
  contactEmail: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'contact_email',
  },
  contactPhone: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'contact_phone',
  },

  // G-PROV-4
  saldoPendiente: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    field: 'saldo_pendiente',
  },
}, {
  tableName: 'suppliers',
  timestamps: true,
  underscored: true,
});

module.exports = Supplier;
