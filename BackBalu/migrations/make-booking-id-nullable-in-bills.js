'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔧 Iniciando migración: Hacer bookingId nullable en Bills...');
      
      // 1. Hacer bookingId nullable
      await queryInterface.changeColumn('Bills', 'bookingId', {
        type: Sequelize.INTEGER,
        allowNull: true, // ✅ PERMITIR NULL
        references: {
          model: 'Bookings',
          key: 'bookingId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      }, { transaction });

      // 2. Añadir nuevas columnas para facturas manuales
      console.log('📝 Añadiendo columnas para facturas manuales...');
      
      await queryInterface.addColumn('Bills', 'billType', {
        type: Sequelize.STRING,
        defaultValue: 'booking',
        allowNull: false,
      }, { transaction });

      await queryInterface.addColumn('Bills', 'buyerId', {
        type: Sequelize.STRING,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('Bills', 'sellerId', {
        type: Sequelize.STRING,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('Bills', 'notes', {
        type: Sequelize.TEXT,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('Bills', 'qrCode', {
        type: Sequelize.TEXT,
        allowNull: true,
      }, { transaction });

      // 3. Crear índices
      console.log('📋 Creando índices...');
      
      await queryInterface.addIndex('Bills', ['billType'], { 
        name: 'bills_bill_type_idx',
        transaction 
      });
      
      await queryInterface.addIndex('Bills', ['buyerId'], { 
        name: 'bills_buyer_id_idx',
        transaction 
      });

      console.log('✅ Migración completada exitosamente');
      await transaction.commit();
    } catch (error) {
      console.error('❌ Error en migración:', error);
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔄 Revirtiendo migración...');
      
      // Eliminar índices
      await queryInterface.removeIndex('Bills', 'bills_buyer_id_idx', { transaction });
      await queryInterface.removeIndex('Bills', 'bills_bill_type_idx', { transaction });
      
      // Eliminar columnas
      await queryInterface.removeColumn('Bills', 'qrCode', { transaction });
      await queryInterface.removeColumn('Bills', 'notes', { transaction });
      await queryInterface.removeColumn('Bills', 'sellerId', { transaction });
      await queryInterface.removeColumn('Bills', 'buyerId', { transaction });
      await queryInterface.removeColumn('Bills', 'billType', { transaction });

      // Hacer bookingId NOT NULL de nuevo
      await queryInterface.changeColumn('Bills', 'bookingId', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Bookings',
          key: 'bookingId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      }, { transaction });

      await transaction.commit();
      console.log('✅ Migración revertida exitosamente');
    } catch (error) {
      console.error('❌ Error revirtiendo migración:', error);
      await transaction.rollback();
      throw error;
    }
  }
};