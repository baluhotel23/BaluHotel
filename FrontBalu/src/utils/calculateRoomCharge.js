/**
 * Función para calcular costo de habitación usando la misma lógica que el backend
 * Coincide exactamente con roomController.js calculateRoomPrice
 */
export const calculateRoomCharge = (room, guestCount = 1, nights = 1) => {
  if (!room) {
    console.warn('⚠️ No room data provided');
    return 0;
  }

  if (nights <= 0 || guestCount <= 0) {
    console.warn('⚠️ Invalid nights or guest count');
    return 0;
  }

  let pricePerNight = 0;

  // ✅ USAR LA MISMA LÓGICA QUE TU BACKEND
  if (room.isPromo && room.promotionPrice && parseFloat(room.promotionPrice) > 0) {
    pricePerNight = parseFloat(room.promotionPrice);
    console.log('🎉 Usando precio promocional:', pricePerNight);
  } else {
    // Lógica exacta del backend
    if (guestCount === 1) {
      pricePerNight = parseFloat(room.priceSingle || room.price || 0);
    } else if (guestCount === 2) {
      pricePerNight = parseFloat(room.priceDouble || room.price || 0);
    } else { // guestCount >= 3
      pricePerNight = parseFloat(room.priceMultiple || room.price || 0);
    }
  }

  const totalAmount = pricePerNight * nights;

  console.log('💡 [ROOM-CHARGE] Cálculo (misma lógica que backend):', {
    roomNumber: room.roomNumber,
    guestCount,
    nights,
    pricePerNight,
    totalAmount,
    isPromo: room.isPromo,
    usedPrice: room.isPromo && room.promotionPrice ? 'promotionPrice' :
               guestCount === 1 ? 'priceSingle' : 
               guestCount === 2 ? 'priceDouble' : 'priceMultiple'
  });

  return Math.max(0, totalAmount);
};

/**
 * Función para obtener desglose detallado de precios
 */
export const getRoomPriceBreakdown = (room, guestCount = 1, nights = 1) => {
  if (!room) return null;

  let pricePerNight = 0;
  let priceSource = 'unknown';
  let isPromotional = false;

  // ✅ MISMA LÓGICA QUE EL BACKEND
  if (room.isPromo && room.promotionPrice && parseFloat(room.promotionPrice) > 0) {
    pricePerNight = parseFloat(room.promotionPrice);
    priceSource = 'promotion';
    isPromotional = true;
  } else {
    if (guestCount === 1) {
      pricePerNight = parseFloat(room.priceSingle || room.price || 0);
      priceSource = 'priceSingle';
    } else if (guestCount === 2) {
      pricePerNight = parseFloat(room.priceDouble || room.price || 0);
      priceSource = 'priceDouble';
    } else {
      pricePerNight = parseFloat(room.priceMultiple || room.price || 0);
      priceSource = 'priceMultiple';
    }
  }

  const totalCost = pricePerNight * nights;

  return {
    guestCount,
    nights,
    pricePerNight,
    totalCost,
    priceSource,
    isPromotional,
    
    // Información adicional para UI
    availablePrices: {
      priceSingle: parseFloat(room.priceSingle || 0),
      priceDouble: parseFloat(room.priceDouble || 0),
      priceMultiple: parseFloat(room.priceMultiple || 0),
      promotionPrice: parseFloat(room.promotionPrice || 0)
    },
    
    roomInfo: {
      roomNumber: room.roomNumber,
      type: room.type,
      isPromo: room.isPromo,
      maxGuests: room.maxGuests
    }
  };
};

/**
 * Función para validar configuración de precios de habitación
 */
export const validateRoomPricing = (room) => {
  if (!room) {
    return { isValid: false, errors: ['No hay datos de habitación'], warnings: [] };
  }

  const errors = [];
  const warnings = [];

  // Verificar que al menos un precio esté configurado
  const hasPriceSingle = room.priceSingle && parseFloat(room.priceSingle) > 0;
  const hasPriceDouble = room.priceDouble && parseFloat(room.priceDouble) > 0;
  const hasPriceMultiple = room.priceMultiple && parseFloat(room.priceMultiple) > 0;
  const hasBasePrice = room.price && parseFloat(room.price) > 0;

  if (!hasPriceSingle && !hasPriceDouble && !hasPriceMultiple && !hasBasePrice) {
    errors.push('No hay precios configurados para esta habitación');
  }

  // Verificar promoción
  if (room.isPromo) {
    if (!room.promotionPrice || parseFloat(room.promotionPrice) <= 0) {
      errors.push('Promoción activa pero sin precio promocional válido');
    }
  }

  // Verificar lógica de precios (warnings)
  if (hasPriceSingle && hasPriceDouble) {
    const single = parseFloat(room.priceSingle);
    const double = parseFloat(room.priceDouble);
    
    if (single > double) {
      warnings.push('El precio para 1 huésped es mayor que para 2 huéspedes');
    }
  }

  if (hasPriceDouble && hasPriceMultiple) {
    const double = parseFloat(room.priceDouble);
    const multiple = parseFloat(room.priceMultiple);
    
    if (double > multiple) {
      warnings.push('El precio para 2 huéspedes es mayor que para múltiples huéspedes');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Función para obtener resumen financiero que respeta datos del backend
 */
export const getBookingFinancialSummary = (booking) => {
  if (!booking) return null;

  return {
    totalAmount: parseFloat(booking.totalAmount || booking.finalAmount || 0),
    originalAmount: parseFloat(booking.originalAmount || booking.baseAmount || 0),
    discountAmount: parseFloat(booking.discountAmount || 0),
    taxAmount: parseFloat(booking.taxAmount || 0),
    extrasAmount: parseFloat(booking.extrasAmount || 0),
    
    room: {
      basePrice: parseFloat(booking.room?.pricePerNight || booking.room?.price || 0),
      calculatedPrice: parseFloat(booking.room?.calculatedPrice || 0),
      nights: parseInt(booking.nights || 1),
      guestCount: parseInt(booking.guestCount || 1)
    },
    
    currency: booking.currency || 'COP',
    lastUpdated: booking.updatedAt || booking.lastModified,
    source: 'backend'
  };
};

/**
 * Función para validar si los datos del frontend coinciden con backend
 */
export const validateBackendPricing = (booking) => {
  if (!booking || !booking.room) return { isValid: true, warnings: [] };

  const warnings = [];
  const room = booking.room;

  if (!room.priceSingle && !room.priceDouble && !room.priceMultiple && !room.price) {
    warnings.push('❌ No se encontró ningún precio en los datos del backend');
  }

  if (!booking.nights || booking.nights <= 0) {
    warnings.push('⚠️ Información de noches no válida');
  }

  if (!booking.totalAmount && !booking.finalAmount) {
    warnings.push('⚠️ No se encontró total calculado en el backend');
  }

  return {
    isValid: warnings.length === 0,
    warnings,
    backendDataComplete: !!(
      (room.priceSingle || room.priceDouble || room.priceMultiple) && 
      booking.totalAmount && 
      booking.nights
    )
  };
};

/**
 * Función para estimar descuento por early checkout
 */
export const estimateEarlyCheckoutDiscount = (booking, newCheckOutDate) => {
  if (!booking || !newCheckOutDate) return null;

  const originalCheckOut = new Date(booking.checkOut);
  const earlyCheckOut = new Date(newCheckOutDate);
  const checkIn = new Date(booking.checkIn);

  const originalNights = Math.ceil((originalCheckOut - checkIn) / (1000 * 60 * 60 * 24));
  const actualNights = Math.ceil((earlyCheckOut - checkIn) / (1000 * 60 * 60 * 24));
  
  if (actualNights >= originalNights) {
    return null;
  }

  // Usar la misma lógica que el backend para calcular precio por noche
  const guestCount = booking.guestCount || 1;
  const room = booking.room;
  
  let pricePerNight = 0;
  
  if (room.isPromo && room.promotionPrice) {
    pricePerNight = parseFloat(room.promotionPrice);
  } else {
    if (guestCount === 1) {
      pricePerNight = parseFloat(room.priceSingle || room.price || 0);
    } else if (guestCount === 2) {
      pricePerNight = parseFloat(room.priceDouble || room.price || 0);
    } else {
      pricePerNight = parseFloat(room.priceMultiple || room.price || 0);
    }
  }

  // Fallback si no encontramos precio específico
  if (pricePerNight === 0) {
    pricePerNight = parseFloat(booking.totalAmount || 0) / originalNights;
  }

  const nightsSaved = originalNights - actualNights;
  const estimatedDiscount = nightsSaved * pricePerNight;

  return {
    originalNights,
    actualNights,
    nightsSaved,
    pricePerNight,
    estimatedDiscount,
    guestCount,
    priceSource: room.isPromo && room.promotionPrice ? 'promotion' :
                 guestCount === 1 ? 'priceSingle' : 
                 guestCount === 2 ? 'priceDouble' : 'priceMultiple',
    note: '⚠️ ESTIMACIÓN FRONTEND: El backend debe calcular el descuento real'
  };
};

export default {
  calculateRoomCharge,
  getRoomPriceBreakdown,
  validateRoomPricing,
  getBookingFinancialSummary,
  validateBackendPricing,
  estimateEarlyCheckoutDiscount
};