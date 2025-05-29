const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  sequelize.define(
    "Invoice",
    {
      
      buyerId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: "Users",
          key: "n_document",
        },
        index: true,
      },
      sellerId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: "SellerData",
          key: "sdocno",
        },
        index: true,
      },
      invoiceNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        index: true,
      },
      status: {
        type: DataTypes.ENUM("pending", "sent", "failed"),
        defaultValue: "pending",
      },
      totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      taxxaResponse: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      taxxaId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      cufe: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      qrCode: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      orderReference: {
        type: DataTypes.STRING,
        allowNull: false,
      }
      
    },
    {
      timestamps: true,
    }
  );
};