const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Invoice = sequelize.define("Invoice", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    // 🔧 RELACIÓN CON LA FACTURA INTERNA
    billId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Bills',
        key: 'idBill'
      },
      comment: 'Referencia a la factura interna (Bill)'
    },
    // 🔧 NUMERACIÓN SECUENCIAL TAXXA - CORREGIDA
    invoiceSequentialNumber: {
      type: DataTypes.STRING(10), // Especificar longitud
      allowNull: false,
      // 🔧 NO PONER unique AQUÍ, se define en indexes
      comment: 'Número secuencial para Taxxa (1-500)'
    },
    // 🔧 INFORMACIÓN DE TAXXA
    invoiceNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Número de factura generado por Taxxa'
    },
    prefix: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'FVK',
      comment: 'Prefijo de facturación DIAN'
    },
    // 🔧 INFORMACIÓN FISCAL
    cufe: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Código Único de Facturación Electrónica'
    },
    qrCode: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Código QR de la factura'
    },
    // 🔧 DATOS DEL CLIENTE
    buyerId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Documento del comprador'
    },
    buyerName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Nombre del comprador'
    },
    buyerEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Email del comprador'
    },
    // 🔧 DATOS DEL VENDEDOR
    sellerId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'NIT del vendedor (hotel)'
    },
    sellerName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Razón social del vendedor'
    },
    // 🔧 MONTOS
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Monto total de la factura'
    },
    taxAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Monto de impuestos'
    },
    netAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Monto neto sin impuestos'
    },
    // 🔧 ESTADO Y FECHAS
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: [['pending', 'sent', 'failed', 'cancelled']]
      },
      comment: 'Estado de la factura en Taxxa'
    },
    sentToTaxxaAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de envío a Taxxa'
    },
    // 🔧 RESPUESTA DE TAXXA
    taxxaResponse: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Respuesta completa de Taxxa'
    },
    taxxaTransactionId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'ID de transacción en Taxxa'
    },
    // 🔧 RESOLUCIÓN DIAN
    resolutionNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Número de resolución DIAN'
    },
    resolutionFrom: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: 'Número inicial de resolución'
    },
    resolutionTo: {
      type: DataTypes.INTEGER,
      defaultValue: 500,
      comment: 'Número final de resolución'
    },
    resolutionStartDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Fecha inicio de resolución'
    },
    resolutionEndDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Fecha fin de resolución'
    },
    // 🔧 REFERENCIA DEL PEDIDO
    orderReference: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Referencia del pedido/reserva'
    }
  }, {
    timestamps: true,
    paranoid: true,
    // 🔧 ÍNDICES CORREGIDOS - UNIQUE SE DEFINE AQUÍ
    indexes: [
      {
        fields: ['billId']
      },
      {
        fields: ['invoiceSequentialNumber'],
        unique: true, // ✅ UNIQUE constraint definido correctamente
        name: 'invoices_sequential_number_unique'
      },
      {
        fields: ['status']
      },
      {
        fields: ['buyerId']
      },
      {
        fields: ['sentToTaxxaAt']
      },
      {
        fields: ['prefix', 'invoiceSequentialNumber'],
        name: 'invoices_prefix_number_idx'
      }
    ]
  });

  // 🔧 MÉTODOS DE INSTANCIA
  Invoice.prototype.getFullInvoiceNumber = function() {
    return `${this.prefix}${this.invoiceSequentialNumber}`;
  };

  Invoice.prototype.isWithinResolution = function() {
    const number = parseInt(this.invoiceSequentialNumber);
    return number >= this.resolutionFrom && number <= this.resolutionTo;
  };

  Invoice.prototype.markAsSent = function(taxxaData) {
    return this.update({
      status: 'sent',
      invoiceNumber: taxxaData.sinvoicenumber || taxxaData.invoiceNumber,
      cufe: taxxaData.scufe || taxxaData.cufe,
      qrCode: taxxaData.sqrcode || taxxaData.qrCode,
      taxxaResponse: taxxaData,
      taxxaTransactionId: taxxaData.stransactionid || taxxaData.transactionId,
      sentToTaxxaAt: new Date()
    });
  };

  Invoice.prototype.markAsFailed = function(error) {
    return this.update({
      status: 'failed',
      taxxaResponse: { 
        error: error.message, 
        timestamp: new Date() 
      }
    });
  };

  return Invoice;
};