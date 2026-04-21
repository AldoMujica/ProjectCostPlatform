require('dotenv').config();
const sequelize = require('../db/sequelize');

// Demo employees for the conciliación checador flow.
// numero_lista values match fixtures/checador-sample.csv.
const empleados = [
  { numero_lista: '001', nombre: 'Carlos Menéndez',  area: 'Ensamble',      turno: '08:00-17:00' },
  { numero_lista: '002', nombre: 'María López',      area: 'Producción',    turno: '08:00-17:00' },
  { numero_lista: '003', nombre: 'Pedro García',     area: 'Calidad',       turno: '08:00-17:00' },
  { numero_lista: '004', nombre: 'Ana Ramírez',      area: 'Mantenimiento', turno: '14:00-22:00' },
  { numero_lista: '005', nombre: 'Luis Hernández',   area: 'Producción',    turno: '08:00-17:00' },
];

// Demo week matching the sample CSV: Apr 13–17, 2026 (Mon–Fri).
const semana = {
  fecha_inicio: '2026-04-13',
  fecha_fin:    '2026-04-17',
  descripcion:  'Semana 16 · 13-17 Abr 2026',
};

async function seedConciliacionDemo() {
  await sequelize.authenticate();
  console.log('✓ Connected to database');

  for (const e of empleados) {
    await sequelize.query(
      `INSERT INTO empleados (numero_lista, nombre, area, turno, activo)
       VALUES (:numero_lista, :nombre, :area, :turno, TRUE)
       ON CONFLICT (numero_lista) DO UPDATE
         SET nombre = EXCLUDED.nombre,
             area   = EXCLUDED.area,
             turno  = EXCLUDED.turno,
             activo = TRUE`,
      { replacements: e }
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

  console.log('\nNext steps:');
  console.log('  1. Log in as any role');
  console.log('  2. Open the Conciliación module');
  console.log('  3. Upload backend/fixtures/checador-sample.csv in sub-tab 9.1');
  console.log(`  4. Use semana_id=${rows[0].id} when you confirm the import`);
}

if (require.main === module) {
  seedConciliacionDemo()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('✗ Conciliación demo seed failed:', err);
      process.exit(1);
    });
}

module.exports = seedConciliacionDemo;
