/**
 * Script para simular pago exitoso de reserva online
 * Uso: node BackBalu/scripts/fix-booking-189-payment.js
 */

const { Booking, Payment, Room, Voucher } = require('../src/data');

async function fixBooking189() {
  try {
    console.log('🚀 [FIX-BOOKING] Iniciando proceso para reserva 189...\n');

    // 1. BUSCAR LA RESERVA
    const booking = await Booking.findByPk(189, {
      include: [
        { model: Room, as: 'room' },
        { model: Payment, as: 'payments' }
      ]
    });

    if (!booking) {
      console.error('❌ Reserva 189 no encontrada');
      process.exit(1);
    }

    console.log('✅ Reserva encontrada:', {
      bookingId: booking.bookingId,
      status: booking.status,
      totalAmount: booking.totalAmount,
      roomNumber: booking.roomNumber,
      guestId: booking.guestId,
      trackingToken: booking.trackingToken ? 'Existe' : 'No existe'
    });

    // 2. GENERAR TRACKING TOKEN SI NO EXISTE
    if (!booking.trackingToken) {
      const jwt = require('jsonwebtoken');
      const trackingToken = jwt.sign(
        { 
          guestId: booking.guestId, 
          roomNumber: booking.roomNumber, 
          timestamp: Date.now() 
        },
        process.env.JWT_SECRET || 'secret-key',
        { expiresIn: '30d' }
      );
      
      await booking.update({ trackingToken });
      console.log('✅ Tracking token generado');
    } else {
      console.log('ℹ️  Tracking token ya existe');
    }

    // 3. CREAR PAGO SIMULADO
    const existingPayment = await Payment.findOne({
      where: { bookingId: 189, paymentStatus: 'completed' }
    });

    if (!existingPayment) {
      const payment = await Payment.create({
        bookingId: 189,
        amount: parseFloat(booking.totalAmount),
        paymentMethod: 'wompi',
        paymentType: 'online',
        paymentStatus: 'completed',
        paymentDate: new Date(),
        transactionId: `SIMULATED-TEST-${Date.now()}`,
        paymentReference: `BALU-189-${Date.now()}`,
        processedBy: null, // NULL porque es pago automático de Wompi
        includesExtras: false,
        isReservationPayment: true,
        isCheckoutPayment: false,
        wompiTransactionId: `SIMULATED-WOMPI-${Date.now()}`,
        wompiStatus: 'APPROVED'
      });

      console.log('✅ Pago creado:', {
        paymentId: payment.paymentId,
        amount: payment.amount,
        status: payment.paymentStatus
      });
    } else {
      console.log('ℹ️  Ya existe un pago completado');
    }

    // 4. ACTUALIZAR ESTADO DE RESERVA A 'paid'
    await booking.update({
      status: 'paid',
      paymentCompletedAt: new Date()
    });
    console.log('✅ Reserva actualizada a status: paid');

    // 5. ACTUALIZAR HABITACIÓN
    const room = await Room.findByPk(booking.roomNumber);
    if (room) {
      await room.update({
        status: 'Reservada',
        available: false
      });
      console.log('✅ Habitación 201 marcada como Reservada');
    }

    // 6. CREAR VOUCHER SI NO EXISTE
    const existingVoucher = await Voucher.findOne({
      where: { originalBookingId: 189 }
    });

    if (!existingVoucher) {
      const voucherCode = `BLU${Date.now().toString().slice(-6)}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const crypto = require('crypto');
      const voucherId = crypto.randomUUID();
      
      await Voucher.create({
        voucherId,
        voucherCode,
        amount: parseFloat(booking.totalAmount),
        status: 'active',
        guestId: booking.guestId,
        originalBookingId: 189,
        validUntil: new Date(booking.checkOut),
        createdBy: 'system',
        notes: 'Voucher generado por script de corrección'
      });

      console.log('✅ Voucher creado:', voucherCode);
    } else {
      console.log('ℹ️  Voucher ya existe:', existingVoucher.voucherCode);
    }

    // 7. VERIFICACIÓN FINAL
    console.log('\n📊 VERIFICACIÓN FINAL:');
    const updatedBooking = await Booking.findByPk(189, {
      include: [
        { model: Room, as: 'room' },
        { model: Payment, as: 'payments' }
      ]
    });

    const totalPaid = updatedBooking.payments
      ?.filter(p => p.paymentStatus === 'completed')
      .reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;

    const vouchersCount = await Voucher.count({ where: { originalBookingId: 189 } });

    console.log({
      bookingId: updatedBooking.bookingId,
      status: updatedBooking.status,
      hasTrackingToken: !!updatedBooking.trackingToken,
      paymentCompleted: !!updatedBooking.paymentCompletedAt,
      totalAmount: updatedBooking.totalAmount,
      totalPaid,
      roomStatus: updatedBooking.room?.status,
      roomAvailable: updatedBooking.room?.available,
      paymentsCount: updatedBooking.payments?.length || 0,
      vouchersCount
    });

    console.log('\n✅ ¡PROCESO COMPLETADO EXITOSAMENTE!');
    console.log('\n📝 Próximos pasos:');
    console.log('1. Configura la URL del webhook en Wompi:');
    console.log('   https://baluhotel-production.up.railway.app/webhooks/wompi');
    console.log('2. Prueba hacer una nueva reserva online');
    console.log('3. Verifica los logs del backend cuando Wompi envíe el webhook');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Ejecutar
fixBooking189();
