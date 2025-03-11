const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  sequelize.define('HotelSettings', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,  // Nombre del hotel, obligatorio
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false,  // Dirección del hotel, obligatorio
    },
    contactInfo: {
      type: DataTypes.STRING,
      allowNull: true,   // Información de contacto (teléfono, email, etc.)
    }
  }, {
    timestamps: true,
    paranoid: true,
    tableName: 'HotelSettings'
  });

  
};