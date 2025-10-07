/**
 * MIGRACIÓN: Actualizar columnas de fecha en tabla Bookings
 * 
 * CAMBIOS:
 * 1. checkIn: DATE → DATEONLY (solo fecha, sin hora)
 * 2. checkOut: DATE → DATEONLY (solo fecha, sin hora)
 * 3. Agregar columna nights: INTEGER (número de noches)
 * 
 * IMPORTANTE: Esta migración convierte timestamps a fechas
 * Los datos existentes se preservan pero pierden la información de hora
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('📅 [MIGRATION] Iniciando migración de columnas de fecha...');

      // 1. Agregar columna temporal para nights
      console.log('➕ [MIGRATION] Agregando columna "nights"...');
      await queryInterface.addColumn('Bookings', 'nights', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Número de noches de la reserva'
      }, { transaction });

          // 2️⃣ Calcular y guardar el número de noches para registros existentes
    console.log('🔢 [MIGRATION] Calculando noches para reservas existentes...');
    await queryInterface.sequelize.query(`
      UPDATE "Bookings"
        SET "nights" = ("checkOut"::date - "checkIn"::date)
        WHERE "nights" IS NULL;
    `, { transaction });

      // 3. Cambiar tipo de checkIn a DATEONLY
      console.log('🔄 [MIGRATION] Convirtiendo checkIn a DATEONLY...');
      await queryInterface.changeColumn('Bookings', 'checkIn', {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Fecha de check-in (solo fecha, sin hora específica)'
      }, { transaction });

      // 4. Cambiar tipo de checkOut a DATEONLY
      console.log('🔄 [MIGRATION] Convirtiendo checkOut a DATEONLY...');
      await queryInterface.changeColumn('Bookings', 'checkOut', {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Fecha de check-out (solo fecha, sin hora específica)'
      }, { transaction });

      await transaction.commit();
      console.log('✅ [MIGRATION] Migración completada exitosamente');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ [MIGRATION] Error en migración:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('⏪ [MIGRATION] Revirtiendo migración de columnas de fecha...');

      // 1. Revertir checkIn a DATE
      console.log('🔄 [MIGRATION] Revirtiendo checkIn a DATE...');
      await queryInterface.changeColumn('Bookings', 'checkIn', {
        type: Sequelize.DATE,
        allowNull: false
      }, { transaction });

      // 2. Revertir checkOut a DATE
      console.log('🔄 [MIGRATION] Revirtiendo checkOut a DATE...');
      await queryInterface.changeColumn('Bookings', 'checkOut', {
        type: Sequelize.DATE,
        allowNull: false
      }, { transaction });

      // 3. Eliminar columna nights
      console.log('➖ [MIGRATION] Eliminando columna "nights"...');
      await queryInterface.removeColumn('Bookings', 'nights', { transaction });

      await transaction.commit();
      console.log('✅ [MIGRATION] Reversión completada exitosamente');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ [MIGRATION] Error en reversión:', error);
      throw error;
    }
  }
};
