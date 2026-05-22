require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, User } = require('../models');
const { seedSystemConfigDefaults } = require('./system-config-defaults');

const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD || 'alenstec_dev_2026';
const seedUsers = [
  { nombre: 'Admin',        email: 'admin@alenstec.mx',      rol: 'admin' },
  { nombre: 'Jefe de Área', email: 'jefe.area@alenstec.mx',  rol: 'jefe_area' },
  { nombre: 'RH',           email: 'rh@alenstec.mx',         rol: 'rh' },
  { nombre: 'Supervisor',   email: 'supervisor@alenstec.mx', rol: 'supervisor' },
  { nombre: 'Ventas',       email: 'ventas@alenstec.mx',     rol: 'ventas' },
  { nombre: 'Compras',      email: 'compras@alenstec.mx',    rol: 'compras' },
];

(async () => {
  await sequelize.authenticate();
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  for (const u of seedUsers) {
    await User.upsert({ ...u, passwordHash, activo: true });
  }
  console.log(`✓ Seeded 6 users (password: ${DEFAULT_PASSWORD})`);
  const n = await seedSystemConfigDefaults();
  console.log(`✓ Seeded ${n} system_config defaults`);
  await sequelize.close();
  console.log('✓ Clean DB ready for customer delivery');
})().catch(e => { console.error(e); process.exit(1); });
