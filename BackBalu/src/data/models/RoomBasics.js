const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const RoomBasics = sequelize.define("RoomBasics", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    roomNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    basicId: {
      type: DataTypes.UUID,
      allowNull: false,
      // ⭐ REMOVER REFERENCES TEMPORALMENTE - AGREGARLAS EN ASSOCIATIONS
      // references: {
      //   model: 'BasicInventories',
      //   key: 'id'
      // }
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 0
      }
    },
    isRequired: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
      validate: {
        min: 1,
        max: 5
      }
    }
  }, {
    timestamps: true,
    tableName: 'RoomBasics', // ⭐ AGREGAR NOMBRE EXPLÍCITO
    
    indexes: [
      {
        fields: ['roomNumber']
      },
      {
        fields: ['basicId']
      },
      {
        fields: ['isRequired']
      },
      {
        unique: true,
        fields: ['roomNumber', 'basicId']
      }
    ]
  });

  return RoomBasics;
};