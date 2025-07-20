export const getRealPaymentSummary = (booking) => {
  if (!booking) {
    return {
      totalOriginal: 0,
      totalExtras: 0,
      totalDescuentos: 0,
      totalImpuestos: 0,
      totalFinal: 0,
      totalPagado: 0,
      totalPendiente: 0,
      isFullyPaid: false,
      paymentPercentage: 0,
      hasPayments: false,
      hasExtras: false,
      hasDiscounts: false,
      breakdown: {}
    };
  }

  // ✅ USAR DATOS DEL BACKEND SI ESTÁN DISPONIBLES
  if (booking.financialSummary) {
    const fs = booking.financialSummary;
    
    // ✅ CALCULAR DESCUENTOS CORRECTAMENTE
    const totalDescuentos = parseFloat(
      booking.discountAmount || 
      booking.earlyCheckoutDiscount || 
      fs.totalDescuentos ||
      0
    );

    // ✅ VERIFICAR SI HAY DESCUENTOS POR CHECK-OUT ANTICIPADO
    const hasEarlyCheckoutDiscount = parseFloat(booking.earlyCheckoutDiscount || 0) > 0;
    
    return {
      totalOriginal: parseFloat(fs.totalReserva || booking.totalAmount || 0),
      totalExtras: parseFloat(fs.totalExtras || 0),
      totalDescuentos, // ✅ INCLUIR TODOS LOS DESCUENTOS
      totalImpuestos: parseFloat(booking.taxAmount || 0),
      totalFinal: parseFloat(fs.totalFinal || fs.totalReserva || 0) - totalDescuentos, // ✅ RESTAR DESCUENTOS
      totalPagado: parseFloat(fs.totalPagado || 0),
      totalPendiente: Math.max(0, parseFloat(fs.totalPendiente || 0) - totalDescuentos), // ✅ AJUSTAR PENDIENTE
      isFullyPaid: (parseFloat(fs.totalFinal || 0) - totalDescuentos) <= parseFloat(fs.totalPagado || 0),
      paymentPercentage: (() => {
        const finalAmount = parseFloat(fs.totalFinal || 0) - totalDescuentos;
        const paidAmount = parseFloat(fs.totalPagado || 0);
        return finalAmount > 0 ? Math.min(100, Math.round((paidAmount / finalAmount) * 100)) : 0;
      })(),
      hasPayments: fs.paymentsCount > 0 || fs.totalPagado > 0,
      hasExtras: fs.hasExtras === true || fs.totalExtras > 0,
      hasDiscounts: totalDescuentos > 0,
      hasEarlyCheckoutDiscount, // ✅ NUEVO CAMPO
      
      // ✅ INFORMACIÓN ADICIONAL DEL BACKEND
      paymentStatus: (() => {
        const finalAmount = parseFloat(fs.totalFinal || 0) - totalDescuentos;
        const paidAmount = parseFloat(fs.totalPagado || 0);
        
        if (finalAmount <= paidAmount) return 'fully_paid';
        if (paidAmount === 0) return 'unpaid';
        return 'partially_paid';
      })(),
      paymentsCount: fs.paymentsCount || 0,
      extraChargesCount: fs.extraChargesCount || 0,
      
      // ✅ DESGLOSE USANDO DATOS REALES DEL BACKEND
      breakdown: {
        habitacion: {
          amount: parseFloat(fs.totalReserva || booking.totalAmount || 0),
          description: "Costo de habitación",
          nights: calculateStayNights(booking.checkIn, booking.checkOut),
          roomNumber: booking.roomNumber || booking.room?.roomNumber
        },
        extras: getExtraChargesBreakdown(booking),
        descuentos: getDiscountsBreakdown(booking), // ✅ INCLUIRÁ DESCUENTOS POR CHECK-OUT ANTICIPADO
        impuestos: {
          amount: parseFloat(booking.taxAmount || 0),
          description: "Impuestos aplicables"
        },
        pagos: getPaymentsBreakdown(booking)
      }
    };
  }

  // ✅ FALLBACK A CÁLCULO MANUAL SI NO HAY financialSummary
  console.warn('⚠️ No financialSummary encontrado, usando cálculo manual');
  
  const totalOriginal = parseFloat(booking.totalAmount || 0);
  const totalExtras = calculateExtraCharges(booking);
  const totalDescuentos = parseFloat(booking.discountAmount || booking.earlyCheckoutDiscount || 0);
  const totalImpuestos = parseFloat(booking.taxAmount || 0);
  const totalFinal = Math.max(0, totalOriginal + totalExtras - totalDescuentos + totalImpuestos);
  const totalPagado = calculateTotalPayments(booking);
  const totalPendiente = Math.max(0, totalFinal - totalPagado);

  return {
    totalOriginal,
    totalExtras,
    totalDescuentos,
    totalImpuestos,
    totalFinal,
    totalPagado,
    totalPendiente,
    isFullyPaid: totalPendiente === 0 && totalFinal > 0,
    paymentPercentage: totalFinal > 0 ? Math.round((totalPagado / totalFinal) * 100) : 0,
    hasPayments: totalPagado > 0,
    hasExtras: totalExtras > 0,
    hasDiscounts: totalDescuentos > 0,
    hasEarlyCheckoutDiscount: parseFloat(booking.earlyCheckoutDiscount || 0) > 0,
    breakdown: {
      habitacion: {
        amount: totalOriginal,
        description: "Costo de habitación",
        nights: calculateStayNights(booking.checkIn, booking.checkOut)
      },
      extras: getExtraChargesBreakdown(booking),
      descuentos: getDiscountsBreakdown(booking),
      impuestos: {
        amount: totalImpuestos,
        description: "Impuestos aplicables"
      },
      pagos: getPaymentsBreakdown(booking)
    }
  };
};

// ✅ FUNCIÓN PARA CALCULAR CONSUMOS EXTRAS (adaptada al backend)
export const calculateExtraCharges = (booking) => {
  if (!booking) return 0;

  // ✅ PRIORIZAR DATOS DEL BACKEND
  if (booking.financialSummary?.totalExtras !== undefined) {
    return parseFloat(booking.financialSummary.totalExtras);
  }

  let total = 0;

  // Extras del array extraCharges del backend
  if (booking.extraCharges && Array.isArray(booking.extraCharges)) {
    total += booking.extraCharges.reduce((sum, extra) => {
      return sum + parseFloat(extra.amount || 0);
    }, 0);
  }

  // Otros campos que podrían existir
  if (booking.extraChargesAmount) {
    total += parseFloat(booking.extraChargesAmount);
  }

  return Math.max(0, total);
};

// ✅ FUNCIÓN PARA CALCULAR TOTAL DE PAGOS (adaptada al backend)
export const calculateTotalPayments = (booking) => {
  if (!booking) return 0;

  // ✅ PRIORIZAR DATOS DEL BACKEND
  if (booking.financialSummary?.totalPagado !== undefined) {
    return parseFloat(booking.financialSummary.totalPagado);
  }

  if (booking.paymentInfo?.totalPaid !== undefined) {
    return parseFloat(booking.paymentInfo.totalPaid);
  }

  let total = 0;

  // ✅ PAGOS DEL ARRAY payments DEL BACKEND
  if (booking.payments && Array.isArray(booking.payments)) {
    total += booking.payments.reduce((sum, payment) => {
      // Solo contar pagos autorizados/completados según el backend
      if (payment.paymentStatus === 'authorized' || 
          payment.paymentStatus === 'completed' || 
          payment.paymentStatus === 'success') {
        return sum + parseFloat(payment.amount || 0);
      }
      return sum;
    }, 0);
  }

  return Math.max(0, total);
};

// ✅ FUNCIÓN PARA OBTENER DESGLOSE DE EXTRAS (adaptada al backend)
export const getExtraChargesBreakdown = (booking) => {
  const extras = [];

  if (booking.extraCharges && Array.isArray(booking.extraCharges)) {
    booking.extraCharges.forEach((extra, index) => {
      extras.push({
        id: extra.extraChargeId || extra.id || `extra-${index}`,
        description: extra.description || extra.concept || `Cargo extra ${index + 1}`,
        amount: parseFloat(extra.amount || 0),
        date: extra.chargeDate || extra.createdAt,
        category: extra.category || 'general',
        processedBy: extra.processedBy
      });
    });
  }

  return extras;
};

// ✅ FUNCIÓN PARA OBTENER DESGLOSE DE PAGOS (adaptada al backend)
export const getPaymentsBreakdown = (booking) => {
  const payments = [];

  if (booking.payments && Array.isArray(booking.payments)) {
    booking.payments.forEach((payment, index) => {
      payments.push({
        id: payment.paymentId || `payment-${index}`,
        amount: parseFloat(payment.amount || 0),
        method: payment.paymentMethod || 'efectivo',
        date: payment.paymentDate || payment.createdAt,
        status: payment.paymentStatus || 'completed',
        reference: payment.paymentReference || payment.transactionId,
        description: getPaymentMethodDescription(payment.paymentMethod),
        type: payment.paymentType || 'full',
        processedBy: payment.processedBy
      });
    });
  }

  return payments;
};

// ✅ FUNCIÓN PARA CALCULAR NOCHES DE ESTADÍA
export const calculateStayNights = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;

  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  
  const diffTime = checkOutDate - checkInDate;
  const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(1, nights);
};

// ✅ FUNCIÓN PARA OBTENER DESGLOSE DE DESCUENTOS
export const getDiscountsBreakdown = (booking) => {
  const discounts = [];

  // Descuento principal
  if (booking.discountAmount && parseFloat(booking.discountAmount) > 0) {
    discounts.push({
      id: 'main-discount',
      description: booking.discountReason || 'Descuento aplicado',
      amount: parseFloat(booking.discountAmount),
      date: booking.discountDate || booking.updatedAt,
      type: booking.discountType || 'manual'
    });
  }

  // ✅ DESCUENTO POR CHECK-OUT ANTICIPADO
  if (booking.earlyCheckoutDiscount && parseFloat(booking.earlyCheckoutDiscount) > 0) {
    discounts.push({
      id: 'early-checkout-discount',
      description: booking.earlyCheckoutReason || 'Descuento por check-out anticipado',
      amount: parseFloat(booking.earlyCheckoutDiscount),
      date: booking.actualCheckOut || booking.updatedAt,
      type: 'early_checkout',
      originalNights: booking.originalNights,
      actualNights: booking.actualNights,
      nightsSaved: (booking.originalNights || 0) - (booking.actualNights || 0)
    });
  }

  // ✅ OTROS DESCUENTOS ESPECÍFICOS
  if (booking.promoDiscount && parseFloat(booking.promoDiscount) > 0) {
    discounts.push({
      id: 'promo-discount',
      description: 'Descuento promocional',
      amount: parseFloat(booking.promoDiscount),
      date: booking.updatedAt,
      type: 'promotion'
    });
  }

  return discounts;
};

// ✅ FUNCIÓN PARA OBTENER DESCRIPCIÓN DE MÉTODO DE PAGO
export const getPaymentMethodDescription = (method) => {
  const methods = {
    'cash': 'Efectivo',
    'efectivo': 'Efectivo',
    'card': 'Tarjeta',
    'tarjeta': 'Tarjeta',
    'credit_card': 'Tarjeta de Crédito',
    'debit_card': 'Tarjeta de Débito',
    'transfer': 'Transferencia',
    'transferencia': 'Transferencia',
    'nequi': 'Nequi',
    'daviplata': 'Daviplata',
    'pse': 'PSE',
    'mixed': 'Mixto',
    'partial': 'Pago Parcial',
    'full': 'Pago Completo',
    'other': 'Otro'
  };

  return methods[method?.toLowerCase()] || method || 'No especificado';
};

// ✅ FUNCIÓN PARA VALIDAR SI SE PUEDE APLICAR DESCUENTO
export const canApplyDiscount = (booking, discountAmount, discountType = 'manual') => {
  if (!booking || !discountAmount || discountAmount <= 0) {
    return { can: false, reason: 'Datos de descuento inválidos' };
  }

  const financials = getRealPaymentSummary(booking);
  
  // No permitir descuentos mayores al total original
  if (discountAmount > financials.totalOriginal) {
    return { 
      can: false, 
      reason: `El descuento no puede ser mayor al costo original ($${financials.totalOriginal.toLocaleString()})` 
    };
  }

  return { can: true, reason: null };
};

// ✅ FUNCIÓN PARA CALCULAR DESCUENTO POR CHECK-OUT ANTICIPADO
export const calculateEarlyCheckoutDiscount = (booking, newCheckOutDate) => {
  if (!booking || !newCheckOutDate) {
    return { discount: 0, reason: 'Datos insuficientes' };
  }

  const originalCheckOut = new Date(booking.checkOut);
  const earlyCheckOut = new Date(newCheckOutDate);
  const checkIn = new Date(booking.checkIn);

  // Validar fechas
  if (earlyCheckOut >= originalCheckOut) {
    return { discount: 0, reason: 'No es check-out anticipado' };
  }

  if (earlyCheckOut <= checkIn) {
    return { discount: 0, reason: 'Fecha de salida inválida' };
  }

  // Calcular noches
  const originalNights = calculateStayNights(booking.checkIn, booking.checkOut);
  const actualNights = calculateStayNights(booking.checkIn, newCheckOutDate);
  const nightsSaved = originalNights - actualNights;

  if (nightsSaved <= 0) {
    return { discount: 0, reason: 'No hay noches ahorradas' };
  }

  // ✅ USAR DATOS DEL BACKEND PARA CALCULAR
  const originalAmount = parseFloat(
    booking.financialSummary?.totalReserva || 
    booking.totalAmount || 
    0
  );
  
  const costPerNight = originalAmount / originalNights;
  const discount = Math.round(costPerNight * nightsSaved);

  const reason = `Check-out anticipado: ${nightsSaved} noche${nightsSaved > 1 ? 's' : ''} menos (${originalNights} → ${actualNights})`;

  return {
    discount: Math.max(0, discount),
    reason,
    originalNights,
    actualNights,
    nightsSaved,
    costPerNight
  };
};

// ✅ FUNCIÓN PARA FORMATEAR RESUMEN FINANCIERO
export const formatPaymentSummary = (financials, options = {}) => {
  const { includeBreakdown = false, currency = 'COP' } = options;

  const format = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const summary = {
    totalOriginal: format(financials.totalOriginal),
    totalExtras: format(financials.totalExtras),
    totalDescuentos: format(financials.totalDescuentos),
    totalFinal: format(financials.totalFinal),
    totalPagado: format(financials.totalPagado),
    totalPendiente: format(financials.totalPendiente),
    paymentPercentage: `${financials.paymentPercentage}%`,
    status: financials.isFullyPaid ? 'Pagado completo' : 'Pagos pendientes',
    paymentStatus: financials.paymentStatus || 'unknown'
  };

  if (includeBreakdown) {
    summary.breakdown = {
      extras: financials.breakdown.extras.map(extra => ({
        ...extra,
        amount: format(extra.amount)
      })),
      descuentos: financials.breakdown.descuentos.map(discount => ({
        ...discount,
        amount: format(discount.amount)
      })),
      pagos: financials.breakdown.pagos.map(payment => ({
        ...payment,
        amount: format(payment.amount)
      }))
    };
  }

  return summary;
};

// ✅ FUNCIÓN PARA OBTENER ESTADO DE PAGO CON COLOR
export const getPaymentStatus = (financials) => {
  if (!financials) {
    return { status: 'unknown', color: 'gray', text: 'Sin información' };
  }

  // ✅ USAR ESTADO DEL BACKEND SI ESTÁ DISPONIBLE
  if (financials.paymentStatus) {
    const statusMap = {
      'fully_paid': { status: 'paid', color: 'green', text: 'Pagado completo' },
      'partially_paid': { 
        status: 'partial', 
        color: 'yellow', 
        text: `Pagado ${financials.paymentPercentage}%`,
        pending: financials.totalPendiente
      },
      'unpaid': { status: 'unpaid', color: 'red', text: 'Sin pagos' },
      'pending': { status: 'pending', color: 'orange', text: 'Pago pendiente' }
    };

    return statusMap[financials.paymentStatus] || { status: 'unknown', color: 'gray', text: 'Estado desconocido' };
  }

  // Fallback a lógica anterior
  if (financials.isFullyPaid) {
    return { status: 'paid', color: 'green', text: 'Pagado completo' };
  } else if (financials.paymentPercentage === 0) {
    return { status: 'unpaid', color: 'red', text: 'Sin pagos' };
  } else if (financials.paymentPercentage > 0) {
    return { 
      status: 'partial', 
      color: 'yellow', 
      text: `Pagado ${financials.paymentPercentage}%`,
      pending: financials.totalPendiente
    };
  }

  return { status: 'unknown', color: 'gray', text: 'Estado desconocido' };
};

// ✅ FUNCIÓN PARA VALIDAR DATOS DE PAGO
export const validatePaymentData = (paymentData) => {
  const errors = [];

  if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
    errors.push('El monto debe ser mayor a 0');
  }

  if (!paymentData.method) {
    errors.push('Debe especificar el método de pago');
  }

  if (paymentData.method === 'card' && !paymentData.reference) {
    errors.push('Se requiere referencia para pagos con tarjeta');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// ✅ FUNCIÓN PARA OBTENER INFORMACIÓN DE RESERVA PARA PAGOS
export const getBookingForPayment = (booking) => {
  if (!booking) return null;

  const financials = getRealPaymentSummary(booking);

  return {
    bookingId: booking.bookingId,
    roomNumber: booking.roomNumber || booking.room?.roomNumber,
    guestName: booking.guest?.scostumername || 'N/A',
    guestId: booking.guest?.sdocno || booking.guestId,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    totalAmount: financials.totalFinal,
    totalPaid: financials.totalPagado,
    totalPending: financials.totalPendiente,
    paymentStatus: financials.paymentStatus,
    isFullyPaid: financials.isFullyPaid,
    canMakePayment: financials.totalPendiente > 0 && booking.status !== 'completed',
    existingPayments: financials.breakdown.pagos
  };
};

export default {
  getRealPaymentSummary,
  calculateExtraCharges,
  calculateTotalPayments,
  calculateStayNights,
  getExtraChargesBreakdown,
  getDiscountsBreakdown,
  getPaymentsBreakdown,
  getPaymentMethodDescription,
  canApplyDiscount,
  calculateEarlyCheckoutDiscount,
  formatPaymentSummary,
  getPaymentStatus,
  validatePaymentData,
  getBookingForPayment // ✅ NUEVA FUNCIÓN
};