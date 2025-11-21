'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔒 [MIGRATION] Agregando índice único para prevenir múltiples turnos abiertos por usuario...');
    
    try {
      // ⭐ AGREGAR ÍNDICE ÚNICO COMPUESTO
      // Esto garantiza que un usuario no pueda tener más de un turno con status='open'
      await queryInterface.addIndex('ReceptionShifts', ['userId', 'status'], {
        unique: true,
        name: 'unique_open_shift_per_user',
        where: {
          status: 'open'
        }
      });

      console.log('✅ [MIGRATION] Índice único agregado exitosamente');
    } catch (error) {
      console.error('❌ [MIGRATION] Error al agregar índice único:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🔓 [MIGRATION] Eliminando índice único de turnos...');
    
    try {
      await queryInterface.removeIndex('ReceptionShifts', 'unique_open_shift_per_user');
      console.log('✅ [MIGRATION] Índice único eliminado');
    } catch (error) {
      console.error('❌ [MIGRATION] Error al eliminar índice:', error);
      throw error;
    }
  }
};
