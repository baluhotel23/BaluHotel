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
    category: {
      type: DataTypes.ENUM('Room', 'Bathroom', 'Kitchen', 'Other'),
      defaultValue: 'Other'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    timestamps: true,
    paranoid: false,
    tableName: 'BasicInventories'
  });

  return BasicInventory;
};