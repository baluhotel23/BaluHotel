const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const PurchaseItem = sequelize.define("PurchaseItem", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    purchaseId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Purchases',
        key: 'id'
      }
    },
    basicId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'BasicInventories',
        key: 'id'
      }
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
  });

  return PurchaseItem;
};