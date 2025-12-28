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
    },
    receiptUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'URL del comprobante del gasto en Cloudinary'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas adicionales sobre el gasto'
    },
    createdBy: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Documento del usuario que creó el gasto'
    }
  });
 return Expense;
};