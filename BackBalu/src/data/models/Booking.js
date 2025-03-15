const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
 sequelize.define('Booking', {
    bookingId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    checkIn: {
      type: DataTypes.DATE,
      allowNull: false
    },
    checkOut: {
      type: DataTypes.DATE,
      allowNull: false
    },
    pointOfSale: {
        type: DataTypes.ENUM("Online", "Local"),
        allowNull: false,
        defaultValue: "Online",
      },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'checked-in', 'completed', 'facturada', 'cancelled'),
      defaultValue: 'pending'
    },
    guestCount: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    }
  });

 
};