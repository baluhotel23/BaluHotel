/**
 * Script para eliminar reserva de prueba
 * Uso: node scripts/delete-booking.js
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

// ⭐ CONEXIÓN DIRECTA A PRODUCCIÓN
const PRODUCTION_DB_URL = 'postgresql://postgres:QSwYCDumogbbHCXfMKQIyCXOlKuljZSM@yamabiko.proxy.rlwy.net:35806/railway';

console.log('🔧 [DELETE-BOOKING] Conectando a PRODUCCIÓN en Railway...');

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

async function deleteBooking() {
  try {
    console.log('🚀 [DELETE-BOOKING] Iniciando script...');
    
    await sequelize.authenticate();
    console.log('✅ [DELETE-BOOKING] Conexión establecida\n');

    // ⭐ OBTENER BOOKING ID DEL ARGUMENTO O USAR DEFAULT
    const bookingId = process.argv[2] ? parseInt(process.argv[2]) : null;
    
    if (!bookingId) {
      console.error('❌ [DELETE-BOOKING] Debes proporcionar un bookingId');
      console.log('\n💡 Uso: node scripts/delete-booking.js <bookingId>');
      console.log('   Ejemplo: node scripts/delete-booking.js 95\n');
      await sequelize.close();
      process.exit(1);
    }

    console.log(`🎯 [DELETE-BOOKING] BookingId a eliminar: ${bookingId}\n`);

    // ⭐ VERIFICAR QUE EXISTE Y OBTENER INFO
    console.log(`🔍 [DELETE-BOOKING] Verificando reserva ${bookingId}...`);
    
    const [booking] = await sequelize.query(`
      SELECT 
        "bookingId",
        "roomNumber",
        status,
        "guestId",
        "totalAmount"
      FROM "Bookings"
      WHERE "bookingId" = :bookingId
    `, {
      replacements: { bookingId }
    });

    if (booking.length === 0) {
      console.log(`❌ [DELETE-BOOKING] Reserva ${bookingId} no encontrada`);
      await sequelize.close();
      process.exit(0);
    }

    console.log(`📊 [DELETE-BOOKING] Reserva encontrada:`, booking[0]);

    // ⭐ ELIMINAR PAGOS ASOCIADOS
    console.log(`\n🗑️ [DELETE-BOOKING] Eliminando pagos asociados...`);
    
    const [payments] = await sequelize.query(`
      DELETE FROM "Payments"
      WHERE "bookingId" = :bookingId
      RETURNING "paymentId"
    `, {
      replacements: { bookingId }
    });

    console.log(`✅ [DELETE-BOOKING] ${payments.length} pago(s) eliminado(s)`);

    // ⭐ ELIMINAR CARGOS EXTRAS ASOCIADOS (si existen)
    console.log(`\n🗑️ [DELETE-BOOKING] Verificando cargos extras...`);
    
    try {
      const [extraCharges] = await sequelize.query(`
        DELETE FROM "ExtraCharges"
        WHERE "bookingId" = :bookingId
        RETURNING "extraChargeId"
      `, {
        replacements: { bookingId }
      });

      console.log(`✅ [DELETE-BOOKING] ${extraCharges.length} cargo(s) extra(s) eliminado(s)`);
    } catch (error) {
      console.log(`ℹ️ [DELETE-BOOKING] Sin cargos extras o tabla no existe`);
    }

    // ⭐ LIBERAR HABITACIÓN: Cambiar a NULL (Disponible) y available = true
    if (booking[0].roomNumber) {
      console.log(`\n🔓 [DELETE-BOOKING] Liberando habitación ${booking[0].roomNumber}...`);
      
      await sequelize.query(`
        UPDATE "Rooms"
        SET 
          status = NULL,
          available = true,
          "updatedAt" = NOW()
        WHERE "roomNumber" = :roomNumber
      `, {
        replacements: { roomNumber: booking[0].roomNumber }
      });

      // Verificar estado final
      const [roomAfter] = await sequelize.query(`
        SELECT "roomNumber", status, available 
        FROM "Rooms" 
        WHERE "roomNumber" = :roomNumber
      `, {
        replacements: { roomNumber: booking[0].roomNumber }
      });

      console.log(`✅ [DELETE-BOOKING] Habitación liberada:`, {
        roomNumber: roomAfter[0].roomNumber,
        status: roomAfter[0].status === null ? 'NULL (Disponible)' : roomAfter[0].status,
        available: roomAfter[0].available
      });
    }

    // ⭐ ELIMINAR LA RESERVA
    console.log(`\n🗑️ [DELETE-BOOKING] Eliminando reserva ${bookingId}...`);
    
    await sequelize.query(`
      DELETE FROM "Bookings"
      WHERE "bookingId" = :bookingId
    `, {
      replacements: { bookingId }
    });

    console.log(`✅ [DELETE-BOOKING] Reserva ${bookingId} eliminada exitosamente\n`);

    await sequelize.close();
    console.log('👋 [DELETE-BOOKING] Conexión cerrada');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ [DELETE-BOOKING] Error:', error);
    await sequelize.close();
    process.exit(1);
  }
}

deleteBooking();
