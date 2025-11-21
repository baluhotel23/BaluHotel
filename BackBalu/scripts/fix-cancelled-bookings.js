require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('postgresql://postgres:QSwYCDumogbbHCXfMKQIyCXOlKuljZSM@yamabiko.proxy.rlwy.net:35806/railway', {
  dialect: 'postgres',
  logging: false
});

async function fixProblematicBookings() {
  try {
    console.log('🔍 Conectando a Railway...');
    await sequelize.authenticate();
    console.log('✅ Conectado a Railway\n');

    // Buscar reservas "cancelled" que tienen pagos completos
    const [problematicBookings] = await sequelize.query(`
      SELECT 
        b."bookingId",
        b."roomNumber",
        b."status",
        b."totalAmount",
        b."checkIn",
        b."checkOut",
        b."actualCheckIn",
        b."actualCheckOut",
        b."paymentCompletedAt",
        COALESCE(SUM(p."amount"), 0) as "totalPaid"
      FROM "Bookings" b
      LEFT JOIN "Payments" p ON b."bookingId" = p."bookingId" 
        AND p."paymentStatus" IN ('authorized', 'completed')
      WHERE b."status" = 'cancelled'
      GROUP BY b."bookingId"
      HAVING COALESCE(SUM(p."amount"), 0) >= b."totalAmount"
      ORDER BY b."bookingId" ASC
    `);

    if (problematicBookings.length === 0) {
      console.log('✅ No se encontraron reservas problemáticas');
      await sequelize.close();
      return;
    }

    console.log(`🔧 CORRIGIENDO ${problematicBookings.length} RESERVAS:\n`);
    console.log('================================================\n');

    for (const booking of problematicBookings) {
      console.log(`\n📋 Procesando Reserva #${booking.bookingId}:`);
      console.log(`   Habitación: ${booking.roomNumber}`);
      console.log(`   Status actual: ${booking.status}`);
      console.log(`   Monto: $${parseFloat(booking.totalAmount).toLocaleString()}`);
      console.log(`   Pagado: $${parseFloat(booking.totalPaid).toLocaleString()}`);

      // Determinar el nuevo status basado en las fechas
      const now = new Date();
      const checkInDate = new Date(booking.checkIn);
      const checkOutDate = new Date(booking.checkOut);
      
      let newStatus;
      let statusReason;

      if (booking.actualCheckOut) {
        // Ya hizo checkout
        newStatus = 'completed';
        statusReason = 'Corregido: Checkout completado con pago verificado';
      } else if (booking.actualCheckIn) {
        // Ya hizo check-in pero no checkout
        newStatus = 'checked-in';
        statusReason = 'Corregido: Check-in realizado con pago completo';
      } else if (now >= checkOutDate) {
        // Ya pasó la fecha de checkout y nunca hizo check-in
        newStatus = 'completed';
        statusReason = 'Corregido: Reserva vencida con pago completo';
      } else if (now >= checkInDate) {
        // Entre check-in y checkout, pero nunca hizo check-in
        newStatus = 'paid';
        statusReason = 'Corregido: Pago completo, listo para check-in';
      } else {
        // Antes del check-in
        newStatus = 'paid';
        statusReason = 'Corregido: Pago completo, pendiente check-in';
      }

      console.log(`   ➡️  Nuevo status: ${newStatus}`);
      console.log(`   Razón: ${statusReason}`);

      // Actualizar la reserva
      await sequelize.query(`
        UPDATE "Bookings"
        SET 
          "status" = :newStatus,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "bookingId" = :bookingId
      `, {
        replacements: {
          newStatus: newStatus,
          bookingId: booking.bookingId
        }
      });

      // Actualizar el estado de la habitación si es necesario
      if (newStatus === 'checked-in') {
        await sequelize.query(`
          UPDATE "Rooms"
          SET 
            "status" = 'Ocupada',
            "available" = false
          WHERE "roomNumber" = :roomNumber
        `, {
          replacements: { roomNumber: booking.roomNumber }
        });
        console.log(`   🏨 Habitación ${booking.roomNumber} marcada como Ocupada`);
      } else if (newStatus === 'completed') {
        await sequelize.query(`
          UPDATE "Rooms"
          SET 
            "status" = NULL,
            "available" = true
          WHERE "roomNumber" = :roomNumber
        `, {
          replacements: { roomNumber: booking.roomNumber }
        });
        console.log(`   🏨 Habitación ${booking.roomNumber} marcada como Disponible (NULL)`);
      } else if (newStatus === 'paid') {
        await sequelize.query(`
          UPDATE "Rooms"
          SET 
            "status" = 'Reservada',
            "available" = false
          WHERE "roomNumber" = :roomNumber
        `, {
          replacements: { roomNumber: booking.roomNumber }
        });
        console.log(`   🏨 Habitación ${booking.roomNumber} marcada como Reservada`);
      }

      console.log(`   ✅ Reserva #${booking.bookingId} corregida`);
    }

    console.log('\n\n📊 RESUMEN FINAL:');
    console.log('================================================');
    console.log(`✅ ${problematicBookings.length} reservas corregidas exitosamente`);
    console.log('\n💡 Las reservas ahora pueden:');
    console.log('   - Hacer check-in si están en estado "paid"');
    console.log('   - Hacer checkout si están en "checked-in"');
    console.log('   - Agregar y cobrar gastos extras');

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

fixProblematicBookings();
