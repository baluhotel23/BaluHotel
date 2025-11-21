/**
 * Script para forzar check-out de reservas específicas
 * Uso: node scripts/force-checkout-bookings.js
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');
const { DateTime } = require('luxon');

// ⭐ CONEXIÓN DIRECTA A PRODUCCIÓN
const PRODUCTION_DB_URL = 'postgresql://postgres:QSwYCDumogbbHCXfMKQIyCXOlKuljZSM@yamabiko.proxy.rlwy.net:35806/railway';

console.log('🔧 [FORCE-CHECKOUT] Conectando a PRODUCCIÓN en Railway...');

// ⭐ Crear instancia de Sequelize para PRODUCCIÓN
const sequelize = new Sequelize(PRODUCTION_DB_URL, {
  dialect: 'postgres',
  logging: console.log,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

async function forceCheckout() {
  try {
    console.log('🚀 [FORCE-CHECKOUT] Iniciando script...');
    
    // ⭐ VERIFICAR CONEXIÓN
    await sequelize.authenticate();
    console.log('✅ [FORCE-CHECKOUT] Conexión a base de datos establecida');

    const bookingIds = [92, 93, 94];
    const now = DateTime.now().setZone('America/Bogota');

    console.log(`\n📋 [FORCE-CHECKOUT] Reservas a procesar: ${bookingIds.join(', ')}`);
    console.log(`⏰ [FORCE-CHECKOUT] Fecha/Hora de checkout: ${now.toISO()}\n`);

    // ⭐ OBTENER INFORMACIÓN ACTUAL DE LAS RESERVAS
    for (const bookingId of bookingIds) {
      console.log(`\n🔍 [BOOKING ${bookingId}] Consultando estado actual...`);
      
      const [booking] = await sequelize.query(`
        SELECT 
          "bookingId",
          "roomNumber",
          status,
          "checkIn",
          "checkOut",
          "actualCheckIn",
          "actualCheckOut"
        FROM "Bookings"
        WHERE "bookingId" = :bookingId
      `, {
        replacements: { bookingId }
      });

      if (booking.length === 0) {
        console.log(`❌ [BOOKING ${bookingId}] No encontrada`);
        continue;
      }

      const b = booking[0];
      console.log(`📊 [BOOKING ${bookingId}] Estado actual:`, {
        roomNumber: b.roomNumber,
        status: b.status,
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        actualCheckIn: b.actualCheckIn,
        actualCheckOut: b.actualCheckOut
      });

      // ⭐ FORZAR CHECK-IN PRIMERO (si no se ha hecho)
      if (!b.actualCheckIn) {
        console.log(`🔄 [BOOKING ${bookingId}] Registrando check-in primero...`);
        
        await sequelize.query(`
          UPDATE "Bookings"
          SET 
            status = 'checked-in',
            "actualCheckIn" = :checkInTime,
            "updatedAt" = NOW()
          WHERE "bookingId" = :bookingId
        `, {
          replacements: { 
            bookingId,
            checkInTime: now.toJSDate()
          }
        });

        console.log(`✅ [BOOKING ${bookingId}] Check-in registrado`);
      }

      // ⭐ AHORA FORZAR CHECK-OUT
      console.log(`🔄 [BOOKING ${bookingId}] Forzando check-out...`);
      
      await sequelize.query(`
        UPDATE "Bookings"
        SET 
          status = 'completed',
          "actualCheckOut" = :checkoutTime,
          "updatedAt" = NOW()
        WHERE "bookingId" = :bookingId
      `, {
        replacements: { 
          bookingId,
          checkoutTime: now.toJSDate()
        }
      });

      console.log(`✅ [BOOKING ${bookingId}] Check-out forzado exitosamente (status = 'completed')`);

      // ⭐ LIBERAR HABITACIÓN
      if (b.roomNumber) {
        console.log(`🔓 [BOOKING ${bookingId}] Liberando habitación ${b.roomNumber}...`);
        
        await sequelize.query(`
          UPDATE "Rooms"
          SET 
            status = NULL,
            "updatedAt" = NOW()
          WHERE "roomNumber" = :roomNumber
        `, {
          replacements: { roomNumber: b.roomNumber }
        });

        console.log(`✅ [BOOKING ${bookingId}] Habitación ${b.roomNumber} liberada (status = NULL = Disponible)`);
      }
    }

    console.log('\n✅ [FORCE-CHECKOUT] Proceso completado exitosamente');
    console.log('\n📊 [FORCE-CHECKOUT] Verificando resultados finales...\n');

    // ⭐ VERIFICAR RESULTADOS
    for (const bookingId of bookingIds) {
      const [booking] = await sequelize.query(`
        SELECT 
          b."bookingId",
          b."roomNumber",
          b.status as booking_status,
          b."actualCheckOut",
          r.status as room_status
        FROM "Bookings" b
        LEFT JOIN "Rooms" r ON r."roomNumber" = b."roomNumber"
        WHERE b."bookingId" = :bookingId
      `, {
        replacements: { bookingId }
      });

      if (booking.length > 0) {
        console.log(`📊 [BOOKING ${bookingId}] Estado final:`, {
          roomNumber: booking[0].roomNumber,
          bookingStatus: booking[0].booking_status,
          roomStatus: booking[0].room_status || 'NULL (Disponible)',
          actualCheckOut: booking[0].actualCheckOut
        });
      }
    }

    await sequelize.close();
    console.log('\n👋 [FORCE-CHECKOUT] Conexión cerrada');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ [FORCE-CHECKOUT] Error:', error);
    await sequelize.close();
    process.exit(1);
  }
}

forceCheckout();
