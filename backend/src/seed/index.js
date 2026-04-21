require('dotenv').config();
const bcrypt = require('bcryptjs');
const {
  sequelize,
  User,
  WorkOrder,
  Quote,
  MaterialCost,
  LaborCost,
  Supplier,
} = require('../models');
const seedConciliacionDemo = require('./conciliacion-demo');

const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD || 'alenstec_dev_2026';

const seedUsers = [
  { nombre: 'Admin',        email: 'admin@alenstec.mx',      rol: 'admin' },
  { nombre: 'Jefe de Área', email: 'jefe.area@alenstec.mx',  rol: 'jefe_area' },
  { nombre: 'RH',           email: 'rh@alenstec.mx',         rol: 'rh' },
  { nombre: 'Supervisor',   email: 'supervisor@alenstec.mx', rol: 'supervisor' },
  { nombre: 'Ventas',       email: 'ventas@alenstec.mx',     rol: 'ventas' },
  { nombre: 'Compras',      email: 'compras@alenstec.mx',    rol: 'compras' },
];

async function seedDatabase() {
  await sequelize.authenticate();
  console.log('✓ Connected to database');

  // Idempotent-friendly: upsert users, then ensure reference data exists.
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  for (const u of seedUsers) {
    await User.upsert({ ...u, passwordHash, activo: true });
  }
  console.log(`✓ Seeded ${seedUsers.length} users (default password: ${DEFAULT_PASSWORD})`);

  const woCount = await WorkOrder.count();
  if (woCount > 0) {
    console.log(`✓ Work orders already present (${woCount}), skipping fixture data`);
    return;
  }

  const wos = await WorkOrder.bulkCreate([
    { otNumber: 'OT-AL-1948', client: 'Adient Lerma', description: 'Camb. botón vestidura Rivian/Toyota', type: 'Refurbish', progress: 15, status: 'En ejecución', quotedCost: 6789, actualCost: 2000, currency: 'USD', startDate: new Date('2026-03-15') },
    { otNumber: 'OT-AL-1947', client: 'Adient Lerma', description: 'Fab. 10 pzas. punch T226038E', type: 'Nuevo', progress: 40, status: 'En ejecución', quotedCost: 8990, actualCost: 3500, currency: 'USD', startDate: new Date('2026-03-10') },
    { otNumber: 'OT-AL-1946', client: 'Autoliv AMX', description: 'Manuf. 2 Hand to Hand Tacoma 736D', type: 'Nuevo', progress: 60, status: 'En ejecución', quotedCost: 16020, actualCost: 9500, currency: 'USD', startDate: new Date('2026-03-05') },
    { otNumber: 'OT-AL-1945', client: 'Avanzar', description: 'Refurbish e integración', type: 'Refurbish', progress: 100, status: 'Liberada', quotedCost: 12500, actualCost: 12200, currency: 'USD', startDate: new Date('2026-02-20'), endDate: new Date('2026-03-20') },
    { otNumber: 'OT-AL-1944', client: 'Avanzar', description: 'Corte láser y programación', type: 'Servicio', progress: 78, status: 'En revisión', quotedCost: 9250, actualCost: 7200, currency: 'USD', startDate: new Date('2026-03-01') },
    { otNumber: 'OT-AL-1936', client: 'Adient/Toyota', description: 'Manuf. 2 Brazos Neumáticos Tacoma', type: 'Nuevo', progress: 100, status: 'Cerrada', quotedCost: 8520, actualCost: 8320, currency: 'USD', startDate: new Date('2026-02-01'), endDate: new Date('2026-02-28') },
  ]);
  console.log(`✓ Created ${wos.length} work orders`);

  const byOt = Object.fromEntries(wos.map((w) => [w.otNumber, w]));

  await Quote.bulkCreate([
    { quoteNumber: 'CZ-2026-001', client: 'Adient Lerma', description: 'Cotización para refurbish de componentes', amount: 15500, currency: 'USD', status: 'Pendiente', validUntil: new Date('2026-05-01') },
    { quoteNumber: 'CZ-2026-002', client: 'Autoliv AMX', description: 'Fabricación de piezas personalizadas', amount: 22000, currency: 'USD', status: 'Pendiente', validUntil: new Date('2026-04-30') },
    { quoteNumber: 'CZ-2026-003', client: 'Avanzar', description: 'Servicios de corte y ensamble', amount: 18750, currency: 'USD', status: 'Aprobada', validUntil: new Date('2026-06-15'), otNumber: 'OT-AL-1944', tipo: 'Servicio' },
    { quoteNumber: 'CZ-2026-004', client: 'Mayser', description: 'Suministro de componentes eléctricos', amount: 9200, currency: 'USD', status: 'Pendiente', validUntil: new Date('2026-04-20') },
  ]);
  console.log('✓ Created quotes');

  await MaterialCost.bulkCreate([
    { workOrderId: byOt['OT-AL-1948'].id, otNumber: 'OT-AL-1948', materialDescription: 'Botones de vestidura', quantity: 50, unitCost: 12.50, subtotal: 625, iva: 100, retencion: 0, totalCost: 725, currency: 'MXN', supplier: 'Ecosy Engineering', status: 'En tránsito', deliveryDate: new Date('2026-04-10') },
    { workOrderId: byOt['OT-AL-1947'].id, otNumber: 'OT-AL-1947', materialDescription: 'Acero inoxidable 304', quantity: 100, unitCost: 450, subtotal: 45000, iva: 7200, retencion: 0, totalCost: 52200, currency: 'MXN', supplier: 'Misumi Mexico', status: 'Entregado', deliveryDate: new Date('2026-03-25') },
    { workOrderId: byOt['OT-AL-1946'].id, otNumber: 'OT-AL-1946', materialDescription: 'Componentes neumáticos', quantity: 20, unitCost: 800, subtotal: 16000, iva: 2560, retencion: 0, totalCost: 18560, currency: 'MXN', supplier: 'CORTELASER', status: 'En tránsito', deliveryDate: new Date('2026-04-15') },
  ]);
  console.log('✓ Created material costs');

  await LaborCost.bulkCreate([
    { workOrderId: byOt['OT-AL-1948'].id, otNumber: 'OT-AL-1948', employeeName: 'Carlos Menéndez', role: 'Técnico de Ensamble', hoursWorked: 8, hourlyRate: 250, totalCost: 2000, currency: 'MXN', date: new Date('2026-03-28') },
    { workOrderId: byOt['OT-AL-1947'].id, otNumber: 'OT-AL-1947', employeeName: 'María López', role: 'Soldadora', hoursWorked: 12, hourlyRate: 280, totalCost: 3360, currency: 'MXN', date: new Date('2026-03-27') },
    { workOrderId: byOt['OT-AL-1946'].id, otNumber: 'OT-AL-1946', employeeName: 'Pedro García', role: 'Supervisor de Producción', hoursWorked: 16, hourlyRate: 400, totalCost: 6400, currency: 'MXN', date: new Date('2026-03-26') },
  ]);
  console.log('✓ Created labor costs');

  const ecosy = await Supplier.create({ supplierName: 'Ecosy Engineering', description: 'Conectores, pinzas, detectores', categories: ['Conectores', 'Detectores', 'Componentes'], status: 'Activo', contactEmail: 'info@ecosy.mx', contactPhone: '+52 55 1234 5678' });
  const misumi = await Supplier.create({ supplierName: 'Misumi Mexico', description: 'Tornillos, perfiles y accesorios industriales', categories: ['Tornillería', 'Perfiles', 'Accesorios'], status: 'Activo', contactEmail: 'ventas@misumi.mx', contactPhone: '+52 55 2345 6789' });
  const corte = await Supplier.create({ supplierName: 'CORTELASER (A.U. Ceballos)', description: 'Corte láser y mantenimiento de equipos', categories: ['Corte Láser', 'Mantenimiento', 'Servicios'], status: 'Activo', contactEmail: 'cortes@cortelaser.mx', contactPhone: '+52 55 3456 7890' });

  await ecosy.setWorkOrders([byOt['OT-AL-1948']]);
  await misumi.setWorkOrders([byOt['OT-AL-1947']]);
  await corte.setWorkOrders([byOt['OT-AL-1946']]);
  console.log('✓ Created suppliers and supplier_work_orders links');

  // Conciliación demo data (empleados + one semana_nomina).
  // Kept in its own module so it can be re-run standalone via
  // `npm run seed:conciliacion`.
  console.log('\n— Conciliación demo —');
  await seedConciliacionDemo();

  console.log('\n✓ Database seeded successfully!');
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('✗ Seed failed:', err);
      process.exit(1);
    });
}

module.exports = seedDatabase;
