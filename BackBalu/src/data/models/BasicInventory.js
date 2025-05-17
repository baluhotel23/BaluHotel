const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const BasicInventory = sequelize.define("BasicInventory", {
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
      allowNull: false,
    },

    currentStock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    minStock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
    },
    unitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    // Nuevo campo: indica si el ítem puede venderse
    isSellable: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Indica si este ítem puede venderse a los huéspedes"
    },
    // Nuevo campo: precio de venta (aplicable solo si isSellable=true)
    salePrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: "Precio de venta al huésped (solo para items vendibles)"
    },
    category: {
      type: DataTypes.ENUM('Room', 'Bathroom', 'Kitchen', 'Cafeteria',  'Other'),
      defaultValue: 'Other'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    timestamps: true,
    paranoid: false,
    
  });

  return BasicInventory;
};