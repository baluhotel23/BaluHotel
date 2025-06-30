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
      type: DataTypes.ENUM(
        "pending",     // Pago iniciado pero no procesado
        "authorized",  // Pago autorizado (reserva pagada, pero puede haber extras)
        "completed",   // Pago totalmente finalizado (después del checkout)
        "failed",      // Pago fallido
        "refunded",    // Pago reembolsado
        "partial"      // Pago parcial realizado
      ),
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
      type: DataTypes.ENUM(
        "full",        // Pago completo de la reserva
        "partial",     // Pago parcial de la reserva
        "online",      // Pago online
        "deposit",     // Depósito/anticipo
        "final",       // Pago final (checkout con extras)
        "extra_charge" // Pago solo de gastos extras
      ),
      allowNull: true,
    },
    processedBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // ⭐ NUEVOS CAMPOS PARA CONTROL DE GASTOS EXTRAS
    includesExtras: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Indica si este pago incluye gastos extras"
    },
    isReservationPayment: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: "Indica si es pago de la reserva base"
    },
    isCheckoutPayment: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Indica si es el pago final en checkout"
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    }
  }, {
    timestamps: true,
  });
  
  return Payment;
};