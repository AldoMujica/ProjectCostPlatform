const { DataTypes } = require('sequelize');

async function columnExists(qi, table, column) {
  const desc = await qi.describeTable(table);
  return Object.prototype.hasOwnProperty.call(desc, column);
}

const NEW_COLUMNS = {
  cliente:                      { type: DataTypes.STRING,         allowNull: true },
  proyecto:                     { type: DataTypes.STRING,         allowNull: true },
  celda:                        { type: DataTypes.STRING,         allowNull: true },
  rfq:                          { type: DataTypes.STRING,         allowNull: true },
  mecr:                         { type: DataTypes.STRING,         allowNull: true },
  cot_ref_alenstec:             { type: DataTypes.STRING,         allowNull: true },
  fecha_cot:                    { type: DataTypes.DATE,           allowNull: true },
  costo_cot_usd:                { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  tipo_contrato:                { type: DataTypes.STRING,         allowNull: true },
  fecha_oc:                     { type: DataTypes.DATE,           allowNull: true },
  costo_oc_usd:                 { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  fecha_compromiso:             { type: DataTypes.DATE,           allowNull: true },
  tipo_cambio:                  { type: DataTypes.DECIMAL(10, 4), allowNull: true },
  descripcion_proyecto:         { type: DataTypes.TEXT,           allowNull: true },
  labor_indirecta:              { type: DataTypes.JSON,           allowNull: true },
  labor_directa_ingenieria:     { type: DataTypes.JSON,           allowNull: true },
  labor_directa_manufactura:    { type: DataTypes.JSON,           allowNull: true },
  labor_directa_automatizacion: { type: DataTypes.JSON,           allowNull: true },
  materiales:                   { type: DataTypes.JSON,           allowNull: true },
  viaticos:                     { type: DataTypes.JSON,           allowNull: true },
  logistica:                    { type: DataTypes.JSON,           allowNull: true },
  utilidad_final:               { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  iva_empresa:                  { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  total_final:                  { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  notas:                        { type: DataTypes.TEXT,           allowNull: true },
};

module.exports = {
  async up({ context: qi }) {
    for (const [name, spec] of Object.entries(NEW_COLUMNS)) {
      if (!(await columnExists(qi, 'quotes', name))) {
        await qi.addColumn('quotes', name, spec);
      }
    }
  },

  async down({ context: qi }) {
    for (const name of Object.keys(NEW_COLUMNS)) {
      if (await columnExists(qi, 'quotes', name)) {
        await qi.removeColumn('quotes', name);
      }
    }
  },
};
