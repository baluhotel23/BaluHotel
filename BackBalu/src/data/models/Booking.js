const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  sequelize.define('Booking', {
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
      type: DataTypes.ENUM('pending', 'confirmed', 'checked-in', 'completed', 'advanced', 'cancelled', 'no_show_cancelled'), // <--- AÑADIR 'no_show_cancelled'
      defaultValue: 'pending'
    },
    pointOfSale: {
        type: DataTypes.ENUM("Online", "Local"),
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
      references: {
        model: 'Buyers', 
        key: 'sdocno'
      }
    },
    roomNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    trackingToken: {
      type: DataTypes.STRING,
      allowNull: true, 
    },
  }, {
    
    timestamps: true,
  });
};