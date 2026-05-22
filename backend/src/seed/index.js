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
  PurchaseOrder,
  InventoryItem,
  SupplierInvoice,
  Delivery,
  Incident,
  PayrollWeek,
} = require('../models');
const seedConciliacionDemo = require('./conciliacion-demo');
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

async function seedDatabase() {
  await sequelize.authenticate();
  console.log('✓ Connected to database');

  // Idempotent-friendly: upsert users, then ensure reference data exists.
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  for (const u of seedUsers) {
    await User.upsert({ ...u, passwordHash, activo: true });
  }
  console.log(`✓ Seeded ${seedUsers.length} users (default password: ${DEFAULT_PASSWORD})`);

  // Phase-5b — admin-panel config defaults. Idempotent (findOrCreate per
  // key), so re-running after an operator has tuned values is safe.
  const n = await seedSystemConfigDefaults();
  console.log(`✓ Seeded ${n} system_config defaults (idempotent)`);

  // Phase-4 · Nómina skeleton · una semana demo. Idempotent via
  // UNIQUE(anio, semana). Sin líneas — se capturan cuando el cliente
  // confirme el layout en P4.1.
  await PayrollWeek.findOrCreate({
    where: { anio: 2026, semana: 16 },
    defaults: {
      anio: 2026, mes: 4, bimestre: 2, semana: 16,
      fechaInicio: '2026-04-13', fechaFin: '2026-04-17',
      cerrada: false,
      notas: 'Semana demo · estructura Phase-4, captura pendiente de P4.1.',
    },
  });
  console.log('✓ Seeded PayrollWeek demo (2026 · semana 16)');

  // Conciliación + empleados master seed runs every time (it's an upsert and
  // Phase-3 extended the empleado schema — legacy DBs need the new columns
  // backfilled on the next seed).
  const runConciliacion = async () => {
    console.log('\n— Conciliación demo —');
    await seedConciliacionDemo();
  };

  // Phase-3 fixtures (OCP / inventario / facturas / entregas / incidencias)
  // seed only if their own tables are empty. Makes the main seed reusable
  // against legacy DBs that predate Phase 3.
  async function seedPhase3IfEmpty(byOt, suppliersByName) {
    if (await PurchaseOrder.count() > 0) {
      console.log('✓ Phase-3 fixtures already present, skipping');
      return;
    }
    const ecosyId  = suppliersByName.get('Ecosy Engineering')?.id || null;
    const misumiId = suppliersByName.get('Misumi Mexico')?.id || null;
    const corteId  = suppliersByName.get('CORTELASER (A.U. Ceballos)')?.id || null;
    await PurchaseOrder.bulkCreate([
      { ocNumber: 'OCA-2026-001', supplierId: ecosyId,  supplierName: 'Ecosy Engineering',  workOrderId: byOt['OT-AL-1948']?.id, otNumber: 'OT-AL-1948', description: 'Conectores KQ2L04, Pinzas MH22, Detectores D-MBPL', currency: 'MXN', amount: 27778.83, issueDate: '2026-01-15', expectedDeliveryDate: '2026-02-10', status: 'Recibido' },
      { ocNumber: 'OCA-2026-002', supplierId: misumiId, supplierName: 'Misumi Mexico',      workOrderId: byOt['OT-AL-1948']?.id, otNumber: 'OT-AL-1948', description: 'Tornillos DBB3-3-3 ×8 pzas',                         currency: 'USD', amount:    54.03, issueDate: '2026-01-15', expectedDeliveryDate: '2026-02-28', status: 'Recibido' },
      { ocNumber: 'OCA-2026-003', supplierId: corteId,  supplierName: 'CORTELASER',          workOrderId: byOt['OT-AL-1946']?.id, otNumber: 'OT-AL-1946', description: 'Corte láser ×33 pzas + mantenimiento edificio',     currency: 'MXN', amount: 10431.72, issueDate: '2026-02-01', expectedDeliveryDate: '2026-03-19', status: 'Parcial' },
      { ocNumber: 'OCA-2026-004',                       supplierName: 'Pei Equipos',         workOrderId: byOt['OT-AL-1945']?.id, otNumber: 'OT-AL-1945', description: 'Perfil 40×40mm ×1',                                  currency: 'USD', amount:   187.48, issueDate: '2026-02-10', expectedDeliveryDate: '2026-03-24', status: 'Recibido' },
      { ocNumber: 'OCA-2026-005',                       supplierName: 'Servicio Industrial', workOrderId: byOt['OT-AL-1948']?.id, otNumber: 'OT-AL-1948', description: 'Placa C4140-2-1/4 + Corte aceros',                   currency: 'USD', amount:    68.14, issueDate: '2026-02-10', expectedDeliveryDate: '2026-03-05', status: 'Pendiente' },
      { ocNumber: 'OCA-2026-006',                       supplierName: 'Aceros Argenis',      workOrderId: byOt['OT-AL-1944']?.id, otNumber: 'OT-AL-1944', description: 'Pláfene-1/2-6 ×9 pzas',                              currency: 'MXN', amount:  1618.20, issueDate: '2026-02-01', expectedDeliveryDate: '2026-02-28', status: 'Recibido' },
    ]);
    console.log('✓ Created purchase orders (OCP)');

    const inv = await InventoryItem.bulkCreate([
      { clave: 'KQ2L04-M5A',    description: 'Conex. instantáneo',      supplierName: 'Ecosy Eng.',      currency: 'MXN', existencia:  6, unidad: 'pza', unitCost:   31.68, assignedWorkOrderId: byOt['OT-AL-1948']?.id, assignedOtNumber: 'OT-AL-1948', status: 'Asignado' },
      { clave: 'MH22-20D',      description: 'Pinza neumática',         supplierName: 'Ecosy Eng.',      currency: 'MXN', existencia:  8, unidad: 'pza', unitCost: 2361.92, assignedWorkOrderId: byOt['OT-AL-1948']?.id, assignedOtNumber: 'OT-AL-1948', status: 'Asignado' },
      { clave: 'D-MBPL',        description: 'Detector de elemento',    supplierName: 'Ecosy Eng.',      currency: 'MXN', existencia: 20, unidad: 'pza', unitCost:  270.10, assignedWorkOrderId: byOt['OT-AL-1948']?.id, assignedOtNumber: 'OT-AL-1948', status: 'Asignado' },
      { clave: 'DBB3-3-3',      description: 'Tornillo escalado',       supplierName: 'Misumi MX',       currency: 'USD', existencia:  8, unidad: 'pza', unitCost:    6.19, assignedWorkOrderId: byOt['OT-AL-1948']?.id, assignedOtNumber: 'OT-AL-1948', status: 'Asignado' },
      { clave: '40-4040',       description: 'Perfil 40×40mm',          supplierName: 'Pei Equipos',     currency: 'USD', existencia:  1, unidad: 'pza', unitCost:   80.81, assignedWorkOrderId: byOt['OT-AL-1945']?.id, assignedOtNumber: 'OT-AL-1945', status: 'Asignado' },
      { clave: 'PLAFENE-12-6',  description: 'Placa aluminio 1/2"',     supplierName: 'Aceros Argenis', currency: 'MXN', existencia:  9, unidad: 'pza', unitCost:  155.00, assignedWorkOrderId: byOt['OT-AL-1944']?.id, assignedOtNumber: 'OT-AL-1944', status: 'Asignado' },
      { clave: 'PLACA-C4140',   description: 'Placa acero C4140-2-1/4', supplierName: 'Serv. Ind.',      currency: 'USD', existencia:  1, unidad: 'pza', unitCost:   48.18, status: 'Sin asignar' },
    ]);
    console.log('✓ Created inventory items');

    await SupplierInvoice.bulkCreate([
      { uuidFiscal: 'EMF006602Q2-DEMO-76286',     rfcEmisor: 'ECO010101A1A', rfcReceptor: 'ALE010410123', folio: '76286 LN',   fechaEmision: new Date('2026-03-20'), fechaCertificacion: new Date('2026-03-20T11:47'), regimenFiscal: 'Régimen General', concepto: 'Conectores y accesorios',  cantidad: 1, precioUnitario: 23946.60, subtotal: 23946.60, iva: 3831.46, total: 27778.06, moneda: 'MXN', metodoPago: 'PUE', validacionSat: 'válida',    supplierId: ecosyId,  workOrderId: byOt['OT-AL-1948']?.id, otNumber: 'OT-AL-1948' },
      { uuidFiscal: 'SCD110101056-DEMO-52960',    rfcEmisor: 'ECO010101A1A', rfcReceptor: 'ALE010410123', serie: 'A', folio: '52960', fechaEmision: new Date('2026-03-20'), fechaCertificacion: new Date('2026-03-20T12:16'), regimenFiscal: 'Régimen General', concepto: 'Suministro de materiales', total: 0, moneda: 'MXN', metodoPago: 'PPD', validacionSat: 'pendiente', supplierId: ecosyId },
      { uuidFiscal: 'EMF006602Q2-DEMO-54700',     rfcEmisor: 'ECO010101A1A', rfcReceptor: 'ALE010410123', folio: '54700 FI',   fechaEmision: new Date('2026-03-23'), fechaCertificacion: new Date('2026-03-23T15:25'), regimenFiscal: 'Régimen General', concepto: 'Servicios diversos',       cantidad: 1, precioUnitario: 15500.00, subtotal: 15500.00, iva: 2480.00, retencionIsr:  775.00, total: 17205.00, moneda: 'MXN', metodoPago: 'PUE', validacionSat: 'válida', supplierId: ecosyId },
      { uuidFiscal: 'LSO1306189-DEMO-52918',      rfcEmisor: 'CTL010101ABC', rfcReceptor: 'ALE010410123', folio: '52918',      fechaEmision: new Date('2026-03-24'), fechaCertificacion: new Date('2026-03-24T12:12'), regimenFiscal: 'Régimen General', concepto: 'Corte láser y servicios',  cantidad: 1, precioUnitario:  8975.50, subtotal:  8975.50, iva: 1436.08, retencionIsr:  448.78, total:  9962.80, moneda: 'MXN', metodoPago: 'PUE', validacionSat: 'válida', supplierId: corteId },
      { uuidFiscal: 'TSP00724QW-DEMO-54900',      rfcEmisor: 'MIS010101XYZ', rfcReceptor: 'ALE010410123', folio: '54900 FC',   fechaEmision: new Date('2026-03-25'), fechaCertificacion: new Date('2026-03-25T12:50'), regimenFiscal: 'Régimen General', concepto: 'Distribuidor mayorista',   cantidad: 2, precioUnitario:    27.01, subtotal:    54.02, iva:    8.64, total:    62.66, moneda: 'USD', tipoCambio: 17.23, metodoPago: 'PUE', validacionSat: 'revisar', supplierId: misumiId },
    ]);
    console.log('✓ Created supplier invoices (CFDI demo)');

    await Delivery.bulkCreate([
      { deliveryNumber: '28',  supplierId: ecosyId,  supplierName: 'Ecosy Engineering',  workOrderId: byOt['OT-AL-1948']?.id, otNumber: 'OT-AL-1948', producto: 'Conex. KQ2L04-M5A',     piezas:  6, unitCost:   31.68, currency: 'MXN', entregadoPor: 'Diego',   fechaRecibido: '2026-02-28', status: 'Entregado', inventoryItemId: inv[0].id },
      { deliveryNumber: '28',  supplierId: ecosyId,  supplierName: 'Ecosy Engineering',  workOrderId: byOt['OT-AL-1948']?.id, otNumber: 'OT-AL-1948', producto: 'Pinza MH22-20D',         piezas:  2, unitCost: 2361.92, currency: 'MXN', entregadoPor: 'Diego',   fechaRecibido: '2026-02-28', status: 'Entregado', inventoryItemId: inv[1].id },
      { deliveryNumber: '28',  supplierId: ecosyId,  supplierName: 'Ecosy Engineering',  workOrderId: byOt['OT-AL-1948']?.id, otNumber: 'OT-AL-1948', producto: 'Detector D-MBPL ×18',    piezas: 18, unitCost:  270.10, currency: 'MXN', entregadoPor: 'Eduardo', fechaRecibido: '2026-03-24', status: 'Entregado', inventoryItemId: inv[2].id },
      { deliveryNumber: '3',                          supplierName: 'Pei Equipos',        workOrderId: byOt['OT-AL-1945']?.id, otNumber: 'OT-AL-1945', producto: 'Perfil 40-4040',          piezas:  1, unitCost:   80.81, currency: 'USD', entregadoPor: 'Eduardo', fechaRecibido: '2026-03-24', status: 'Entregado', inventoryItemId: inv[4].id },
      { deliveryNumber: '254', supplierId: corteId,  supplierName: 'CORTELASER',          workOrderId: byOt['OT-AL-1946']?.id, otNumber: 'OT-AL-1946', producto: 'Corte láser ×11',         piezas: 11, unitCost:  249.47, currency: 'MXN', entregadoPor: 'L. Vargas-E.D.', fechaRecibido: '2026-03-19', status: 'Entregado' },
      { deliveryNumber: '254', supplierId: corteId,  supplierName: 'CORTELASER',          workOrderId: byOt['OT-AL-1946']?.id, otNumber: 'OT-AL-1946', producto: 'Mant. Edificio',          piezas:  1, unitCost:  310.32, currency: 'MXN', status: 'Pendiente', incidencia: 'Pendiente desde fecha comprometida' },
      { deliveryNumber: '37',  supplierId: misumiId, supplierName: 'Misumi Mexico',       workOrderId: byOt['OT-AL-1948']?.id, otNumber: 'OT-AL-1948', producto: 'Tornillo DBB3-3-3',       piezas:  2, unitCost:    6.19, currency: 'USD', entregadoPor: 'Diego',   fechaRecibido: '2026-02-28', fechaAutorizado: '2026-03-05', status: 'Entregado', inventoryItemId: inv[3].id },
      { deliveryNumber: '20',                         supplierName: 'Servicio Industrial', workOrderId: byOt['OT-AL-1948']?.id, otNumber: 'OT-AL-1948', producto: 'Placa C4140-2-1/4',       piezas:  1, unitCost:   48.18, currency: 'USD', fechaAutorizado: '2026-03-05', status: 'Pendiente' },
    ]);
    console.log('✓ Created deliveries');

    await Incident.bulkCreate([
      { folio: 'INC-001', workOrderId: byOt['OT-AL-1946']?.id, otNumber: 'OT-AL-1946', supplierId: corteId,  supplierName: 'CORTELASER',          descripcion: 'Entrega de mant. edificio pendiente desde fecha comprometida', registradoPor: 'Felipe N. Flores', fecha: '2026-03-20', status: 'Abierta' },
      { folio: 'INC-002', workOrderId: byOt['OT-AL-1948']?.id, otNumber: 'OT-AL-1948',                        supplierName: 'Servicio Industrial', descripcion: 'Placa C4140 sin recibir, OC autorizada el 05/03',             registradoPor: 'Diego Castillo',   fecha: '2026-03-22', status: 'Abierta' },
    ]);
    console.log('✓ Created incidents');
  }

  const woCount = await WorkOrder.count();
  if (woCount > 0) {
    console.log(`✓ Work orders already present (${woCount}), skipping fixture data`);
    // Backfill exchangeRate on seed OTs that predate its inclusion (so the
    // Pronóstico USD-normalization works in demos). Only touches rows whose
    // FX is NULL — user-entered OTs are left alone.
    const demoFx = {
      'OT-AL-1948': 17.34, 'OT-AL-1947': 17.81, 'OT-AL-1946': 17.23,
      'OT-AL-1945': 17.54, 'OT-AL-1944': 17.80, 'OT-AL-1936': 17.95,
    };
    for (const [otNumber, fx] of Object.entries(demoFx)) {
      await WorkOrder.update(
        { exchangeRate: fx },
        { where: { otNumber, exchangeRate: null } }
      );
    }
    // Still attempt Phase-3 fixtures if their tables are empty (legacy DB upgrade).
    const existingByOt = {};
    for (const w of await WorkOrder.findAll()) existingByOt[w.otNumber] = w;
    const suppliersByName = new Map((await Supplier.findAll()).map((s) => [s.supplierName, s]));
    await seedPhase3IfEmpty(existingByOt, suppliersByName);
    await runConciliacion();
    return;
  }

  const wos = await WorkOrder.bulkCreate([
    { otNumber: 'OT-AL-1948', client: 'Adient Lerma', description: 'Camb. botón vestidura Rivian/Toyota', type: 'Refurbish', progress: 15, status: 'En ejecución', quotedCost: 6789, actualCost: 2000, currency: 'USD', exchangeRate: 17.34, startDate: new Date('2026-03-15') },
    { otNumber: 'OT-AL-1947', client: 'Adient Lerma', description: 'Fab. 10 pzas. punch T226038E', type: 'Nuevo', progress: 40, status: 'En ejecución', quotedCost: 8990, actualCost: 3500, currency: 'USD', exchangeRate: 17.81, startDate: new Date('2026-03-10') },
    { otNumber: 'OT-AL-1946', client: 'Autoliv AMX', description: 'Manuf. 2 Hand to Hand Tacoma 736D', type: 'Nuevo', progress: 60, status: 'En ejecución', quotedCost: 16020, actualCost: 9500, currency: 'USD', exchangeRate: 17.23, startDate: new Date('2026-03-05') },
    { otNumber: 'OT-AL-1945', client: 'Avanzar', description: 'Refurbish e integración', type: 'Refurbish', progress: 100, status: 'Liberada', quotedCost: 12500, actualCost: 12200, currency: 'USD', exchangeRate: 17.54, startDate: new Date('2026-02-20'), endDate: new Date('2026-03-20') },
    { otNumber: 'OT-AL-1944', client: 'Avanzar', description: 'Corte láser y programación', type: 'Servicio', progress: 78, status: 'En revisión', quotedCost: 9250, actualCost: 7200, currency: 'USD', exchangeRate: 17.80, startDate: new Date('2026-03-01') },
    { otNumber: 'OT-AL-1936', client: 'Adient/Toyota', description: 'Manuf. 2 Brazos Neumáticos Tacoma', type: 'Nuevo', progress: 100, status: 'Cerrada', quotedCost: 8520, actualCost: 8320, currency: 'USD', exchangeRate: 17.95, startDate: new Date('2026-02-01'), endDate: new Date('2026-02-28') },
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

  // Phase-3 fixtures — idempotent helper also used by the early-return branch.
  const suppliersByName = new Map([[ecosy.supplierName, ecosy], [misumi.supplierName, misumi], [corte.supplierName, corte]]);
  await seedPhase3IfEmpty(byOt, suppliersByName);

  // Conciliación demo data (empleados + one semana_nomina).
  // Kept in its own module so it can be re-run standalone via
  // `npm run seed:conciliacion`.
  await runConciliacion();

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
