// Script para ejecutar manualmente la migración de timezone
require('dotenv').config();
const { Sequelize } = require('sequelize');

// Importar la migración
const migration = require('../migrations/20251006-update-booking-date-columns.js');

// Configurar conexión a la base de datos
const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } = require('../src/config/envs.js');

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'postgres',
  logging: console.log
});

async function runMigration() {
  try {
    console.log('🔄 Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión establecida exitosamente');

    console.log('\n🔄 Ejecutando migración de timezone...');
    const queryInterface = sequelize.getQueryInterface();
    
    await migration.up(queryInterface, Sequelize);
    
    console.log('✅ Migración ejecutada exitosamente!');
    
    // Verificar los cambios
    console.log('\n🔍 Verificando cambios en la tabla Bookings...');
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'Bookings'
      AND column_name IN ('checkIn', 'checkOut', 'nights')
      ORDER BY column_name;
    `);
    
    console.log('\n📊 Estructura de columnas actualizada:');
    console.table(results);
    
    // Verificar datos existentes
    console.log('\n🔍 Verificando cálculo de noches en registros existentes...');
    const [bookings] = await sequelize.query(`
      SELECT "bookingId", "checkIn", "checkOut", nights
      FROM "Bookings"
      LIMIT 5;
    `);
    
    console.log('\n📊 Primeras 5 reservas con noches calculadas:');
    console.table(bookings);
    
  } catch (error) {
    console.error('\n❌ Error ejecutando migración:', error);
    throw error;
  } finally {
    await sequelize.close();
    console.log('\n🔌 Conexión cerrada');
  }
}

runMigration()
  .then(() => {
    console.log('\n✅ Proceso completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error en el proceso:', error.message);
    process.exit(1);
  });
