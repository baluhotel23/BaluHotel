const initialState = {
  // ⭐ ESTADOS DE CARGA GRANULARES
  loading: {
    general: false,
    availability: false,
    booking: false,
    checkIn: false,
    checkOut: false,
    inventory: false,
    reports: false,
    bills: false
  },
  
  // ⭐ DATOS PRINCIPALES
  availability: [],
  roomTypes: [],
  
  // ⭐ RESERVAS - ESTRUCTURA MEJORADA
  booking: null, // Reserva actualmente seleccionada/creada
  bookingDetails: null, // Detalles completos de la reserva
  bookings: [], // Lista de todas las reservas
  
  // ⭐ INVENTARIO DE RESERVAS (NUEVO)
  inventory: {
    status: null, // Estado de inventario de la reserva actual
    usage: [], // Uso de inventario por reserva
    availability: null, // Disponibilidad de inventario para check-in
    history: [], // Historial de uso de inventario
    assignments: [], // Asignaciones activas
    returns: [] // Devoluciones procesadas
  },
  
  // ⭐ CHECK-IN/CHECK-OUT MEJORADO
  checkInOut: {
    currentOperation: null, // 'check-in' | 'check-out' | null
    inventoryAssigned: [],
    inventoryReturned: [],
    laundryItems: [],
    warnings: []
  },
  
 // ⭐ FACTURACIÓN
  bill: null,
  bills: [],
  extraCharges: [], // Movido aquí para mejor organización
  // 🆕 NUEVOS CAMPOS PARA TAXXA
  taxxaStatus: null, // 'success' | 'failed' | null
  currentBill: null, // Alias para compatibilidad
  
  // ⭐ REPORTES ORGANIZADOS
  reports: {
    occupancy: null,
    revenue: null,
    inventoryUsage: null // Nuevo reporte
  },
  
  // ⭐ FILTROS Y PAGINACIÓN
  filters: {
    status: null,
    roomNumber: null,
    dateRange: null,
    guestId: null
  },
  
  pagination: {
    currentPage: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  },
  
  // ⭐ MANEJO DE ERRORES MEJORADO
  errors: {
    general: null,
    availability: null,
    booking: null,
    checkIn: null,
    checkOut: null,
    inventory: null,
    reports: null,
    bills: null
  },
  
  // ⭐ ESTADOS DE ÉXITO
  success: {
    message: null,
    type: null // 'create' | 'update' | 'check-in' | 'check-out'
  },
  
  // ⭐ CACHE Y OPTIMIZACIÓN
  cache: {
    lastUpdated: null,
    roomTypesLastFetch: null,
    bookingsLastFetch: null
  }
};

const bookingReducer = (state = initialState, action) => {
  console.log('📮 [REDUCER] Action received:', {
    type: action.type,
    payloadType: typeof action.payload,
    timestamp: new Date().toISOString()
  });
  
  switch (action.type) {
    case "CHECK_AVAILABILITY_REQUEST":
      console.log('🔄 [REDUCER] Processing availability request');
      return { 
        ...state, 
        loading: { ...state.loading, availability: true }, 
        errors: { ...state.errors, availability: null },
        success: { ...state.success, message: null }
      };
      
    case "CHECK_AVAILABILITY_SUCCESS": {
      console.log('✅ [REDUCER] Processing availability success:', {
        hasPayload: !!action.payload,
        payloadKeys: action.payload ? Object.keys(action.payload) : [],
        roomsCount: action.payload?.rooms?.length || 0,
        summary: action.payload?.summary
      });
      
      // ⭐ MANEJAR TANTO FORMATO NUEVO COMO LEGACY
      const rooms = action.payload?.rooms || action.payload || [];
      const summary = action.payload?.summary || {
        total: Array.isArray(rooms) ? rooms.length : 0,
        available: Array.isArray(rooms) ? rooms.filter(r => r.isAvailable).length : 0
      };
      
      const newState = { 
        ...state, 
        loading: { ...state.loading, availability: false },
        availability: rooms,
        // ⭐ AGREGAR INFORMACIÓN DE RESUMEN
        availabilitySummary: summary,
        // ⭐ MANTENER FILTROS APLICADOS
        filters: {
          ...state.filters,
          lastSearch: action.payload?.filters || null
        },
        cache: { 
          ...state.cache, 
          lastUpdated: action.payload?.timestamp || Date.now() 
        },
        errors: { ...state.errors, availability: null }
      };
      
      console.log('📊 [REDUCER] New availability state:', {
        roomsCount: newState.availability?.length,
        availableCount: summary.available,
        loading: newState.loading.availability
      });
      
      return newState;
    }
      
    // Removed unreachable and invalid lexical declaration
      

    // ⭐ GET ROOM TYPES - OPTIMIZADO
    case "GET_ROOM_TYPES_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, general: true }, 
        errors: { ...state.errors, general: null } 
      };
    case "GET_ROOM_TYPES_SUCCESS":
      return { 
        ...state, 
        loading: { ...state.loading, general: false }, 
        roomTypes: action.payload.data || action.payload,
        cache: { ...state.cache, roomTypesLastFetch: Date.now() }
      };
    case "GET_ROOM_TYPES_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, general: false }, 
        errors: { ...state.errors, general: action.payload }
      };

    // ⭐ CREATE BOOKING - OPTIMIZADO
    case "CREATE_BOOKING_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, booking: true }, 
        errors: { ...state.errors, booking: null },
        success: { ...state.success, message: null }
      };
    case "CREATE_BOOKING_SUCCESS":
      return { 
        ...state, 
        loading: { ...state.loading, booking: false }, 
        booking: action.payload,
        bookings: [action.payload, ...state.bookings], // Agregar a la lista
        success: { message: 'Reserva creada exitosamente', type: 'create' },
        cache: { ...state.cache, bookingsLastFetch: null } // Invalidar cache
      };
    case "CREATE_BOOKING_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, booking: false }, 
        errors: { ...state.errors, booking: action.payload }
      };

    // ⭐ GET USER BOOKINGS - OPTIMIZADO
    case "GET_USER_BOOKINGS_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, general: true }, 
        errors: { ...state.errors, general: null } 
      };
    case "GET_USER_BOOKINGS_SUCCESS":
      return { 
        ...state, 
        loading: { ...state.loading, general: false }, 
        bookings: action.payload.bookings || action.payload,
        pagination: action.payload.pagination || state.pagination,
        cache: { ...state.cache, bookingsLastFetch: Date.now() }
      };
    case "GET_USER_BOOKINGS_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, general: false }, 
        errors: { ...state.errors, general: action.payload }
      };

    // ⭐ GET BOOKING DETAILS - OPTIMIZADO
    case "GET_BOOKING_DETAILS_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, booking: true }, 
        errors: { ...state.errors, booking: null } 
      };
    case "GET_BOOKING_DETAILS_SUCCESS":
      return { 
        ...state, 
        loading: { ...state.loading, booking: false }, 
        bookingDetails: action.payload,
        // ⭐ NUEVO: Extraer información de inventario si está presente
        inventory: {
          ...state.inventory,
          status: action.payload.inventoryStatus || null,
          usage: action.payload.inventoryUsages || []
        }
      };
    case "GET_BOOKING_DETAILS_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, booking: false }, 
        errors: { ...state.errors, booking: action.payload }
      };

    // ⭐ GET ALL BOOKINGS (STAFF) - OPTIMIZADO
    case "GET_ALL_BOOKINGS_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, general: true }, 
        errors: { ...state.errors, general: null } 
      };
    case "GET_ALL_BOOKINGS_SUCCESS":
      return { 
        ...state, 
        loading: { ...state.loading, general: false }, 
        bookings: action.payload.bookings || action.payload,
        pagination: action.payload.pagination || state.pagination,
        cache: { ...state.cache, bookingsLastFetch: Date.now() }
      };
    case "GET_ALL_BOOKINGS_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, general: false }, 
        errors: { ...state.errors, general: action.payload }
      };

    // ⭐ CHECK-IN TRADICIONAL - OPTIMIZADO
    case "CHECKIN_BOOKING_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, checkIn: true }, 
        errors: { ...state.errors, checkIn: null },
        checkInOut: { ...state.checkInOut, currentOperation: 'check-in' }
      };
    case "CHECKIN_BOOKING_SUCCESS":
      return { 
        ...state, 
        loading: { ...state.loading, checkIn: false }, 
        bookingDetails: action.payload,
        checkInOut: { 
          ...state.checkInOut, 
          currentOperation: null,
          inventoryAssigned: action.payload.inventoryAssigned || []
        },
        success: { message: 'Check-in realizado exitosamente', type: 'check-in' }
      };
    case "CHECKIN_BOOKING_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, checkIn: false }, 
        errors: { ...state.errors, checkIn: action.payload },
        checkInOut: { ...state.checkInOut, currentOperation: null }
      };

    // ⭐ CHECK-IN CON INVENTARIO - NUEVO
    case "CHECKIN_BOOKING_WITH_INVENTORY_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, checkIn: true, inventory: true }, 
        errors: { ...state.errors, checkIn: null, inventory: null },
        checkInOut: { ...state.checkInOut, currentOperation: 'check-in' }
      };
    case "CHECKIN_BOOKING_WITH_INVENTORY_SUCCESS":
      return { 
        ...state, 
        loading: { ...state.loading, checkIn: false, inventory: false }, 
        bookingDetails: action.payload.booking,
        checkInOut: { 
          ...state.checkInOut, 
          currentOperation: null,
          inventoryAssigned: action.payload.inventoryAssigned || [],
          warnings: action.payload.inventoryWarnings || []
        },
        inventory: {
          ...state.inventory,
          assignments: action.payload.inventoryAssigned || []
        },
        success: { message: 'Check-in con inventario realizado exitosamente', type: 'check-in' }
      };
    case "CHECKIN_BOOKING_WITH_INVENTORY_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, checkIn: false, inventory: false }, 
        errors: { ...state.errors, checkIn: action.payload },
        checkInOut: { ...state.checkInOut, currentOperation: null }
      };

    // ⭐ CHECK-OUT TRADICIONAL - OPTIMIZADO
    case "CHECKOUT_BOOKING_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, checkOut: true }, 
        errors: { ...state.errors, checkOut: null },
        checkInOut: { ...state.checkInOut, currentOperation: 'check-out' }
      };
    case "CHECKOUT_BOOKING_SUCCESS":
      return {
        ...state,
        loading: { ...state.loading, checkOut: false },
        bookingDetails: action.payload,
        bill: action.payload.bill,
        checkInOut: { 
          ...state.checkInOut, 
          currentOperation: null,
          inventoryReturned: action.payload.inventoryProcessed || []
        },
        success: { message: 'Check-out realizado exitosamente', type: 'check-out' }
      };
    case "CHECKOUT_BOOKING_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, checkOut: false }, 
        errors: { ...state.errors, checkOut: action.payload },
        checkInOut: { ...state.checkInOut, currentOperation: null }
      };

    // ⭐ CHECK-OUT CON INVENTARIO - NUEVO
    case "CHECKOUT_BOOKING_WITH_INVENTORY_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, checkOut: true, inventory: true }, 
        errors: { ...state.errors, checkOut: null, inventory: null },
        checkInOut: { ...state.checkInOut, currentOperation: 'check-out' }
      };
    case "CHECKOUT_BOOKING_WITH_INVENTORY_SUCCESS":
      return {
        ...state,
        loading: { ...state.loading, checkOut: false, inventory: false },
        bookingDetails: action.payload.booking,
        bill: action.payload.booking.bill,
        checkInOut: { 
          ...state.checkInOut, 
          currentOperation: null,
          inventoryReturned: action.payload.inventoryProcessed || [],
          laundryItems: action.payload.laundryItems || []
        },
        inventory: {
          ...state.inventory,
          returns: action.payload.inventoryProcessed || []
        },
        success: { message: 'Check-out con inventario realizado exitosamente', type: 'check-out' }
      };
    case "CHECKOUT_BOOKING_WITH_INVENTORY_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, checkOut: false, inventory: false }, 
        errors: { ...state.errors, checkOut: action.payload },
        checkInOut: { ...state.checkInOut, currentOperation: null }
      };

    // ⭐ ESTADO DE INVENTARIO DE RESERVA - NUEVO
    case "GET_BOOKING_INVENTORY_STATUS_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, inventory: true }, 
        errors: { ...state.errors, inventory: null } 
      };
    case "GET_BOOKING_INVENTORY_STATUS_SUCCESS":
      return { 
        ...state, 
        loading: { ...state.loading, inventory: false }, 
        inventory: {
          ...state.inventory,
          status: action.payload.summary,
          usage: action.payload.items || []
        }
      };
    case "GET_BOOKING_INVENTORY_STATUS_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, inventory: false }, 
        errors: { ...state.errors, inventory: action.payload }
      };

    // ⭐ ADD EXTRA CHARGES - OPTIMIZADO
   case "ADD_EXTRA_CHARGE_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, booking: true }, 
        errors: { ...state.errors, booking: null },
        success: { ...state.success, message: null }
      };
    case "ADD_EXTRA_CHARGE_SUCCESS": {
  console.log('✅ [REDUCER] Procesando cargo extra exitoso:', action.payload);
  console.log('📊 [REDUCER] Estado actual de bookings:', state.bookings);
  
  const updatedBookings = state.bookings.map(booking => {
    if (booking.bookingId === action.payload.bookingId) {
      const newExtraCharges = [
        ...(booking.ExtraCharges || []),
        action.payload.extraCharge
      ];
      
      console.log('📦 [REDUCER] Actualizando ExtraCharges para reserva:', booking.bookingId);
      console.log('📦 [REDUCER] ExtraCharges anteriores:', booking.ExtraCharges || []);
      console.log('📦 [REDUCER] ExtraCharges nuevos:', newExtraCharges);
      
      return {
        ...booking,
        ExtraCharges: newExtraCharges
      };
    }
    return booking;
  });

  // Verificar si realmente se actualizó algún booking
  const bookingUpdated = updatedBookings.some((booking, index) => {
    return JSON.stringify(booking) !== JSON.stringify(state.bookings[index]);
  });
  
  console.log('🔍 [REDUCER] ¿Se actualizó algún booking?', bookingUpdated);

  const newState = { 
    ...state, 
    loading: { ...state.loading, booking: false }, 
    extraCharges: [...state.extraCharges, action.payload.extraCharge],
    bookings: updatedBookings,
    bookingDetails: state.bookingDetails?.bookingId === action.payload.bookingId 
      ? {
          ...state.bookingDetails,
          ExtraCharges: [
            ...(state.bookingDetails.ExtraCharges || []),
            action.payload.extraCharge
          ]
        }
      : state.bookingDetails,
    success: { message: 'Cargo adicional agregado exitosamente', type: 'update' },
    errors: { ...state.errors, booking: null }
  };
  
  console.log('📊 [REDUCER] Estado actualizado con cargo extra');
  return newState;
}
    case "ADD_EXTRA_CHARGE_FAILURE":
      console.error('❌ [REDUCER] Error al agregar cargo extra:', action.payload);
      return { 
        ...state, 
        loading: { ...state.loading, booking: false }, 
        errors: { ...state.errors, booking: action.payload },
        success: { ...state.success, message: null }
      };

    // ⭐ GENERATE BILL - MEJORADO PARA INCLUIR TAXXA
    case "GENERATE_BILL_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, bills: true }, 
        errors: { ...state.errors, bills: null },
        bill: null,
        currentBill: null, // 🆕 ALIAS PARA COMPATIBILIDAD
        taxxaStatus: null // 🆕 RESETEAR ESTADO DE TAXXA
      };

    case "GENERATE_BILL_SUCCESS":
      return { 
        ...state, 
        loading: { ...state.loading, bills: false }, 
        bill: action.payload,
        currentBill: action.payload, // 🆕 ALIAS PARA COMPATIBILIDAD
        bills: [...state.bills, action.payload], // 🆕 AGREGAR A LA LISTA
        success: { message: 'Factura generada exitosamente', type: 'create' },
        errors: { ...state.errors, bills: null }
      };

    case "GENERATE_BILL_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, bills: false }, 
        errors: { ...state.errors, bills: action.payload },
        bill: null,
        currentBill: null,
        taxxaStatus: null
      };

    // ⭐ SEND BILL TO TAXXA - MEJORADO CON ESTADOS
    case "SEND_BILL_TO_TAXXA_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, bills: true }, 
        errors: { ...state.errors, bills: null },
        taxxaStatus: 'pending' // 🆕 ESTADO PENDIENTE
      };

    case "SEND_BILL_TO_TAXXA_SUCCESS":
      return {
        ...state,
        loading: { ...state.loading, bills: false },
        bill: state.bill ? { ...state.bill, taxxaStatus: "sent" } : state.bill,
        currentBill: state.currentBill ? { ...state.currentBill, taxxaStatus: "sent" } : state.currentBill,
        taxxaStatus: 'success', // 🆕 ESTADO EXITOSO
        success: { message: 'Factura enviada a Taxxa exitosamente', type: 'update' },
        errors: { ...state.errors, bills: null }
      };

    case "SEND_BILL_TO_TAXXA_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, bills: false }, 
        errors: { ...state.errors, bills: action.payload },
        taxxaStatus: 'failed' // 🆕 ESTADO FALLIDO
      };

    // ⭐ GET ALL BILLS - OPTIMIZADO
    case "GET_ALL_BILLS_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, bills: true }, 
        errors: { ...state.errors, bills: null } 
      };
    case "GET_ALL_BILLS_SUCCESS":
      return { 
        ...state, 
        loading: { ...state.loading, bills: false }, 
        bills: action.payload
      };
    case "GET_ALL_BILLS_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, bills: false }, 
        errors: { ...state.errors, bills: action.payload }
      };

    // ⭐ UPDATE BOOKING STATUS - OPTIMIZADO
    case "UPDATE_BOOKING_STATUS_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, booking: true }, 
        errors: { ...state.errors, booking: null } 
      };
    case "UPDATE_BOOKING_STATUS_SUCCESS":
      return { 
        ...state, 
        loading: { ...state.loading, booking: false }, 
        bookingDetails: action.payload,
        success: { message: 'Estado actualizado exitosamente', type: 'update' }
      };
    case "UPDATE_BOOKING_STATUS_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, booking: false }, 
        errors: { ...state.errors, booking: action.payload }
      };

    // ⭐ CANCEL BOOKING - OPTIMIZADO
    case "CANCEL_BOOKING_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, booking: true }, 
        errors: { ...state.errors, booking: null } 
      };
    case "CANCEL_BOOKING_SUCCESS":
      return { 
        ...state, 
        loading: { ...state.loading, booking: false }, 
        bookingDetails: action.payload,
        success: { message: 'Reserva cancelada exitosamente', type: 'update' }
      };
    case "CANCEL_BOOKING_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, booking: false }, 
        errors: { ...state.errors, booking: action.payload }
      };

    // ⭐ GET OCCUPANCY REPORT - OPTIMIZADO
    case "GET_OCCUPANCY_REPORT_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, reports: true }, 
        errors: { ...state.errors, reports: null } 
      };
    case "GET_OCCUPANCY_REPORT_SUCCESS":
      return { 
        ...state, 
        loading: { ...state.loading, reports: false }, 
        reports: { ...state.reports, occupancy: action.payload }
      };
    case "GET_OCCUPANCY_REPORT_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, reports: false }, 
        errors: { ...state.errors, reports: action.payload }
      };

    // ⭐ GET REVENUE REPORT - OPTIMIZADO
    case "GET_REVENUE_REPORT_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, reports: true }, 
        errors: { ...state.errors, reports: null } 
      };
    case "GET_REVENUE_REPORT_SUCCESS":
      return { 
        ...state, 
        loading: { ...state.loading, reports: false }, 
        reports: { ...state.reports, revenue: action.payload }
      };
    case "GET_REVENUE_REPORT_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, reports: false }, 
        errors: { ...state.errors, reports: action.payload }
      };

    // ⭐ REPORTE DE USO DE INVENTARIO - NUEVO
    case "GET_INVENTORY_USAGE_REPORT_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, reports: true }, 
        errors: { ...state.errors, reports: null } 
      };
    case "GET_INVENTORY_USAGE_REPORT_SUCCESS":
      return { 
        ...state, 
        loading: { ...state.loading, reports: false }, 
        reports: { ...state.reports, inventoryUsage: action.payload }
      };
    case "GET_INVENTORY_USAGE_REPORT_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, reports: false }, 
        errors: { ...state.errors, reports: action.payload }
      };

    // ⭐ UPDATE ONLINE PAYMENT - OPTIMIZADO
    case "UPDATE_ONLINE_PAYMENT_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, booking: true }, 
        errors: { ...state.errors, booking: null } 
      };
    case "UPDATE_ONLINE_PAYMENT_SUCCESS":
      return {
        ...state,
        loading: { ...state.loading, booking: false },
        bookingDetails: { 
          ...state.bookingDetails, 
          payment: action.payload 
        },
        success: { message: 'Pago actualizado exitosamente', type: 'update' }
      };
    case "UPDATE_ONLINE_PAYMENT_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, booking: false }, 
        errors: { ...state.errors, booking: action.payload }
      };

    default:
      return state;
  }
};

export default bookingReducer;