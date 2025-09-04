const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Invoice = sequelize.define(
    "Invoice",
    {
      id: {
        type: DataTypes.INTEGER, 
        autoIncrement: true,     
        primaryKey: true,
        allowNull: false
      },
      billId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Bills',
          key: 'idBill'
        },
        comment: 'Referencia a la factura interna'
      },
      invoiceSequentialNumber: {
        type: DataTypes.STRING(10),
        allowNull: false,
        comment: 'Número secuencial para Taxxa (1-500)'
      },
      invoiceNumber: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Número completo de factura (prefix + sequential)'
      },
      prefix: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'FVK',
        comment: 'Prefijo de la factura'
      },
      cufe: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'CUFE devuelto por Taxxa'
      },
      qrCode: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Código QR de la factura'
      },
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
      sellerId: {
        type: DataTypes.STRING(255), // ✅ Cambiar a 255 según la tabla real
        allowNull: false,
        comment: 'Documento del vendedor'
      },
      sellerName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Nombre del vendedor'
      },
      totalAmount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        comment: 'Monto total de la factura'
      },
      taxAmount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: 0,
        comment: 'Monto de impuestos'
      },
      netAmount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        comment: 'Monto neto (sin impuestos)'
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'pending',
        validate: {
          isIn: [['pending', 'sent', 'completed', 'failed', 'cancelled']]
        },
        comment: 'Estado de la factura'
      },
      sentToTaxxaAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha de envío a Taxxa'
      },
      taxxaResponse: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Respuesta completa de Taxxa'
      },
      taxxaTransactionId: {
        type: DataTypes.STRING(255), // ✅ Cambiar a 255 según la tabla
        allowNull: true,
        comment: 'ID de transacción en Taxxa'
      },
      resolutionNumber: {
        type: DataTypes.STRING(50),
        allowNull: true, // ✅ Permitir NULL según la tabla
        comment: 'Número de resolución DIAN'
      },
      resolutionFrom: {
        type: DataTypes.INTEGER,
        allowNull: true, // ✅ Permitir NULL según la tabla
        comment: 'Número inicial de la resolución'
      },
      resolutionTo: {
        type: DataTypes.INTEGER,
        allowNull: true, // ✅ Permitir NULL según la tabla
        comment: 'Número final de la resolución'
      },
      resolutionStartDate: {
        type: DataTypes.DATEONLY,
        allowNull: true, // ✅ Permitir NULL según la tabla
        comment: 'Fecha inicio de la resolución'
      },
      resolutionEndDate: {
        type: DataTypes.DATEONLY,
        allowNull: true, // ✅ Permitir NULL según la tabla
        comment: 'Fecha fin de la resolución'
      },
      orderReference: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Referencia del pedido'
      },
      bookingId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'ID de la reserva'
      }
    },
    {
      tableName: "Invoices",
      timestamps: true,
      paranoid: true, // Soft delete con deletedAt
      indexes: [
        {
          name: 'invoices_bill_id_idx',
          fields: ['billId']
        },
        {
          name: 'invoices_sequential_number_idx',
          fields: ['invoiceSequentialNumber']
        },
        {
          name: 'invoices_status_idx',
          fields: ['status']
        },
        {
          name: 'invoices_unique_number_idx',
          unique: true,
          fields: ['prefix', 'invoiceSequentialNumber'],
          where: {
            deletedAt: null
          }
        }
      ]
    }
  );

  // 🔧 MÉTODOS DE INSTANCIA
  Invoice.prototype.getFullInvoiceNumber = function() {
    return `${this.prefix}${this.invoiceSequentialNumber}`;
  };

  Invoice.prototype.markAsSent = async function(taxxaResponse) {
    return await this.update({
      status: 'sent',
      sentToTaxxaAt: new Date(),
      taxxaResponse: taxxaResponse,
      cufe: taxxaResponse.scufe || taxxaResponse.cufe,
      taxxaTransactionId: taxxaResponse.stransactionid || taxxaResponse.transactionId
    });
  };

  Invoice.prototype.markAsFailed = async function(error) {
    return await this.update({
      status: 'failed',
      taxxaResponse: {
        error: error.message,
        timestamp: new Date().toISOString()
      }
    });
  };

  return Invoice;
};