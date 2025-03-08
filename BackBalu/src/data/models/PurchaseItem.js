const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const PurchaseItem = sequelize.define("PurchaseItem", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
    }
  }, {
    timestamps: true,
    paranoid: true,
    tableName: 'PurchaseItems'
  });

  return PurchaseItem;
};