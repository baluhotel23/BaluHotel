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
      values: ['pending', 'confirmed', 'paid', 'checked-in', 'completed', 'advanced', 'cancelled', 'no_show_cancelled'],
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
    // ⭐ CAMPOS EXISTENTES PARA DISTINGUIR PROCESOS
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
    },
    
    // ⭐ NUEVOS CAMPOS PARA TRACKING DE ESTADOS DE CHECK-IN
    inventoryVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Indica si el inventario básico fue verificado y cargado'
    },
    
    inventoryVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha y hora cuando se verificó el inventario'
    },
    
    inventoryDelivered: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Indica si el inventario básico fue entregado al huésped'
    },
    
    inventoryDeliveredAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha y hora cuando se entregó el inventario'
    },
    
    inventoryDeliveredBy: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Usuario que entregó el inventario básico'
    },
    
    passengersCompleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Indica si todos los pasajeros requeridos están registrados'
    },
    
    passengersCompletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha y hora cuando se completó el registro de todos los pasajeros'
    },
    
    checkInReadyAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha y hora cuando la reserva cumplió todos los requisitos para check-in'
    },
    
    checkInProgress: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Indica si la reserva está en proceso de check-in'
    }
  }, {
    timestamps: true,
    tableName: 'Bookings'
  });

  return Booking;
};