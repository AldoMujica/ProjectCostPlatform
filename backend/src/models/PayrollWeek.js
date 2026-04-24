const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

// Phase-4 · período semanal de nómina (P4.2 · G-NOM-4).
const PayrollWeek = sequelize.define('PayrollWeek', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  anio:          { type: DataTypes.INTEGER,  allowNull: false },
  mes:           { type: DataTypes.INTEGER,  allowNull: false },
  bimestre:      { type: DataTypes.INTEGER,  allowNull: true },
  semana:        { type: DataTypes.INTEGER,  allowNull: false },
  fechaInicio:   { type: DataTypes.DATEONLY, allowNull: false, field: 'fecha_inicio' },
  fechaFin:      { type: DataTypes.DATEONLY, allowNull: false, field: 'fecha_fin' },
  cerrada:       { type: DataTypes.BOOLEAN,  defaultValue: false },
  cerradaPor:    { type: DataTypes.INTEGER,  allowNull: true, field: 'cerrada_por' },
  cerradaAt:     { type: DataTypes.DATE,     allowNull: true, field: 'cerrada_at' },
  notas:         { type: DataTypes.TEXT,     allowNull: true },
}, {
  tableName: 'payroll_weeks',
  timestamps: true,
  underscored: true,
});

module.exports = PayrollWeek;
