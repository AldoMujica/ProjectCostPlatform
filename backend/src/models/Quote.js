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
  cliente: { type: DataTypes.STRING, allowNull: true }, // Alias for client
  description: { type: DataTypes.TEXT, allowNull: false },
  descripcionProyecto: { type: DataTypes.TEXT, allowNull: true, field: 'descripcion_proyecto' },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  currency: { type: DataTypes.STRING(3), defaultValue: 'USD' },
  status: {
    type: DataTypes.ENUM('Pendiente', 'Aprobada', 'Rechazada', 'Expirada'),
    defaultValue: 'Pendiente',
  },
  validUntil: { type: DataTypes.DATE, allowNull: true, field: 'valid_until' },

  // G-COT-5 extensions — all fields from mockup
  proyecto: { type: DataTypes.STRING, allowNull: true },
  celda: { type: DataTypes.STRING, allowNull: true },
  rfq: { type: DataTypes.STRING, allowNull: true },
  mecr: { type: DataTypes.STRING, allowNull: true },
  cotRef: { type: DataTypes.STRING, allowNull: true, field: 'cot_ref' },
  cotRefAlenstec: { type: DataTypes.STRING, allowNull: true, field: 'cot_ref_alenstec' },
  fechaCot: { type: DataTypes.DATE, allowNull: true, field: 'fecha_cot' },
  costoCotUsd: { type: DataTypes.DECIMAL(12, 2), allowNull: true, field: 'costo_cot_usd' },
  ocCliente: { type: DataTypes.STRING, allowNull: true, field: 'oc_cliente' },
  tipoContrato: { type: DataTypes.STRING, allowNull: true, field: 'tipo_contrato' },
  fechaOc: { type: DataTypes.DATE, allowNull: true, field: 'fecha_oc' },
  costoOcUsd: { type: DataTypes.DECIMAL(12, 2), allowNull: true, field: 'costo_oc_usd' },
  fechaCompromiso: { type: DataTypes.DATE, allowNull: true, field: 'fecha_compromiso' },
  tipoCambio: { type: DataTypes.DECIMAL(10, 4), allowNull: true, field: 'tipo_cambio' },
  exchangeRate: { type: DataTypes.DECIMAL(10, 4), allowNull: true, field: 'exchange_rate' },
  otNumber: { type: DataTypes.STRING, allowNull: true, field: 'ot_number' },
  tipo: {
    type: DataTypes.ENUM('Nuevo', 'Refurbish', 'Servicio'),
    allowNull: true,
  },

  // Labor sections (JSON for flexibility)
  laborIndirecta: { type: DataTypes.JSON, allowNull: true, field: 'labor_indirecta' },
  laborDirectaIngenieria: { type: DataTypes.JSON, allowNull: true, field: 'labor_directa_ingenieria' },
  laborDirectaManufactura: { type: DataTypes.JSON, allowNull: true, field: 'labor_directa_manufactura' },
  laborDirectaAutomatizacion: { type: DataTypes.JSON, allowNull: true, field: 'labor_directa_automatizacion' },

  // Materials (JSON)
  materiales: { type: DataTypes.JSON, allowNull: true },
  viaticos: { type: DataTypes.JSON, allowNull: true },
  logistica: { type: DataTypes.JSON, allowNull: true },

  // Final totals
  utilidadFinal: { type: DataTypes.DECIMAL(12, 2), allowNull: true, field: 'utilidad_final' },
  ivaEmpresa: { type: DataTypes.DECIMAL(12, 2), allowNull: true, field: 'iva_empresa' },
  totalFinal: { type: DataTypes.DECIMAL(12, 2), allowNull: true, field: 'total_final' },
  notas: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'quotes',
  timestamps: true,
  underscored: true,
});

module.exports = Quote;
