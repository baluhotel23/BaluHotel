const initialState = {
  // ⭐ REGISTROS PRINCIPALES
  registrationPasses: [], // Todos los registros de pasajeros
  registrationsByBooking: {}, // Organizados por reserva: { bookingId: [...] }
  currentRegistration: null, // Registro actualmente seleccionado
  
  // ⭐ ESTADÍSTICAS Y REPORTES
  statistics: {
    totalRegistrations: 0,
    registrationsByPeriod: {},
    guestsByNationality: {},
    averageStayDuration: 0
  },
  
  // ⭐ FILTROS Y BÚSQUEDA
  filters: {
    bookingId: null,
    dateRange: null,
    nationality: null,
    documentType: null,
    guestName: null
  },
  
  // ⭐ VALIDACIÓN Y DUPLICADOS
  validation: {
    duplicateCheck: null, // Resultado de verificación de duplicados
    documentsToValidate: [], // Documentos pendientes de validación
    validationErrors: {}
  },
  
  // ⭐ PAGINACIÓN
  pagination: {
    currentPage: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  },
  
  // ⭐ LOADING GRANULAR
  loading: {
    general: false,
    creating: false,
    updating: false,
    deleting: false,
    byBooking: false,
    validation: false,
    statistics: false
  },
  
  // ⭐ ERRORES ESPECÍFICOS
  errors: {
    general: null,
    creating: null,
    updating: null,
    deleting: null,
    byBooking: null,
    validation: null,
    statistics: null
  },
  
  // ⭐ MENSAJES DE ÉXITO
  success: {
    message: null,
    type: null, // 'create', 'update', 'delete', 'bulk'
    timestamp: null,
    affectedRegistrations: []
  },
  
  // ⭐ CACHE Y OPTIMIZACIÓN
  cache: {
    lastUpdated: null,
    bookingCacheTime: {}, // { bookingId: timestamp }
    statisticsLastFetch: null
  }
};

const registrationPassReducer = (state = initialState, action) => {
  switch (action.type) {
    
    // ⭐ OBTENER TODOS LOS REGISTROS - OPTIMIZADO
    case 'GET_REGISTRATION_PASSES_REQUEST':
      return { 
        ...state, 
        loading: { ...state.loading, general: true }, 
        errors: { ...state.errors, general: null } 
      };
    case 'GET_REGISTRATION_PASSES_SUCCESS':
    case 'GET_REGISTRATION_PASSES':
      return {
        ...state,
        loading: { ...state.loading, general: false },
        registrationPasses: action.payload || [],
        pagination: action.payload?.pagination || state.pagination,
        cache: { ...state.cache, lastUpdated: Date.now() }
      };
    case 'GET_REGISTRATION_PASSES_FAILURE':
      return { 
        ...state, 
        loading: { ...state.loading, general: false }, 
        errors: { ...state.errors, general: action.payload }
      };

    // ⭐ OBTENER REGISTROS POR RESERVA - OPTIMIZADO
    case 'GET_REGISTRATION_PASSES_BY_BOOKING_REQUEST':
      return { 
        ...state, 
        loading: { ...state.loading, byBooking: true }, 
        errors: { ...state.errors, byBooking: null } 
      };
    case 'GET_REGISTRATION_PASSES_BY_BOOKING_SUCCESS':
    case 'GET_REGISTRATION_PASSES_BY_BOOKING': {
      // ⭐ VALIDAR PAYLOAD
      const payload = action.payload || {};
      const bookingId = payload.bookingId;
      const passengers = payload.passengers || [];
      
      if (!bookingId) {
        console.warn('GET_REGISTRATION_PASSES_BY_BOOKING: bookingId no encontrado en payload', action.payload);
        return {
          ...state,
          loading: { ...state.loading, byBooking: false },
          errors: { ...state.errors, byBooking: 'ID de reserva no válido' }
        };
      }
      
      return {
        ...state,
        loading: { ...state.loading, byBooking: false },
        registrationPasses: passengers, // Para retrocompatibilidad
        registrationsByBooking: {
          ...state.registrationsByBooking,
          [bookingId]: passengers
        },
        cache: {
          ...state.cache,
          bookingCacheTime: {
            ...state.cache.bookingCacheTime,
            [bookingId]: Date.now()
          }
        }
      };
    }
    case 'GET_REGISTRATION_PASSES_BY_BOOKING_FAILURE':
      return { 
        ...state, 
        loading: { ...state.loading, byBooking: false }, 
        errors: { ...state.errors, byBooking: action.payload }
      };

    // ⭐ CREAR REGISTRO - OPTIMIZADO
    case 'CREATE_REGISTRATION_PASS_REQUEST':
      return { 
        ...state, 
        loading: { ...state.loading, creating: true }, 
        errors: { ...state.errors, creating: null },
        success: { ...state.success, message: null }
      };
    case 'CREATE_REGISTRATION_PASS_SUCCESS':
    case 'CREATE_REGISTRATION_PASS': {
      const payload = action.payload || {};
      const bookingId = payload.bookingId;
      const passengersData = payload.passengers;
      
      if (!bookingId) {
        console.warn('CREATE_REGISTRATION_PASS: bookingId no encontrado en payload', action.payload);
        return {
          ...state,
          loading: { ...state.loading, creating: false },
          errors: { ...state.errors, creating: 'ID de reserva no válido' }
        };
      }
      
      const newPassengers = Array.isArray(passengersData) 
        ? passengersData 
        : (passengersData ? [passengersData] : []);
      
      // ⭐ ACTUALIZAR ESTADÍSTICAS
      const newStats = {
        ...state.statistics,
        totalRegistrations: state.statistics.totalRegistrations + newPassengers.length
      };
      
      return {
        ...state,
        loading: { ...state.loading, creating: false },
        registrationPasses: [
          ...state.registrationPasses,
          ...newPassengers
        ],
        registrationsByBooking: {
          ...state.registrationsByBooking,
          [bookingId]: [
            ...(state.registrationsByBooking[bookingId] || []),
            ...newPassengers
          ]
        },
        statistics: newStats,
        success: {
          message: `${newPassengers.length} registro(s) de pasajero creado(s) exitosamente`,
          type: 'create',
          timestamp: Date.now(),
          affectedRegistrations: newPassengers.map(p => p.registrationNumber)
        },
        // Invalidar cache
        cache: {
          ...state.cache,
          lastUpdated: Date.now(),
          bookingCacheTime: {
            ...state.cache.bookingCacheTime,
            [bookingId]: Date.now()
          }
        }
      };
    }
    case 'CREATE_REGISTRATION_PASS_FAILURE':
      return { 
        ...state, 
        loading: { ...state.loading, creating: false }, 
        errors: { ...state.errors, creating: action.payload }
      };

    // ⭐ ACTUALIZAR REGISTRO - OPTIMIZADO
    case 'UPDATE_REGISTRATION_PASS_REQUEST':
      return { 
        ...state, 
        loading: { ...state.loading, updating: true }, 
        errors: { ...state.errors, updating: null },
        success: { ...state.success, message: null }
      };
    case 'UPDATE_REGISTRATION_PASS_SUCCESS':
    case 'UPDATE_REGISTRATION_PASS': {
      const updatedPass = action.payload;
      if (!updatedPass || !updatedPass.registrationNumber) {
        console.warn('UPDATE_REGISTRATION_PASS: payload inválido', action.payload);
        return {
          ...state,
          loading: { ...state.loading, updating: false },
          errors: { ...state.errors, updating: 'Datos de registro inválidos' }
        };
      }
      
      return {
        ...state,
        loading: { ...state.loading, updating: false },
        registrationPasses: state.registrationPasses.map((pass) =>
          pass.registrationNumber === updatedPass.registrationNumber ? updatedPass : pass
        ),
        // ⭐ ACTUALIZAR EN ESTADO POR RESERVA
        registrationsByBooking: Object.keys(state.registrationsByBooking).reduce((acc, bookingId) => {
          acc[bookingId] = (state.registrationsByBooking[bookingId] || []).map(pass =>
            pass.registrationNumber === updatedPass.registrationNumber ? updatedPass : pass
          );
          return acc;
        }, {}),
        // ⭐ ACTUALIZAR CURRENT SI ES EL MISMO
        currentRegistration: state.currentRegistration?.registrationNumber === updatedPass.registrationNumber 
          ? updatedPass 
          : state.currentRegistration,
        success: {
          message: 'Registro de pasajero actualizado exitosamente',
          type: 'update',
          timestamp: Date.now(),
          affectedRegistrations: [updatedPass.registrationNumber]
        }
      };
    }
    case 'UPDATE_REGISTRATION_PASS_FAILURE':
      return { 
        ...state, 
        loading: { ...state.loading, updating: false }, 
        errors: { ...state.errors, updating: action.payload }
      };

    // ⭐ ELIMINAR REGISTRO - OPTIMIZADO
    case 'DELETE_REGISTRATION_PASS_REQUEST':
      return { 
        ...state, 
        loading: { ...state.loading, deleting: true }, 
        errors: { ...state.errors, deleting: null },
        success: { ...state.success, message: null }
      };
    case 'DELETE_REGISTRATION_PASS_SUCCESS':
    case 'DELETE_REGISTRATION_PASS': {
      const registrationNumber = action.payload;
      if (!registrationNumber) {
        console.warn('DELETE_REGISTRATION_PASS: registrationNumber no encontrado', action.payload);
        return {
          ...state,
          loading: { ...state.loading, deleting: false },
          errors: { ...state.errors, deleting: 'Número de registro no válido' }
        };
      }
      
      // ⭐ ACTUALIZAR ESTADÍSTICAS
      const newStats = {
        ...state.statistics,
        totalRegistrations: Math.max(0, state.statistics.totalRegistrations - 1)
      };
      
      return {
        ...state,
        loading: { ...state.loading, deleting: false },
        registrationPasses: state.registrationPasses.filter(
          (pass) => pass.registrationNumber !== registrationNumber
        ),
        // ⭐ ELIMINAR DEL ESTADO POR RESERVA
        registrationsByBooking: Object.keys(state.registrationsByBooking).reduce((acc, bookingId) => {
          acc[bookingId] = (state.registrationsByBooking[bookingId] || []).filter(
            pass => pass.registrationNumber !== registrationNumber
          );
          return acc;
        }, {}),
        // ⭐ LIMPIAR CURRENT SI ES EL MISMO
        currentRegistration: state.currentRegistration?.registrationNumber === registrationNumber 
          ? null 
          : state.currentRegistration,
        statistics: newStats,
        success: {
          message: 'Registro de pasajero eliminado exitosamente',
          type: 'delete',
          timestamp: Date.now(),
          affectedRegistrations: [registrationNumber]
        }
      };
    }
    case 'DELETE_REGISTRATION_PASS_FAILURE':
      return { 
        ...state, 
        loading: { ...state.loading, deleting: false }, 
        errors: { ...state.errors, deleting: action.payload }
      };

    // ⭐ SELECCIONAR REGISTRO ACTUAL - NUEVO
    case 'SET_CURRENT_REGISTRATION':
      return {
        ...state,
        currentRegistration: action.payload
      };

    // ⭐ VALIDACIÓN DE DOCUMENTOS - NUEVO
    case 'VALIDATE_DOCUMENTS_REQUEST':
      return {
        ...state,
        loading: { ...state.loading, validation: true },
        errors: { ...state.errors, validation: null }
      };
    case 'VALIDATE_DOCUMENTS_SUCCESS':
      return {
        ...state,
        loading: { ...state.loading, validation: false },
        validation: {
          ...state.validation,
          duplicateCheck: action.payload.duplicates,
          validationErrors: action.payload.errors || {}
        }
      };
    case 'VALIDATE_DOCUMENTS_FAILURE':
      return {
        ...state,
        loading: { ...state.loading, validation: false },
        errors: { ...state.errors, validation: action.payload }
      };

    // ⭐ ESTADÍSTICAS - NUEVO
    case 'GET_REGISTRATION_STATISTICS_REQUEST':
      return {
        ...state,
        loading: { ...state.loading, statistics: true },
        errors: { ...state.errors, statistics: null }
      };
    case 'GET_REGISTRATION_STATISTICS_SUCCESS':
      return {
        ...state,
        loading: { ...state.loading, statistics: false },
        statistics: {
          ...state.statistics,
          ...action.payload
        },
        cache: { ...state.cache, statisticsLastFetch: Date.now() }
      };
    case 'GET_REGISTRATION_STATISTICS_FAILURE':
      return {
        ...state,
        loading: { ...state.loading, statistics: false },
        errors: { ...state.errors, statistics: action.payload }
      };

    // ⭐ FILTROS - NUEVO
    case 'SET_REGISTRATION_FILTERS':
      return {
        ...state,
        filters: {
          ...state.filters,
          ...action.payload
        }
      };

    case 'CLEAR_REGISTRATION_FILTERS':
      return {
        ...state,
        filters: {
          bookingId: null,
          dateRange: null,
          nationality: null,
          documentType: null,
          guestName: null
        }
      };

    // ⭐ PAGINACIÓN - NUEVO
    case 'SET_REGISTRATION_PAGINATION':
      return {
        ...state,
        pagination: {
          ...state.pagination,
          ...action.payload
        }
      };

    // ⭐ OPERACIONES MASIVAS - NUEVO
    case 'BULK_REGISTRATION_OPERATION_REQUEST':
      return {
        ...state,
        loading: { ...state.loading, general: true },
        errors: { ...state.errors, general: null }
      };
    case 'BULK_REGISTRATION_OPERATION_SUCCESS':
      return {
        ...state,
        loading: { ...state.loading, general: false },
        success: {
          message: `Operación masiva completada: ${action.payload.operation}`,
          type: 'bulk',
          timestamp: Date.now(),
          affectedRegistrations: action.payload.affectedRegistrations || []
        },
        // Invalidar cache para refrescar datos
        cache: {
          ...state.cache,
          lastUpdated: Date.now(),
          bookingCacheTime: {}
        }
      };
    case 'BULK_REGISTRATION_OPERATION_FAILURE':
      return {
        ...state,
        loading: { ...state.loading, general: false },
        errors: { ...state.errors, general: action.payload }
      };

    // ⭐ LIMPIAR ESTADO
    case 'CLEAR_REGISTRATION_SUCCESS':
      return {
        ...state,
        success: {
          message: null,
          type: null,
          timestamp: null,
          affectedRegistrations: []
        }
      };

    case 'CLEAR_REGISTRATION_ERRORS':
      return {
        ...state,
        errors: {
          general: null,
          creating: null,
          updating: null,
          deleting: null,
          byBooking: null,
          validation: null,
          statistics: null
        }
      };

    case 'CLEAR_BOOKING_REGISTRATIONS': {
  const bookingIdToClear = action.payload;
  return {
    ...state,
    registrationsByBooking: {
      ...state.registrationsByBooking,
      [bookingIdToClear]: []
    },
    cache: {
      ...state.cache,
      bookingCacheTime: {
        ...state.cache.bookingCacheTime,
        [bookingIdToClear]: undefined
      }
    }
  };
}

    // ⭐ RESET COMPLETO
    case 'RESET_REGISTRATION_STATE':
      return {
        ...initialState,
        // Mantener filtros si se especifica
        filters: action.payload?.keepFilters ? state.filters : initialState.filters
      };

    // ⭐ COMPATIBILIDAD CON BOOKING REDUCER
    case 'CLEAR_BOOKING_DETAILS':
      return { 
        ...state, 
        currentRegistration: null,
        // No limpiar registrationsByBooking para mantener cache
      };

    default:
      return state;
  }
};

export default registrationPassReducer;