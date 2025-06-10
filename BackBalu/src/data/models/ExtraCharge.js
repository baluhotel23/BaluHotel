const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const ExtraCharge = sequelize.define("ExtraCharge", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    // ⭐ AGREGAR RELACIÓN CON BOOKING
    bookingId: {
      type: DataTypes.INTEGER, // ⭐ INTEGER para coincidir con Booking.bookingId
      allowNull: false,
      // ⭐ NO REFERENCES AQUÍ - SE MANEJA EN ASSOCIATIONS
    },
    // ⭐ AGREGAR RELACIÓN OPCIONAL CON INVENTARIO
    basicId: {
      type: DataTypes.UUID,
      allowNull: true, // ⭐ OPCIONAL: puede ser un cargo libre o basado en inventario
      // ⭐ NO REFERENCES AQUÍ - SE MANEJA EN ASSOCIATIONS
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1
      }
    },
    // ⭐ CAMBIAR price POR amount PARA CONSISTENCIA
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    // ⭐ TOTAL CALCULADO (quantity * amount)
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true, // ⭐ Se puede calcular automáticamente
    },
    chargeDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    // ⭐ AGREGAR TIPO DE CARGO
    chargeType: {
      type: DataTypes.ENUM,
      values: ['service', 'damage', 'consumption', 'cleaning', 'minibar', 'other'],
      allowNull: false,
      defaultValue: 'service'
    },
    // ⭐ QUIEN APLICÓ EL CARGO
    chargedBy: {
      type: DataTypes.STRING,
      allowNull: true,
      // ⭐ PUEDE REFERENCIAR A User.n_document PERO SIN FK CONSTRAINT
    },
    // ⭐ NOTAS ADICIONALES
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // ⭐ SI EL CARGO ESTÁ APROBADO
    isApproved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    // ⭐ FECHA DE APROBACIÓN
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // ⭐ QUIEN APROBÓ EL CARGO
    approvedBy: {
      type: DataTypes.STRING,
      allowNull: true,
    }
  }, {
    timestamps: true,
    paranoid: true, // ⭐ SOFT DELETE
    
    // ⭐ HOOKS PARA CÁLCULOS AUTOMÁTICOS
    hooks: {
      beforeSave: (instance) => {
        // ⭐ CALCULAR TOTAL AUTOMÁTICAMENTE
        if (instance.quantity && instance.amount) {
          instance.totalAmount = instance.quantity * instance.amount;
        }
      },
      beforeUpdate: (instance) => {
        // ⭐ AUTO-APROBAR CIERTOS TIPOS DE CARGO
        if (instance.chargeType === 'service' && !instance.isApproved) {
          instance.isApproved = true;
          instance.approvedAt = new Date();
        }
        
        // ⭐ RECALCULAR TOTAL SI CAMBIAN CANTIDAD O PRECIO
        if (instance.changed('quantity') || instance.changed('amount')) {
          instance.totalAmount = instance.quantity * instance.amount;
        }
      }
    },
    
    // ⭐ ÍNDICES PARA MEJORAR PERFORMANCE
    indexes: [
      {
        fields: ['bookingId']
      },
      {
        fields: ['chargeType']
      },
      {
        fields: ['chargeDate']
      },
      {
        fields: ['isApproved']
      },
      {
        fields: ['basicId']
      }
    ]
  });

  // ⭐ IMPORTANTE: RETURN DEL MODELO
  return ExtraCharge;
};