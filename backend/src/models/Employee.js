const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

// Phase-3 P3.16 — Employee master. Mapped onto the existing `empleados` table
// (created by the conciliación SQL migration); Phase-3 extensions added the
// Control-de-Empleados columns (RFC, CURP, IMSS, puesto, SD, SDI, etc.).
const Employee = sequelize.define('Employee', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  numeroLista: { type: DataTypes.STRING(20), allowNull: false, unique: true, field: 'numero_lista' },
  nombre:      { type: DataTypes.STRING(150), allowNull: false },
  turno:       { type: DataTypes.STRING(20), defaultValue: '08:00-17:00' },
  area:        { type: DataTypes.STRING(100), allowNull: false },
  supervisorId:{ type: DataTypes.INTEGER, allowNull: true, field: 'supervisor_id' },
  activo:      { type: DataTypes.BOOLEAN, defaultValue: true },

  nombreRepProc:  { type: DataTypes.STRING(200), allowNull: true, field: 'nombre_rep_proc' },
  rfc:            { type: DataTypes.STRING(20),  allowNull: true },
  curp:           { type: DataTypes.STRING(20),  allowNull: true },
  imss:           { type: DataTypes.STRING(20),  allowNull: true },
  nivelEstudios:  { type: DataTypes.STRING(50),  allowNull: true, field: 'nivel_estudios' },
  puesto:         { type: DataTypes.STRING(120), allowNull: true },
  departamento:   { type: DataTypes.STRING(120), allowNull: true },
  fechaIngreso:   { type: DataTypes.DATEONLY,    allowNull: true, field: 'fecha_ingreso' },
  salarioDiario:  { type: DataTypes.DECIMAL(10, 2), allowNull: true, field: 'salario_diario' },
  salarioDiarioIntegrado: { type: DataTypes.DECIMAL(10, 2), allowNull: true, field: 'salario_diario_integrado' },
}, {
  tableName: 'empleados',
  timestamps: true,
  underscored: true,
  paranoid: true,
  deletedAt: 'deleted_at',
});

module.exports = Employee;
