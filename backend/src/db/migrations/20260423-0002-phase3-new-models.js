const { DataTypes } = require('sequelize');

// Phase-3 schema — all new core models (Themes B–F) in one migration.
//
//  B · PurchaseOrderAlenstec  (OCs Alenstec → proveedor)  — P3.1
//  C · InventoryItem + StockMovement                      — P3.4
//  D · SupplierInvoice (CFDI persistence)                 — P3.8
//  E · Delivery + Incident                                — P3.12
//  F · WorkOrderApproval (aprobación OT flujo 5 pasos)    — P3.19
//
// All child tables carry work_order_id FK where applicable (ADR-006:
// enforced, otNumber kept redundant). Invoice UUIDs are unique + indexed
// for PAC lookup (Phase 6 / G-FACT-1).

module.exports = {
  async up({ context: qi }) {
    // ─── Theme B: purchase_orders_alenstec (OCP) ───────────────────────
    await qi.createTable('purchase_orders_alenstec', {
      id:         { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      oc_number:  { type: DataTypes.STRING(40), allowNull: false, unique: true },
      supplier_id:{ type: DataTypes.UUID, allowNull: true,
                    references: { model: 'suppliers', key: 'id' }, onDelete: 'SET NULL' },
      supplier_name: { type: DataTypes.STRING, allowNull: false },
      work_order_id: { type: DataTypes.UUID, allowNull: true,
                    references: { model: 'work_orders', key: 'id' }, onDelete: 'SET NULL' },
      ot_number:  { type: DataTypes.STRING, allowNull: true },
      description:{ type: DataTypes.TEXT, allowNull: false },
      currency:   { type: DataTypes.STRING(3), defaultValue: 'MXN' },
      amount:     { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      issue_date: { type: DataTypes.DATEONLY, allowNull: true },
      expected_delivery_date: { type: DataTypes.DATEONLY, allowNull: true },
      status:     { type: DataTypes.ENUM('Pendiente', 'Parcial', 'Recibido', 'Cancelada'),
                    defaultValue: 'Pendiente' },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    await qi.addIndex('purchase_orders_alenstec', ['supplier_id']);
    await qi.addIndex('purchase_orders_alenstec', ['work_order_id']);
    await qi.addIndex('purchase_orders_alenstec', ['status']);

    // ─── Theme C: inventory_items + stock_movements ────────────────────
    await qi.createTable('inventory_items', {
      id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      clave:         { type: DataTypes.STRING(60), allowNull: false, unique: true },
      description:   { type: DataTypes.STRING(200), allowNull: false },
      supplier_name: { type: DataTypes.STRING, allowNull: true },
      currency:      { type: DataTypes.STRING(3), defaultValue: 'MXN' },
      existencia:    { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
      unidad:        { type: DataTypes.STRING(20), defaultValue: 'pza' },
      unit_cost:     { type: DataTypes.DECIMAL(12, 4), allowNull: false, defaultValue: 0 },
      assigned_work_order_id: { type: DataTypes.UUID, allowNull: true,
                    references: { model: 'work_orders', key: 'id' }, onDelete: 'SET NULL' },
      assigned_ot_number: { type: DataTypes.STRING, allowNull: true },
      status:        { type: DataTypes.ENUM('Asignado', 'Sin asignar', 'Agotado'),
                    defaultValue: 'Sin asignar' },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    await qi.addIndex('inventory_items', ['assigned_work_order_id']);
    await qi.addIndex('inventory_items', ['status']);

    await qi.createTable('stock_movements', {
      id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      inventory_item_id: { type: DataTypes.UUID, allowNull: false,
                    references: { model: 'inventory_items', key: 'id' }, onDelete: 'CASCADE' },
      movement_type:  { type: DataTypes.ENUM('entrada', 'salida', 'ajuste'), allowNull: false },
      quantity:       { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      reason:         { type: DataTypes.STRING(200), allowNull: true },
      reference_type: { type: DataTypes.STRING(40), allowNull: true },
      reference_id:   { type: DataTypes.UUID, allowNull: true },
      performed_by:   { type: DataTypes.INTEGER, allowNull: true,
                    references: { model: 'usuarios', key: 'id' }, onDelete: 'SET NULL' },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    await qi.addIndex('stock_movements', ['inventory_item_id']);
    await qi.addIndex('stock_movements', ['movement_type']);

    // ─── Theme D: supplier_invoices (CFDI) ─────────────────────────────
    await qi.createTable('supplier_invoices', {
      id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      uuid_fiscal:     { type: DataTypes.STRING(64), allowNull: false, unique: true },
      rfc_emisor:      { type: DataTypes.STRING(20), allowNull: false },
      rfc_receptor:    { type: DataTypes.STRING(20), allowNull: false },
      serie:           { type: DataTypes.STRING(20), allowNull: true },
      folio:           { type: DataTypes.STRING(40), allowNull: true },
      fecha_emision:   { type: DataTypes.DATE, allowNull: true },
      fecha_certificacion: { type: DataTypes.DATE, allowNull: true },
      regimen_fiscal:  { type: DataTypes.STRING(80), allowNull: true },
      concepto:        { type: DataTypes.TEXT, allowNull: true },
      cantidad:        { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      precio_unitario: { type: DataTypes.DECIMAL(12, 4), allowNull: true },
      subtotal:        { type: DataTypes.DECIMAL(14, 2), allowNull: true },
      iva:             { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
      retencion_isr:   { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
      retencion_iva:   { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
      total:           { type: DataTypes.DECIMAL(14, 2), allowNull: false },
      moneda:          { type: DataTypes.STRING(3), defaultValue: 'MXN' },
      tipo_cambio:     { type: DataTypes.DECIMAL(10, 4), allowNull: true },
      metodo_pago:     { type: DataTypes.ENUM('PUE', 'PPD'), allowNull: true },
      validacion_sat:  { type: DataTypes.ENUM('válida', 'pendiente', 'revisar', 'no válida'),
                    defaultValue: 'pendiente' },
      supplier_id:     { type: DataTypes.UUID, allowNull: true,
                    references: { model: 'suppliers', key: 'id' }, onDelete: 'SET NULL' },
      work_order_id:   { type: DataTypes.UUID, allowNull: true,
                    references: { model: 'work_orders', key: 'id' }, onDelete: 'SET NULL' },
      ot_number:       { type: DataTypes.STRING, allowNull: true },
      xml_raw:         { type: DataTypes.TEXT, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    await qi.addIndex('supplier_invoices', ['rfc_emisor']);
    await qi.addIndex('supplier_invoices', ['supplier_id']);
    await qi.addIndex('supplier_invoices', ['work_order_id']);
    await qi.addIndex('supplier_invoices', ['validacion_sat']);

    // ─── Theme E: deliveries + incidents ───────────────────────────────
    await qi.createTable('deliveries', {
      id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      delivery_number: { type: DataTypes.STRING(40), allowNull: true },
      supplier_id:     { type: DataTypes.UUID, allowNull: true,
                    references: { model: 'suppliers', key: 'id' }, onDelete: 'SET NULL' },
      supplier_name:   { type: DataTypes.STRING, allowNull: false },
      work_order_id:   { type: DataTypes.UUID, allowNull: true,
                    references: { model: 'work_orders', key: 'id' }, onDelete: 'SET NULL' },
      ot_number:       { type: DataTypes.STRING, allowNull: true },
      producto:        { type: DataTypes.STRING(200), allowNull: false },
      piezas:          { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      unit_cost:       { type: DataTypes.DECIMAL(12, 4), allowNull: true },
      currency:        { type: DataTypes.STRING(3), defaultValue: 'MXN' },
      entregado_por:   { type: DataTypes.STRING(120), allowNull: true },
      fecha_recibido:  { type: DataTypes.DATEONLY, allowNull: true },
      fecha_autorizado:{ type: DataTypes.DATEONLY, allowNull: true },
      inventory_item_id: { type: DataTypes.UUID, allowNull: true,
                    references: { model: 'inventory_items', key: 'id' }, onDelete: 'SET NULL' },
      incidencia:      { type: DataTypes.STRING(240), allowNull: true },
      status:          { type: DataTypes.ENUM('Pendiente', 'Entregado', 'Con incidencia'),
                    defaultValue: 'Pendiente' },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    await qi.addIndex('deliveries', ['supplier_id']);
    await qi.addIndex('deliveries', ['work_order_id']);
    await qi.addIndex('deliveries', ['status']);

    await qi.createTable('incidents', {
      id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      folio:       { type: DataTypes.STRING(40), allowNull: false, unique: true },
      work_order_id: { type: DataTypes.UUID, allowNull: true,
                    references: { model: 'work_orders', key: 'id' }, onDelete: 'SET NULL' },
      ot_number:   { type: DataTypes.STRING, allowNull: true },
      supplier_id: { type: DataTypes.UUID, allowNull: true,
                    references: { model: 'suppliers', key: 'id' }, onDelete: 'SET NULL' },
      supplier_name: { type: DataTypes.STRING, allowNull: true },
      descripcion: { type: DataTypes.TEXT, allowNull: false },
      registrado_por: { type: DataTypes.STRING(120), allowNull: true },
      fecha:       { type: DataTypes.DATEONLY, allowNull: false },
      status:      { type: DataTypes.ENUM('Abierta', 'En revisión', 'Cerrada'),
                    defaultValue: 'Abierta' },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    await qi.addIndex('incidents', ['work_order_id']);
    await qi.addIndex('incidents', ['status']);

    // ─── Theme F: work_order_approvals (Flujo de Liberación OT) ────────
    await qi.createTable('work_order_approvals', {
      id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      work_order_id: { type: DataTypes.UUID, allowNull: false,
                    references: { model: 'work_orders', key: 'id' }, onDelete: 'CASCADE' },
      step:          { type: DataTypes.ENUM(
                        'cotizacion', 'compras', 'produccion', 'calidad', 'liberacion_final'
                      ), allowNull: false },
      status:        { type: DataTypes.ENUM('pendiente', 'aprobada', 'rechazada'),
                    defaultValue: 'pendiente' },
      decided_by:    { type: DataTypes.INTEGER, allowNull: true,
                    references: { model: 'usuarios', key: 'id' }, onDelete: 'SET NULL' },
      decided_at:    { type: DataTypes.DATE, allowNull: true },
      comments:      { type: DataTypes.TEXT, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    await qi.addIndex('work_order_approvals', ['work_order_id']);
    await qi.addIndex('work_order_approvals', ['step']);
    await qi.addIndex('work_order_approvals', ['status']);
  },

  async down({ context: qi }) {
    await qi.dropTable('work_order_approvals');
    await qi.dropTable('incidents');
    await qi.dropTable('deliveries');
    await qi.dropTable('supplier_invoices');
    await qi.dropTable('stock_movements');
    await qi.dropTable('inventory_items');
    await qi.dropTable('purchase_orders_alenstec');
    // Drop enums explicitly (Sequelize leaves them behind on Postgres).
    for (const type of [
      'enum_purchase_orders_alenstec_status',
      'enum_inventory_items_status',
      'enum_stock_movements_movement_type',
      'enum_supplier_invoices_metodo_pago',
      'enum_supplier_invoices_validacion_sat',
      'enum_deliveries_status',
      'enum_incidents_status',
      'enum_work_order_approvals_step',
      'enum_work_order_approvals_status',
    ]) {
      await qi.sequelize.query(`DROP TYPE IF EXISTS "${type}"`);
    }
  },
};
