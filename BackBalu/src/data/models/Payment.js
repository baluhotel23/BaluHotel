const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
 const Payment = sequelize.define("Payment", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    paymentMethod: {
      type: DataTypes.ENUM,
      values: ['cash', 'credit_card', 'debit_card', 'wompi', 'transfer'],
      allowNull: false,
    },
    paymentStatus: {
      type: DataTypes.ENUM,
      values: ['pending', 'completed', 'failed', 'refunded'],
      defaultValue: 'pending',
    },
    transactionId: {
      type: DataTypes.STRING, // Para wompi o referencias bancarias
    },
    paymentDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    type: {
      type: DataTypes.ENUM,
      values: ['advance', 'complete', 'extra_charges'],
      allowNull: false,
    }
  });
  return Payment;
};