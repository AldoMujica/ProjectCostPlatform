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

  // Control de Ventas 2026 workbook alignment — mirrors the first 19 cols
  // of the "Control Ventas 2026" sheet so the upload/download flow can
  // round-trip without lossy mapping.
  proyecto:        { type: DataTypes.STRING, allowNull: true },
  celda:           { type: DataTypes.STRING, allowNull: true },
  rfq:             { type: DataTypes.STRING, allowNull: true },
  mecr:            { type: DataTypes.STRING, allowNull: true },
  fechaCotizacion: { type: DataTypes.DATEONLY, allowNull: true, field: 'fecha_cotizacion' },
  tipoContrato:    { type: DataTypes.STRING, allowNull: true, field: 'tipo_contrato' },
  fechaOC:         { type: DataTypes.DATEONLY, allowNull: true, field: 'fecha_oc' },
  costoOC:         { type: DataTypes.DECIMAL(12, 2), allowNull: true, field: 'costo_oc' },
  fechaCompromiso: { type: DataTypes.DATEONLY, allowNull: true, field: 'fecha_compromiso' },

  // Módulo 10 (Costo MO) — desglose COTIZADO de labor directa por las 13
  // actividades A–M. Capturado a mano desde la UI. Estructura:
  //   [{ code: 'A', label?: string, hours: number, rate: number }, ...]
  // Si es null, la OT aún no tiene desglose y el reporte mostrará "—" en
  // las columnas cotizadas.
  laborBreakdown: { type: DataTypes.JSONB, allowNull: true, field: 'labor_breakdown' },

  // ── Columnas expandidas "Control de Ventas 2026" (migración 20260424-0001) ──
  // Labor Indirecta: array de actividades [{ actividad, cotHrs, realHrs, costPerHr, totalCost }]
  laborIndirecta:           { type: DataTypes.JSON, allowNull: true, field: 'labor_indirecta' },
  // Labor Directa Ingeniería: { cotHrs, realHrs, costPerHr, totalCost }
  laborDirectaIngenieria:   { type: DataTypes.JSON, allowNull: true, field: 'labor_directa_ingenieria' },
  // Labor Directa Manufactura: { cotProcesses:{corte,fabricacion,maquinado,hiloErosion,ensamble,
  //   laborElectrica,otrosProc,shopper,certDimensional,empaque}, cotInstall:{supervisor,tecnicoMecanico,
  //   electrico,programador,total}, realProcesses:{...sin empaque}, realInstall:{diseno,tecnico,
  //   electrico,programador,total}, costPerHr, totalCost }
  laborDirectaManufactura:  { type: DataTypes.JSON, allowNull: true, field: 'labor_directa_manufactura' },
  // Labor Directa Automatización: { cotHrs, realHrs, costPerHr, totalCost }
  laborDirectaAutomatizacion: { type: DataTypes.JSON, allowNull: true, field: 'labor_directa_automatizacion' },
  // Materiales: { aceros, plasticos, recubrimientos, tratamientos, componentes, certificados,
  //   subtotal, profitPct, profitUsd, total }
  materiales:               { type: DataTypes.JSON, allowNull: true },
  // Viáticos: { comida, estancia, peaje, gasolina, total }
  viaticos:                 { type: DataTypes.JSON, allowNull: true },
  // Logística: { envio, embalaje, total }
  logistica:                { type: DataTypes.JSON, allowNull: true },
  // Totales finales escalares
  utilidadFinal:            { type: DataTypes.DECIMAL(12, 2), allowNull: true, field: 'utilidad_final' },
  ivaEmpresa:               { type: DataTypes.DECIMAL(12, 2), allowNull: true, field: 'iva_empresa' },
  totalFinal:               { type: DataTypes.DECIMAL(12, 2), allowNull: true, field: 'total_final' },
  notas:                    { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'quotes',
  timestamps: true,
  underscored: true,
  paranoid: true,
  deletedAt: 'deleted_at',
});

module.exports = Quote;
