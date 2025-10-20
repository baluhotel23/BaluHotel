require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('postgresql://postgres:QSwYCDumogbbHCXfMKQIyCXOlKuljZSM@yamabiko.proxy.rlwy.net:35806/railway', {
  dialect: 'postgres',
  logging: false
});

async function fixCompletedToPaid() {
  try {
    console.log('🔍 Conectando a Railway...');
    await sequelize.authenticate();
    console.log('✅ Conectado a Railway\n');

    console.log('🔍 BUSCANDO RESERVAS "COMPLETED" SIN CHECKOUT:');
    console.log('================================================\n');
    
    // Buscar reservas "completed" que NO tienen actualCheckOut
    // Estas deberían estar en "paid" en lugar de "completed"
    const [problematicBookings] = await sequelize.query(`
      SELECT 
        b."bookingId",
        b."roomNumber",
        b."status",
        b."checkIn",
        b."checkOut",
        b."totalAmount",
        b."actualCheckIn",
        b."actualCheckOut",
        b."paymentCompletedAt",
        b."createdAt",
        g."scostumername" as "guestName",
        COALESCE(SUM(p."amount"), 0) as "totalPaid"
      FROM "Bookings" b
      LEFT JOIN "Buyers" g ON b."guestId" = g."sdocno"
      LEFT JOIN "Payments" p ON b."bookingId" = p."bookingId" 
        AND p."paymentStatus" IN ('authorized', 'completed')
      WHERE b."status" = 'completed'
        AND b."actualCheckOut" IS NULL  -- ⭐ NO tiene fecha de checkout real
      GROUP BY b."bookingId", g."scostumername"
      ORDER BY b."bookingId" ASC
    `);

    if (problematicBookings.length === 0) {
      console.log('✅ No se encontraron reservas "completed" sin checkout');
      await sequelize.close();
      return;
    }

    console.log(`⚠️ ENCONTRADAS ${problematicBookings.length} RESERVAS PROBLEMÁTICAS:\n`);

    problematicBookings.forEach((booking) => {
      const totalPaid = parseFloat(booking.totalPaid);
      const totalAmount = parseFloat(booking.totalAmount);
      const isFullyPaid = totalPaid >= totalAmount;
      
      console.log(`📋 Reserva #${booking.bookingId}:`);
      console.log(`   Habitación: ${booking.roomNumber}`);
      console.log(`   Huésped: ${booking.guestName || 'N/A'}`);
      console.log(`   Check-in: ${booking.checkIn ? new Date(booking.checkIn).toLocaleDateString() : 'N/A'}`);
      console.log(`   Check-out: ${booking.checkOut ? new Date(booking.checkOut).toLocaleDateString() : 'N/A'}`);
      console.log(`   Total: $${totalAmount.toLocaleString()}`);
      console.log(`   Pagado: $${totalPaid.toLocaleString()}`);
      console.log(`   ¿Pago completo?: ${isFullyPaid ? '✅ SÍ' : '❌ NO'}`);
      console.log(`   actualCheckIn: ${booking.actualCheckIn || 'NULL'}`);
      console.log(`   actualCheckOut: ${booking.actualCheckOut || 'NULL ⚠️'}`);
      console.log(`   Acción: ${isFullyPaid ? 'Cambiar a PAID' : 'Cambiar a CONFIRMED'}`);
      console.log('');
    });

    // Preguntar confirmación (en producción, comentar esto y ejecutar directamente)
    console.log('\n🔧 INICIANDO CORRECCIÓN...\n');

    for (const booking of problematicBookings) {
      const totalPaid = parseFloat(booking.totalPaid);
      const totalAmount = parseFloat(booking.totalAmount);
      const isFullyPaid = totalPaid >= totalAmount;
      
      // Determinar nuevo estado
      const newStatus = isFullyPaid ? 'paid' : 'confirmed';
      
      console.log(`📝 Corrigiendo Reserva #${booking.bookingId}: completed → ${newStatus}`);

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

      // Actualizar estado de la habitación según el nuevo status
      if (newStatus === 'paid') {
        await sequelize.query(`
          UPDATE "Rooms"
          SET 
            "status" = 'Reservada',
            "available" = false
          WHERE "roomNumber" = :roomNumber
        `, {
          replacements: { roomNumber: booking.roomNumber }
        });
        console.log(`   🏨 Habitación ${booking.roomNumber} → Reservada`);
      } else {
        // confirmed
        await sequelize.query(`
          UPDATE "Rooms"
          SET 
            "status" = 'Reservada',
            "available" = false
          WHERE "roomNumber" = :roomNumber
        `, {
          replacements: { roomNumber: booking.roomNumber }
        });
        console.log(`   🏨 Habitación ${booking.roomNumber} → Reservada`);
      }

      console.log(`   ✅ Reserva #${booking.bookingId} corregida\n`);
    }

    console.log('\n📊 RESUMEN FINAL:');
    console.log('================================================');
    console.log(`✅ ${problematicBookings.length} reservas corregidas exitosamente`);
    console.log('\n📋 NUEVOS ESTADOS:');
    
    const paidCount = problematicBookings.filter(b => 
      parseFloat(b.totalPaid) >= parseFloat(b.totalAmount)
    ).length;
    const confirmedCount = problematicBookings.length - paidCount;
    
    console.log(`   - ${paidCount} reserva(s) cambiadas a "paid" (pago completo, listas para check-in)`);
    console.log(`   - ${confirmedCount} reserva(s) cambiadas a "confirmed" (pago incompleto)`);
    
    console.log('\n💡 IMPORTANTE:');
    console.log('   - Las reservas "completed" ahora son SOLO las que tienen checkout real');
    console.log('   - Las reservas "paid" son las que tienen pago completo pero NO checkout');
    console.log('   - Las reservas "confirmed" son las que NO tienen pago completo');

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

fixCompletedToPaid();
