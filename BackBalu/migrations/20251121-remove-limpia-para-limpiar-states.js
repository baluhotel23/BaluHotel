'use strict';

/**
 * MIGRACIÓN: Eliminar estados "Limpia" y "Para Limpiar"
 * 
 * Esta migración simplifica los estados de habitaciones eliminando
 * "Limpia" y "Para Limpiar", dejando solo:
 * - Ocupada
 * - Mantenimiento  
 * - Reservada
 * 
 * Las habitaciones con "Limpia" o "Para Limpiar" se convertirán a NULL
 * (estado por defecto = disponible)
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔄 [MIGRATION] Iniciando eliminación de estados Limpia y Para Limpiar...');

      // 1. Ver distribución actual de estados
      const [currentStates] = await queryInterface.sequelize.query(
        'SELECT status, COUNT(*) as count FROM "Rooms" GROUP BY status;',
        { transaction }
      );
      console.log('📊 Estados actuales:', currentStates);

      // 2. Actualizar habitaciones con "Limpia" o "Para Limpiar" a NULL
      await queryInterface.sequelize.query(
        `UPDATE "Rooms" 
         SET status = NULL, available = true
         WHERE status IN ('Limpia', 'Para Limpiar');`,
        { transaction }
      );

      console.log('✅ Habitaciones actualizadas');

      // 3. Eliminar el tipo ENUM antiguo y crear uno nuevo
      // Primero, cambiar temporalmente la columna a VARCHAR
      await queryInterface.changeColumn('Rooms', 'status', {
        type: Sequelize.STRING,
        allowNull: true
      }, { transaction });

      console.log('✅ Columna convertida a VARCHAR temporalmente');

      // 4. Eliminar el ENUM antiguo
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_Rooms_status";',
        { transaction }
      );

      console.log('✅ ENUM antiguo eliminado');

      // 5. Crear nuevo ENUM solo con los 3 estados necesarios
      await queryInterface.sequelize.query(
        `CREATE TYPE "enum_Rooms_status" AS ENUM ('Ocupada', 'Mantenimiento', 'Reservada');`,
        { transaction }
      );

      console.log('✅ Nuevo ENUM creado');

      // 6. Cambiar la columna al nuevo ENUM (permitiendo NULL)
      await queryInterface.sequelize.query(
        `ALTER TABLE "Rooms" 
         ALTER COLUMN status TYPE "enum_Rooms_status" 
         USING CASE 
           WHEN status IN ('Ocupada', 'Mantenimiento', 'Reservada') 
           THEN status::"enum_Rooms_status"
           ELSE NULL 
         END;`,
        { transaction }
      );

      console.log('✅ Columna convertida al nuevo ENUM');

      // 7. Actualizar default value (NULL = disponible)
      await queryInterface.sequelize.query(
        `ALTER TABLE "Rooms" ALTER COLUMN status SET DEFAULT NULL;`,
        { transaction }
      );

      console.log('✅ Default value actualizado a NULL');

      // 8. Ver resultado final
      const [finalStates] = await queryInterface.sequelize.query(
        'SELECT status, COUNT(*) as count FROM "Rooms" GROUP BY status ORDER BY count DESC;',
        { transaction }
      );
      console.log('📊 Estados finales:', finalStates);

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
      console.log('🔄 [MIGRATION] Revirtiendo eliminación de estados...');

      // 1. Cambiar columna a VARCHAR
      await queryInterface.changeColumn('Rooms', 'status', {
        type: Sequelize.STRING,
        allowNull: true
      }, { transaction });

      // 2. Eliminar ENUM actual
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_Rooms_status";',
        { transaction }
      );

      // 3. Recrear ENUM con todos los estados
      await queryInterface.sequelize.query(
        `CREATE TYPE "enum_Rooms_status" AS ENUM ('Limpia', 'Ocupada', 'Mantenimiento', 'Reservada', 'Para Limpiar');`,
        { transaction }
      );

      // 4. Reconvertir columna al ENUM original
      await queryInterface.sequelize.query(
        `ALTER TABLE "Rooms" 
         ALTER COLUMN status TYPE "enum_Rooms_status" 
         USING CASE 
           WHEN status IN ('Ocupada', 'Mantenimiento', 'Reservada') 
           THEN status::"enum_Rooms_status"
           ELSE 'Para Limpiar'::"enum_Rooms_status"
         END;`,
        { transaction }
      );

      // 5. Restaurar default value
      await queryInterface.sequelize.query(
        `ALTER TABLE "Rooms" ALTER COLUMN status SET DEFAULT 'Para Limpiar';`,
        { transaction }
      );

      await transaction.commit();
      console.log('✅ [MIGRATION] Reversión completada');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ [MIGRATION] Error en reversión:', error);
      throw error;
    }
  }
};
