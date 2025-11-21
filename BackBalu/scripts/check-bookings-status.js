/**
 * Script para verificar estado de reservas en producción
 * Uso: node scripts/check-bookings-status.js
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

// ⭐ CONEXIÓN DIRECTA A PRODUCCIÓN
const PRODUCTION_DB_URL = 'postgresql://postgres:QSwYCDumogbbHCXfMKQIyCXOlKuljZSM@yamabiko.proxy.rlwy.net:35806/railway';

console.log('🔧 [CHECK-STATUS] Conectando a PRODUCCIÓN en Railway...\n');

const sequelize = new Sequelize(PRODUCTION_DB_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

async function checkStatus() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión establecida\n');

    const bookingIds = process.argv[2] ? [parseInt(process.argv[2])] : [92, 93, 94];

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                    ESTADO DE RESERVAS                         ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    for (const bookingId of bookingIds) {
      const [results] = await sequelize.query(`
        SELECT 
          b."bookingId",
          b."roomNumber",
          b.status,
          b."checkIn",
          b."checkOut",
          b."actualCheckIn",
          b."actualCheckOut",
          b."createdAt",
          b."updatedAt",
          b."guestId",
          b."totalAmount",
          r.status as room_status
        FROM "Bookings" b
        LEFT JOIN "Rooms" r ON r."roomNumber" = b."roomNumber"
        WHERE b."bookingId" = :bookingId
      `, {
        replacements: { bookingId }
      });

      if (results.length === 0) {
        console.log(`❌ BOOKING ${bookingId}: NO ENCONTRADA\n`);
        continue;
      }

      const b = results[0];
      const roomStatusText = b.room_status === null ? 'Disponible' : b.room_status;
      
      console.log(`📋 BOOKING ${bookingId}:`);
      console.log(`   Habitación: ${b.roomNumber}`);
      console.log(`   Estado Reserva: ${b.status}`);
      console.log(`   Estado Habitación: ${roomStatusText}`);
      console.log(`   Check-in Programado: ${b.checkIn}`);
      console.log(`   Check-out Programado: ${b.checkOut}`);
      console.log(`   Check-in Real: ${b.actualCheckIn || 'No realizado'}`);
      console.log(`   Check-out Real: ${b.actualCheckOut || 'No realizado'}`);
      console.log(`   Huésped ID: ${b.guestId || 'N/A'}`);
      console.log(`   Total: $${b.totalAmount || 0}`);
      console.log(`   Creada: ${b.createdAt}`);
      console.log(`   Actualizada: ${b.updatedAt}`);
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════════════\n');

    // ⭐ VERIFICAR SI HAY PAGOS ASOCIADOS
    console.log('💰 PAGOS ASOCIADOS:\n');
    
    for (const bookingId of bookingIds) {
      const [payments] = await sequelize.query(`
        SELECT 
          "paymentId",
          "bookingId",
          amount,
          "paymentMethod",
          "paymentStatus",
          "createdAt"
        FROM "Payments"
        WHERE "bookingId" = :bookingId
        ORDER BY "createdAt" DESC
      `, {
        replacements: { bookingId }
      });

      if (payments.length > 0) {
        console.log(`📋 BOOKING ${bookingId} - ${payments.length} pago(s):`);
        payments.forEach(p => {
          console.log(`   - Payment ${p.paymentId}: $${p.amount} (${p.paymentMethod}) - ${p.paymentStatus}`);
        });
      } else {
        console.log(`📋 BOOKING ${bookingId}: Sin pagos registrados`);
      }
      console.log('');
    }

    await sequelize.close();
    console.log('👋 Conexión cerrada');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    await sequelize.close();
    process.exit(1);
  }
}

checkStatus();
