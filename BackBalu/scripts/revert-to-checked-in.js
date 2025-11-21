/**
 * Script para cambiar reservas completed a checked-in
 * Para que aparezcan en la vista de CheckOut
 * Uso: node scripts/revert-to-checked-in.js
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');
const { DateTime } = require('luxon');

// ⭐ CONEXIÓN DIRECTA A PRODUCCIÓN
const PRODUCTION_DB_URL = 'postgresql://postgres:QSwYCDumogbbHCXfMKQIyCXOlKuljZSM@yamabiko.proxy.rlwy.net:35806/railway';

console.log('🔧 [REVERT-TO-CHECKED-IN] Conectando a PRODUCCIÓN en Railway...');

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

async function revertToCheckedIn() {
  try {
    console.log('🚀 [REVERT] Iniciando script...');
    
    await sequelize.authenticate();
    console.log('✅ [REVERT] Conexión establecida\n');

    const bookingIds = [92, 93, 94];
    const now = DateTime.now().setZone('America/Bogota');

    for (const bookingId of bookingIds) {
      console.log(`\n🔄 [BOOKING ${bookingId}] Procesando...`);
      
      // Verificar estado actual
      const [booking] = await sequelize.query(`
        SELECT "bookingId", "roomNumber", status, "actualCheckIn", "actualCheckOut"
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
        status: b.status,
        actualCheckIn: b.actualCheckIn,
        actualCheckOut: b.actualCheckOut
      });

      // Cambiar a checked-in
      await sequelize.query(`
        UPDATE "Bookings"
        SET 
          status = 'checked-in',
          "actualCheckIn" = COALESCE("actualCheckIn", :checkInTime),
          "actualCheckOut" = NULL,
          "updatedAt" = NOW()
        WHERE "bookingId" = :bookingId
      `, {
        replacements: { 
          bookingId,
          checkInTime: now.toJSDate()
        }
      });

      console.log(`✅ [BOOKING ${bookingId}] Cambiado a checked-in`);

      // Cambiar habitación a Ocupada
      if (b.roomNumber) {
        await sequelize.query(`
          UPDATE "Rooms"
          SET 
            status = 'Ocupada',
            "updatedAt" = NOW()
          WHERE "roomNumber" = :roomNumber
        `, {
          replacements: { roomNumber: b.roomNumber }
        });

        console.log(`✅ [BOOKING ${bookingId}] Habitación ${b.roomNumber} marcada como Ocupada`);
      }
    }

    console.log('\n✅ [REVERT] Proceso completado\n');

    // Verificar resultados
    console.log('📊 [REVERT] Verificando resultados:\n');
    
    for (const bookingId of bookingIds) {
      const [booking] = await sequelize.query(`
        SELECT 
          b."bookingId",
          b."roomNumber",
          b.status as booking_status,
          b."actualCheckIn",
          b."actualCheckOut",
          r.status as room_status
        FROM "Bookings" b
        LEFT JOIN "Rooms" r ON r."roomNumber" = b."roomNumber"
        WHERE b."bookingId" = :bookingId
      `, {
        replacements: { bookingId }
      });

      if (booking.length > 0) {
        const roomStatusText = booking[0].room_status === null ? 'Disponible' : booking[0].room_status;
        console.log(`📋 BOOKING ${bookingId}:`, {
          room: booking[0].roomNumber,
          bookingStatus: booking[0].booking_status,
          roomStatus: roomStatusText,
          actualCheckIn: booking[0].actualCheckIn,
          actualCheckOut: booking[0].actualCheckOut
        });
      }
    }

    await sequelize.close();
    console.log('\n👋 [REVERT] Conexión cerrada');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ [REVERT] Error:', error);
    await sequelize.close();
    process.exit(1);
  }
}

revertToCheckedIn();
