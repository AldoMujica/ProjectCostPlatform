const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

const StockMovement = sequelize.define('StockMovement', {
  id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  inventoryItemId: { type: DataTypes.UUID, allowNull: false, field: 'inventory_item_id' },
  movementType:    { type: DataTypes.ENUM('entrada', 'salida', 'ajuste'), allowNull: false, field: 'movement_type' },
  quantity:        { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  reason:          { type: DataTypes.STRING(200), allowNull: true },
  referenceType:   { type: DataTypes.STRING(40), allowNull: true, field: 'reference_type' },
  referenceId:     { type: DataTypes.UUID, allowNull: true, field: 'reference_id' },
  performedBy:     { type: DataTypes.INTEGER, allowNull: true, field: 'performed_by' },
}, {
  tableName: 'stock_movements',
  timestamps: true,
  underscored: true,
  paranoid: true,
  deletedAt: 'deleted_at',
});

module.exports = StockMovement;
