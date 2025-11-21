#!/usr/bin/env node

/**
 * Script para ejecutar la migración de eliminación de estados Limpia y Para Limpiar
 * 
 * Uso: node scripts/run-remove-limpia-migration.js
 */

const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

// Configuración de la base de datos
const sequelize = new Sequelize(
  process.env.DB_NAME || 'BaluHotel',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || '7754',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: console.log,
    dialectOptions: {
      ssl: process.env.DB_HOST !== 'localhost' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    }
  }
);

async function runMigration() {
  try {
    console.log('🔗 Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión establecida\n');

    // Importar la migración
    const migration = require('../migrations/20251121-remove-limpia-para-limpiar-states');
    
    console.log('📊 Estado ANTES de la migración:');
    const [beforeStats] = await sequelize.query(
      'SELECT status, COUNT(*) as count FROM "Rooms" WHERE status IS NOT NULL GROUP BY status;'
    );
    console.table(beforeStats);
    
    const [nullCount] = await sequelize.query(
      'SELECT COUNT(*) as count FROM "Rooms" WHERE status IS NULL;'
    );
    console.log(`Habitaciones con status NULL: ${nullCount[0].count}\n`);

    // Confirmar antes de ejecutar
    console.log('⚠️  ADVERTENCIA: Esta migración eliminará los estados "Limpia" y "Para Limpiar"');
    console.log('⚠️  Todas las habitaciones con estos estados quedarán disponibles (NULL)\n');

    // En producción, agregar confirmación manual aquí
    if (process.env.NODE_ENV === 'production') {
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise(resolve => {
        rl.question('¿Desea continuar? (escriba "SI" para confirmar): ', resolve);
      });
      rl.close();

      if (answer !== 'SI') {
        console.log('❌ Migración cancelada');
        process.exit(0);
      }
    }

    console.log('\n🚀 Ejecutando migración UP...');
    await migration.up(sequelize.getQueryInterface(), Sequelize);
    
    console.log('\n📊 Estado DESPUÉS de la migración:');
    const [afterStats] = await sequelize.query(
      'SELECT status, COUNT(*) as count FROM "Rooms" GROUP BY status ORDER BY count DESC;'
    );
    console.table(afterStats);

    console.log('\n✅ Migración completada exitosamente!');
    console.log('\n📋 Resumen:');
    console.log('- Estados eliminados: "Limpia", "Para Limpiar"');
    console.log('- Estados actuales: NULL (Disponible), Ocupada, Mantenimiento, Reservada');
    console.log('- Habitaciones con estos estados antiguos ahora tienen status = NULL');

  } catch (error) {
    console.error('\n❌ Error durante la migración:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar
runMigration();
