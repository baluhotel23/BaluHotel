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
      // ⭐ REMOVER REFERENCES - SE MANEJA EN ASSOCIATIONS
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    paymentMethod: {
      type: DataTypes.ENUM(
        "credit_card",
        "debit_card", 
        "cash",
        "transfer",
        "wompi",
        "wompi_checkout"
      ),
      allowNull: false,
    },
    paymentStatus: {
      type: DataTypes.ENUM("pending", "completed", "failed", "refunded"),
      allowNull: false,
      defaultValue: "pending",
    },
    paymentDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    transactionId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    paymentReference: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    paymentType: {
      type: DataTypes.ENUM("full", "partial", "online"),
      allowNull: true,
    },
    processedBy: {
      type: DataTypes.STRING,
      allowNull: true,
      // ⭐ REMOVER REFERENCES - SE MANEJA EN ASSOCIATIONS
    },
  }, {
    timestamps: true,
  });
  
  return Payment;
};