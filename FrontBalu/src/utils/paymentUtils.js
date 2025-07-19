/**
 * Utilidades para el manejo de pagos y cálculos financieros
 */

// ✅ FUNCIÓN PRINCIPAL PARA OBTENER RESUMEN REAL DE PAGOS
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

  // ✅ OBTENER MONTOS BASE
  const totalOriginal = parseFloat(booking.originalAmount || booking.totalAmount || 0);
  const totalExtras = calculateExtraCharges(booking);
  const totalDescuentos = parseFloat(booking.discountAmount || 0);
  const totalImpuestos = parseFloat(booking.taxAmount || 0);

  // ✅ CALCULAR TOTAL FINAL
  const totalFinal = Math.max(0, totalOriginal + totalExtras - totalDescuentos + totalImpuestos);

  // ✅ OBTENER PAGOS REALIZADOS
  const totalPagado = calculateTotalPayments(booking);

  // ✅ CALCULAR PENDIENTE
  const totalPendiente = Math.max(0, totalFinal - totalPagado);

  // ✅ ESTADOS BOOLEANOS
  const isFullyPaid = totalPendiente === 0 && totalFinal > 0;
  const hasPayments = totalPagado > 0;
  const hasExtras = totalExtras > 0;
  const hasDiscounts = totalDescuentos > 0;

  // ✅ PORCENTAJE DE PAGO
  const paymentPercentage = totalFinal > 0 ? Math.round((totalPagado / totalFinal) * 100) : 0;

  // ✅ DESGLOSE DETALLADO
  const breakdown = {
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
  };

  return {
    totalOriginal,
    totalExtras,
    totalDescuentos,
    totalImpuestos,
    totalFinal,
    totalPagado,
    totalPendiente,
    isFullyPaid,
    paymentPercentage,
    hasPayments,
    hasExtras,
    hasDiscounts,
    breakdown
  };
};

// ✅ FUNCIÓN PARA CALCULAR CONSUMOS EXTRAS
export const calculateExtraCharges = (booking) => {
  if (!booking) return 0;

  let total = 0;

  // Extras de la reserva directa
  if (booking.extraCharges && Array.isArray(booking.extraCharges)) {
    total += booking.extraCharges.reduce((sum, extra) => {
      return sum + parseFloat(extra.amount || 0);
    }, 0);
  }

  // Extras desde extraChargesAmount
  if (booking.extraChargesAmount) {
    total += parseFloat(booking.extraChargesAmount);
  }

  // Extras desde consumos
  if (booking.consumos && Array.isArray(booking.consumos)) {
    total += booking.consumos.reduce((sum, consumo) => {
      return sum + (parseFloat(consumo.cantidad || 0) * parseFloat(consumo.precio || 0));
    }, 0);
  }

  // Extras desde servicios adicionales
  if (booking.additionalServices && Array.isArray(booking.additionalServices)) {
    total += booking.additionalServices.reduce((sum, service) => {
      return sum + parseFloat(service.amount || 0);
    }, 0);
  }

  return Math.max(0, total);
};

// ✅ FUNCIÓN PARA CALCULAR TOTAL DE PAGOS
export const calculateTotalPayments = (booking) => {
  if (!booking) return 0;

  let total = 0;

  // Pagos desde payments array
  if (booking.payments && Array.isArray(booking.payments)) {
    total += booking.payments.reduce((sum, payment) => {
      // Solo contar pagos exitosos
      if (payment.status === 'completed' || payment.status === 'success' || payment.status === 'paid') {
        return sum + parseFloat(payment.amount || 0);
      }
      return sum;
    }, 0);
  }

  // Pago desde paidAmount
  if (booking.paidAmount) {
    total += parseFloat(booking.paidAmount);
  }

  // Anticipos
  if (booking.advancePayment) {
    total += parseFloat(booking.advancePayment);
  }

  // Depósito
  if (booking.depositAmount) {
    total += parseFloat(booking.depositAmount);
  }

  return Math.max(0, total);
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

// ✅ FUNCIÓN PARA OBTENER DESGLOSE DE EXTRAS
export const getExtraChargesBreakdown = (booking) => {
  const extras = [];

  if (booking.extraCharges && Array.isArray(booking.extraCharges)) {
    booking.extraCharges.forEach((extra, index) => {
      extras.push({
        id: extra.id || `extra-${index}`,
        description: extra.description || extra.concept || `Cargo extra ${index + 1}`,
        amount: parseFloat(extra.amount || 0),
        date: extra.date || extra.createdAt,
        category: extra.category || 'general'
      });
    });
  }

  if (booking.consumos && Array.isArray(booking.consumos)) {
    booking.consumos.forEach((consumo, index) => {
      const amount = parseFloat(consumo.cantidad || 0) * parseFloat(consumo.precio || 0);
      extras.push({
        id: consumo.id || `consumo-${index}`,
        description: `${consumo.producto || 'Producto'} (x${consumo.cantidad || 1})`,
        amount: amount,
        date: consumo.fecha || consumo.createdAt,
        category: 'consumo'
      });
    });
  }

  if (booking.additionalServices && Array.isArray(booking.additionalServices)) {
    booking.additionalServices.forEach((service, index) => {
      extras.push({
        id: service.id || `service-${index}`,
        description: service.description || service.name || `Servicio ${index + 1}`,
        amount: parseFloat(service.amount || 0),
        date: service.date || service.createdAt,
        category: 'servicio'
      });
    });
  }

  return extras;
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

  // Descuentos adicionales
  if (booking.discounts && Array.isArray(booking.discounts)) {
    booking.discounts.forEach((discount, index) => {
      discounts.push({
        id: discount.id || `discount-${index}`,
        description: discount.reason || discount.description || `Descuento ${index + 1}`,
        amount: parseFloat(discount.amount || 0),
        date: discount.date || discount.createdAt,
        type: discount.type || 'additional'
      });
    });
  }

  // Descuentos promocionales
  if (booking.promotionalDiscounts && Array.isArray(booking.promotionalDiscounts)) {
    booking.promotionalDiscounts.forEach((promo, index) => {
      discounts.push({
        id: promo.id || `promo-${index}`,
        description: promo.name || `Promoción ${index + 1}`,
        amount: parseFloat(promo.discountAmount || 0),
        date: promo.appliedDate,
        type: 'promotional'
      });
    });
  }

  return discounts;
};

// ✅ FUNCIÓN PARA OBTENER DESGLOSE DE PAGOS
export const getPaymentsBreakdown = (booking) => {
  const payments = [];

  if (booking.payments && Array.isArray(booking.payments)) {
    booking.payments.forEach((payment, index) => {
      payments.push({
        id: payment.id || `payment-${index}`,
        amount: parseFloat(payment.amount || 0),
        method: payment.method || payment.paymentMethod || 'efectivo',
        date: payment.date || payment.createdAt,
        status: payment.status || 'completed',
        reference: payment.reference || payment.transactionId,
        description: payment.description || getPaymentMethodDescription(payment.method)
      });
    });
  }

  // Agregar pagos individuales si existen
  if (booking.paidAmount && parseFloat(booking.paidAmount) > 0) {
    payments.push({
      id: 'direct-payment',
      amount: parseFloat(booking.paidAmount),
      method: booking.paymentMethod || 'efectivo',
      date: booking.paymentDate || booking.updatedAt,
      status: 'completed',
      description: 'Pago registrado'
    });
  }

  if (booking.advancePayment && parseFloat(booking.advancePayment) > 0) {
    payments.push({
      id: 'advance-payment',
      amount: parseFloat(booking.advancePayment),
      method: booking.advancePaymentMethod || 'efectivo',
      date: booking.advancePaymentDate || booking.createdAt,
      status: 'completed',
      description: 'Anticipo'
    });
  }

  return payments;
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

  // Verificar límites por tipo de descuento
  if (discountType === 'early_checkout') {
    const maxDiscount = financials.totalOriginal * 0.8; // Máximo 80% para check-out anticipado
    if (discountAmount > maxDiscount) {
      return {
        can: false,
        reason: `Descuento por check-out anticipado no puede exceder 80% del costo original`
      };
    }
  }

  // Verificar que no haga el total negativo
  const newTotal = financials.totalOriginal + financials.totalExtras - (financials.totalDescuentos + discountAmount) + financials.totalImpuestos;
  if (newTotal < 0) {
    return {
      can: false,
      reason: 'El descuento haría el total negativo'
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

  // Calcular descuento proporcional
  const originalAmount = parseFloat(booking.originalAmount || booking.totalAmount || 0);
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
    status: financials.isFullyPaid ? 'Pagado completo' : 'Pagos pendientes'
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
  validatePaymentData
};