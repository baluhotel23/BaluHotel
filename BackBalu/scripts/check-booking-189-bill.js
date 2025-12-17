/**
 * Script para verificar si la reserva 189 tiene factura
 */

const { Booking, Bill, Payment } = require('../src/data');

async function checkBooking189Bill() {
  try {
    console.log('🔍 Verificando factura para reserva 189...\n');

    const booking = await Booking.findByPk(189);
    
    if (!booking) {
      console.error('❌ Reserva 189 no encontrada');
      process.exit(1);
    }

    console.log('✅ Reserva encontrada:', {
      bookingId: booking.bookingId,
      status: booking.status,
      totalAmount: booking.totalAmount,
      createdAt: booking.createdAt
    });

    // Buscar factura asociada
    const bill = await Bill.findOne({
      where: { bookingId: 189 }
    });

    if (bill) {
      console.log('\n✅ FACTURA ENCONTRADA:');
      console.log({
        billId: bill.billId,
        bookingId: bill.bookingId,
        reservationAmount: bill.reservationAmount,
        extraChargesAmount: bill.extraChargesAmount,
        totalAmount: bill.totalAmount,
        status: bill.status,
        createdAt: bill.createdAt
      });
    } else {
      console.log('\n❌ NO HAY FACTURA ASOCIADA');
      console.log('La reserva no aparecerá en el balance porque no tiene Bill');
      console.log('\n💡 Solución: Crear una factura para esta reserva');
    }

    // Verificar pagos
    const payments = await Payment.findAll({
      where: { bookingId: 189 }
    });

    console.log(`\n💰 Pagos registrados: ${payments.length}`);
    payments.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.amount} - ${p.paymentMethod} - ${p.paymentStatus}`);
    });

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkBooking189Bill();
