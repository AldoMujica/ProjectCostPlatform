const { DataTypes } = require('sequelize');

module.exports = {
  async up({ context: qi }) {
    await qi.addColumn('quotes', 'cliente', {
      type: DataTypes.STRING,
      allowNull: true,
    });
    await qi.addColumn('quotes', 'proyecto', {
      type: DataTypes.STRING,
      allowNull: true,
    });
    await qi.addColumn('quotes', 'celda', {
      type: DataTypes.STRING,
      allowNull: true,
    });
    await qi.addColumn('quotes', 'rfq', {
      type: DataTypes.STRING,
      allowNull: true,
    });
    await qi.addColumn('quotes', 'mecr', {
      type: DataTypes.STRING,
      allowNull: true,
    });
    await qi.addColumn('quotes', 'cot_ref_alenstec', {
      type: DataTypes.STRING,
      allowNull: true,
    });
    await qi.addColumn('quotes', 'fecha_cot', {
      type: DataTypes.DATE,
      allowNull: true,
    });
    await qi.addColumn('quotes', 'costo_cot_usd', {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    });
    await qi.addColumn('quotes', 'tipo_contrato', {
      type: DataTypes.STRING,
      allowNull: true,
    });
    await qi.addColumn('quotes', 'fecha_oc', {
      type: DataTypes.DATE,
      allowNull: true,
    });
    await qi.addColumn('quotes', 'costo_oc_usd', {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    });
    await qi.addColumn('quotes', 'fecha_compromiso', {
      type: DataTypes.DATE,
      allowNull: true,
    });
    await qi.addColumn('quotes', 'tipo_cambio', {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: true,
    });
    await qi.addColumn('quotes', 'descripcion_proyecto', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
    await qi.addColumn('quotes', 'labor_indirecta', {
      type: DataTypes.JSON,
      allowNull: true,
    });
    await qi.addColumn('quotes', 'labor_directa_ingenieria', {
      type: DataTypes.JSON,
      allowNull: true,
    });
    await qi.addColumn('quotes', 'labor_directa_manufactura', {
      type: DataTypes.JSON,
      allowNull: true,
    });
    await qi.addColumn('quotes', 'labor_directa_automatizacion', {
      type: DataTypes.JSON,
      allowNull: true,
    });
    await qi.addColumn('quotes', 'materiales', {
      type: DataTypes.JSON,
      allowNull: true,
    });
    await qi.addColumn('quotes', 'viaticos', {
      type: DataTypes.JSON,
      allowNull: true,
    });
    await qi.addColumn('quotes', 'logistica', {
      type: DataTypes.JSON,
      allowNull: true,
    });
    await qi.addColumn('quotes', 'utilidad_final', {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    });
    await qi.addColumn('quotes', 'iva_empresa', {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    });
    await qi.addColumn('quotes', 'total_final', {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    });
    await qi.addColumn('quotes', 'notas', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
  },

  async down({ context: qi }) {
    const columns = [
      'cliente', 'proyecto', 'celda', 'rfq', 'mecr', 'cot_ref_alenstec',
      'fecha_cot', 'costo_cot_usd', 'tipo_contrato', 'fecha_oc', 'costo_oc_usd',
      'fecha_compromiso', 'tipo_cambio', 'descripcion_proyecto', 'labor_indirecta',
      'labor_directa_ingenieria', 'labor_directa_manufactura', 'labor_directa_automatizacion',
      'materiales', 'viaticos', 'logistica', 'utilidad_final', 'iva_empresa', 'total_final', 'notas'
    ];
    for (const col of columns) {
      await qi.removeColumn('quotes', col);
    }
  }
};
