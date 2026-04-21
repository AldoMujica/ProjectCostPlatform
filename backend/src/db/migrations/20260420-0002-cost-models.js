const { DataTypes } = require('sequelize');

module.exports = {
  async up({ context: qi }) {
    await qi.createTable('work_orders', {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      ot_number: { type: DataTypes.STRING, allowNull: false, unique: true },
      client: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: false },
      type: { type: DataTypes.ENUM('Nuevo', 'Refurbish', 'Servicio'), allowNull: false },
      progress: { type: DataTypes.INTEGER, defaultValue: 0 },
      status: {
        type: DataTypes.ENUM('En ejecución', 'Liberada', 'En revisión', 'Cerrada'),
        defaultValue: 'En ejecución',
      },
      quoted_cost: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      actual_cost: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.00 },
      currency: { type: DataTypes.STRING(3), defaultValue: 'USD' },
      start_date: { type: DataTypes.DATE },
      end_date: { type: DataTypes.DATE },
      quote_ref: { type: DataTypes.STRING },
      customer_po: { type: DataTypes.STRING },
      exchange_rate: { type: DataTypes.DECIMAL(10, 4) },
      liberation_date: { type: DataTypes.DATEONLY },
      liberated_by: {
        type: DataTypes.INTEGER,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'SET NULL',
      },
      notes: { type: DataTypes.TEXT },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    await qi.addIndex('work_orders', ['status']);
    await qi.addIndex('work_orders', ['client']);

    await qi.createTable('quotes', {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      quote_number: { type: DataTypes.STRING, allowNull: false, unique: true },
      client: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: false },
      amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      currency: { type: DataTypes.STRING(3), defaultValue: 'USD' },
      status: {
        type: DataTypes.ENUM('Pendiente', 'Aprobada', 'Rechazada', 'Expirada'),
        defaultValue: 'Pendiente',
      },
      valid_until: { type: DataTypes.DATE },
      cot_ref: { type: DataTypes.STRING },
      oc_cliente: { type: DataTypes.STRING },
      exchange_rate: { type: DataTypes.DECIMAL(10, 4) },
      ot_number: { type: DataTypes.STRING },
      tipo: { type: DataTypes.ENUM('Nuevo', 'Refurbish', 'Servicio') },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });

    await qi.createTable('suppliers', {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      supplier_name: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT },
      categories: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
      status: { type: DataTypes.ENUM('Activo', 'Inactivo'), defaultValue: 'Activo' },
      contact_email: { type: DataTypes.STRING },
      contact_phone: { type: DataTypes.STRING },
      saldo_pendiente: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });

    await qi.createTable('material_costs', {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      work_order_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'work_orders', key: 'id' },
        onDelete: 'RESTRICT',
      },
      ot_number: { type: DataTypes.STRING, allowNull: false },
      material_description: { type: DataTypes.STRING, allowNull: false },
      quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      unit_cost: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      subtotal: { type: DataTypes.DECIMAL(12, 2) },
      iva: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
      retencion: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
      total_cost: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      currency: { type: DataTypes.STRING(3), defaultValue: 'MXN' },
      supplier: { type: DataTypes.STRING, allowNull: false },
      status: {
        type: DataTypes.ENUM('Pendiente', 'En tránsito', 'Entregado'),
        defaultValue: 'Pendiente',
      },
      delivery_date: { type: DataTypes.DATE },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    await qi.addIndex('material_costs', ['work_order_id']);
    await qi.addIndex('material_costs', ['ot_number']);

    await qi.createTable('labor_costs', {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      work_order_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'work_orders', key: 'id' },
        onDelete: 'RESTRICT',
      },
      ot_number: { type: DataTypes.STRING, allowNull: false },
      employee_name: { type: DataTypes.STRING, allowNull: false },
      role: { type: DataTypes.STRING, allowNull: false },
      hours_worked: { type: DataTypes.DECIMAL(6, 2), allowNull: false },
      hourly_rate: { type: DataTypes.DECIMAL(8, 2), allowNull: false },
      total_cost: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      currency: { type: DataTypes.STRING(3), defaultValue: 'MXN' },
      date: { type: DataTypes.DATE, allowNull: false },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    await qi.addIndex('labor_costs', ['work_order_id']);
    await qi.addIndex('labor_costs', ['date']);

    await qi.createTable('supplier_work_orders', {
      supplier_id: {
        type: DataTypes.UUID,
        primaryKey: true,
        references: { model: 'suppliers', key: 'id' },
        onDelete: 'CASCADE',
      },
      work_order_id: {
        type: DataTypes.UUID,
        primaryKey: true,
        references: { model: 'work_orders', key: 'id' },
        onDelete: 'CASCADE',
      },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
  },

  async down({ context: qi }) {
    await qi.dropTable('supplier_work_orders');
    await qi.dropTable('labor_costs');
    await qi.dropTable('material_costs');
    await qi.dropTable('suppliers');
    await qi.dropTable('quotes');
    await qi.dropTable('work_orders');
    await qi.sequelize.query('DROP TYPE IF EXISTS "enum_work_orders_type"');
    await qi.sequelize.query('DROP TYPE IF EXISTS "enum_work_orders_status"');
    await qi.sequelize.query('DROP TYPE IF EXISTS "enum_quotes_status"');
    await qi.sequelize.query('DROP TYPE IF EXISTS "enum_quotes_tipo"');
    await qi.sequelize.query('DROP TYPE IF EXISTS "enum_suppliers_status"');
    await qi.sequelize.query('DROP TYPE IF EXISTS "enum_material_costs_status"');
  },
};
