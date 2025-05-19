const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
 const Purchase= sequelize.define("Purchase", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    
    supplier: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    invoiceNumber: {
      type: DataTypes.STRING,
    },
    purchaseDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    paymentMethod: {
  type: DataTypes.ENUM,
  values: ['cash', 'credit_card', 'transfer', 'credit'],
  allowNull: false,
},
    paymentStatus: {
      type: DataTypes.ENUM,
      values: ['pending', 'paid', 'partial'],
      defaultValue: 'pending',
    }
  });
 return Purchase;
};