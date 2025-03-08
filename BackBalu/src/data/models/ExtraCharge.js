const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const ExtraCharge = sequelize.define("ExtraCharge", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    chargeDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    }
  }, {
    timestamps: true,
    tableName: 'ExtraCharges'
  });

  return ExtraCharge;
};