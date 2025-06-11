const { Booking, Payment, User, Buyer, sequelize, ExtraCharge, Room, Bill } = require('../data'); // ⭐ AGREGAR Bill
const { CustomError } = require('../middleware/error');
const { Op } = require("sequelize");

// ⭐ IMPORTAR UTILIDADES DE FECHA
const { 
  formatForLogs,
  formatForDetailedLogs,
  getDaysDifference 
} = require('../utils/dateUtils');

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

    // Validar el monto del pago
    const paymentAmountFloat = parseFloat(amount);
    if (isNaN(paymentAmountFloat) || paymentAmountFloat <= 0) {
      console.log('❌ [PAYMENT-CONTROLLER] Monto inválido:', amount);
      throw new CustomError(`Monto del pago inválido: '${amount}'. Debe ser un número positivo.`, 400);
    }
    console.log('✅ [PAYMENT-CONTROLLER] Monto válido:', paymentAmountFloat);

    // ⭐ BUSCAR LA RESERVA CON ALIASES CORRECTOS
    console.log('🔍 [PAYMENT-CONTROLLER] Buscando reserva con ID:', bookingId);
    
    const booking = await Booking.findByPk(bookingId, {
      include: [
        { 
          model: Payment,
          as: 'payments' // ⭐ PROBAR CON ESTE ALIAS PRIMERO
        },
        { 
          model: ExtraCharge,
          as: 'extraCharges' // ⭐ PROBAR CON ESTE ALIAS
        },
        { 
          model: Room,
          as: 'room' // ⭐ PROBAR CON ESTE ALIAS
        },
        { 
          model: Buyer, 
          as: "guest" // ⭐ ESTE YÁ LO TIENES CORRECTO
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

    // Calcular el total pagado y el monto restante
    console.log('💰 [PAYMENT-CONTROLLER] Calculando montos...');
    
    const totalSuccessfullyPaid = await Payment.sum('amount', {
      where: { bookingId: booking.bookingId, paymentStatus: 'completed' },
    }) || 0;
    
    const bookingTotalAmountFloat = parseFloat(booking.totalAmount);
    const remainingAmount = bookingTotalAmountFloat - totalSuccessfullyPaid;

    console.log('💰 [PAYMENT-CONTROLLER] Cálculos:', {
      totalBooking: bookingTotalAmountFloat,
      totalPaid: totalSuccessfullyPaid,
      remaining: remainingAmount,
      newPayment: paymentAmountFloat
    });

    if (paymentAmountFloat > remainingAmount) {
      console.log('❌ [PAYMENT-CONTROLLER] Pago excede monto restante');
      throw new CustomError(`El monto del pago (${paymentAmountFloat.toFixed(2)}) excede el monto restante (${remainingAmount.toFixed(2)}).`, 400);
    }

    // ⭐ REGISTRAR EL PAGO
    console.log('💾 [PAYMENT-CONTROLLER] Creando pago...');
    
    const newPayment = await Payment.create({
      bookingId: booking.bookingId,
      amount: paymentAmountFloat,
      paymentMethod,
      paymentStatus: 'completed',
      paymentType: paymentTypeFromBody || (paymentAmountFloat >= remainingAmount ? 'full' : 'partial'),
      paymentDate: new Date(),
      processedBy: staffUserNdocument,
    });

    console.log('✅ [PAYMENT-CONTROLLER] Pago creado:', {
      paymentId: newPayment.id,
      amount: newPayment.amount,
      method: newPayment.paymentMethod,
      type: newPayment.paymentType
    });

    // ⭐ ACTUALIZAR ESTADO DE LA RESERVA SI ESTÁ COMPLETAMENTE PAGADA
    const newTotalPaidAfterThisPayment = totalSuccessfullyPaid + paymentAmountFloat;
    console.log('💰 [PAYMENT-CONTROLLER] Total después del pago:', newTotalPaidAfterThisPayment);
    
    if (newTotalPaidAfterThisPayment >= bookingTotalAmountFloat) {
      console.log('✅ [PAYMENT-CONTROLLER] Reserva completamente pagada, actualizando estado...');
      
      await booking.update({ status: 'completed' });

      // ⭐ GENERAR LA FACTURA (SI TIENES EL MODELO Bill)
      try {
        console.log('📄 [PAYMENT-CONTROLLER] Generando factura...');
        
        const bill = await Bill.create({
          bookingId: booking.bookingId,
          totalAmount: bookingTotalAmountFloat,
          generatedBy: staffUserNdocument,
          details: {
            roomCharge: calculateRoomCharge(booking),
            extraCharges: booking.extraCharges || [],
            nights: getDaysDifference(booking.checkIn, booking.checkOut), // ⭐ USAR UTILIDAD
            roomDetails: booking.room || {},
            guestDetails: booking.guest || {},
            generatedAt: formatForLogs(new Date())
          },
        });

        console.log('✅ [PAYMENT-CONTROLLER] Factura generada:', bill.id);
      } catch (billError) {
        console.error('❌ [PAYMENT-CONTROLLER] Error generando factura:', billError);
        // No fallar el pago por esto
      }
    }

    // ⭐ PREPARAR RESPUESTA
    const response = {
      error: false,
      message: 'Pago registrado exitosamente.',
      data: {
        payment: newPayment.toJSON(),
        booking: {
          ...booking.toJSON(),
          totalPaid: newTotalPaidAfterThisPayment,
          remainingAmount: bookingTotalAmountFloat - newTotalPaidAfterThisPayment,
          isFullyPaid: newTotalPaidAfterThisPayment >= bookingTotalAmountFloat
        },
      },
    };

    console.log('✅ [PAYMENT-CONTROLLER] Proceso completado exitosamente:', {
      paymentId: newPayment.id,
      bookingStatus: booking.status,
      isFullyPaid: newTotalPaidAfterThisPayment >= bookingTotalAmountFloat,
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
  if (!booking.room) return 0;
  
  const nights = getDaysDifference(booking.checkIn, booking.checkOut);
  const baseCharge = parseFloat(booking.totalAmount) || 0;
  
  return {
    nights,
    baseCharge,
    roomType: booking.room.type || 'Unknown'
  };
};

module.exports = {
  registerLocalPayment,
};