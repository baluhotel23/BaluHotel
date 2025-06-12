const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Purchase = sequelize.define("Purchase", {
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
    },
    receiptUrl: {
      type: DataTypes.STRING,
    },
    createdBy: { // ⭐ AGREGAR ESTE CAMPO
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'n_document'
      }
    },
    notes: { // ⭐ CAMPO ADICIONAL QUE PUEDE SER ÚTIL
      type: DataTypes.TEXT,
      allowNull: true,
    }
  }, {
    timestamps: true,
    paranoid: true,
  });

  return Purchase;
};