const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Bill = sequelize.define("Bill", {
    idBill: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    bookingId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    reservationAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    extraChargesAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    taxAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    taxInvoiceId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // 🔧 USAR STRING EN LUGAR DE ENUM PARA EVITAR PROBLEMAS
    status: {
      type: DataTypes.STRING,
      defaultValue: 'pending',
      validate: {
        isIn: [['pending', 'paid', 'cancelled']]
      }
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isIn: [['cash', 'credit_card', 'debit_card', 'transfer']]
      }
    },
    // 🆕 CAMPOS PARA TAXXA (USANDO STRING)
    taxxaStatus: {
      type: DataTypes.STRING,
      defaultValue: 'not_sent',
      validate: {
        isIn: [['not_sent', 'pending', 'sent', 'failed']]
      }
    },
    sentToTaxxaAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    taxxaResponse: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    cufe: {
      type: DataTypes.STRING,
      allowNull: true,
    }
  }, {
    timestamps: true,
    paranoid: true,
    // 🔧 ÍNDICES SIMPLES
    indexes: [
      {
        fields: ['bookingId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['taxxaStatus']
      }
    ]
  });

  // 🆕 MÉTODOS DE INSTANCIA
  Bill.prototype.canBeSentToTaxxa = function() {
    return this.status === 'paid' && 
           ['not_sent', 'failed'].includes(this.taxxaStatus) && 
           !this.deletedAt;
  };

  Bill.prototype.isAlreadySentToTaxxa = function() {
    return this.taxxaStatus === 'sent' && this.taxInvoiceId;
  };

  Bill.prototype.markAsSentToTaxxa = function(taxxaData) {
    return this.update({
      taxxaStatus: 'sent',
      taxInvoiceId: taxxaData.sinvoicenumber || taxxaData.invoiceNumber,
      cufe: taxxaData.scufe || taxxaData.cufe,
      taxxaResponse: taxxaData,
      sentToTaxxaAt: new Date()
    });
  };

  Bill.prototype.markAsTaxxaFailed = function(error) {
    return this.update({
      taxxaStatus: 'failed',
      taxxaResponse: { 
        error: error.message, 
        timestamp: new Date() 
      }
    });
  };

  return Bill;
};