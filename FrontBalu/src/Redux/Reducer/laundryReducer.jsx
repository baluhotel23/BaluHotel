const initialState = {
  // ⭐ ESTADO GENERAL DE LAVANDERÍA
  status: {
    summary: null, // Estado general: items pendientes, en proceso, etc.
    pendingItems: [],
    processingItems: [],
    readyItems: []
  },
  
  // ⭐ ITEMS POR ESTADO
  pending: [], // Items esperando ser enviados a lavandería
  inWashing: [], // Items actualmente en lavandería
  clean: [], // Items limpios listos para usar
  dirty: [], // Items marcados como sucios
  
  // ⭐ HISTORIAL Y MOVIMIENTOS
  history: [], // Historial completo de movimientos
  movements: [], // Movimientos recientes
  roomHistory: {}, // Historial por habitación: { roomNumber: [...] }
  
  // ⭐ ESTADÍSTICAS Y REPORTES
  stats: {
    current: null, // Estadísticas actuales
    period: 'week', // Período actual: 'week', 'month', 'year'
    trends: null, // Tendencias calculadas
    efficiency: null // Métricas de eficiencia
  },
  
  // ⭐ OPERACIONES COMPUESTAS
  operations: {
    checkoutProcessing: false, // Para el flujo de check-out
    bulkProcessing: false, // Para operaciones masivas
    currentBookingId: null // Reserva siendo procesada
  },
  
  // ⭐ FILTROS Y BÚSQUEDA
  filters: {
    status: null, // 'dirty', 'washing', 'clean'
    roomNumber: null,
    dateRange: null,
    itemType: null
  },
  
  // ⭐ ITEMS LOCALES (para actualizaciones optimistas)
  localUpdates: {}, // Updates pendientes por itemId
  
  // ⭐ LOADING GRANULAR
  loading: {
    general: false,
    status: false,
    pending: false,
    history: false,
    stats: false,
    sending: false,
    receiving: false,
    marking: false,
    checkout: false
  },
  
  // ⭐ ERRORES ESPECÍFICOS
  errors: {
    general: null,
    status: null,
    pending: null,
    history: null,
    stats: null,
    sending: null,
    receiving: null,
    marking: null,
    checkout: null
  },
  
  // ⭐ MENSAJES DE ÉXITO
  success: {
    message: null,
    type: null, // 'send', 'receive', 'mark-dirty', 'checkout'
    timestamp: null
  },
  
  // ⭐ CACHE Y OPTIMIZACIÓN
  cache: {
    lastUpdated: null,
    statusLastFetch: null,
    historyLastFetch: null,
    statsLastFetch: {}
  }
};

const laundryReducer = (state = initialState, action) => {
  switch (action.type) {
    
    // ⭐ ESTADO GENERAL DE LAVANDERÍA
    case 'GET_LAUNDRY_STATUS_REQUEST':
      return {
        ...state,
        loading: { ...state.loading, status: true },
        errors: { ...state.errors, status: null }
      };
    case 'GET_LAUNDRY_STATUS_SUCCESS':
      return {
        ...state,
        loading: { ...state.loading, status: false },
        status: {
          summary: action.payload.summary,
          pendingItems: action.payload.pending || [],
          processingItems: action.payload.processing || [],
          readyItems: action.payload.ready || []
        },
        cache: { ...state.cache, statusLastFetch: Date.now() }
      };
    case 'GET_LAUNDRY_STATUS_FAILURE':
      return {
        ...state,
        loading: { ...state.loading, status: false },
        errors: { ...state.errors, status: action.payload }
      };

    // ⭐ ITEMS PENDIENTES EN LAVANDERÍA
    case 'GET_PENDING_LAUNDRY_REQUEST':
      return {
        ...state,
        loading: { ...state.loading, pending: true },
        errors: { ...state.errors, pending: null }
      };
    case 'GET_PENDING_LAUNDRY_SUCCESS':
      return {
        ...state,
        loading: { ...state.loading, pending: false },
        pending: action.payload,
        // Actualizar también el estado general
        status: {
          ...state.status,
          pendingItems: action.payload
        }
      };
    case 'GET_PENDING_LAUNDRY_FAILURE':
      return {
        ...state,
        loading: { ...state.loading, pending: false },
        errors: { ...state.errors, pending: action.payload }
      };

    // ⭐ ENVIAR ITEMS A LAVANDERÍA
    case 'SEND_TO_LAUNDRY_REQUEST':
      return {
        ...state,
        loading: { ...state.loading, sending: true },
        errors: { ...state.errors, sending: null },
        success: { ...state.success, message: null }
      };
    case 'SEND_TO_LAUNDRY_SUCCESS':
      return {
        ...state,
        loading: { ...state.loading, sending: false },
        // Mover items de dirty a inWashing
        dirty: state.dirty.filter(item => 
          !action.payload.sentItems?.some(sent => sent.itemId === item.itemId)
        ),
        inWashing: [
          ...state.inWashing,
          ...(action.payload.sentItems || [])
        ],
        // Actualizar historial
        movements: [action.payload, ...state.movements.slice(0, 49)], // Mantener últimos 50
        success: {
          message: 'Items enviados a lavandería exitosamente',
          type: 'send',
          timestamp: Date.now()
        },
        // Invalidar cache
        cache: { ...state.cache, statusLastFetch: null }
      };
    case 'SEND_TO_LAUNDRY_FAILURE':
      return {
        ...state,
        loading: { ...state.loading, sending: false },
        errors: { ...state.errors, sending: action.payload }
      };

    // ⭐ RECIBIR ITEMS DE LAVANDERÍA
    case 'RECEIVE_FROM_LAUNDRY_REQUEST':
      return {
        ...state,
        loading: { ...state.loading, receiving: true },
        errors: { ...state.errors, receiving: null },
        success: { ...state.success, message: null }
      };
    case 'RECEIVE_FROM_LAUNDRY_SUCCESS':
      return {
        ...state,
        loading: { ...state.loading, receiving: false },
        // Mover items de inWashing a clean
        inWashing: state.inWashing.filter(item => 
          !action.payload.receivedItems?.some(received => received.itemId === item.itemId)
        ),
        clean: [
          ...state.clean,
          ...(action.payload.receivedItems || [])
        ],
        // Actualizar historial
        movements: [action.payload, ...state.movements.slice(0, 49)],
        success: {
          message: 'Items recibidos de lavandería exitosamente',
          type: 'receive',
          timestamp: Date.now()
        },
        // Invalidar cache
        cache: { ...state.cache, statusLastFetch: null }
      };
    case 'RECEIVE_FROM_LAUNDRY_FAILURE':
      return {
        ...state,
        loading: { ...state.loading, receiving: false },
        errors: { ...state.errors, receiving: action.payload }
      };

    // ⭐ MARCAR ITEMS COMO SUCIOS
    case 'MARK_AS_DIRTY_REQUEST':
      return {
        ...state,
        loading: { ...state.loading, marking: true },
        errors: { ...state.errors, marking: null },
        success: { ...state.success, message: null }
      };
    case 'MARK_AS_DIRTY_SUCCESS':
      return {
        ...state,
        loading: { ...state.loading, marking: false },
        // Mover items de clean a dirty
        clean: state.clean.filter(item => 
          !action.payload.markedItems?.some(marked => marked.itemId === item.itemId)
        ),
        dirty: [
          ...state.dirty,
          ...(action.payload.markedItems || [])
        ],
        // Actualizar historial
        movements: [action.payload, ...state.movements.slice(0, 49)],
        success: {
          message: 'Items marcados como sucios exitosamente',
          type: 'mark-dirty',
          timestamp: Date.now()
        },
        // Invalidar cache
        cache: { ...state.cache, statusLastFetch: null }
      };
    case 'MARK_AS_DIRTY_FAILURE':
      return {
        ...state,
        loading: { ...state.loading, marking: false },
        errors: { ...state.errors, marking: action.payload }
      };

    // ⭐ HISTORIAL DE LAVANDERÍA
    case 'GET_LAUNDRY_HISTORY_REQUEST':
      return {
        ...state,
        loading: { ...state.loading, history: true },
        errors: { ...state.errors, history: null }
      };
    case 'GET_LAUNDRY_HISTORY_SUCCESS':
      return {
        ...state,
        loading: { ...state.loading, history: false },
        history: action.payload,
        cache: { ...state.cache, historyLastFetch: Date.now() }
      };
    case 'GET_LAUNDRY_HISTORY_FAILURE':
      return {
        ...state,
        loading: { ...state.loading, history: false },
        errors: { ...state.errors, history: action.payload }
      };

    // ⭐ LAVANDERÍA POR HABITACIÓN
    case 'GET_LAUNDRY_BY_ROOM_REQUEST':
      return {
        ...state,
        loading: { ...state.loading, history: true },
        errors: { ...state.errors, history: null }
      };
    case 'GET_LAUNDRY_BY_ROOM_SUCCESS':
      return {
        ...state,
        loading: { ...state.loading, history: false },
        roomHistory: {
          ...state.roomHistory,
          [action.payload.roomNumber]: action.payload.laundryData
        }
      };
    case 'GET_LAUNDRY_BY_ROOM_FAILURE':
      return {
        ...state,
        loading: { ...state.loading, history: false },
        errors: { ...state.errors, history: action.payload }
      };

    // ⭐ ESTADÍSTICAS DE LAVANDERÍA
    case 'GET_LAUNDRY_STATS_REQUEST':
      return {
        ...state,
        loading: { ...state.loading, stats: true },
        errors: { ...state.errors, stats: null }
      };
    case 'GET_LAUNDRY_STATS_SUCCESS':
      return {
        ...state,
        loading: { ...state.loading, stats: false },
        stats: {
          current: action.payload.stats,
          period: action.payload.period,
          trends: action.payload.stats.trends,
          efficiency: action.payload.stats.efficiencyMetrics
        },
        cache: {
          ...state.cache,
          statsLastFetch: {
            ...state.cache.statsLastFetch,
            [action.payload.period]: Date.now()
          }
        }
      };
    case 'GET_LAUNDRY_STATS_FAILURE':
      return {
        ...state,
        loading: { ...state.loading, stats: false },
        errors: { ...state.errors, stats: action.payload }
      };

    // ⭐ PROCESO DE CHECK-OUT CON LAVANDERÍA
    case 'PROCESS_CHECKOUT_LAUNDRY_REQUEST':
      return {
        ...state,
        loading: { ...state.loading, checkout: true },
        errors: { ...state.errors, checkout: null },
        operations: {
          ...state.operations,
          checkoutProcessing: true,
          currentBookingId: action.payload?.bookingId || null
        }
      };
    case 'PROCESS_CHECKOUT_LAUNDRY_SUCCESS':
      return {
        ...state,
        loading: { ...state.loading, checkout: false },
        // Agregar items procesados al estado sucio
        dirty: [
          ...state.dirty,
          ...(action.payload.processedItems || [])
        ],
        // Actualizar historial
        movements: [
          {
            type: 'checkout',
            bookingId: action.payload.bookingId,
            roomNumber: action.payload.roomNumber,
            items: action.payload.processedItems,
            timestamp: Date.now()
          },
          ...state.movements.slice(0, 49)
        ],
        operations: {
          ...state.operations,
          checkoutProcessing: false,
          currentBookingId: null
        },
        success: {
          message: `Lavandería de check-out procesada - Habitación ${action.payload.roomNumber}`,
          type: 'checkout',
          timestamp: Date.now()
        },
        // Invalidar cache
        cache: { ...state.cache, statusLastFetch: null }
      };
    case 'PROCESS_CHECKOUT_LAUNDRY_FAILURE':
      return {
        ...state,
        loading: { ...state.loading, checkout: false },
        errors: { ...state.errors, checkout: action.payload },
        operations: {
          ...state.operations,
          checkoutProcessing: false,
          currentBookingId: null
        }
      };

    // ⭐ ACTUALIZACIONES LOCALES (para optimistic updates)
    case 'UPDATE_LAUNDRY_ITEM_LOCAL':
      return {
        ...state,
        localUpdates: {
          ...state.localUpdates,
          [action.payload.itemId]: {
            ...action.payload.updates,
            timestamp: Date.now()
          }
        }
      };

    // ⭐ LIMPIAR ESTADO
    case 'CLEAR_LAUNDRY_STATE':
      return {
        ...state,
        // Mantener datos principales pero limpiar temporales
        localUpdates: {},
        operations: {
          checkoutProcessing: false,
          bulkProcessing: false,
          currentBookingId: null
        },
        success: {
          message: null,
          type: null,
          timestamp: null
        },
        errors: {
          general: null,
          status: null,
          pending: null,
          history: null,
          stats: null,
          sending: null,
          receiving: null,
          marking: null,
          checkout: null
        }
      };

    // ⭐ ACTUALIZAR FILTROS
    case 'SET_LAUNDRY_FILTERS':
      return {
        ...state,
        filters: {
          ...state.filters,
          ...action.payload
        }
      };

    // ⭐ LIMPIAR FILTROS
    case 'CLEAR_LAUNDRY_FILTERS':
      return {
        ...state,
        filters: {
          status: null,
          roomNumber: null,
          dateRange: null,
          itemType: null
        }
      };

    // ⭐ LIMPIAR MENSAJES DE ÉXITO
    case 'CLEAR_LAUNDRY_SUCCESS':
      return {
        ...state,
        success: {
          message: null,
          type: null,
          timestamp: null
        }
      };

    // ⭐ OPERACIONES MASIVAS
    case 'BULK_LAUNDRY_OPERATION_REQUEST':
      return {
        ...state,
        loading: { ...state.loading, general: true },
        operations: {
          ...state.operations,
          bulkProcessing: true
        }
      };
    case 'BULK_LAUNDRY_OPERATION_SUCCESS':
      return {
        ...state,
        loading: { ...state.loading, general: false },
        operations: {
          ...state.operations,
          bulkProcessing: false
        },
        success: {
          message: `Operación masiva completada: ${action.payload.operation}`,
          type: 'bulk',
          timestamp: Date.now()
        },
        // Invalidar cache para refrescar datos
        cache: {
          ...state.cache,
          statusLastFetch: null,
          historyLastFetch: null
        }
      };
    case 'BULK_LAUNDRY_OPERATION_FAILURE':
      return {
        ...state,
        loading: { ...state.loading, general: false },
        operations: {
          ...state.operations,
          bulkProcessing: false
        },
        errors: { ...state.errors, general: action.payload }
      };

    default:
      return state;
  }
};

export default laundryReducer;