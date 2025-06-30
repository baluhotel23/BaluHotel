const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Booking = sequelize.define('Booking', {
    bookingId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    checkIn: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    checkOut: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM,
      values: ['pending', 'confirmed', 'paid', 'checked-in', 'completed', 'advanced', 'cancelled', 'no_show_cancelled'], // ⭐ AGREGAR 'paid'
      defaultValue: 'pending'
    },
    pointOfSale: {
      type: DataTypes.ENUM,
      values: ["Online", "Local"],
      allowNull: false,
      defaultValue: "Online",
    },
    guestCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    guestId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    roomNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    trackingToken: {
      type: DataTypes.STRING,
      allowNull: true, 
    },
    createdBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // ⭐ NUEVOS CAMPOS PARA DISTINGUIR PROCESOS
    paymentCompletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp cuando se completó el pago total'
    },
    actualCheckIn: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp real cuando se completó el check-in físico'
    },
    actualCheckOut: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp real cuando se completó el check-out físico'
    }
  }, {
    timestamps: true,
    tableName: 'Bookings'
  });

  return Booking;
};