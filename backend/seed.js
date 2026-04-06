require('dotenv').config();
const sequelize = require('./config/database');
const WorkOrder = require('./models/WorkOrder');
const Quote = require('./models/Quote');
const MaterialCost = require('./models/MaterialCost');
const LaborCost = require('./models/LaborCost');
const Supplier = require('./models/Supplier');

async function seedDatabase() {
  try {
    await sequelize.authenticate();
    console.log('✓ Connected to database');
    
    await sequelize.sync({ force: true });
    console.log('✓ Database tables reset');
    
    // Seed Work Orders
    const workOrders = await WorkOrder.bulkCreate([
      {
        otNumber: 'OT-AL-1948',
        client: 'Adient Lerma',
        description: 'Camb. botón vestidura Rivian/Toyota',
        type: 'Refurbish',
        progress: 15,
        status: 'En ejecución',
        quotedCost: 6789,
        actualCost: 2000,
        currency: 'USD',
        startDate: new Date('2026-03-15'),
      },
      {
        otNumber: 'OT-AL-1947',
        client: 'Adient Lerma',
        description: 'Fab. 10 pzas. punch T226038E',
        type: 'Nuevo',
        progress: 40,
        status: 'En ejecución',
        quotedCost: 8990,
        actualCost: 3500,
        currency: 'USD',
        startDate: new Date('2026-03-10'),
      },
      {
        otNumber: 'OT-AL-1946',
        client: 'Autoliv AMX',
        description: 'Manuf. 2 Hand to Hand Tacoma 736D',
        type: 'Nuevo',
        progress: 60,
        status: 'En ejecución',
        quotedCost: 16020,
        actualCost: 9500,
        currency: 'USD',
        startDate: new Date('2026-03-05'),
      },
      {
        otNumber: 'OT-AL-1945',
        client: 'Avanzar',
        description: 'Refurbish e integración',
        type: 'Refurbish',
        progress: 100,
        status: 'Liberada',
        quotedCost: 12500,
        actualCost: 12200,
        currency: 'USD',
        startDate: new Date('2026-02-20'),
        endDate: new Date('2026-03-20'),
      },
      {
        otNumber: 'OT-AL-1944',
        client: 'Avanzar',
        description: 'Corte láser y programación',
        type: 'Servicio',
        progress: 78,
        status: 'En revisión',
        quotedCost: 9250,
        actualCost: 7200,
        currency: 'USD',
        startDate: new Date('2026-03-01'),
      },
      {
        otNumber: 'OT-AL-1936',
        client: 'Adient/Toyota',
        description: 'Manuf. 2 Brazos Neumáticos Tacoma',
        type: 'Nuevo',
        progress: 100,
        status: 'Cerrada',
        quotedCost: 8520,
        actualCost: 8320,
        currency: 'USD',
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-02-28'),
      },
    ]);
    console.log(`✓ Created ${workOrders.length} work orders`);
    
    // Seed Quotes
    const quotes = await Quote.bulkCreate([
      {
        quoteNumber: 'CZ-2026-001',
        client: 'Adient Lerma',
        description: 'Cotización para refurbish de componentes',
        amount: 15500,
        currency: 'USD',
        status: 'Pendiente',
        validUntil: new Date('2026-05-01'),
      },
      {
        quoteNumber: 'CZ-2026-002',
        client: 'Autoliv AMX',
        description: 'Fabricación de piezas personalizadas',
        amount: 22000,
        currency: 'USD',
        status: 'Pendiente',
        validUntil: new Date('2026-04-30'),
      },
      {
        quoteNumber: 'CZ-2026-003',
        client: 'Avanzar',
        description: 'Servicios de corte y ensamble',
        amount: 18750,
        currency: 'USD',
        status: 'Aprobada',
        validUntil: new Date('2026-06-15'),
      },
      {
        quoteNumber: 'CZ-2026-004',
        client: 'Mayser',
        description: 'Suministro de componentes eléctricos',
        amount: 9200,
        currency: 'USD',
        status: 'Pendiente',
        validUntil: new Date('2026-04-20'),
      },
    ]);
    console.log(`✓ Created ${quotes.length} quotes`);
    
    // Seed Material Costs
    const materialCosts = await MaterialCost.bulkCreate([
      {
        otNumber: 'OT-AL-1948',
        materialDescription: 'Botones de vestidura',
        quantity: 50,
        unitCost: 12.50,
        totalCost: 625,
        currency: 'MXN',
        supplier: 'Ecosy Engineering',
        status: 'En tránsito',
        deliveryDate: new Date('2026-04-10'),
      },
      {
        otNumber: 'OT-AL-1947',
        materialDescription: 'Acero inoxidable 304',
        quantity: 100,
        unitCost: 450,
        totalCost: 45000,
        currency: 'MXN',
        supplier: 'Misumi Mexico',
        status: 'Entregado',
        deliveryDate: new Date('2026-03-25'),
      },
      {
        otNumber: 'OT-AL-1946',
        materialDescription: 'Componentes neumáticos',
        quantity: 20,
        unitCost: 800,
        totalCost: 16000,
        currency: 'MXN',
        supplier: 'CORTELASER',
        status: 'En tránsito',
        deliveryDate: new Date('2026-04-15'),
      },
    ]);
    console.log(`✓ Created ${materialCosts.length} material costs`);
    
    // Seed Labor Costs
    const laborCosts = await LaborCost.bulkCreate([
      {
        otNumber: 'OT-AL-1948',
        employeeName: 'Carlos Menéndez',
        role: 'Técnico de Ensamble',
        hoursWorked: 8,
        hourlyRate: 250,
        totalCost: 2000,
        currency: 'MXN',
        date: new Date('2026-03-28'),
      },
      {
        otNumber: 'OT-AL-1947',
        employeeName: 'María López',
        role: 'Soldadora',
        hoursWorked: 12,
        hourlyRate: 280,
        totalCost: 3360,
        currency: 'MXN',
        date: new Date('2026-03-27'),
      },
      {
        otNumber: 'OT-AL-1946',
        employeeName: 'Pedro García',
        role: 'Supervisor de Producción',
        hoursWorked: 16,
        hourlyRate: 400,
        totalCost: 6400,
        currency: 'MXN',
        date: new Date('2026-03-26'),
      },
    ]);
    console.log(`✓ Created ${laborCosts.length} labor costs`);
    
    // Seed Suppliers
    const suppliers = await Supplier.bulkCreate([
      {
        supplierName: 'Ecosy Engineering',
        description: 'Conectores, pinzas, detectores',
        categories: ['Conectores', 'Detectores', 'Componentes'],
        workOrders: ['OT-1928', 'OT-1948'],
        status: 'Activo',
        contactEmail: 'info@ecosy.mx',
        contactPhone: '+52 55 1234 5678',
      },
      {
        supplierName: 'Misumi Mexico',
        description: 'Tornillos, perfiles y accesorios industriales',
        categories: ['Tornillería', 'Perfiles', 'Accesorios'],
        workOrders: ['OT-1928', 'OT-1934', 'OT-1947'],
        status: 'Activo',
        contactEmail: 'ventas@misumi.mx',
        contactPhone: '+52 55 2345 6789',
      },
      {
        supplierName: 'CORTELASER (A.U. Ceballos)',
        description: 'Corte láser y mantenimiento de equipos',
        categories: ['Corte Láser', 'Mantenimiento', 'Servicios'],
        workOrders: ['OT-1904', 'OT-1934', 'OT-1946'],
        status: 'Activo',
        contactEmail: 'cortes@cortelaser.mx',
        contactPhone: '+52 55 3456 7890',
      },
    ]);
    console.log(`✓ Created ${suppliers.length} suppliers`);
    
    console.log('\n✓ Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error seeding database:', error.message);
    process.exit(1);
  }
}

seedDatabase();
