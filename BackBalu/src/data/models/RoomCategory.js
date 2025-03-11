const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  sequelize.define('RoomCategory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,  
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,   
    },
    maxGuests: {  // Campo para definir la cantidad máxima de huéspedes
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    }
  }, {
    timestamps: true,
    paranoid: true,
    tableName: 'RoomCategories'
  });
};