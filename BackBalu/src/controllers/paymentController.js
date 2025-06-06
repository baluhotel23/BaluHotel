const { Booking, Payment, User, Buyer, sequelize, ExtraCharge, Room } = require('../data'); // Asegúrate de importar 'sequelize' (o 'conn' y luego usa conn.transaction)
const { CustomError } = require('../middleware/error');
const { Op } = require("sequelize");

const registerLocalPayment = async (req, res, next) => {
  console.log('[PaymentController] === Iniciando Proceso: registerLocalPayment ===');
  try {
    const { bookingId, amount, paymentMethod, paymentType: paymentTypeFromBody } = req.body;

    if (!req.user || !req.user.n_document) {
      return res.status(401).json({ error: true, message: 'Usuario no autenticado o token inválido.' });
    }
    const staffUserNdocument = req.user.n_document;

    // Validar el monto del pago
    const paymentAmountFloat = parseFloat(amount);
    if (isNaN(paymentAmountFloat) || paymentAmountFloat <= 0) {
      throw new CustomError(`Monto del pago inválido: '${amount}'. Debe ser un número positivo.`, 400);
    }

    // Buscar la reserva
    const booking = await Booking.findByPk(bookingId, {
      include: [{ model: Payment }, { model: ExtraCharge }, { model: Room }, { model: Buyer, as: "guest" }],
    });
    if (!booking) {
      throw new CustomError(`Reserva con bookingId '${bookingId}' no encontrada.`, 404);
    }

    // Calcular el total pagado y el monto restante
    const totalSuccessfullyPaid = await Payment.sum('amount', {
      where: { bookingId: booking.bookingId, paymentStatus: 'completed' },
    }) || 0;
    const bookingTotalAmountFloat = parseFloat(booking.totalAmount);
    const remainingAmount = bookingTotalAmountFloat - totalSuccessfullyPaid;

    if (paymentAmountFloat > remainingAmount) {
      throw new CustomError(`El monto del pago (${paymentAmountFloat.toFixed(2)}) excede el monto restante (${remainingAmount.toFixed(2)}).`, 400);
    }

    // Registrar el pago
    const newPayment = await Payment.create({
      bookingId: booking.bookingId,
      amount: paymentAmountFloat,
      paymentMethod,
      paymentStatus: 'completed',
      paymentType: paymentTypeFromBody || (paymentAmountFloat >= remainingAmount ? 'full' : 'partial'),
      paymentDate: new Date(),
      processedBy: staffUserNdocument,
    });

    // Actualizar el estado de la reserva si está completamente pagada
    const newTotalPaidAfterThisPayment = totalSuccessfullyPaid + paymentAmountFloat;
    if (newTotalPaidAfterThisPayment >= bookingTotalAmountFloat) {
      await booking.update({ status: 'completed' });

      // Generar la factura
      const bill = await Bill.create({
        bookingId: booking.bookingId,
        totalAmount: bookingTotalAmountFloat,
        generatedBy: staffUserNdocument,
        details: {
          roomCharge: calculateRoomCharge(booking),
          extraCharges: booking.ExtraCharges,
          nights: calculateNights(booking.checkIn, booking.checkOut),
          roomDetails: booking.Room,
          guestDetails: booking.guest,
        },
      });

      console.log('[PaymentController] Factura generada exitosamente:', bill.toJSON());
    }

    res.status(201).json({
      error: false,
      message: 'Pago registrado exitosamente.',
      data: {
        payment: newPayment.toJSON(),
        booking: booking.toJSON(),
      },
    });
  } catch (error) {
    console.error("[PaymentController] Error en registerLocalPayment:", error);
    next(error);
  }
};

module.exports = {
  registerLocalPayment,
};