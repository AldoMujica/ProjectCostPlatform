const { DataTypes } = require('sequelize');

// Phase-4 Nómina · skeleton (P4.2 · G-NOM-4).
//
// Dos tablas:
//
//   payroll_weeks  — período semanal (año/mes/bimestre/semana + rango de
//                    fechas + cerrada). Unique compuesto (año, semana).
//
//   payroll_lines  — una fila por empleado por semana. Identificación y
//                    totales (percepciones / deducciones / pago) en
//                    columnas tipadas para que las KPIs del Resumen se
//                    puedan agregar via SQL. El resto del desglose
//                    (horas por tipo de turno, percepciones granulares,
//                    deducciones IMSS/ISR/INFONAVIT/FONACOT) vive en
//                    `detalle` JSONB. Razón: el layout exacto de 86+
//                    columnas depende de la revisión P4.1 con cliente;
//                    JSONB nos evita churn de migraciones cada vez que
//                    aparece una nueva columna.
//
// Las calculadoras (IMSS obrero-patronal, ISR tarifa 2026, INFONAVIT,
// FONACOT) NO viven en esta migración — llegan en P4.3–P4.6 cuando el
// cliente nos entregue los 20 escenarios de referencia para unit tests.
// Hoy los totales se capturan manualmente.

module.exports = {
  async up({ context: qi }) {
    await qi.createTable('payroll_weeks', {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      anio:         { type: DataTypes.INTEGER, allowNull: false },  // "año" sin ñ para portabilidad
      mes:          { type: DataTypes.INTEGER, allowNull: false },
      bimestre:     { type: DataTypes.INTEGER, allowNull: true },
      semana:       { type: DataTypes.INTEGER, allowNull: false },
      fecha_inicio: { type: DataTypes.DATEONLY, allowNull: false },
      fecha_fin:    { type: DataTypes.DATEONLY, allowNull: false },
      cerrada:      { type: DataTypes.BOOLEAN, defaultValue: false },
      cerrada_por:  { type: DataTypes.INTEGER, allowNull: true,
                      references: { model: 'usuarios', key: 'id' }, onDelete: 'SET NULL' },
      cerrada_at:   { type: DataTypes.DATE, allowNull: true },
      notas:        { type: DataTypes.TEXT, allowNull: true },
      created_at:   { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at:   { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    await qi.addIndex('payroll_weeks', ['anio', 'semana'], {
      unique: true, name: 'ux_payroll_weeks_anio_semana',
    });
    await qi.addIndex('payroll_weeks', ['fecha_inicio', 'fecha_fin']);

    await qi.createTable('payroll_lines', {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      payroll_week_id: { type: DataTypes.UUID, allowNull: false,
                         references: { model: 'payroll_weeks', key: 'id' }, onDelete: 'CASCADE' },
      empleado_id:     { type: DataTypes.INTEGER, allowNull: false,
                         references: { model: 'empleados', key: 'id' }, onDelete: 'RESTRICT' },

      // Snapshot denormalizado del empleado al cierre de la semana —
      // si después cambian RFC/puesto/etc. en el empleado master, esta
      // línea de nómina conserva el estado que tenía al capturarse.
      numero_lista:  { type: DataTypes.STRING(20),  allowNull: true },
      nombre:        { type: DataTypes.STRING(150), allowNull: true },
      rfc:           { type: DataTypes.STRING(20),  allowNull: true },
      curp:          { type: DataTypes.STRING(20),  allowNull: true },
      imss:          { type: DataTypes.STRING(20),  allowNull: true },
      puesto:        { type: DataTypes.STRING(120), allowNull: true },
      area:          { type: DataTypes.STRING(100), allowNull: true },
      departamento:  { type: DataTypes.STRING(120), allowNull: true },
      turno:         { type: DataTypes.STRING(20),  allowNull: true },
      fecha_ingreso: { type: DataTypes.DATEONLY,    allowNull: true },
      sd:            { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      sdi:           { type: DataTypes.DECIMAL(10, 2), allowNull: true },

      // Totales tipados — así la KPI del Resumen (SUM) no necesita
      // parsear JSONB en cada request.
      total_percepciones:   { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
      total_deducciones:    { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
      percepciones_gravadas:{ type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
      pago_nomina:          { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
      dias_nomina:          { type: DataTypes.DECIMAL(5, 2),  defaultValue: 0 },
      hrs_laboradas:        { type: DataTypes.DECIMAL(6, 2),  defaultValue: 0 },

      // Resto de las ~70 columnas del layout de captura — las
      // guardamos como JSONB para que P4.1 pueda cambiar las columnas
      // exactas sin migración. El FE renderiza genéricamente contra
      // este blob + una plantilla de columnas editable (futuro).
      detalle:       { type: DataTypes.JSONB, defaultValue: {} },
      notas:         { type: DataTypes.TEXT, allowNull: true },

      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    await qi.addIndex('payroll_lines', ['payroll_week_id', 'empleado_id'], {
      unique: true, name: 'ux_payroll_lines_week_empleado',
    });
    await qi.addIndex('payroll_lines', ['payroll_week_id']);
    await qi.addIndex('payroll_lines', ['empleado_id']);
  },

  async down({ context: qi }) {
    await qi.dropTable('payroll_lines');
    await qi.dropTable('payroll_weeks');
  },
};
