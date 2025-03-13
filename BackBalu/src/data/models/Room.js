const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  sequelize.define("Room", {
    roomNumber: {
      type: DataTypes.INTEGER,
      unique:true,
      allowNull: false,
      primaryKey: true,
    },
    description: {
      type: DataTypes.TEXT,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    available: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isPromo: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    promotionPrice: {
      type: DataTypes.DECIMAL(10, 2),
    },
    
   image_url: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
},
    status: {
      type: DataTypes.ENUM,
      values: ["Limpia", "Ocupada", "Mantenimiento", "Reservada"],
      
    },
 
    maxGuests: {  // Campo para definir la cantidad máxima de huéspedes
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  });
};
