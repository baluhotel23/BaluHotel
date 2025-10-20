const { Booking, Payment } = require('../src/data');

async function checkBooking66() {
  try {
    console.log('🔍 Consultando información de Booking #66...\n');

    // Buscar la reserva (incluyendo soft-deleted si usa paranoid)
    const booking = await Booking.findByPk(66, {
      paranoid: false, // ⭐ Incluir registros eliminados
      include: [
        {
          model: Payment,
          as: 'payments',
          paranoid: false, // ⭐ Incluir pagos eliminados
          attributes: [
            'paymentId',
            'amount',
            'paymentMethod',
            'paymentStatus',
            'paymentType',
            'createdAt',
            'updatedAt'
          ]
        }
      ]
    });

    if (!booking) {
      console.log('❌ Booking #66 no encontrado (ni siquiera soft-deleted)');
      
      // Buscar todas las reservas para ver IDs disponibles
      const allBookings = await Booking.findAll({
        attributes: ['bookingId', 'status', 'roomNumber'],
        paranoid: false,
        order: [['bookingId', 'DESC']],
        limit: 10
      });
      
      console.log('\n📋 Últimas 10 reservas en la base de datos:');
      allBookings.forEach(b => {
        console.log(`  - ID ${b.bookingId}: Habitación ${b.roomNumber}, Estado: ${b.status}`);
      });
      
      return;
    }

    console.log('📋 INFORMACIÓN DE LA RESERVA:');
    console.log('================================');
    console.log('ID:', booking.bookingId);
    console.log('Estado:', booking.status);
    console.log('Punto de Venta:', booking.pointOfSale);
    console.log('Habitación:', booking.roomNumber);
    console.log('Check-in:', booking.checkIn);
    console.log('Check-out:', booking.checkOut);
    console.log('Total Amount:', booking.totalAmount);
    console.log('Creada:', booking.createdAt);
    console.log('Actualizada:', booking.updatedAt);
    console.log('¿Eliminada?:', booking.deletedAt ? `SÍ (${booking.deletedAt})` : 'NO');
    console.log('\n');

    console.log('💰 PAGOS REGISTRADOS:');
    console.log('================================');
    if (booking.payments && booking.payments.length > 0) {
      booking.payments.forEach((payment, index) => {
        console.log(`\n Pago #${index + 1}:`);
        console.log('  - ID:', payment.paymentId);
        console.log('  - Monto:', payment.amount);
        console.log('  - Método:', payment.paymentMethod);
        console.log('  - Estado:', payment.paymentStatus);
        console.log('  - Tipo:', payment.paymentType);
        console.log('  - Creado:', payment.createdAt);
        console.log('  - Actualizado:', payment.updatedAt);
      });

      const totalPaid = booking.payments
        .filter(p => p.paymentStatus === 'completed' || p.paymentStatus === 'authorized')
        .reduce((sum, p) => sum + parseFloat(p.amount), 0);

      console.log('\n📊 RESUMEN:');
      console.log('================================');
      console.log('Total a pagar:', booking.totalAmount);
      console.log('Total pagado:', totalPaid);
      console.log('Saldo:', parseFloat(booking.totalAmount) - totalPaid);
      console.log('¿Pagado completamente?', totalPaid >= parseFloat(booking.totalAmount) ? 'SÍ' : 'NO');
    } else {
      console.log('No hay pagos registrados');
    }

    console.log('\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkBooking66();
