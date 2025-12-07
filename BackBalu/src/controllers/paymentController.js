const { Booking, Payment, User, Buyer, sequelize, ExtraCharge, Room, Bill } = require('../data');
const { CustomError } = require('../middleware/error');
const { Op } = require("sequelize");

// ⭐ IMPORTAR UTILIDADES DE FECHA
const { 
  formatForLogs,
  formatForDetailedLogs,
  getDaysDifference,
  getColombiaTime
} = require('../utils/dateUtils');

// ⭐ FUNCIÓN PARA MAPEAR MÉTODOS DE PAGO
const mapPaymentMethod = (method) => {
  const methodMap = {
    'card': 'credit_card',
    'credit_card': 'credit_card',
    'debit_card': 'debit_card',
    'cash': 'cash',
    'transfer': 'transfer',
    'bank_transfer': 'transfer',
    'wompi': 'wompi',
    'wompi_checkout': 'wompi_checkout',
    'online': 'wompi_checkout'
  };
  
  const mappedMethod = methodMap[method?.toLowerCase()];
  
  if (!mappedMethod) {
    console.warn(`⚠️ [PAYMENT-CONTROLLER] Método de pago no reconocido: '${method}', usando 'credit_card' por defecto`);
    return 'credit_card';
  }
  
  console.log(`✅ [PAYMENT-CONTROLLER] Método mapeado: '${method}' → '${mappedMethod}'`);
  return mappedMethod;
};

// ⭐ FUNCIÓN PARA MAPEAR TIPOS DE PAGO
const mapPaymentType = (type) => {
  const typeMap = {
    'checkout': 'final',          // ✅ checkout → final (pago final al salir)
    'checkin': 'deposit',         // ✅ checkin → deposit (depósito al entrar)
    'full': 'full',               // ✅ mantener full
    'partial': 'partial',         // ✅ mantener partial
    'online': 'online',           // ✅ mantener online
    'deposit': 'deposit',         // ✅ mantener deposit
    'final': 'final',             // ✅ mantener final
    'complete': 'full',           // ✅ completo → full
    'wompi': 'online',            // ✅ wompi → online
    'wompi_checkout': 'online',   // ✅ wompi_checkout → online
    'extra_charge': 'extra_charge' // ✅ mantener extra_charge
  };
  
  const mappedType = typeMap[type?.toLowerCase()];
  
  if (!mappedType) {
    console.warn(`⚠️ [PAYMENT-CONTROLLER] Tipo de pago no reconocido: '${type}', usando 'partial' por defecto`);
    return 'partial';
  }
  
  console.log(`✅ [PAYMENT-CONTROLLER] Tipo mapeado: '${type}' → '${mappedType}'`);
  return mappedType;
};

// ⭐ FUNCIÓN PRINCIPAL PARA REGISTRAR PAGOS LOCALES
const registerLocalPayment = async (req, res, next) => {
  try {
    // Bloquear admins de registrar pagos locales
    if (req.user && req.user.role === 'admin') {
      return res.status(403).json({ error: true, message: 'No tienes permisos para registrar pagos locales' });
    }
    console.log("💳 [REGISTER-LOCAL-PAYMENT] ⭐ INICIANDO PROCESO");
    console.log("🕐 [REGISTER-LOCAL-PAYMENT] Hora Colombia:", formatForLogs(getColombiaTime()));
    console.log("📥 [REGISTER-LOCAL-PAYMENT] Request body:", JSON.stringify(req.body, null, 2));

    const { 
      bookingId, 
      amount, 
      paymentMethod, 
      paymentType,
      notes,
      updateBookingStatus = false,
      newBookingStatus = null,
      isCheckoutPayment = false,
      includesExtras = false,
      transactionId = null,
      paymentReference = null
    } = req.body;

    // ⭐ VALIDACIONES BÁSICAS
    if (!bookingId || !amount || !paymentMethod) {
      return res.status(400).json({
        error: true,
        message: 'Faltan campos requeridos: bookingId, amount, paymentMethod'
      });
    }

    // ⭐ BUSCAR LA RESERVA CON DATOS COMPLETOS
    const booking = await Booking.findByPk(bookingId, {
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['roomNumber', 'status', 'type']
        },
        {
          model: Buyer,
          as: 'guest',
          attributes: ['scostumername', 'sdocno']
        },
        {
          model: Payment,
          as: 'payments',
          attributes: [
            'paymentId', 'amount', 'paymentStatus', 'paymentType', 
            'isCheckoutPayment', 'includesExtras', 'isReservationPayment'
          ]
        },
        {
          model: ExtraCharge,
          as: 'extraCharges',
          attributes: ['id', 'amount', 'description', 'quantity']
        }
      ]
    });

    if (!booking) {
      return res.status(404).json({
        error: true,
        message: 'Reserva no encontrada'
      });
    }

    console.log("🏨 [REGISTER-LOCAL-PAYMENT] Reserva encontrada:", {
      bookingId,
      currentStatus: booking.status,
      totalAmount: booking.totalAmount,
      roomNumber: booking.roomNumber,
      existingPayments: booking.payments?.length || 0,
      extraCharges: booking.extraCharges?.length || 0
    });

    // ⭐ CALCULAR TOTALES FINANCIEROS
    const paymentAmount = parseFloat(amount);
    const reservationAmount = parseFloat(booking.totalAmount);
    
    // Calcular gastos extras
    const extraChargesTotal = booking.extraCharges?.reduce((sum, charge) => {
      const chargeAmount = parseFloat(charge.amount) || 0;
      const quantity = parseInt(charge.quantity) || 1;
      return sum + (chargeAmount * quantity);
    }, 0) || 0;
    
    const grandTotal = reservationAmount + extraChargesTotal;
    
    // ⭐ CALCULAR PAGOS PREVIOS (solo authorized y completed)
    const previousPayments = booking.payments?.filter(p => 
      p.paymentStatus === 'authorized' || p.paymentStatus === 'completed'
    ) || [];
    
    const totalPreviousPaid = previousPayments.reduce((sum, p) => 
      sum + parseFloat(p.amount), 0
    );
    
    const remainingAmount = grandTotal - totalPreviousPaid;

    console.log("💰 [REGISTER-LOCAL-PAYMENT] Cálculos financieros:", {
      paymentAmount,
      reservationAmount,
      extraChargesTotal,
      grandTotal,
      totalPreviousPaid,
      remainingAmount,
      isCheckoutPayment,
      includesExtras
    });

    // ⭐ VALIDAR MONTO
    if (paymentAmount <= 0) {
      return res.status(400).json({
        error: true,
        message: 'El monto del pago debe ser mayor a 0'
      });
    }

    if (paymentAmount > remainingAmount) {
      return res.status(400).json({
        error: true,
        message: `El monto del pago ($${paymentAmount}) excede el monto pendiente ($${remainingAmount})`
      });
    }

    // ⭐ DETERMINAR ESTADO DEL PAGO Y CONFIGURACIÓN
    let paymentStatus = 'pending';
    let finalPaymentType = mapPaymentType(paymentType);
    let shouldUpdateBookingStatus = updateBookingStatus;
    let targetBookingStatus = booking.status;
    let isReservationPayment = true;
    let isCheckoutPaymentFlag = isCheckoutPayment;

    // ⭐ LÓGICA DE ESTADOS SEGÚN CONTEXTO - CORREGIDA
    if (isCheckoutPayment) {
      // ⭐ PAGO EN CHECKOUT - SIEMPRE COMPLETED
      paymentStatus = 'completed';
      finalPaymentType = 'final';
      shouldUpdateBookingStatus = true;
      targetBookingStatus = 'completed';
      isReservationPayment = !includesExtras;
      isCheckoutPaymentFlag = true;
      
      console.log("🏁 [REGISTER-LOCAL-PAYMENT] Pago de checkout detectado");
      
    } else if (booking.status === 'confirmed' || booking.status === 'pending') {
      // ⭐ PAGO DE RESERVA INICIAL - CAMBIO PRINCIPAL AQUÍ
      const isFullReservationPayment = paymentAmount >= reservationAmount;
      
      if (isFullReservationPayment) {
        paymentStatus = 'authorized';
        finalPaymentType = 'full';
        shouldUpdateBookingStatus = true;
        targetBookingStatus = 'paid'; // ⭐ CAMBIAR A 'paid' NO 'checked-in'
        isReservationPayment = true;
        
        console.log("✅ [REGISTER-LOCAL-PAYMENT] Pago completo de reserva - Status: PAID (listo para check-in físico)");
        
      } else {
        paymentStatus = 'authorized';
        finalPaymentType = 'partial';
        shouldUpdateBookingStatus = false; // ⭐ Mantener 'confirmed' hasta pago completo
        isReservationPayment = true;
        
        console.log("📊 [REGISTER-LOCAL-PAYMENT] Pago parcial de reserva - Mantener CONFIRMED");
      }
      
    } else if (booking.status === 'paid') {
      // ⭐ NUEVO CASO: PAGO ADICIONAL EN RESERVA YA PAGADA
      paymentStatus = 'authorized';
      finalPaymentType = includesExtras ? 'extra_charge' : 'partial';
      isReservationPayment = !includesExtras;
      shouldUpdateBookingStatus = false; // ⭐ Mantener 'paid' hasta check-in físico
      
      console.log("💰 [REGISTER-LOCAL-PAYMENT] Pago adicional en reserva pagada - Mantener PAID");
      
    } else if (booking.status === 'checked-in') {
      // ⭐ PAGO DURANTE LA ESTADÍA
      if (includesExtras) {
        paymentStatus = 'authorized';
        finalPaymentType = 'extra_charge';
        isReservationPayment = false;
        
        console.log("🏨 [REGISTER-LOCAL-PAYMENT] Pago de gastos extras durante estadía");
      } else {
        paymentStatus = 'authorized';
        finalPaymentType = 'partial';
        isReservationPayment = true;
        
        console.log("🏨 [REGISTER-LOCAL-PAYMENT] Pago complementario durante estadía");
      }
      shouldUpdateBookingStatus = false; // Mantener checked-in
      
    } else {
      // ⭐ OTROS CASOS
      paymentStatus = 'authorized';
      shouldUpdateBookingStatus = false;
      
      console.log("ℹ️ [REGISTER-LOCAL-PAYMENT] Pago en estado:", booking.status);
    }

    // ⭐ MAPEAR MÉTODO DE PAGO
    const mappedPaymentMethod = mapPaymentMethod(paymentMethod);

    // ⭐ OBTENER TURNO ACTIVO DEL USUARIO (si aplica)
    let shiftId = null;
    const physicalPaymentMethods = ['cash', 'credit_card', 'debit_card', 'transfer'];
    
    if (physicalPaymentMethods.includes(mappedPaymentMethod) && req.user?.n_document) {
      try {
        const { ReceptionShift } = require('../data');
        const currentShift = await ReceptionShift.findOne({
          where: {
            userId: req.user.n_document,
            status: 'open'
          }
        });
        
        if (currentShift) {
          shiftId = currentShift.shiftId;
          console.log(`💼 [REGISTER-LOCAL-PAYMENT] Asignando pago al turno ${shiftId}`);
        } else {
          console.log('⚠️ [REGISTER-LOCAL-PAYMENT] Usuario no tiene turno abierto, pago sin shiftId');
        }
      } catch (shiftError) {
        console.log('⚠️ [REGISTER-LOCAL-PAYMENT] Error al obtener turno:', shiftError.message);
      }
    }

    // ⭐ CREAR EL REGISTRO DE PAGO
    const paymentData = {
      bookingId,
      amount: paymentAmount,
      paymentMethod: mappedPaymentMethod,
      paymentType: finalPaymentType,
      paymentStatus: paymentStatus,
      paymentDate: getColombiaTime().toJSDate(),
      transactionId: transactionId,
      paymentReference: paymentReference,
      notes: notes || `Pago local ${finalPaymentType} - ${mappedPaymentMethod}`,
      processedBy: req.user?.n_document || 'staff',
      shiftId: shiftId, // ⭐ NUEVO: Asignar shiftId si existe
      // ⭐ CAMPOS SEGÚN NUEVO MODELO
      includesExtras: includesExtras,
      isReservationPayment: isReservationPayment,
      isCheckoutPayment: isCheckoutPaymentFlag
    };

    console.log("💾 [REGISTER-LOCAL-PAYMENT] Creando pago:", paymentData);

    const payment = await Payment.create(paymentData);

    // ⭐ ACTUALIZAR ESTADO DE RESERVA SI ES NECESARIO
    if (shouldUpdateBookingStatus) {
      console.log("🔄 [REGISTER-LOCAL-PAYMENT] Actualizando estado de reserva:", {
        from: booking.status,
        to: targetBookingStatus,
        reason: `Pago ${finalPaymentType} - ${mappedPaymentMethod}`
      });

      const updateData = {
        status: targetBookingStatus,
        statusUpdatedBy: req.user?.n_document || 'system',
        statusUpdatedAt: getColombiaTime().toJSDate(),
        statusReason: `Pago ${finalPaymentType} recibido - ${mappedPaymentMethod}`
      };

      // ⭐ AGREGAR TIMESTAMP DE PAGO COMPLETO SI CORRESPONDE
      if (targetBookingStatus === 'paid') {
        updateData.paymentCompletedAt = getColombiaTime().toJSDate();
      }

      await booking.update(updateData);

      // ⭐ ACTUALIZAR HABITACIÓN SEGÚN NUEVO ESTADO
      const room = await Room.findByPk(booking.roomNumber);
      if (room) {
        let newRoomStatus = room.status;
        let newRoomAvailability = room.available;
        
        if (targetBookingStatus === 'paid') {
          // ⭐ CUANDO ESTÁ PAGADO PERO NO CHECKED-IN, MANTENER RESERVADA
          newRoomStatus = 'Reservada';
          newRoomAvailability = false;
        } else if (targetBookingStatus === 'checked-in') {
          newRoomStatus = 'Ocupada';
          newRoomAvailability = false;
        } else if (targetBookingStatus === 'completed') {
          newRoomStatus = 'Disponible';
          newRoomAvailability = true;
        }
        
        await room.update({
          status: newRoomStatus,
          available: newRoomAvailability
        });
        
        console.log("🏨 [REGISTER-LOCAL-PAYMENT] Habitación actualizada:", {
          roomNumber: booking.roomNumber,
          status: newRoomStatus,
          available: newRoomAvailability
        });
      }
    }

    // ⭐ OBTENER RESERVA ACTUALIZADA
    const updatedBooking = await Booking.findByPk(bookingId, {
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['roomNumber', 'status', 'type']
        },
        {
          model: Buyer,
          as: 'guest',
          attributes: ['scostumername', 'sdocno']
        },
        {
          model: Payment,
          as: 'payments',
          attributes: [
            'paymentId', 'amount', 'paymentMethod', 'paymentStatus', 
            'paymentType', 'paymentDate', 'includesExtras', 'isReservationPayment'
          ]
        },
        {
          model: ExtraCharge,
          as: 'extraCharges',
          attributes: ['id', 'amount', 'description', 'quantity']
        }
      ]
    });

    // ⭐ CALCULAR TOTALES ACTUALIZADOS
    const authorizedPayments = updatedBooking.payments?.filter(p => 
      p.paymentStatus === 'authorized' || p.paymentStatus === 'completed'
    ) || [];
    
    const totalPaid = authorizedPayments.reduce((sum, p) => 
      sum + parseFloat(p.amount), 0
    );
    
    const newRemainingAmount = grandTotal - totalPaid;
    const isFullyPaid = newRemainingAmount <= 0;

    console.log("✅ [REGISTER-LOCAL-PAYMENT] Pago registrado exitosamente:", {
      paymentId: payment.paymentId,
      amount: paymentAmount,
      status: paymentStatus,
      type: finalPaymentType,
      bookingStatus: updatedBooking.status,
      totalPaid,
      remainingAmount: newRemainingAmount,
      isFullyPaid,
      readyForPhysicalCheckIn: updatedBooking.status === 'paid',
      canCheckout: isFullyPaid && updatedBooking.status === 'checked-in'
    });

    // ⭐ DETERMINAR MENSAJE DE RESPUESTA - ACTUALIZADO
    let responseMessage = '';
    if (isCheckoutPayment) {
      responseMessage = '🏁 Pago de checkout completado exitosamente. Reserva finalizada.';
    } else if (paymentStatus === 'authorized' && targetBookingStatus === 'paid') {
      responseMessage = '✅ Pago completo registrado. Reserva lista para check-in físico.';
    } else if (paymentStatus === 'authorized' && targetBookingStatus === 'checked-in') {
      responseMessage = '✅ Pago completo registrado. Check-in automático realizado.';
    } else if (finalPaymentType === 'partial') {
      responseMessage = `📊 Pago parcial registrado. Restante: $${newRemainingAmount.toFixed(2)}`;
    } else if (finalPaymentType === 'extra_charge') {
      responseMessage = '🏨 Pago de gastos extras registrado exitosamente.';
    } else {
      responseMessage = '💳 Pago registrado exitosamente.';
    }

    const responseData = {
      payment,
      booking: updatedBooking,
      paymentSummary: {
        reservationAmount,
        extraChargesTotal,
        grandTotal,
        totalPaid,
        remainingAmount: newRemainingAmount,
        isFullyPaid,
        readyForPhysicalCheckIn: updatedBooking.status === 'paid', // ⭐ NUEVO CAMPO
        canCheckout: isFullyPaid && updatedBooking.status === 'checked-in',
        paymentsCount: updatedBooking.payments?.length || 0
      },
      statusChanged: shouldUpdateBookingStatus,
      newStatus: updatedBooking.status,
      roomStatus: updatedBooking.room?.status
    };

    res.status(201).json({
      error: false,
      success: true,
      message: responseMessage,
      data: responseData,
      timestamp: formatForLogs(getColombiaTime())
    });

  } catch (error) {
    console.error("❌ [REGISTER-LOCAL-PAYMENT] Error:", error);
    next(error);
  }
};

// ⭐ FUNCIÓN PARA PROCESAR PAGO DE CHECKOUT
const processCheckoutPayment = async (req, res, next) => {
  try {
    console.log("🏁 [CHECKOUT-PAYMENT] Iniciando pago de checkout");
    console.log("📥 [CHECKOUT-PAYMENT] Request body:", JSON.stringify(req.body, null, 2));
    
    const { bookingId, extraChargesAmount = 0, paymentMethod, notes } = req.body;
    
    if (!bookingId || !paymentMethod) {
      return res.status(400).json({
        error: true,
        message: 'Faltan campos requeridos: bookingId, paymentMethod'
      });
    }

    // Buscar reserva con gastos extras
    const booking = await Booking.findByPk(bookingId, {
      include: [
        {
          model: ExtraCharge,
          as: 'extraCharges',
          attributes: ['id', 'amount', 'description', 'quantity']
        },
        {
          model: Payment,
          as: 'payments',
          attributes: ['paymentId', 'amount', 'paymentStatus']
        }
      ]
    });
    
    if (!booking) {
      return res.status(404).json({
        error: true,
        message: 'Reserva no encontrada'
      });
    }
    
    if (booking.status !== 'checked-in') {
      return res.status(400).json({
        error: true,
        message: 'Solo se puede hacer checkout de reservas en estado checked-in'
      });
    }

    // Calcular total de gastos extras
    const calculatedExtrasAmount = booking.extraCharges?.reduce((sum, charge) => {
      const chargeAmount = parseFloat(charge.amount) || 0;
      const quantity = parseInt(charge.quantity) || 1;
      return sum + (chargeAmount * quantity);
    }, 0) || 0;

    console.log("💰 [CHECKOUT-PAYMENT] Cálculos de checkout:", {
      bookingId,
      extraChargesAmount,
      calculatedExtrasAmount,
      hasExtras: calculatedExtrasAmount > 0
    });
    
    // Procesar pago final si hay gastos extras
    if (calculatedExtrasAmount > 0) {
      const finalAmount = extraChargesAmount || calculatedExtrasAmount;
      
      const checkoutPaymentData = {
        bookingId,
        amount: finalAmount,
        paymentMethod,
        paymentType: 'final',
        isCheckoutPayment: true,
        includesExtras: true,
        notes: notes || 'Pago final de checkout con gastos extras'
      };
      
      console.log("🏁 [CHECKOUT-PAYMENT] Procesando pago con extras:", checkoutPaymentData);
      
      // Reutilizar la función de registro de pago
      req.body = checkoutPaymentData;
      return registerLocalPayment(req, res, next);
      
    } else {
      // Checkout sin gastos extras - solo actualizar estado
      console.log("🏁 [CHECKOUT-PAYMENT] Checkout sin gastos extras");
      
      await booking.update({
        status: 'completed',
        statusUpdatedBy: req.user?.n_document || 'system',
        statusUpdatedAt: getColombiaTime().toJSDate(),
        statusReason: 'Checkout completado sin gastos extras'
      });

      // Liberar habitación
      const room = await Room.findByPk(booking.roomNumber);
      if (room) {
        await room.update({
          status: 'Disponible',
          available: true
        });
      }
      
      res.json({
        error: false,
        success: true,
        message: 'Checkout completado exitosamente sin gastos extras',
        data: { 
          booking: await Booking.findByPk(bookingId, {
            include: [
              { model: Room, attributes: ['roomNumber', 'status'] },
              { model: Buyer, as: 'guest', attributes: ['scostumername'] }
            ]
          })
        },
        timestamp: formatForLogs(getColombiaTime())
      });
    }
    
  } catch (error) {
    console.error("❌ [CHECKOUT-PAYMENT] Error:", error);
    next(error);
  }
};

// ⭐ FUNCIÓN PARA OBTENER RESUMEN FINANCIERO DE UNA RESERVA
const getBookingFinancialSummary = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    
    if (!bookingId) {
      return res.status(400).json({
        error: true,
        message: 'bookingId es requerido'
      });
    }

    const booking = await Booking.findByPk(bookingId, {
      include: [
        { 
          model: Payment,
          as: 'payments',
          attributes: [
            'paymentId', 'amount', 'paymentStatus', 'paymentType', 
            'paymentDate', 'includesExtras', 'isReservationPayment'
          ]
        },
        { 
          model: ExtraCharge,
          as: 'extraCharges',
          attributes: ['id', 'amount', 'description', 'quantity']
        },
        {
          model: Room,
          attributes: ['roomNumber', 'type']
        }
      ]
    });

    if (!booking) {
      return res.status(404).json({
        error: true,
        message: 'Reserva no encontrada'
      });
    }

    const baseAmount = parseFloat(booking.totalAmount || 0);
    const extraCharges = booking.extraCharges || [];
    const payments = booking.payments || [];

    // Calcular gastos extras
    const totalExtras = extraCharges.reduce((sum, charge) => {
      const chargeAmount = parseFloat(charge.amount || 0);
      const quantity = parseInt(charge.quantity || 1);
      return sum + (chargeAmount * quantity);
    }, 0);

    // Calcular pagos válidos (authorized y completed)
    const validPayments = payments.filter(p => 
      p.paymentStatus === 'authorized' || p.paymentStatus === 'completed'
    );

    const totalPaid = validPayments.reduce((sum, payment) => {
      return sum + parseFloat(payment.amount || 0);
    }, 0);

    const totalFinal = baseAmount + totalExtras;
    const totalPending = Math.max(0, totalFinal - totalPaid);

    // Desglose de pagos
    const reservationPayments = validPayments.filter(p => p.isReservationPayment);
    const extraPayments = validPayments.filter(p => p.includesExtras);
    const checkoutPayments = validPayments.filter(p => p.isCheckoutPayment);

    const summary = {
      booking: {
        bookingId: booking.bookingId,
        status: booking.status,
        roomNumber: booking.roomNumber,
        roomType: booking.Room?.type
      },
      amounts: {
        reservationAmount: baseAmount,
        extraChargesAmount: totalExtras,
        totalAmount: totalFinal,
        totalPaid,
        remainingAmount: totalPending
      },
      status: {
        isFullyPaid: totalPending === 0 && totalFinal > 0,
        hasExtras: totalExtras > 0,
        canCheckout: booking.status === 'checked-in' && totalPending === 0,
        requiresPayment: totalPending > 0
      },
      counts: {
        extraCharges: extraCharges.length,
        totalPayments: payments.length,
        validPayments: validPayments.length,
        reservationPayments: reservationPayments.length,
        extraPayments: extraPayments.length,
        checkoutPayments: checkoutPayments.length
      },
      details: {
        extraCharges: extraCharges.map(charge => ({
          id: charge.id,
          description: charge.description,
          amount: parseFloat(charge.amount),
          quantity: parseInt(charge.quantity || 1),
          total: parseFloat(charge.amount) * parseInt(charge.quantity || 1)
        })),
        payments: validPayments.map(payment => ({
          paymentId: payment.paymentId,
          amount: parseFloat(payment.amount),
          paymentType: payment.paymentType,
          paymentStatus: payment.paymentStatus,
          paymentDate: payment.paymentDate,
          includesExtras: payment.includesExtras,
          isReservationPayment: payment.isReservationPayment
        }))
      }
    };

    res.json({
      error: false,
      success: true,
      message: 'Resumen financiero obtenido exitosamente',
      data: summary,
      timestamp: formatForLogs(getColombiaTime())
    });

  } catch (error) {
    console.error('❌ [FINANCIAL-SUMMARY] Error:', error);
    next(error);
  }
};

// ⭐ FUNCIÓN PARA OBTENER HISTORIAL DE PAGOS
const getPaymentHistory = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    
    if (!bookingId) {
      return res.status(400).json({
        error: true,
        message: 'bookingId es requerido'
      });
    }

    const payments = await Payment.findAll({
      where: { bookingId },
      include: [
        {
          model: Booking,
          attributes: ['bookingId', 'status', 'roomNumber'],
          include: [
            {
              model: Room,
              attributes: ['roomNumber', 'type']
            }
          ]
        }
      ],
      order: [['paymentDate', 'DESC']]
    });

    const formattedPayments = payments.map(payment => ({
      paymentId: payment.paymentId,
      amount: parseFloat(payment.amount),
      paymentMethod: payment.paymentMethod,
      paymentStatus: payment.paymentStatus,
      paymentType: payment.paymentType,
      paymentDate: payment.paymentDate,
      transactionId: payment.transactionId,
      paymentReference: payment.paymentReference,
      processedBy: payment.processedBy,
      includesExtras: payment.includesExtras,
      isReservationPayment: payment.isReservationPayment,
      isCheckoutPayment: payment.isCheckoutPayment,
      notes: payment.notes
    }));

    res.json({
      error: false,
      success: true,
      message: 'Historial de pagos obtenido exitosamente',
      data: {
        bookingId,
        payments: formattedPayments,
        totalPayments: formattedPayments.length
      },
      timestamp: formatForLogs(getColombiaTime())
    });

  } catch (error) {
    console.error('❌ [PAYMENT-HISTORY] Error:', error);
    next(error);
  }
};

// ⭐ FUNCIONES AUXILIARES
const calculateRoomCharge = (booking) => {
  if (!booking.Room) {
    return {
      nights: 0,
      baseCharge: 0,
      roomType: 'Unknown',
      roomNumber: 'N/A',
      pricePerNight: 0
    };
  }
  
  const nights = getDaysDifference(booking.checkIn, booking.checkOut);
  const baseCharge = parseFloat(booking.totalAmount) || 0;
  
  return {
    nights,
    baseCharge,
    roomType: booking.Room.type || 'Unknown',
    roomNumber: booking.Room.roomNumber || 'N/A',
    pricePerNight: nights > 0 ? (baseCharge / nights) : baseCharge
  };
};

// ⭐ FUNCIÓN PARA PROCESAR REEMBOLSOS
const processRefund = async (req, res, next) => {
  try {
    const { paymentId, refundAmount, reason } = req.body;
    
    if (!paymentId || !refundAmount || !reason) {
      return res.status(400).json({
        error: true,
        message: 'Faltan campos requeridos: paymentId, refundAmount, reason'
      });
    }

    const payment = await Payment.findByPk(paymentId);
    
    if (!payment) {
      return res.status(404).json({
        error: true,
        message: 'Pago no encontrado'
      });
    }

    if (payment.paymentStatus === 'refunded') {
      return res.status(400).json({
        error: true,
        message: 'Este pago ya ha sido reembolsado'
      });
    }

    const refundAmountFloat = parseFloat(refundAmount);
    const originalAmount = parseFloat(payment.amount);

    if (refundAmountFloat > originalAmount) {
      return res.status(400).json({
        error: true,
        message: 'El monto del reembolso no puede ser mayor al monto original'
      });
    }

    // Actualizar estado del pago
    await payment.update({
      paymentStatus: 'refunded',
      notes: `${payment.notes || ''} | REEMBOLSO: $${refundAmountFloat} - ${reason}`
    });

    res.json({
      error: false,
      success: true,
      message: 'Reembolso procesado exitosamente',
      data: {
        payment,
        refundAmount: refundAmountFloat,
        reason
      },
      timestamp: formatForLogs(getColombiaTime())
    });

  } catch (error) {
    console.error('❌ [REFUND] Error:', error);
    next(error);
  }
};

module.exports = {
  registerLocalPayment,
  processCheckoutPayment,
  getBookingFinancialSummary,
  getPaymentHistory,
  processRefund,
  calculateRoomCharge,
  mapPaymentMethod,
  mapPaymentType
};