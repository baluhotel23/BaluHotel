const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const RoomBasics = sequelize.define("RoomBasics", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    
    basicId: {
      type: DataTypes.UUID,
      allowNull: false,
      
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    lastUpdated: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    }
  });
  return RoomBasics;
};