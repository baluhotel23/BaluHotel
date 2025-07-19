/**
 * Utilidades para el sistema de check-out
 */

// ✅ FUNCIÓN PARA OBTENER EL BADGE DE CHECK-OUT
export const getCheckOutBadge = (booking) => {
  if (!booking) return { type: 'unknown', text: 'Sin información', color: 'gray' };

  const today = new Date();
  const checkOutDate = new Date(booking.checkOut);
  const diffTime = checkOutDate - today;
  const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Determinar el tipo de badge basado en días hasta check-out
  if (daysUntil < 0) {
    const daysOverdue = Math.abs(daysUntil);
    return {
      type: 'overdue',
      text: `Vencido ${daysOverdue} día${daysOverdue > 1 ? 's' : ''}`,
      color: 'red',
      priority: 'urgent',
      icon: '🚨'
    };
  } else if (daysUntil === 0) {
    return {
      type: 'today',
      text: 'Check-out HOY',
      color: 'orange',
      priority: 'high',
      icon: '📅'
    };
  } else if (daysUntil === 1) {
    return {
      type: 'tomorrow',
      text: 'Check-out mañana',
      color: 'yellow',
      priority: 'medium',
      icon: '⏰'
    };
  } else if (daysUntil <= 3) {
    return {
      type: 'soon',
      text: `Check-out en ${daysUntil} días`,
      color: 'blue',
      priority: 'normal',
      icon: '📝'
    };
  } else {
    return {
      type: 'future',
      text: `Check-out en ${daysUntil} días`,
      color: 'green',
      priority: 'low',
      icon: '📋'
    };
  }
};

// ✅ FUNCIÓN PARA OBTENER EL BADGE DE ESTADO DE RESERVA
export const getBookingStatusBadge = (status) => {
  const statusConfig = {
    'confirmed': {
      text: 'Confirmada',
      color: 'blue',
      bgColor: 'bg-blue-100 text-blue-800',
      icon: '📋'
    },
    'paid': {
      text: 'Pagada',
      color: 'green',
      bgColor: 'bg-green-100 text-green-800',
      icon: '💰'
    },
    'checked-in': {
      text: 'Check-in realizado',
      color: 'purple',
      bgColor: 'bg-purple-100 text-purple-800',
      icon: '🏨'
    },
    'completed': {
      text: 'Completada',
      color: 'gray',
      bgColor: 'bg-gray-100 text-gray-800',
      icon: '✅'
    },
    'cancelled': {
      text: 'Cancelada',
      color: 'red',
      bgColor: 'bg-red-100 text-red-800',
      icon: '❌'
    },
    'pending': {
      text: 'Pendiente',
      color: 'yellow',
      bgColor: 'bg-yellow-100 text-yellow-800',
      icon: '⏳'
    }
  };

  return statusConfig[status] || {
    text: status || 'Desconocido',
    color: 'gray',
    bgColor: 'bg-gray-100 text-gray-800',
    icon: '❓'
  };
};

// ✅ FUNCIÓN PARA OBTENER EL BADGE DE ESTADO DE PAGO
export const getPaymentStatusBadge = (financials) => {
  if (!financials) {
    return {
      text: 'Sin información',
      color: 'gray',
      bgColor: 'bg-gray-100 text-gray-800',
      icon: '❓'
    };
  }

  const { isFullyPaid, totalPendiente, paymentPercentage } = financials;

  if (isFullyPaid) {
    return {
      text: 'Pagado completo',
      color: 'green',
      bgColor: 'bg-green-100 text-green-800',
      icon: '✅',
      percentage: 100
    };
  } else if (paymentPercentage === 0) {
    return {
      text: 'Sin pagos',
      color: 'red',
      bgColor: 'bg-red-100 text-red-800',
      icon: '💳',
      percentage: 0
    };
  } else if (paymentPercentage > 0 && paymentPercentage < 100) {
    return {
      text: `Pagado ${paymentPercentage}%`,
      color: 'yellow',
      bgColor: 'bg-yellow-100 text-yellow-800',
      icon: '💰',
      percentage: paymentPercentage,
      pending: totalPendiente
    };
  }

  return {
    text: 'Estado desconocido',
    color: 'gray',
    bgColor: 'bg-gray-100 text-gray-800',
    icon: '❓'
  };
};

// ✅ FUNCIÓN PARA FORMATEAR FECHAS
export const formatDate = (date, options = {}) => {
  if (!date) return 'Sin fecha';

  const {
    includeTime = false,
    includeYear = true,
    locale = 'es-CO',
    relative = false
  } = options;

  const dateObj = new Date(date);

  if (relative) {
    const today = new Date();
    const diffTime = dateObj - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Mañana';
    if (diffDays === -1) return 'Ayer';
    if (diffDays > 1 && diffDays <= 7) return `En ${diffDays} días`;
    if (diffDays < -1 && diffDays >= -7) return `Hace ${Math.abs(diffDays)} días`;
  }

  const formatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(includeYear && { year: 'numeric' }),
    ...(includeTime && { hour: '2-digit', minute: '2-digit' })
  };

  return dateObj.toLocaleDateString(locale, formatOptions);
};

// ✅ FUNCIÓN PARA FORMATEAR MONEDA
export const formatCurrency = (amount, options = {}) => {
  const {
    currency = 'COP',
    locale = 'es-CO',
    showSymbol = true,
    showDecimals = false
  } = options;

  if (amount === null || amount === undefined) return '$0';

  const number = parseFloat(amount);
  if (isNaN(number)) return '$0';

  const formatOptions = {
    style: showSymbol ? 'currency' : 'decimal',
    currency: currency,
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0
  };

  if (showSymbol) {
    return new Intl.NumberFormat(locale, formatOptions).format(number);
  } else {
    return `$${new Intl.NumberFormat(locale, {
      minimumFractionDigits: showDecimals ? 2 : 0,
      maximumFractionDigits: showDecimals ? 2 : 0
    }).format(number)}`;
  }
};

// ✅ FUNCIÓN PARA CALCULAR NOCHES DE ESTADÍA
export const calculateStayNights = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;

  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  
  const diffTime = checkOutDate - checkInDate;
  const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(1, nights); // Mínimo 1 noche
};

// ✅ FUNCIÓN PARA OBTENER PRIORIDAD DE CHECK-OUT
export const getCheckOutPriority = (booking) => {
  const badge = getCheckOutBadge(booking);
  
  const priorities = {
    'overdue': 1,    // Más urgente
    'today': 2,
    'tomorrow': 3,
    'soon': 4,
    'future': 5      // Menos urgente
  };

  return priorities[badge.type] || 999;
};

// ✅ FUNCIÓN PARA VALIDAR SI PUEDE HACER CHECK-OUT
export const canCheckOut = (booking) => {
  if (!booking) return { can: false, reason: 'Reserva no válida' };

  const validStates = ['checked-in', 'confirmed', 'paid'];
  
  if (!validStates.includes(booking.status)) {
    return {
      can: false,
      reason: `Estado '${booking.status}' no permite check-out`
    };
  }

  if (booking.status === 'completed') {
    return {
      can: false,
      reason: 'Check-out ya realizado'
    };
  }

  return { can: true, reason: null };
};

// ✅ FUNCIÓN PARA OBTENER ACCIONES DISPONIBLES
export const getAvailableActions = (booking, financials) => {
  const actions = [];
  const checkOutValidation = canCheckOut(booking);

  // Check-out normal
  if (checkOutValidation.can && financials?.isFullyPaid) {
    actions.push({
      type: 'checkout',
      label: 'Realizar Check-out',
      color: 'green',
      icon: '✅',
      priority: 1
    });
  }

  // Check-out con pagos pendientes
  if (checkOutValidation.can && !financials?.isFullyPaid) {
    actions.push({
      type: 'checkout-pending',
      label: 'Check-out (Pagos pendientes)',
      color: 'orange',
      icon: '⚠️',
      priority: 2
    });
  }

  // Check-out anticipado
  if (checkOutValidation.can) {
    const today = new Date();
    const checkOutDate = new Date(booking.checkOut);
    
    if (checkOutDate > today) {
      actions.push({
        type: 'early-checkout',
        label: 'Check-out Anticipado',
        color: 'blue',
        icon: '⏩',
        priority: 3
      });
    }
  }

  // Procesar pago
  if (!financials?.isFullyPaid && financials?.totalPendiente > 0) {
    actions.push({
      type: 'payment',
      label: 'Procesar Pago',
      color: 'purple',
      icon: '💳',
      priority: 4
    });
  }

  // Generar factura
  if (['completed', 'checked-in'].includes(booking.status)) {
    actions.push({
      type: 'bill',
      label: 'Generar Factura',
      color: 'gray',
      icon: '🧾',
      priority: 5
    });
  }

  // Agregar consumos extra
  if (['checked-in', 'confirmed', 'paid'].includes(booking.status)) {
    actions.push({
      type: 'extras',
      label: 'Consumos Extra',
      color: 'blue',
      icon: '🍽️',
      priority: 6
    });
  }

  return actions.sort((a, b) => a.priority - b.priority);
};

// ✅ FUNCIÓN PARA OBTENER CLASES CSS POR COLOR
export const getColorClasses = (color, variant = 'badge') => {
  const colorMap = {
    badge: {
      red: 'bg-red-100 text-red-800 border-red-200',
      orange: 'bg-orange-100 text-orange-800 border-orange-200',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      green: 'bg-green-100 text-green-800 border-green-200',
      purple: 'bg-purple-100 text-purple-800 border-purple-200',
      gray: 'bg-gray-100 text-gray-800 border-gray-200'
    },
    button: {
      red: 'bg-red-600 text-white hover:bg-red-700',
      orange: 'bg-orange-600 text-white hover:bg-orange-700',
      yellow: 'bg-yellow-600 text-white hover:bg-yellow-700',
      blue: 'bg-blue-600 text-white hover:bg-blue-700',
      green: 'bg-green-600 text-white hover:bg-green-700',
      purple: 'bg-purple-600 text-white hover:bg-purple-700',
      gray: 'bg-gray-600 text-white hover:bg-gray-700'
    }
  };

  return colorMap[variant]?.[color] || colorMap[variant]?.gray || '';
};

// ✅ FUNCIÓN PARA FILTRAR RESERVAS
export const filterBookings = (bookings, filters) => {
  if (!bookings || !Array.isArray(bookings)) return [];

  return bookings.filter(booking => {
    // Filtro por estado
    if (filters.status && booking.status !== filters.status) {
      return false;
    }

    // Filtro por número de habitación
    if (filters.roomNumber) {
      const roomNumber = booking.roomNumber || booking.room?.roomNumber || '';
      if (!roomNumber.toString().toLowerCase().includes(filters.roomNumber.toLowerCase())) {
        return false;
      }
    }

    // Filtro por ID de huésped
    if (filters.guestId) {
      const guestId = booking.guestId || booking.guest?.sdocno || '';
      if (!guestId.toString().toLowerCase().includes(filters.guestId.toLowerCase())) {
        return false;
      }
    }

    // Filtro por nombre de huésped
    if (filters.guestName) {
      const guestName = booking.guest?.scostumername || '';
      if (!guestName.toLowerCase().includes(filters.guestName.toLowerCase())) {
        return false;
      }
    }

    return true;
  });
};

export default {
  getCheckOutBadge,
  getBookingStatusBadge,
  getPaymentStatusBadge,
  formatDate,
  formatCurrency,
  calculateStayNights,
  getCheckOutPriority,
  canCheckOut,
  getAvailableActions,
  getColorClasses,
  filterBookings
};