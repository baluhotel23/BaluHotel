const { Booking, Payment, User, Buyer, sequelize, ExtraCharge, Room, Bill } = require('../data');
const { CustomError } = require('../middleware/error');
const { Op } = require("sequelize");

// ⭐ IMPORTAR UTILIDADES DE FECHA
const { 
  formatForLogs,
  formatForDetailedLogs,
  getDaysDifference 
} = require('../utils/dateUtils');

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

const mapPaymentType = (type) => {
  const typeMap = {
    'checkout': 'full',        // ✅ checkout → full (pago completo al salir)
    'checkin': 'partial',      // ✅ checkin → partial (depósito al entrar)
    'full': 'full',            // ✅ mantener full
    'partial': 'partial',      // ✅ mantener partial
    'online': 'online',        // ✅ mantener online
    'deposit': 'partial',      // ✅ depósito → partial
    'final': 'full',          // ✅ pago final → full
    'complete': 'full',       // ✅ completo → full
    'wompi': 'online',        // ✅ wompi → online
    'wompi_checkout': 'online' // ✅ wompi_checkout → online
  };
  
  const mappedType = typeMap[type?.toLowerCase()];
  
  if (!mappedType) {
    console.warn(`⚠️ [PAYMENT-CONTROLLER] Tipo de pago no reconocido: '${type}', usando 'partial' por defecto`);
    return 'partial';  // ✅ Default seguro
  }
  
  console.log(`✅ [PAYMENT-CONTROLLER] Tipo mapeado: '${type}' → '${mappedType}'`);
  return mappedType;
};

const registerLocalPayment = async (req, res, next) => {
  console.log('💳 [PAYMENT-CONTROLLER] === Iniciando Proceso: registerLocalPayment ===');
  console.log('💳 [PAYMENT-CONTROLLER] Timestamp:', formatForLogs(new Date()));
  
  try {
    const { bookingId, amount, paymentMethod, paymentType: paymentTypeFromBody } = req.body;
    
    console.log('💳 [PAYMENT-CONTROLLER] Request data:', {
      bookingId,
      amount,
      paymentMethod,
      paymentType: paymentTypeFromBody
    });

    if (!req.user || !req.user.n_document) {
      console.log('❌ [PAYMENT-CONTROLLER] Usuario no autenticado');
      return res.status(401).json({ error: true, message: 'Usuario no autenticado o token inválido.' });
    }
    const staffUserNdocument = req.user.n_document;
    console.log('👨‍💼 [PAYMENT-CONTROLLER] Staff user:', staffUserNdocument);

    // ⭐ MAPEAR MÉTODO Y TIPO DE PAGO ANTES DE VALIDAR
    const mappedPaymentMethod = mapPaymentMethod(paymentMethod);
    const mappedPaymentType = mapPaymentType(paymentTypeFromBody);
    
    console.log('💳 [PAYMENT-CONTROLLER] Valores mapeados:', {
      originalMethod: paymentMethod,
      mappedMethod: mappedPaymentMethod,
      originalType: paymentTypeFromBody,
      mappedType: mappedPaymentType
    });

    // Validar el monto del pago
    const paymentAmountFloat = parseFloat(amount);
    if (isNaN(paymentAmountFloat) || paymentAmountFloat <= 0) {
      console.log('❌ [PAYMENT-CONTROLLER] Monto inválido:', amount);
      throw new CustomError(`Monto del pago inválido: '${amount}'. Debe ser un número positivo.`, 400);
    }
    console.log('✅ [PAYMENT-CONTROLLER] Monto válido:', paymentAmountFloat);

    // ⭐ BUSCAR LA RESERVA CON TODOS LOS DATOS NECESARIOS
    console.log('🔍 [PAYMENT-CONTROLLER] Buscando reserva con ID:', bookingId);
    
    const booking = await Booking.findByPk(bookingId, {
      include: [
        { 
          model: Payment,
          as: 'payments',
          where: { paymentStatus: ['completed', 'pending'] },
          required: false
        },
        { 
          model: ExtraCharge,
          as: 'extraCharges',
          required: false
        },
        { 
          model: Room,
          as: 'room',
          required: false
        },
        { 
          model: Buyer, 
          as: "guest",
          required: false
        }
      ],
    });

    if (!booking) {
      console.log('❌ [PAYMENT-CONTROLLER] Reserva no encontrada:', bookingId);
      throw new CustomError(`Reserva con bookingId '${bookingId}' no encontrada.`, 404);
    }
    
    console.log('✅ [PAYMENT-CONTROLLER] Reserva encontrada:', {
      bookingId: booking.bookingId,
      totalAmount: booking.totalAmount,
      status: booking.status,
      existingPayments: booking.payments ? booking.payments.length : 0,
      extraCharges: booking.extraCharges ? booking.extraCharges.length : 0
    });

    // 🔧 CALCULAR TOTAL REAL (RESERVA + EXTRAS)
    console.log('💰 [PAYMENT-CONTROLLER] Calculando totales reales...');
    
    const baseAmount = parseFloat(booking.totalAmount || 0);
    const extraCharges = booking.extraCharges || [];
    
    // ✅ INCLUIR CARGOS EXTRAS EN EL CÁLCULO TOTAL
    const totalExtras = extraCharges.reduce((sum, charge) => {
      const amount = parseFloat(charge.amount || 0);
      const quantity = parseInt(charge.quantity || 1);
      const chargeTotal = amount * quantity;
      
      console.log(`💰 [PAYMENT-CONTROLLER] Cargo extra: ${charge.description || 'Sin descripción'} - $${amount} x ${quantity} = $${chargeTotal}`);
      
      return sum + chargeTotal;
    }, 0);
    
    const totalBookingWithExtras = baseAmount + totalExtras;

    // ✅ CALCULAR TOTAL PAGADO CORRECTAMENTE
    const totalSuccessfullyPaid = await Payment.sum('amount', {
      where: { 
        bookingId: booking.bookingId, 
        paymentStatus: 'completed' 
      },
    }) || 0;
    
    const remainingAmount = totalBookingWithExtras - totalSuccessfullyPaid;

    console.log('💰 [PAYMENT-CONTROLLER] Cálculos corregidos:', {
      baseAmount,
      totalExtras,
      totalBookingWithExtras,
      totalPaid: totalSuccessfullyPaid,
      remaining: remainingAmount,
      newPayment: paymentAmountFloat
    });

    // ✅ VALIDAR QUE EL PAGO NO EXCEDA EL MONTO PENDIENTE
    if (paymentAmountFloat > remainingAmount) {
      console.log('❌ [PAYMENT-CONTROLLER] Pago excede monto restante');
      throw new CustomError(
        `El monto del pago ($${paymentAmountFloat.toFixed(2)}) excede el monto pendiente ($${remainingAmount.toFixed(2)}). ` +
        `Total reserva: $${baseAmount.toFixed(2)}, Extras: $${totalExtras.toFixed(2)}, Total final: $${totalBookingWithExtras.toFixed(2)}, Ya pagado: $${totalSuccessfullyPaid.toFixed(2)}.`, 
        400
      );
    }

    // ⭐ DETERMINAR EL TIPO DE PAGO FINAL BASADO EN EL MONTO
    const isFullPayment = paymentAmountFloat >= remainingAmount;
    const finalPaymentType = mappedPaymentType || (isFullPayment ? 'full' : 'partial');

    console.log('💳 [PAYMENT-CONTROLLER] Determinando tipo de pago:', {
      isFullPayment,
      remainingAmount,
      paymentAmount: paymentAmountFloat,
      mappedType: mappedPaymentType,
      finalType: finalPaymentType
    });

    // ⭐ REGISTRAR EL PAGO CON VALORES MAPEADOS
    console.log('💾 [PAYMENT-CONTROLLER] Creando pago...');
    
    const newPayment = await Payment.create({
      bookingId: booking.bookingId,
      amount: paymentAmountFloat,
      paymentMethod: mappedPaymentMethod,    // ✅ USAR MÉTODO MAPEADO
      paymentStatus: 'completed',
      paymentType: finalPaymentType,         // ✅ USAR TIPO MAPEADO
      paymentDate: new Date(),
      processedBy: staffUserNdocument,
    });

    console.log('✅ [PAYMENT-CONTROLLER] Pago creado exitosamente:', {
      paymentId: newPayment.paymentId || newPayment.id,
      amount: newPayment.amount,
      method: newPayment.paymentMethod,
      type: newPayment.paymentType,
      status: newPayment.paymentStatus
    });

    // ⭐ ACTUALIZAR ESTADO DE LA RESERVA CON CÁLCULO CORRECTO
    const newTotalPaidAfterThisPayment = totalSuccessfullyPaid + paymentAmountFloat;
    const finalRemainingAmount = totalBookingWithExtras - newTotalPaidAfterThisPayment;
    
    console.log('💰 [PAYMENT-CONTROLLER] Total después del pago:', {
      newTotalPaid: newTotalPaidAfterThisPayment,
      totalFinal: totalBookingWithExtras,
      stillPending: finalRemainingAmount
    });
    
    if (newTotalPaidAfterThisPayment >= totalBookingWithExtras) {
      console.log('✅ [PAYMENT-CONTROLLER] Reserva completamente pagada, actualizando estado...');
      
      await booking.update({ status: 'completed' });

      // ⭐ GENERAR LA FACTURA CON TOTALES CORRECTOS
      try {
        console.log('📄 [PAYMENT-CONTROLLER] Generando factura...');
        
        const bill = await Bill.create({
          bookingId: booking.bookingId,
          reservationAmount: baseAmount,
          extraChargesAmount: totalExtras,
          totalAmount: totalBookingWithExtras,
          status: 'paid',
          paymentMethod: mappedPaymentMethod,   // ✅ USAR MÉTODO MAPEADO EN FACTURA
          generatedBy: staffUserNdocument,
          generatedAt: new Date(),
          details: JSON.stringify({
            roomCharge: calculateRoomCharge(booking),
            extraCharges: extraCharges.map(charge => ({
              id: charge.id,
              description: charge.description,
              amount: parseFloat(charge.amount || 0),
              quantity: parseInt(charge.quantity || 1),
              total: parseFloat(charge.amount || 0) * parseInt(charge.quantity || 1)
            })),
            totalExtras,
            nights: getDaysDifference(booking.checkIn, booking.checkOut),
            roomDetails: booking.room || {},
            guestDetails: booking.guest || {},
            generatedAt: formatForLogs(new Date())
          }),
        });

        console.log('✅ [PAYMENT-CONTROLLER] Factura generada:', bill.idBill || bill.id);
      } catch (billError) {
        console.error('❌ [PAYMENT-CONTROLLER] Error generando factura:', billError);
        // No fallar el pago por esto, solo loggear el error
      }
    }

    // ⭐ PREPARAR RESPUESTA CON RESUMEN FINANCIERO COMPLETO
    const financialSummary = {
      totalReserva: baseAmount,
      totalExtras: totalExtras,
      totalFinal: totalBookingWithExtras,
      totalPagado: newTotalPaidAfterThisPayment,
      totalPendiente: Math.max(0, finalRemainingAmount),
      isFullyPaid: newTotalPaidAfterThisPayment >= totalBookingWithExtras,
      hasExtras: totalExtras > 0,
      extraChargesCount: extraCharges.length,
      paymentsCount: (booking.payments?.filter(p => p.paymentStatus === 'completed').length || 0) + 1,
      // Campos formateados para la UI
      totalReservaFormatted: `$${baseAmount.toLocaleString()}`,
      totalExtrasFormatted: `$${totalExtras.toLocaleString()}`,
      totalPagadoFormatted: `$${newTotalPaidAfterThisPayment.toLocaleString()}`,
      totalFinalFormatted: `$${totalBookingWithExtras.toLocaleString()}`,
      totalPendienteFormatted: `$${Math.max(0, finalRemainingAmount).toLocaleString()}`,
      paymentPercentage: totalBookingWithExtras > 0 ? Math.round((newTotalPaidAfterThisPayment / totalBookingWithExtras) * 100) : 0
    };

    const response = {
      error: false,
      message: 'Pago registrado exitosamente.',
      data: {
        payment: newPayment.toJSON(),
        booking: {
          ...booking.toJSON(),
          financialSummary
        },
      },
    };

    console.log('✅ [PAYMENT-CONTROLLER] Proceso completado exitosamente:', {
      paymentId: newPayment.paymentId || newPayment.id,
      bookingStatus: booking.status,
      isFullyPaid: financialSummary.isFullyPaid,
      totalFinal: financialSummary.totalFinal,
      totalPagado: financialSummary.totalPagado,
      totalPendiente: financialSummary.totalPendiente,
      completedAt: formatForLogs(new Date())
    });

    res.status(201).json(response);
    
  } catch (error) {
    console.error("❌ [PAYMENT-CONTROLLER] Error en registerLocalPayment:", error);
    console.error("❌ [PAYMENT-CONTROLLER] Error timestamp:", formatForDetailedLogs(new Date()));
    next(error);
  }
};

// ⭐ FUNCIONES AUXILIARES
const calculateRoomCharge = (booking) => {
  if (!booking.room) {
    return {
      nights: 0,
      baseCharge: 0,
      roomType: 'Unknown'
    };
  }
  
  const nights = getDaysDifference(booking.checkIn, booking.checkOut);
  const baseCharge = parseFloat(booking.totalAmount) || 0;
  
  return {
    nights,
    baseCharge,
    roomType: booking.room.type || 'Unknown',
    roomNumber: booking.room.roomNumber || 'N/A',
    pricePerNight: nights > 0 ? (baseCharge / nights) : baseCharge
  };
};

// ⭐ FUNCIÓN PARA OBTENER RESUMEN FINANCIERO DE UNA RESERVA
const getBookingFinancialSummary = async (bookingId) => {
  try {
    const booking = await Booking.findByPk(bookingId, {
      include: [
        { 
          model: Payment,
          as: 'payments',
          where: { paymentStatus: 'completed' },
          required: false
        },
        { 
          model: ExtraCharge,
          as: 'extraCharges',
          required: false
        }
      ],
    });

    if (!booking) {
      throw new CustomError(`Reserva con ID ${bookingId} no encontrada.`, 404);
    }

    const baseAmount = parseFloat(booking.totalAmount || 0);
    const extraCharges = booking.extraCharges || [];
    const payments = booking.payments || [];

    const totalExtras = extraCharges.reduce((sum, charge) => {
      return sum + (parseFloat(charge.amount || 0) * parseInt(charge.quantity || 1));
    }, 0);

    const totalPaid = payments.reduce((sum, payment) => {
      return sum + parseFloat(payment.amount || 0);
    }, 0);

    const totalFinal = baseAmount + totalExtras;
    const totalPending = Math.max(0, totalFinal - totalPaid);

    return {
      totalReserva: baseAmount,
      totalExtras,
      totalFinal,
      totalPagado: totalPaid,
      totalPendiente: totalPending,
      isFullyPaid: totalPending === 0 && totalFinal > 0,
      hasExtras: totalExtras > 0,
      extraChargesCount: extraCharges.length,
      paymentsCount: payments.length
    };
  } catch (error) {
    console.error('❌ [PAYMENT-CONTROLLER] Error obteniendo resumen financiero:', error);
    throw error;
  }
};

module.exports = {
  registerLocalPayment,
  getBookingFinancialSummary
};