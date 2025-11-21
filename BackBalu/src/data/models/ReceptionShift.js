const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ReceptionShift = sequelize.define('ReceptionShift', {
    shiftId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    
    // ⭐ USUARIO RESPONSABLE DEL TURNO
    userId: {
      type: DataTypes.STRING, // ⭐ User.n_document es STRING
      allowNull: false,
      references: {
        model: 'Users',
        key: 'n_document' // ⭐ PK correcta de Users
      },
      comment: 'Usuario recepcionista a cargo del turno (n_document)'
    },

    // ⭐ FECHAS Y HORAS DEL TURNO
    openedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Fecha y hora de apertura del turno'
    },

    closedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha y hora de cierre del turno'
    },

    // ⭐ ESTADO DEL TURNO
    status: {
      type: DataTypes.ENUM('open', 'closed'),
      defaultValue: 'open',
      allowNull: false
    },

    // ⭐ MONTOS DE APERTURA
    openingCash: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      allowNull: false,
      comment: 'Efectivo inicial en caja al abrir turno'
    },

    // ⭐ MONTOS DE CIERRE - CALCULADOS
    closingCash: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Efectivo total al cerrar turno'
    },

    totalCashSales: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Total de ventas en efectivo durante el turno'
    },

    totalCardSales: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Total de ventas con tarjeta durante el turno'
    },

    totalTransferSales: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Total de ventas por transferencia durante el turno'
    },

    totalSales: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Total de todas las ventas del turno'
    },

    // ⭐ CONTEO DE TRANSACCIONES
    totalTransactions: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Cantidad total de transacciones procesadas'
    },

    cashTransactions: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Cantidad de transacciones en efectivo'
    },

    cardTransactions: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Cantidad de transacciones con tarjeta'
    },

    transferTransactions: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Cantidad de transacciones por transferencia'
    },

    // ⭐ DIFERENCIAS Y AJUSTES
    expectedCash: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Efectivo esperado = apertura + ventas en efectivo'
    },

    cashDifference: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Diferencia entre efectivo esperado y efectivo real al cierre'
    },

    // ⭐ NOTAS Y OBSERVACIONES
    openingNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas u observaciones al abrir turno'
    },

    closingNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas u observaciones al cerrar turno'
    },

    // ⭐ INFORMACIÓN ADICIONAL
    checkInsProcessed: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Cantidad de check-ins procesados'
    },

    checkOutsProcessed: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Cantidad de check-outs procesados'
    },

    bookingsCreated: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Cantidad de reservas creadas'
    },

    // ⭐ METADATA
    pdfReportUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'URL del PDF generado con el reporte de cierre'
    },

    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'IP desde donde se abrió el turno'
    }

  }, {
    tableName: 'ReceptionShifts',
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['openedAt']
      },
      {
        // ⭐ ÍNDICE ÚNICO: Previene múltiples turnos abiertos por usuario
        unique: true,
        fields: ['userId', 'status'],
        where: {
          status: 'open'
        },
        name: 'unique_open_shift_per_user'
      }
    ]
  });

  return ReceptionShift;
};
