const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const CreditNote = sequelize.define(
    "CreditNote",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      originalInvoiceId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Invoices',
          key: 'id'
        },
        comment: 'Referencia a la factura original'
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
      creditNoteSequentialNumber: {
        type: DataTypes.STRING(10),
        allowNull: false,
        comment: 'Número secuencial para nota de crédito'
      },
      creditNoteNumber: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Número completo de nota de crédito (prefix + sequential)'
      },
      prefix: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'NC',
        comment: 'Prefijo de la nota de crédito'
      },
      cufe: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'CUFE devuelto por Taxxa'
      },
      qrCode: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Código QR de la nota de crédito'
      },
      // ⭐ CAMPOS DE BUYER/SELLER (igual que Invoice)
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
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Documento del vendedor'
      },
      sellerName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Nombre del vendedor'
      },
      // ⭐ CAMPOS ESPECÍFICOS DE NOTA DE CRÉDITO
      creditReason: {
        type: DataTypes.STRING(1),
        allowNull: false,
        validate: {
          isIn: [['1', '2', '3', '4', '5', '6']]
        },
        comment: 'Motivo de la nota de crédito (1-6)'
      },
      creditAmount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        comment: 'Monto de la nota de crédito'
      },
      taxAmount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: 0,
        comment: 'Monto de impuestos'
      },
      totalAmount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        comment: 'Monto total (creditAmount + taxAmount)'
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Descripción del motivo'
      },
      // ⭐ CAMPOS DE ESTADO Y CONTROL
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'pending',
        validate: {
          isIn: [['pending', 'sent', 'completed', 'failed', 'cancelled']]
        },
        comment: 'Estado de la nota de crédito'
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
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'ID de transacción en Taxxa'
      },
      orderReference: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Referencia del pedido'
      },
      // ⭐ CAMPO PARA IDENTIFICAR SI ES PARCIAL O TOTAL
      isPartial: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Si la nota de crédito es parcial o total'
      }
    },
    {
      tableName: "CreditNotes",
      timestamps: true,
      paranoid: true,
      indexes: [
        {
          name: 'credit_notes_original_invoice_idx',
          fields: ['originalInvoiceId']
        },
        {
          name: 'credit_notes_bill_id_idx',
          fields: ['billId']
        },
        {
          name: 'credit_notes_status_idx',
          fields: ['status']
        },
        {
          name: 'credit_notes_sequential_number_idx',
          fields: ['creditNoteSequentialNumber']
        },
        {
          name: 'credit_notes_unique_number_idx',
          unique: true,
          fields: ['prefix', 'creditNoteSequentialNumber'],
          where: {
            deletedAt: null
          }
        }
      ]
    }
  );

  // 🔧 MÉTODOS DE INSTANCIA
  CreditNote.prototype.getFullNumber = function() {
    return `${this.prefix}${this.creditNoteSequentialNumber}`;
  };

  CreditNote.prototype.markAsSent = async function(taxxaResponse) {
    return await this.update({
      status: 'sent',
      sentToTaxxaAt: new Date(),
      taxxaResponse: taxxaResponse,
      cufe: taxxaResponse.scufe || taxxaResponse.cufe,
      taxxaTransactionId: taxxaResponse.stransactionid || taxxaResponse.transactionId
    });
  };

  CreditNote.prototype.markAsFailed = async function(error) {
    return await this.update({
      status: 'failed',
      taxxaResponse: {
        error: error.message,
        timestamp: new Date().toISOString()
      }
    });
  };

  return CreditNote;
};