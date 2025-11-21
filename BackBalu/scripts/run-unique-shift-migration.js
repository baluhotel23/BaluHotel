/**
 * Script para ejecutar migración de índice único en turnos
 * Previene que un usuario tenga múltiples turnos abiertos simultáneamente
 * Uso: node scripts/run-unique-shift-migration.js
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');
const dbConfig = require('../src/config/config');

// ⭐ Determinar ambiente
const environment = process.env.NODE_ENV || 'development';
const config = dbConfig[environment];

console.log('🔧 [MIGRATION] Ambiente:', environment);

// ⭐ Crear instancia de Sequelize
let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    {
      host: config.host,
      port: config.port || 5432,
      dialect: config.dialect,
      logging: console.log,
      dialectOptions: config.dialectOptions
    }
  );
}

async function runMigration() {
  try {
    console.log('🚀 [MIGRATION] Iniciando script de migración...');
    
    // ⭐ VERIFICAR CONEXIÓN
    await sequelize.authenticate();
    console.log('✅ [MIGRATION] Conexión a base de datos establecida');

    // ⭐ VERIFICAR SI YA EXISTE EL ÍNDICE
    const [existingIndex] = await sequelize.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'ReceptionShifts' 
      AND indexname = 'unique_open_shift_per_user'
    `);

    if (existingIndex.length > 0) {
      console.log('⚠️ [MIGRATION] El índice ya existe. Saltando migración.');
      await sequelize.close();
      return;
    }

    // ⭐ VERIFICAR SI HAY TURNOS DUPLICADOS ANTES DE CREAR EL ÍNDICE
    console.log('🔍 [MIGRATION] Verificando turnos duplicados...');
    const [duplicates] = await sequelize.query(`
      SELECT "userId", COUNT(*) as count
      FROM "ReceptionShifts"
      WHERE status = 'open'
      GROUP BY "userId"
      HAVING COUNT(*) > 1
    `);

    if (duplicates.length > 0) {
      console.log('⚠️ [MIGRATION] Se encontraron usuarios con múltiples turnos abiertos:');
      duplicates.forEach(dup => {
        console.log(`   - Usuario ${dup.userId}: ${dup.count} turnos abiertos`);
      });

      console.log('🔄 [MIGRATION] Cerrando turnos duplicados automáticamente...');
      
      for (const dup of duplicates) {
        // Mantener solo el turno más reciente
        await sequelize.query(`
          UPDATE "ReceptionShifts"
          SET status = 'closed',
              "closedAt" = NOW(),
              "closingNotes" = 'Cerrado automáticamente por migración: turno duplicado'
          WHERE "userId" = :userId
          AND status = 'open'
          AND "shiftId" NOT IN (
            SELECT "shiftId"
            FROM "ReceptionShifts"
            WHERE "userId" = :userId
            AND status = 'open'
            ORDER BY "openedAt" DESC
            LIMIT 1
          )
        `, {
          replacements: { userId: dup.userId }
        });
      }

      console.log('✅ [MIGRATION] Turnos duplicados cerrados');
    }

    // ⭐ EJECUTAR MIGRACIÓN
    console.log('🔄 [MIGRATION] Cargando archivo de migración...');
    const migration = require('../migrations/20251121-add-unique-open-shift-constraint');

    console.log('🔄 [MIGRATION] Ejecutando UP migration...');
    await migration.up(sequelize.getQueryInterface(), Sequelize);

    console.log('✅ [MIGRATION] Migración completada exitosamente');

    // ⭐ VERIFICAR QUE EL ÍNDICE FUE CREADO
    const [verifyIndex] = await sequelize.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'ReceptionShifts' 
      AND indexname = 'unique_open_shift_per_user'
    `);

    if (verifyIndex.length > 0) {
      console.log('✅ [MIGRATION] Índice verificado correctamente en la base de datos');
    } else {
      console.log('⚠️ [MIGRATION] No se pudo verificar el índice');
    }

    await sequelize.close();
    console.log('👋 [MIGRATION] Conexión cerrada');
    process.exit(0);

  } catch (error) {
    console.error('❌ [MIGRATION] Error:', error);
    await sequelize.close();
    process.exit(1);
  }
}

runMigration();
