const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

// Phase-3 P3.8 — Facturas (CFDI) de proveedores.
// Phase-6 will extend validacion_sat to reflect real PAC / SAT response.
const SupplierInvoice = sequelize.define('SupplierInvoice', {
  id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  uuidFiscal:       { type: DataTypes.STRING(64), allowNull: false, unique: true, field: 'uuid_fiscal' },
  rfcEmisor:        { type: DataTypes.STRING(20), allowNull: false, field: 'rfc_emisor' },
  rfcReceptor:      { type: DataTypes.STRING(20), allowNull: false, field: 'rfc_receptor' },
  serie:            { type: DataTypes.STRING(20), allowNull: true },
  folio:            { type: DataTypes.STRING(40), allowNull: true },
  fechaEmision:     { type: DataTypes.DATE, allowNull: true, field: 'fecha_emision' },
  fechaCertificacion: { type: DataTypes.DATE, allowNull: true, field: 'fecha_certificacion' },
  regimenFiscal:    { type: DataTypes.STRING(80), allowNull: true, field: 'regimen_fiscal' },
  concepto:         { type: DataTypes.TEXT, allowNull: true },
  cantidad:         { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  precioUnitario:   { type: DataTypes.DECIMAL(12, 4), allowNull: true, field: 'precio_unitario' },
  subtotal:         { type: DataTypes.DECIMAL(14, 2), allowNull: true },
  iva:              { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  retencionIsr:     { type: DataTypes.DECIMAL(12, 2), defaultValue: 0, field: 'retencion_isr' },
  retencionIva:     { type: DataTypes.DECIMAL(12, 2), defaultValue: 0, field: 'retencion_iva' },
  total:            { type: DataTypes.DECIMAL(14, 2), allowNull: false },
  moneda:           { type: DataTypes.STRING(3), defaultValue: 'MXN' },
  tipoCambio:       { type: DataTypes.DECIMAL(10, 4), allowNull: true, field: 'tipo_cambio' },
  metodoPago:       { type: DataTypes.ENUM('PUE', 'PPD'), allowNull: true, field: 'metodo_pago' },
  validacionSat:    { type: DataTypes.ENUM('válida', 'pendiente', 'revisar', 'no válida'),
                      defaultValue: 'pendiente', field: 'validacion_sat' },
  supplierId:       { type: DataTypes.UUID, allowNull: true, field: 'supplier_id' },
  workOrderId:      { type: DataTypes.UUID, allowNull: true, field: 'work_order_id' },
  otNumber:         { type: DataTypes.STRING, allowNull: true, field: 'ot_number' },
  xmlRaw:           { type: DataTypes.TEXT, allowNull: true, field: 'xml_raw' },
}, {
  tableName: 'supplier_invoices',
  timestamps: true,
  underscored: true,
});

module.exports = SupplierInvoice;
