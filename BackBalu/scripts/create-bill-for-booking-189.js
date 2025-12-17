/**
 * Script para crear Bill para la reserva 189
 */

const { Booking, Bill, Payment, Buyer } = require('../src/data');
const { v4: uuidv4 } = require('uuid');

async function createBillForBooking189() {
  try {
    console.log('🔍 Creando Bill para reserva 189...\n');

    // Verificar si ya existe
    const existingBill = await Bill.findOne({ where: { bookingId: 189 } });
    if (existingBill) {
      console.log('ℹ️  Ya existe una factura para esta reserva:', existingBill.billId);
      process.exit(0);
    }

    // Obtener la reserva
    const booking = await Booking.findByPk(189);
    if (!booking) {
      console.error('❌ Reserva no encontrada');
      process.exit(1);
    }

    // Obtener el pago
    const payment = await Payment.findOne({
      where: { bookingId: 189 },
      order: [['createdAt', 'DESC']]
    });

    // Obtener el buyer
    const buyer = await Buyer.findByPk(booking.guestId);

    console.log('📋 Datos de la reserva:');
    console.log({
      bookingId: booking.bookingId,
      totalAmount: booking.totalAmount,
      guestId: booking.guestId,
      pointOfSale: booking.pointOfSale,
      paymentDate: payment?.paymentDate
    });

    // Crear la factura
    const bill = await Bill.create({
      billId: uuidv4(),
      bookingId: 189,
      guestId: booking.guestId,
      reservationAmount: parseFloat(booking.totalAmount),
      extraChargesAmount: 0,
      totalAmount: parseFloat(booking.totalAmount),
      totalPaid: payment ? parseFloat(payment.amount) : 0,
      balance: 0,
      status: 'paid',
      billType: 'booking', // ⭐ Valores permitidos: booking, manual, service, product
      paymentMethod: 'transfer', // ⭐ Valores permitidos: cash, credit_card, debit_card, transfer (wompi no está en la lista)
      notes: 'Factura generada automáticamente para reserva online - Pago Wompi',
      createdAt: payment?.paymentDate || booking.createdAt, // ⭐ Usar fecha del pago
      updatedAt: new Date()
    });

    console.log('\n✅ FACTURA CREADA:');
    console.log({
      billId: bill.billId,
      bookingId: bill.bookingId,
      reservationAmount: bill.reservationAmount,
      totalAmount: bill.totalAmount,
      status: bill.status,
      createdAt: bill.createdAt
    });

    console.log('\n🎉 ¡La reserva 189 ahora debería aparecer en el balance financiero!');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createBillForBooking189();
