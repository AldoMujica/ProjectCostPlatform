const { DataTypes } = require('sequelize');

// Phase-3 P3.16 — extend existing `empleados` table (created in
// 20260420-0003-asistencia-conciliacion.sql) with the columns the mockup's
// Control de Empleados card renders (RFC, CURP, IMSS, puesto, SD, SDI, etc.).
// Adding columns in-place avoids duplicating the master and keeps the
// conciliación joins (registros_checador, horas_clasificadas, incidencias)
// pointing at the same rows.
//
// Also lands P3.18b — adds `supervisor_id` to `work_orders` so
// `filtrarPorSupervisor` can finally filter by OT ownership. Decision:
// ownership lives at the OT level (not at the empleado → labor-cost level)
// because every Phase-2 wiring is OT-scoped and this is the narrowest
// change that doesn't depend on introducing empleado_id on labor_costs.

const EMPLOYEE_COLUMNS = {
  nombre_rep_proc:    { type: DataTypes.STRING(200), allowNull: true },
  rfc:                { type: DataTypes.STRING(20),  allowNull: true },
  curp:               { type: DataTypes.STRING(20),  allowNull: true },
  imss:               { type: DataTypes.STRING(20),  allowNull: true },
  nivel_estudios:     { type: DataTypes.STRING(50),  allowNull: true },
  puesto:             { type: DataTypes.STRING(120), allowNull: true },
  departamento:       { type: DataTypes.STRING(120), allowNull: true },
  fecha_ingreso:      { type: DataTypes.DATEONLY,    allowNull: true },
  salario_diario:     { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  salario_diario_integrado: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
};

async function columnExists(qi, table, column) {
  const desc = await qi.describeTable(table);
  return Object.prototype.hasOwnProperty.call(desc, column);
}

module.exports = {
  async up({ context: qi }) {
    for (const [name, spec] of Object.entries(EMPLOYEE_COLUMNS)) {
      if (!(await columnExists(qi, 'empleados', name))) {
        await qi.addColumn('empleados', name, spec);
      }
    }
    if (!(await columnExists(qi, 'empleados', 'rfc'))) {
      // guard — if addColumn didn't run, skip index
    } else {
      // Unique-ish indices on RFC/CURP for later lookups. Allow NULLs (legacy
      // CSV imports won't have these); Postgres partial-unique syntax not
      // portable through QueryInterface, so use plain non-unique indices.
      await qi.addIndex('empleados', ['rfc'],  { name: 'idx_empleados_rfc',  where: null }).catch(() => {});
      await qi.addIndex('empleados', ['curp'], { name: 'idx_empleados_curp', where: null }).catch(() => {});
    }

    if (!(await columnExists(qi, 'work_orders', 'supervisor_id'))) {
      await qi.addColumn('work_orders', 'supervisor_id', {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'SET NULL',
      });
      await qi.addIndex('work_orders', ['supervisor_id'], { name: 'idx_work_orders_supervisor' });
    }
  },

  async down({ context: qi }) {
    if (await columnExists(qi, 'work_orders', 'supervisor_id')) {
      await qi.removeIndex('work_orders', 'idx_work_orders_supervisor').catch(() => {});
      await qi.removeColumn('work_orders', 'supervisor_id');
    }
    await qi.removeIndex('empleados', 'idx_empleados_rfc').catch(() => {});
    await qi.removeIndex('empleados', 'idx_empleados_curp').catch(() => {});
    for (const name of Object.keys(EMPLOYEE_COLUMNS).reverse()) {
      if (await columnExists(qi, 'empleados', name)) {
        await qi.removeColumn('empleados', name);
      }
    }
  },
};
