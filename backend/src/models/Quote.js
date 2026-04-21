const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

const Quote = sequelize.define('Quote', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  quoteNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'quote_number',
  },
  client: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  currency: { type: DataTypes.STRING(3), defaultValue: 'USD' },
  status: {
    type: DataTypes.ENUM('Pendiente', 'Aprobada', 'Rechazada', 'Expirada'),
    defaultValue: 'Pendiente',
  },
  validUntil: { type: DataTypes.DATE, allowNull: true, field: 'valid_until' },

  // G-COT-5 extensions
  cotRef: { type: DataTypes.STRING, allowNull: true, field: 'cot_ref' },
  ocCliente: { type: DataTypes.STRING, allowNull: true, field: 'oc_cliente' },
  exchangeRate: { type: DataTypes.DECIMAL(10, 4), allowNull: true, field: 'exchange_rate' },
  otNumber: { type: DataTypes.STRING, allowNull: true, field: 'ot_number' },
  tipo: {
    type: DataTypes.ENUM('Nuevo', 'Refurbish', 'Servicio'),
    allowNull: true,
  },
}, {
  tableName: 'quotes',
  timestamps: true,
  underscored: true,
});

module.exports = Quote;
