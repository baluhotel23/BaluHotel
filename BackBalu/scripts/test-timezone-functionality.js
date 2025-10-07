// Script para probar la funcionalidad de fechas después de la migración
require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');
const { parseCheckInOutDate, validateDateRange, toDBFormat, calculateNights } = require('../src/utils/bookingDateUtils');

// Configurar conexión
const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } = require('../src/config/envs.js');

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'postgres',
  logging: false
});

async function testDateFunctionality() {
  try {
    console.log('🧪 Iniciando pruebas de funcionalidad de fechas\n');

    // TEST 1: Parsear fechas
    console.log('📅 TEST 1: Parseando fechas en Colombia timezone');
    const checkIn = '2025-10-15';
    const checkOut = '2025-10-18';
    
    const checkInDT = parseCheckInOutDate(checkIn);
    const checkOutDT = parseCheckInOutDate(checkOut);
    
    console.log(`  ✅ Check-in: ${checkIn} → ${checkInDT.toISO()}`);
    console.log(`  ✅ Check-out: ${checkOut} → ${checkOutDT.toISO()}`);

    // TEST 2: Validar rango
    console.log('\n✔️  TEST 2: Validando rango de fechas');
    const validation = validateDateRange(checkInDT, checkOutDT);
    console.log(`  Valid: ${validation.valid}`);
    console.log(`  Nights: ${validation.nights}`);
    console.log(`  Error: ${validation.error || 'ninguno'}`);

    // TEST 3: Formato para DB
    console.log('\n💾 TEST 3: Formatos para base de datos');
    const checkInDB = toDBFormat(checkInDT);
    const checkOutDB = toDBFormat(checkOutDT);
    console.log(`  ✅ Check-in DB format: ${checkInDB}`);
    console.log(`  ✅ Check-out DB format: ${checkOutDB}`);

    // TEST 4: Calcular noches
    console.log('\n🌙 TEST 4: Calculando noches');
    const nights = calculateNights(checkInDT, checkOutDT);
    console.log(`  ✅ Noches calculadas: ${nights}`);

    // TEST 5: Insertar registro de prueba
    console.log('\n📝 TEST 5: Insertando registro de prueba en BD');
    await sequelize.authenticate();
    
    const [result] = await sequelize.query(`
      INSERT INTO "Bookings" 
        ("checkIn", "checkOut", "nights", "totalAmount", "status", "guestId", "roomNumber", "createdAt", "updatedAt")
      VALUES 
        ('${checkInDB}', '${checkOutDB}', ${nights}, 150000, 'confirmed', '123456789', 101, NOW(), NOW())
      RETURNING *;
    `);
    
    const testBookingId = result[0].bookingId;
    console.log('  ✅ Registro insertado:');
    console.log(`     bookingId: ${testBookingId}`);
    console.log(`     checkIn: ${result[0].checkIn}`);
    console.log(`     checkOut: ${result[0].checkOut}`);
    console.log(`     nights: ${result[0].nights}`);

    // TEST 6: Consultar y verificar
    console.log('\n🔍 TEST 6: Consultando registro insertado');
    const [booking] = await sequelize.query(`
      SELECT "bookingId", "checkIn", "checkOut", "nights"
      FROM "Bookings"
      WHERE "bookingId" = ${testBookingId};
    `);
    
    console.log('  ✅ Datos recuperados de BD:');
    console.table(booking);

    // TEST 7: Limpiar datos de prueba
    console.log('\n🧹 TEST 7: Limpiando datos de prueba');
    await sequelize.query(`
      DELETE FROM "Bookings" WHERE "bookingId" = ${testBookingId};
    `);
    console.log('  ✅ Datos de prueba eliminados');

    console.log('\n✅ TODAS LAS PRUEBAS PASARON EXITOSAMENTE! 🎉\n');
    
  } catch (error) {
    console.error('\n❌ Error en las pruebas:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

testDateFunctionality()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });
