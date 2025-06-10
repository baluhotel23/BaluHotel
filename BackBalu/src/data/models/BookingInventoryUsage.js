const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const BookingInventoryUsage = sequelize.define("BookingInventoryUsage", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    bookingId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      // ⭐ REMOVER REFERENCES - SE MANEJA EN ASSOCIATIONS
    },
    basicInventoryId: {
      type: DataTypes.UUID,
      allowNull: false,
      // ⭐ REMOVER REFERENCES - SE MANEJA EN ASSOCIATIONS
    },
    quantityAssigned: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    quantityConsumed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    quantityReturned: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM,
      values: ['assigned', 'in_use', 'returned', 'consumed', 'damaged'],
      allowNull: false,
      defaultValue: 'assigned'
    },
    assignedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    returnedAt: {
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
    
    hooks: {
      beforeUpdate: (instance, options) => {
        if (instance.changed('status')) {
          const validTransitions = {
            'assigned': ['in_use', 'returned', 'consumed', 'damaged'],
            'in_use': ['returned', 'consumed', 'damaged'],
            'returned': [], 
            'consumed': [], 
            'damaged': [] 
          };
          
          const currentStatus = instance._previousDataValues.status;
          const newStatus = instance.status;
          
          if (currentStatus && !validTransitions[currentStatus]?.includes(newStatus)) {
            throw new Error(`Transición de estado inválida: ${currentStatus} -> ${newStatus}`);
          }
        }
        
        if (instance.status === 'returned' && !instance.returnedAt) {
          instance.returnedAt = new Date();
        }
        if (instance.status === 'assigned' && !instance.assignedAt) {
          instance.assignedAt = new Date();
        }
      }
    }
  });

  return BookingInventoryUsage;
};