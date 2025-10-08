'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // ⭐ 1. CREAR TABLA RECEPTIONSHIFTS
    await queryInterface.createTable('ReceptionShifts', {
      shiftId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      userId: {
        type: Sequelize.STRING, // ⭐ User.n_document es STRING
        allowNull: false,
        references: {
          model: 'Users',
          key: 'n_document' // ⭐ PK correcta de Users
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      openedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      closedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('open', 'closed'),
        defaultValue: 'open',
        allowNull: false
      },
      openingCash: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
        allowNull: false
      },
      closingCash: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      totalCashSales: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      totalCardSales: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      totalTransferSales: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      totalSales: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      totalTransactions: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      cashTransactions: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      cardTransactions: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      transferTransactions: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      expectedCash: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      cashDifference: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      openingNotes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      closingNotes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      checkInsProcessed: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      checkOutsProcessed: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      bookingsCreated: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      pdfReportUrl: {
        type: Sequelize.STRING,
        allowNull: true
      },
      ipAddress: {
        type: Sequelize.STRING,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // ⭐ 2. AGREGAR ÍNDICES
    await queryInterface.addIndex('ReceptionShifts', ['userId']);
    await queryInterface.addIndex('ReceptionShifts', ['status']);
    await queryInterface.addIndex('ReceptionShifts', ['openedAt']);

    // ⭐ 3. AGREGAR COLUMNA shiftId A PAYMENTS
    await queryInterface.addColumn('Payments', 'shiftId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'ReceptionShifts',
        key: 'shiftId'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // ⭐ 4. AGREGAR ÍNDICE EN PAYMENTS
    await queryInterface.addIndex('Payments', ['shiftId']);

    console.log('✅ Migración completada: Tabla ReceptionShifts creada y columna shiftId agregada a Payments');
  },

  down: async (queryInterface, Sequelize) => {
    // ⭐ REVERTIR CAMBIOS EN ORDEN INVERSO

    // 1. Eliminar índice de shiftId en Payments
    await queryInterface.removeIndex('Payments', ['shiftId']);

    // 2. Eliminar columna shiftId de Payments
    await queryInterface.removeColumn('Payments', 'shiftId');

    // 3. Eliminar índices de ReceptionShifts
    await queryInterface.removeIndex('ReceptionShifts', ['userId']);
    await queryInterface.removeIndex('ReceptionShifts', ['status']);
    await queryInterface.removeIndex('ReceptionShifts', ['openedAt']);

    // 4. Eliminar tabla ReceptionShifts
    await queryInterface.dropTable('ReceptionShifts');

    console.log('✅ Rollback completado: Tabla ReceptionShifts eliminada y columna shiftId removida de Payments');
  }
};
