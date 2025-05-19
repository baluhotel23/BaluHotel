const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Expense= sequelize.define("Expense", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    destinatario: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    expenseDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    category: {
      type: DataTypes.ENUM,
      values: ['maintenance', 'utilities', 'salaries', 'marketing', 'supplies', 'other'],
      allowNull: false,
    },
    paymentMethod: {
      type: DataTypes.ENUM,
      values: ['cash', 'credit_card', 'transfer', 'credit'],
      allowNull: false,
    }
  });
 return Expense;
};