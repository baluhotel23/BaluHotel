const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Payment = sequelize.define("Payment", {
    paymentId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    bookingId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'bookings',
        key: 'bookingId'
      }
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    paymentMethod: {
      type: DataTypes.ENUM(['cash', 'credit_card', 'debit_card', 'wompi', 'transfer']),
      allowNull: false,
    },
    paymentStatus: {
      type: DataTypes.ENUM(['pending', 'completed', 'failed', 'refunded']),
      defaultValue: 'pending',
    },
    transactionId: {
      type: DataTypes.STRING,
    },
    paymentDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    paymentType: {
      type: DataTypes.ENUM(['full', 'partial', 'online']), // Added 'online' as a valid value
      allowNull: false,
    },
    paymentReference: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'payments',
    timestamps: true
  });
  return Payment;
};