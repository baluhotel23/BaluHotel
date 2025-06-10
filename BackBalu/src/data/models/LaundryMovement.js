const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const LaundryMovement = sequelize.define("LaundryMovement", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    basicInventoryId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    movementType: {
      type: DataTypes.ENUM,
      values: ['dirty_to_washing', 'washing_to_clean', 'clean_to_dirty', 'damaged'],
      allowNull: false,
      defaultValue: 'dirty_to_washing'
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      }
    },
    roomNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bookingId: {
      type: DataTypes.INTEGER, // ⭐ CAMBIAR A INTEGER PARA COINCIDIR CON BOOKING
      allowNull: true,
    },
    estimatedCompletion: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    actualCompletion: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    }
  }, {
    timestamps: true,
    paranoid: true,
    tableName: 'LaundryMovements',
    
    indexes: [
      {
        fields: ['basicInventoryId']
      },
      {
        fields: ['movementType']
      },
      {
        fields: ['bookingId']
      },
      {
        fields: ['roomNumber']
      },
      {
        fields: ['createdAt']
      }
    ],
    
    hooks: {
      beforeUpdate: (instance) => {
        if (instance.movementType === 'washing_to_clean' && !instance.actualCompletion) {
          instance.actualCompletion = new Date();
        }
      }
    }
  });

  return LaundryMovement;
};