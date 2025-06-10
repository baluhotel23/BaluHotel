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
      values: ['pending', 'confirmed', 'checked-in', 'completed', 'advanced', 'cancelled', 'no_show_cancelled'],
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
      // ⭐ NO REFERENCES AQUÍ - SE MANEJA EN ASSOCIATIONS
    },
    roomNumber: {
      type: DataTypes.STRING, // ⭐ STRING para coincidir con Room
      allowNull: false,
      // ⭐ NO REFERENCES AQUÍ - SE MANEJA EN ASSOCIATIONS
    },
    trackingToken: {
      type: DataTypes.STRING,
      allowNull: true, 
    },
    createdBy: {
      type: DataTypes.STRING,
      allowNull: true,
      // ⭐ REFERENCIA A User.n_document PERO SIN FK CONSTRAINT
    }
  }, {
    timestamps: true,
    tableName: 'Bookings'
  });

  // ⭐ IMPORTANTE: RETURN DEL MODELO
  return Booking;
};