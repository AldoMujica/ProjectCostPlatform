require('dotenv').config();
const sequelize = require('../db/sequelize');

// Demo employees for the conciliación checador flow.
// numero_lista values 001–005 match fixtures/checador-sample.csv (minimal rows).
// Rows 1–21 below mirror the Control-de-Empleados mockup so the Phase-3
// empleados master has realistic Mexican payroll data (RFC/CURP/IMSS/SD/SDI).
const empleados = [
  { numero_lista: '001', nombre: 'Carlos Menéndez',  area: 'Ensamble',      turno: '08:00-17:00' },
  { numero_lista: '002', nombre: 'María López',      area: 'Producción',    turno: '08:00-17:00' },
  { numero_lista: '003', nombre: 'Pedro García',     area: 'Calidad',       turno: '08:00-17:00' },
  { numero_lista: '004', nombre: 'Ana Ramírez',      area: 'Mantenimiento', turno: '14:00-22:00' },
  { numero_lista: '005', nombre: 'Luis Hernández',   area: 'Producción',    turno: '08:00-17:00' },

  // Phase-3 roster (from mockup Control de Empleados).
  { numero_lista: '0010', nombre: 'ESPINOSA MARTINEZ MIGUEL ANGEL',    nombre_rep_proc: '0010 MIGUEL ANGEL ESPINOSA MARTINEZ',    rfc: 'EIMM760515CY1',  curp: 'EIMM760515HMNSRG01', imss: '92967614097', nivel_estudios: 'SECUNDARIA',     puesto: 'ESPECIALIST APARATISTA',     departamento: 'PRODUCCION',       area: 'GENERAL',              fecha_ingreso: '2023-01-16', salario_diario: 677.27, salario_diario_integrado: 714.38, turno: '08:00-17:00' },
  { numero_lista: '0015', nombre: 'LARA SOSA JOSE DE JESUS',           nombre_rep_proc: '0015 JOSE DE JESUS LARA SOSA',           rfc: 'LASJ710228GA5',  curp: 'LASJ710228HDFRSS08', imss: '07897147299', nivel_estudios: 'MEDIA SUPERIOR', puesto: 'SUPERVISOR PRODUCCION "A"',  departamento: 'SUPERVICION',      area: 'SUPERVICION',          fecha_ingreso: '2023-01-16', salario_diario: 700.85, salario_diario_integrado: 739.26, turno: '08:00-17:00' },
  { numero_lista: '0024', nombre: 'ALVAREZ PIÑA MARGARITO',            nombre_rep_proc: '0024 MARGARITO ALVAREZ PIÑA',            rfc: 'AAPM6810173XA',  curp: 'AAPM681017HMCLXR04', imss: '92876806768', nivel_estudios: 'PRIMARIA',       puesto: 'ESPECIALISTA ENSAMBLADOR',   departamento: 'PRODUCCION',       area: 'GENERAL',              fecha_ingreso: '2023-01-16', salario_diario: 677.27, salario_diario_integrado: 738.87, turno: '08:00-17:00' },
  { numero_lista: '0050', nombre: 'FUENTES LOPEZ MARIA GUADALUPE',     nombre_rep_proc: 'MARIA GUADALUPE FUENTES LOPEZ',          rfc: 'FULG720903PU0',  curp: 'FULG720903MDFNPD02', imss: '92897243819', nivel_estudios: 'MEDIA SUPERIOR', puesto: 'COMPRADOR "A"',              departamento: 'COMERCIO EXTERIOR', area: 'COMPRAS',              fecha_ingreso: '2023-04-24', salario_diario: 560.68, salario_diario_integrado: 590.63, turno: '08:00-17:00' },
  { numero_lista: '0065', nombre: 'DURAN PLATA CRISTIAN SAUL',         nombre_rep_proc: '0065 CRISTIAN SAUL DURAN PLATA',         rfc: 'DUPC930104HS5',  curp: 'DUPC930104HMCRLR01', imss: '92119363312', nivel_estudios: 'SUPERIOR',       puesto: 'JEFE DE INGENIERIA Y DISEÑO', departamento: 'INGENIERIA',     area: 'INGENIERIA',           fecha_ingreso: '2018-12-06', salario_diario: 909.32, salario_diario_integrado: 962.88, turno: '08:00-17:00' },
  { numero_lista: '0113', nombre: 'FALCON CERON JESUS ANGEL',          nombre_rep_proc: '0113 JESUS ANGEL FALCÓN CERÓN',          rfc: 'FACJ7504039C9',  curp: 'FACJ750403HDFLRS08', imss: '92977539961', nivel_estudios: 'MEDIA SUPERIOR', puesto: 'LIDER ELECTROMECANICO',      departamento: 'PRODUCCION',       area: 'LABOR ELECTRICA',      fecha_ingreso: '2022-03-29', salario_diario: 630.77, salario_diario_integrado: 683.86, turno: '08:00-17:00' },
  { numero_lista: '0019', nombre: 'ESTRADA JASSO EDUARDO',             nombre_rep_proc: '0019 EDUARDO ESTRADA JASSO',             rfc: 'EAJE670403KNA',  curp: 'EAJE670403HDFSSD01', imss: '89856706406', nivel_estudios: 'SECUNDARIA',     puesto: 'ESPECIALISTA ENSAMBLADOR',   departamento: 'PRODUCCION',       area: 'ENSAMBLE E INSTALACION', fecha_ingreso: '2023-01-09', salario_diario: 677.27, salario_diario_integrado: 758.77, turno: '08:00-17:00' },
  { numero_lista: '0071', nombre: 'BAEZ JARA DAVID',                   nombre_rep_proc: '0071 DAVID BAEZ JARA',                   rfc: 'BAJD790110NX6',  curp: 'BAJD790110HDFZRV02', imss: '68977920682', nivel_estudios: 'SUPERIOR',       puesto: 'DISEÑADOR "B"',              departamento: 'INGENIERIA',       area: 'INGENIERIA',           fecha_ingreso: '2022-06-20', salario_diario: 700.85, salario_diario_integrado: 751.93, turno: '08:00-17:00' },
  { numero_lista: '0114', nombre: 'CASTILLO JIMENEZ DIEGO',            nombre_rep_proc: '0114 DIEGO CASTILLO JIMENEZ',            rfc: 'CAJD950807GQA',  curp: 'CAJD950807HMCSMG00', imss: '01169507462', nivel_estudios: 'SUPERIOR',       puesto: 'ELECTROMECANICO "A"',        departamento: 'PRODUCCION',       area: 'LABOR ELECTRICA',      fecha_ingreso: '2024-03-04', salario_diario: 560.68, salario_diario_integrado: 614.79, turno: '08:00-17:00' },
  { numero_lista: '0012', nombre: 'VARGAS CHIA LUIS ANTONIO',          nombre_rep_proc: '0012 LUIS ANTONIO VARGAS CHIA',          rfc: 'VACL780905PS6',  curp: 'VACL780905HDFRHS09', imss: '92997817868', nivel_estudios: 'MEDIA SUPERIOR', puesto: 'SUPERVISOR PRODUCCION "A"',  departamento: 'PRODUCCION',       area: 'SUPERVICION',          fecha_ingreso: '2023-07-24', salario_diario: 700.85, salario_diario_integrado: 781.06, turno: '08:00-17:00' },
  { numero_lista: '0138', nombre: 'LOPEZ PRUDENTE LUIS ALEJANDRO',     nombre_rep_proc: '0138 LUIS ALEJANDRO LOPEZ PRUDENTE',     rfc: 'LOPL000531861',  curp: 'LOPL000531HMCPRSA1', imss: '04130069398', nivel_estudios: 'TECNICO',        puesto: 'MECANICO APARATISTA "A"',    departamento: 'PRODUCCION',       area: 'GENERAL',              fecha_ingreso: '2025-10-13', salario_diario: 677.27, salario_diario_integrado: 712.53, turno: '08:00-17:00' },
  { numero_lista: '0141', nombre: 'FLORES RODRIGUEZ FELIPE NERI',      nombre_rep_proc: '0141 FELIPE NERI FLORES RODRIGUEZ',      rfc: 'FORF840526PX9',  curp: 'FORF840526HMCLDL07', imss: '92068404398', nivel_estudios: 'MEDIA SUPERIOR', puesto: 'ENCARGADO DE ALMACEN "A"',   departamento: 'PRODUCCION',       area: 'ALMACEN',              fecha_ingreso: '2023-06-15', salario_diario: 420.51, salario_diario_integrado: 442.98, turno: '08:00-17:00' },
  { numero_lista: '0156', nombre: 'ALONSO DIAZ DAVID',                 nombre_rep_proc: '0156 DAVID ALONSO DIAZ',                 rfc: 'AODD001215E97',  curp: 'AODD001215HMCLZVA6', imss: '46190010002', nivel_estudios: 'SUPERIOR',       puesto: 'DISEÑADOR "C"',              departamento: 'INGENIERIA',       area: 'INGENIERIA',           fecha_ingreso: '2025-02-12', salario_diario: 560.68, salario_diario_integrado: 621.07, turno: '08:00-17:00' },
];

// Demo week matching the sample CSV: Apr 13–17, 2026 (Mon–Fri).
const semana = {
  fecha_inicio: '2026-04-13',
  fecha_fin:    '2026-04-17',
  descripcion:  'Semana 16 · 13-17 Abr 2026',
};

async function seedConciliacionDemo() {
  // Callable both standalone (via `npm run seed:conciliacion`) and as a
  // subroutine of the main seed. Authenticate is idempotent — Sequelize
  // returns immediately if the pool's already connected.
  await sequelize.authenticate();

  for (const e of empleados) {
    const row = {
      numero_lista: e.numero_lista,
      nombre: e.nombre,
      area: e.area,
      turno: e.turno || '08:00-17:00',
      nombre_rep_proc: e.nombre_rep_proc || null,
      rfc: e.rfc || null,
      curp: e.curp || null,
      imss: e.imss || null,
      nivel_estudios: e.nivel_estudios || null,
      puesto: e.puesto || null,
      departamento: e.departamento || null,
      fecha_ingreso: e.fecha_ingreso || null,
      salario_diario: e.salario_diario == null ? null : e.salario_diario,
      salario_diario_integrado: e.salario_diario_integrado == null ? null : e.salario_diario_integrado,
    };
    await sequelize.query(
      `INSERT INTO empleados (
         numero_lista, nombre, area, turno, activo,
         nombre_rep_proc, rfc, curp, imss, nivel_estudios,
         puesto, departamento, fecha_ingreso, salario_diario, salario_diario_integrado
       )
       VALUES (
         :numero_lista, :nombre, :area, :turno, TRUE,
         :nombre_rep_proc, :rfc, :curp, :imss, :nivel_estudios,
         :puesto, :departamento, :fecha_ingreso, :salario_diario, :salario_diario_integrado
       )
       ON CONFLICT (numero_lista) DO UPDATE
         SET nombre          = EXCLUDED.nombre,
             area            = EXCLUDED.area,
             turno           = EXCLUDED.turno,
             activo          = TRUE,
             nombre_rep_proc = EXCLUDED.nombre_rep_proc,
             rfc             = EXCLUDED.rfc,
             curp            = EXCLUDED.curp,
             imss            = EXCLUDED.imss,
             nivel_estudios  = EXCLUDED.nivel_estudios,
             puesto          = EXCLUDED.puesto,
             departamento    = EXCLUDED.departamento,
             fecha_ingreso   = EXCLUDED.fecha_ingreso,
             salario_diario  = EXCLUDED.salario_diario,
             salario_diario_integrado = EXCLUDED.salario_diario_integrado`,
      { replacements: row }
    );
  }
  console.log(`✓ Upserted ${empleados.length} empleados`);

  const [rows] = await sequelize.query(
    `INSERT INTO semanas_nomina (fecha_inicio, fecha_fin, descripcion)
     VALUES (:fecha_inicio, :fecha_fin, :descripcion)
     ON CONFLICT (fecha_inicio, fecha_fin) DO UPDATE
       SET descripcion = EXCLUDED.descripcion
     RETURNING id`,
    { replacements: semana }
  );
  console.log(`✓ Upserted semana_nomina (id=${rows[0].id}) ${semana.descripcion}`);
  return { semanaId: rows[0].id };
}

if (require.main === module) {
  seedConciliacionDemo()
    .then(({ semanaId }) => {
      console.log('\nNext steps:');
      console.log('  1. Log in as any role');
      console.log('  2. Open the Conciliación module');
      console.log('  3. Upload backend/fixtures/checador-sample.csv in sub-tab 9.1');
      console.log(`  4. Use semana_id=${semanaId} when you confirm the import`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('✗ Conciliación demo seed failed:', err);
      process.exit(1);
    });
}

module.exports = seedConciliacionDemo;
