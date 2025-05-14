const { Booking, Payment, User, Buyer, sequelize } = require('../data'); // Asegúrate de importar 'sequelize' (o 'conn' y luego usa conn.transaction)
const { CustomError } = require('../middleware/error');
const { Op } = require("sequelize");

const registerLocalPayment = async (req, res, next) => {
  console.log('[PaymentController] === Iniciando Proceso: registerLocalPayment ===');
  console.log('[PaymentController] [Paso 1/X] Timestamp de inicio:', new Date().toISOString());
  console.log('[PaymentController] [Paso 1/X] Request Body recibido:', JSON.stringify(req.body, null, 2));

  if (!req.user || !req.user.n_document) {
    console.error('[PaymentController] [ERROR CRÍTICO] Usuario no autenticado o n_document no encontrado en req.user. req.user:', JSON.stringify(req.user, null, 2));
    return res.status(401).json({ error: true, message: 'Usuario no autenticado o token inválido.' });
  }
  const staffUserNdocument = req.user.n_document;
  console.log(`[PaymentController] [Paso 2/X] Pago siendo procesado por User (empleado) con n_document: ${staffUserNdocument}`);

  try {
    const { bookingId, amount, paymentMethod, paymentType: paymentTypeFromBody } = req.body;
    console.log(`[PaymentController] [Paso 2.1/X] Datos extraídos del body - bookingId: ${bookingId}, amount: ${amount}, paymentMethod: ${paymentMethod}, paymentTypeFromBody (opcional): ${paymentTypeFromBody}`);

    console.log('[PaymentController] [Paso 3/X] Validando monto del pago...');
    if (amount === undefined || amount === null || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      const errorMsg = `Monto del pago inválido: '${amount}'. Debe ser un número positivo.`;
      console.error(`[PaymentController] [ERROR Validación] ${errorMsg}`);
      throw new CustomError(errorMsg, 400);
    }
    const paymentAmountFloat = parseFloat(amount);
    console.log(`[PaymentController] [Paso 3/X] Monto del pago validado (float): ${paymentAmountFloat}`);

    console.log(`[PaymentController] [Paso 4/X] Buscando Booking en la DB con bookingId: ${bookingId}`);
    const booking = await Booking.findByPk(bookingId);

    if (!booking) {
      const errorMsg = `Reserva con bookingId '${bookingId}' no encontrada.`;
      console.error(`[PaymentController] [ERROR DB] ${errorMsg}`);
      throw new CustomError(errorMsg, 404);
    }
    console.log('[PaymentController] [Paso 4/X] Reserva encontrada:', JSON.stringify(booking.toJSON(), null, 2));

    const guestIdFromBooking = booking.guestId;
    console.log(`[PaymentController] [Paso 5/X] Obteniendo guestId (sdocno del Buyer) desde la reserva: ${guestIdFromBooking}`);
    
    let buyer = null;
    if (guestIdFromBooking) {
      console.log(`[PaymentController] [Paso 5.1/X] Buscando Buyer en la DB con sdocno (guestId): ${guestIdFromBooking}`);
      buyer = await Buyer.findByPk(guestIdFromBooking);
      if (buyer) {
        console.log('[PaymentController] [Paso 5.2/X] Detalles del Buyer (huésped) encontrado:', JSON.stringify(buyer.toJSON(), null, 2));
      } else {
        console.warn(`[PaymentController] [ADVERTENCIA DB] Buyer con sdocno '${guestIdFromBooking}' no fue encontrado.`);
      }
    } else {
      console.warn('[PaymentController] [ADVERTENCIA Datos] La reserva encontrada no tiene un guestId asociado.');
    }

    console.log(`[PaymentController] [Paso 6/X] Validando lógica de negocio para la reserva...`);
    console.log(`[PaymentController] [Paso 6.1/X] Punto de venta de la reserva: ${booking.pointOfSale}`);
    if (booking.pointOfSale !== 'Local') {
      const errorMsg = `Esta reserva (ID: ${bookingId}) no puede ser pagada localmente porque su punto de venta es '${booking.pointOfSale}'.`;
      console.error(`[PaymentController] [ERROR Lógica] ${errorMsg}`);
      throw new CustomError(errorMsg, 400);
    }

    console.log(`[PaymentController] [Paso 6.2/X] Estado actual de la reserva: ${booking.status}`);
    const nonPayableStatuses = ['cancelled', 'completed_checkout', 'no_show_cancelled'];
    if (nonPayableStatuses.includes(booking.status)) {
        const errorMsg = `No se pueden registrar pagos para una reserva (ID: ${bookingId}) en estado '${booking.status}'.`;
        console.error(`[PaymentController] [ERROR Lógica] ${errorMsg}`);
        throw new CustomError(errorMsg, 400);
    }

    console.log(`[PaymentController] [Paso 7/X] Calculando montos pendientes para bookingId: ${booking.bookingId}`);
    const totalSuccessfullyPaid = await Payment.sum('amount', {
      where: {
        bookingId: booking.bookingId,
        paymentStatus: 'completed'
      }
    }) || 0;
    console.log(`[PaymentController] [Paso 7.1/X] Total pagado exitosamente (completed) hasta ahora para esta reserva: ${totalSuccessfullyPaid}`);

    const bookingTotalAmountFloat = parseFloat(booking.totalAmount);
    console.log(`[PaymentController] [Paso 7.2/X] Monto total original de la reserva (float): ${bookingTotalAmountFloat}`);
    
    const remainingAmount = bookingTotalAmountFloat - totalSuccessfullyPaid;
    console.log(`[PaymentController] [Paso 7.3/X] Monto restante calculado para la reserva: ${remainingAmount.toFixed(2)}`);

    const tolerance = 0.001; 
    if (paymentAmountFloat > remainingAmount + tolerance) {
      const errorMsg = `El monto del pago (${paymentAmountFloat.toFixed(2)}) excede el monto restante adeudado (${remainingAmount.toFixed(2)}) para la reserva ID ${bookingId}.`;
      console.error(`[PaymentController] [ERROR Lógica] ${errorMsg}`);
      throw new CustomError(errorMsg, 400);
    }

    let finalPaymentType;
    console.log(`[PaymentController] [Paso 8/X] Determinando el tipo de pago (full/partial)...`);
    if (paymentTypeFromBody) {
      console.log(`[PaymentController] [Paso 8.1/X] paymentTypeFromBody (enviado por frontend) es: '${paymentTypeFromBody}'`);
      if (!['full', 'partial'].includes(paymentTypeFromBody)) {
          const errorMsg = `El valor de 'paymentType' enviado ('${paymentTypeFromBody}') es inválido. Para pagos locales, debe ser 'full' o 'partial'.`;
          console.error(`[PaymentController] [ERROR Validación] ${errorMsg}`);
          throw new CustomError(errorMsg, 400);
      }
      finalPaymentType = paymentTypeFromBody;
    } else {
      finalPaymentType = (paymentAmountFloat >= remainingAmount - tolerance) ? 'full' : 'partial';
      console.log(`[PaymentController] [Paso 8.2/X] paymentTypeFromBody no fue proporcionado. Derivado automáticamente a: '${finalPaymentType}'`);
    }
    console.log(`[PaymentController] [Paso 8.3/X] finalPaymentType determinado para este pago: '${finalPaymentType}'`);

    const validLocalPaymentMethods = ['cash', 'credit_card', 'debit_card', 'transfer'];
    console.log(`[PaymentController] [Paso 8.4/X] Validando paymentMethod: '${paymentMethod}' contra métodos válidos: ${validLocalPaymentMethods.join(', ')}`);
    if (!paymentMethod || !validLocalPaymentMethods.includes(paymentMethod)) {
        const errorMsg = `Método de pago '${paymentMethod}' no es válido para pagos locales. Los métodos válidos son: ${validLocalPaymentMethods.join(', ')}.`;
        console.error(`[PaymentController] [ERROR Validación] ${errorMsg}`);
        throw new CustomError(errorMsg, 400);
    }

    const paymentData = {
      bookingId: booking.bookingId,
      amount: paymentAmountFloat,
      paymentMethod,
      paymentStatus: 'completed',
      paymentType: finalPaymentType, 
      paymentDate: new Date(),
      processedBy: staffUserNdocument,
    };
    console.log('[PaymentController] [Paso 9/X] Datos preparados para crear el registro en la tabla Payments:', JSON.stringify(paymentData, null, 2));

    // Diagnóstico: Verifica la reserva justo antes de crear el pago
    const bookingJustBeforePaymentCreate = await Booking.findByPk(booking.bookingId, { attributes: ['bookingId', 'status'] });
    if (!bookingJustBeforePaymentCreate) {
        console.error(`[PaymentController] [CRITICAL DEBUG ERROR] Booking ${booking.bookingId} NO FUE ENCONTRADO justo antes de Payment.create.`);
        throw new CustomError(`Error crítico de integridad: La reserva ${booking.bookingId} desapareció antes de crear el pago.`, 500);
    }
    console.log(`[PaymentController] [DEBUG] Booking ${booking.bookingId} re-verificado exitosamente antes de Payment.create:`, JSON.stringify(bookingJustBeforePaymentCreate.toJSON(), null, 2));

    const newPayment = await Payment.create(paymentData);
    console.log('[PaymentController] [Paso 9.1/X] Registro de Payment creado exitosamente en la DB:', JSON.stringify(newPayment.toJSON(), null, 2));

    console.log(`[PaymentController] [Paso 10/X] Actualizando estado de la reserva (ID: ${booking.bookingId}). Estado actual: '${booking.status}'`);
    let bookingStatusChanged = false;
    if (booking.status === 'pending_payment' && paymentAmountFloat > 0) { 
      booking.status = 'confirmed';
      bookingStatusChanged = true;
      console.log(`[PaymentController] [Paso 10.1/X] Estado de la reserva cambiado de 'pending_payment' a 'confirmed'.`);
    } else if (booking.status === 'confirmed' && paymentAmountFloat > 0) {
        console.log(`[PaymentController] [Paso 10.2/X] Reserva ya estaba 'confirmed'. Se registró el pago.`);
    }

    const newTotalPaidAfterThisPayment = totalSuccessfullyPaid + paymentAmountFloat;
    if (newTotalPaidAfterThisPayment >= bookingTotalAmountFloat - tolerance) {
        console.log(`[PaymentController] [Paso 10.3/X] La reserva (ID: ${booking.bookingId}) ahora está completamente pagada.`);
    }

    if (bookingStatusChanged) {
      await booking.save();
      console.log('[PaymentController] [Paso 10.4/X] Reserva actualizada y guardada en la DB con nuevo estado.');
    } else {
      console.log('[PaymentController] [Paso 10.5/X] No se requirieron cambios de estado para la reserva.');
    }

    console.log('[PaymentController] === Proceso registerLocalPayment Finalizado Exitosamente ===');
    
    res.status(201).json({
      error: false,
      message: 'Pago local registrado exitosamente.',
      data: {
        payment: newPayment.toJSON(),
        booking: booking.toJSON(),
        buyer: buyer ? buyer.toJSON() : null
      }
    });

  } catch (error) {
    console.error("[PaymentController] [ERROR GLOBAL] Error capturado en registerLocalPayment. Nombre:", error.name, "Mensaje:", error.message);
    if (error.original) {
        console.error("[PaymentController] [ERROR GLOBAL] Error Original (Sequelize/DB):", JSON.stringify(error.original, null, 2));
    }
    if (error.fields && error.name === 'SequelizeForeignKeyConstraintError') {
        console.error("[PaymentController] [ERROR DB DETALLE] ForeignKeyConstraintError fields:", JSON.stringify(error.fields, null, 2));
        console.error("[PaymentController] [ERROR DB DETALLE] ForeignKeyConstraintError parent SQL:", error.parent?.sql);
        console.error("[PaymentController] [ERROR DB DETALLE] ForeignKeyConstraintError original SQL:", error.original?.sql);
    }
    if (error instanceof CustomError) {
        return next(error);
    }
    let detailedMessage = "Error interno al procesar el pago.";
    let statusCode = 500;
    if (error.name === 'SequelizeValidationError') {
        detailedMessage = error.errors.map(e => e.message).join(', ');
        statusCode = 400;
    } else if (error.name === 'SequelizeForeignKeyConstraintError') {
        detailedMessage = `Error de referencia de base de datos. Detalle: ${error.original?.detail || error.message}`;
        statusCode = 400;
    } else if (error.message) {
        detailedMessage = error.message;
    }
    next(new CustomError(detailedMessage, statusCode, error.name));
  }
};

module.exports = {
  registerLocalPayment,
};