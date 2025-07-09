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
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Descripción del motivo'
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'pending',
        validate: {
          isIn: [['pending', 'sent', 'completed', 'failed', 'cancelled']]
        }
      },
      sentToTaxxaAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      taxxaResponse: {
        type: DataTypes.JSONB,
        allowNull: true
      }
    },
    {
      tableName: "CreditNotes",
      timestamps: true,
      paranoid: true,
      indexes: [
        {
          fields: ['originalInvoiceId']
        },
        {
          fields: ['billId']
        },
        {
          fields: ['status']
        },
        {
          unique: true,
          fields: ['prefix', 'creditNoteSequentialNumber'],
          where: { deletedAt: null }
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
      cufe: taxxaResponse.scufe || taxxaResponse.cufe
    });
  };

  return CreditNote;
};