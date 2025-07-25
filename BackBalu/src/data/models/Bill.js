const { DataTypes, Op } = require("sequelize"); // ✅ IMPORTAR Op

module.exports = (sequelize) => {
  const Bill = sequelize.define("Bill", {
    idBill: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    // ✅ CAMBIO PRINCIPAL: Hacer bookingId opcional
    bookingId: {
      type: DataTypes.INTEGER,
      allowNull: true, // ⭐ CAMBIAR A TRUE para facturas manuales
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
    // ✅ AÑADIR CAMPOS NUEVOS PARA IDENTIFICAR TIPO DE FACTURA
    billType: {
      type: DataTypes.STRING,
      defaultValue: 'booking',
      allowNull: false,
      validate: {
        isIn: [['booking', 'manual', 'service', 'product']]
      }
    },
    buyerId: {
      type: DataTypes.STRING, // Para referenciar al comprador
      allowNull: true,
    },
    sellerId: {
      type: DataTypes.STRING, // Para referenciar al vendedor
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
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
    },
    // ✅ AÑADIR QR CODE
    qrCode: {
      type: DataTypes.TEXT,
      allowNull: true,
    }
  }, {
    timestamps: true,
    paranoid: true,
    // 🔧 ÍNDICES CORREGIDOS
    indexes: [
      {
        fields: ['bookingId'],
        // ✅ CORREGIR: Usar Op correctamente o simplificar
        where: {
          bookingId: {
            [Op.ne]: null // ✅ AHORA SÍ FUNCIONARÁ
          }
        }
      },
      {
        fields: ['status']
      },
      {
        fields: ['taxxaStatus']
      },
      {
        fields: ['billType']
      },
      {
        fields: ['buyerId']
      }
    ]
  });

  // 🆕 MÉTODOS DE INSTANCIA ACTUALIZADOS
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
      sentToTaxxaAt: new Date(),
      qrCode: taxxaData.qrCode || null
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

  // ✅ NUEVOS MÉTODOS PARA FACTURAS MANUALES
  Bill.prototype.isManualInvoice = function() {
    return this.billType === 'manual';
  };

  Bill.prototype.isBookingInvoice = function() {
    return this.billType === 'booking' && this.bookingId;
  };

  return Bill;
};