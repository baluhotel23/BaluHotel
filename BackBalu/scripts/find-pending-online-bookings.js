/**
 * Script para encontrar reservas online pendientes sin pago
 */

const { Booking, Payment, Room } = require('../src/data');

async function findPendingOnlineBookings() {
  try {
    console.log('🔍 Buscando reservas online pendientes...\n');

    const bookings = await Booking.findAll({
      where: {
        pointOfSale: 'Online'
      },
      include: [
        { model: Room, as: 'room' },
        { model: Payment, as: 'payments' }
      ],
      order: [['createdAt', 'DESC']],
      limit: 20
    });

    console.log(`📊 Total de reservas online: ${bookings.length}\n`);

    bookings.forEach(booking => {
      const totalPaid = booking.payments
        ?.filter(p => p.paymentStatus === 'completed')
        .reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;

      const isProblemBooking = !booking.trackingToken || 
                               totalPaid === 0 || 
                               booking.status === 'pending';

      console.log(`${isProblemBooking ? '⚠️' : '✅'} Reserva ID: ${booking.bookingId}`);
      console.log(`   Estado: ${booking.status}`);
      console.log(`   TrackingToken: ${booking.trackingToken ? 'SÍ' : '❌ NO'}`);
      console.log(`   Total: $${booking.totalAmount}`);
      console.log(`   Pagado: $${totalPaid}`);
      console.log(`   Habitación: ${booking.roomNumber} (${booking.room?.status || 'N/A'})`);
      console.log(`   Pagos registrados: ${booking.payments?.length || 0}`);
      console.log(`   Fecha: ${booking.createdAt}`);
      console.log('');
    });

    // Mostrar específicamente las problemáticas
    const problematicBookings = bookings.filter(b => {
      const totalPaid = b.payments
        ?.filter(p => p.paymentStatus === 'completed')
        .reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;
      return !b.trackingToken || totalPaid === 0 || b.status === 'pending';
    });

    if (problematicBookings.length > 0) {
      console.log('\n⚠️ RESERVAS PROBLEMÁTICAS:');
      problematicBookings.forEach(b => {
        console.log(`   - ID ${b.bookingId}: ${b.status}, tracking=${!!b.trackingToken}, pagos=${b.payments?.length || 0}`);
      });
    } else {
      console.log('\n✅ No se encontraron reservas problemáticas');
    }

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

findPendingOnlineBookings();
