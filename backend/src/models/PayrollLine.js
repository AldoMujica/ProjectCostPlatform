const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

// Phase-4 · línea de nómina por empleado por semana (P4.2 · G-NOM-4).
//
// Los campos `numero_lista/nombre/rfc/...` están denormalizados del
// empleado master porque representan el estado al cierre de esa semana
// — si después RH cambia el puesto o el SDI del empleado, la línea de
// nómina ya capturada no cambia.
//
// `detalle` JSONB guarda la granularidad del layout P4.1 (horas por
// tipo de turno, percepciones gravado/exento/total por concepto,
// deducciones IMSS/ISR/INFONAVIT/FONACOT). Los totales arriba en
// columnas tipadas permiten SUM() de KPIs sin parsear el blob.
const PayrollLine = sequelize.define('PayrollLine', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  payrollWeekId: { type: DataTypes.UUID,    allowNull: false, field: 'payroll_week_id' },
  empleadoId:    { type: DataTypes.INTEGER, allowNull: false, field: 'empleado_id' },

  // Snapshot del empleado al momento de la captura.
  numeroLista:   { type: DataTypes.STRING(20),  allowNull: true, field: 'numero_lista' },
  nombre:        { type: DataTypes.STRING(150), allowNull: true },
  rfc:           { type: DataTypes.STRING(20),  allowNull: true },
  curp:          { type: DataTypes.STRING(20),  allowNull: true },
  imss:          { type: DataTypes.STRING(20),  allowNull: true },
  puesto:        { type: DataTypes.STRING(120), allowNull: true },
  area:          { type: DataTypes.STRING(100), allowNull: true },
  departamento:  { type: DataTypes.STRING(120), allowNull: true },
  turno:         { type: DataTypes.STRING(20),  allowNull: true },
  fechaIngreso:  { type: DataTypes.DATEONLY,    allowNull: true, field: 'fecha_ingreso' },
  sd:            { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  sdi:           { type: DataTypes.DECIMAL(10, 2), allowNull: true },

  // Totales tipados (agregables via SQL).
  totalPercepciones:    { type: DataTypes.DECIMAL(12, 2), defaultValue: 0, field: 'total_percepciones' },
  totalDeducciones:     { type: DataTypes.DECIMAL(12, 2), defaultValue: 0, field: 'total_deducciones' },
  percepcionesGravadas: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0, field: 'percepciones_gravadas' },
  pagoNomina:           { type: DataTypes.DECIMAL(12, 2), defaultValue: 0, field: 'pago_nomina' },
  diasNomina:           { type: DataTypes.DECIMAL(5, 2),  defaultValue: 0, field: 'dias_nomina' },
  hrsLaboradas:         { type: DataTypes.DECIMAL(6, 2),  defaultValue: 0, field: 'hrs_laboradas' },

  detalle:       { type: DataTypes.JSONB, defaultValue: {} },
  notas:         { type: DataTypes.TEXT,  allowNull: true },
}, {
  tableName: 'payroll_lines',
  timestamps: true,
  underscored: true,
});

module.exports = PayrollLine;
