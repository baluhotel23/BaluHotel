const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Bill = sequelize.define("Bill", {
    idBill: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    bookingId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      // ⭐ REMOVER REFERENCES - SE MANEJA EN ASSOCIATIONS
    },
    reservationAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    extraChargesAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    taxAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    taxInvoiceId: {
      type: DataTypes.STRING,
    },
    status: {
      type: DataTypes.ENUM,
      values: ['pending', 'paid', 'cancelled'],
      defaultValue: 'pending'
    },
    paymentMethod: {
      type: DataTypes.ENUM,
      values: ['cash', 'credit_card', 'debit_card', 'transfer'],
    },
  }, {
    timestamps: true,
    paranoid: true,
  });

  return Bill;
};