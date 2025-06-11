const initialState = {
  // ⭐ HABITACIONES PRINCIPALES
  rooms: [],
  roomTypes: [],
  selectedRoom: null,
  searchedRoom: null,
  
  // ⭐ INVENTARIO DE HABITACIONES
  inventory: {
    availability: {},
    history: {},
    currentCheck: null
  },
  
  // ⭐ AMENITIES Y SERVICIOS
  amenities: [],
  services: [],
  
  // ⭐ BÁSICOS DE HABITACIÓN
  roomBasics: {},
  roomBasicsByRoom: {},
  
  // ⭐ PROMOCIONES Y OFERTAS
  activePromotions: [],
  specialOffers: [],
  promoCodeValidation: null,
  
  // ⭐ PRECIOS Y COTIZACIONES
  priceCalculations: {},
  multipleRoomPrices: null,
  tempPriceCalculation: null,
  fullRoomQuote: null,
  availabilityWithPricing: null,
  
  // ⭐ REPORTES
  occupancyReport: null,
  revenueReport: null,
  roomsToPrepare: [],
  roomPreparationStatus: {},
  
  // ⭐ LOADING GRANULAR
  loading: {
    general: false,
    rooms: false,        // ⭐ ESTE ES EL QUE NECESITAS EN CreateRoom
    roomTypes: false,
    amenities: false,
    services: false,
    basics: false,
    inventory: false,
    pricing: false,
    reports: false,
    promotions: false
  },
  
  // ⭐ ERRORES ESPECÍFICOS
  errors: {
    general: null,
    rooms: null,         // ⭐ ESTE ES EL ERROR ESPECÍFICO PARA ROOMS
    roomTypes: null,
    amenities: null,
    services: null,
    basics: null,
    inventory: null,
    pricing: null,
    reports: null,
    promotions: null
  },
  
  // ⭐ FILTROS Y BÚSQUEDA
  filters: {
    roomType: null,
    status: null,
    floor: null,
    availability: null
  },
  
  // ⭐ CACHE Y OPTIMIZACIÓN
  cache: {
    lastUpdated: null,
    roomsLastFetch: null,
    roomTypesLastFetch: null,
    basicsLastFetch: {},
    promotionsLastFetch: null
  }
};


    
    // ⭐ HABITACIONES PRINCIPALES - OPTIMIZADO
   const roomReducer = (state = initialState, action) => {
  console.log('📮 [REDUCER] Action recibida:', {
    type: action.type,
    payloadType: typeof action.payload,
    payloadLength: Array.isArray(action.payload) ? action.payload.length : 'not array',
    timestamp: new Date().toISOString()
  });
  
  switch (action.type) {
    case "GET_ROOMS_REQUEST":
      console.log('🔄 [REDUCER] GET_ROOMS_REQUEST - Setting loading');
      return { 
        ...state, 
        loading: { ...state.loading, rooms: true }, 
        errors: { ...state.errors, rooms: null } 
      };
      
    case "GET_ROOMS_SUCCESS":
      console.log('✅ [REDUCER] GET_ROOMS_SUCCESS recibido');
      console.log('📊 [REDUCER] Payload:', action.payload);
      console.log('🔢 [REDUCER] Cantidad:', action.payload?.length);
      
      // ⭐ VALIDAR PAYLOAD ANTES DE ACTUALIZAR ESTADO
      if (Array.isArray(action.payload)) {
        console.log('🎯 [REDUCER] Payload válido, actualizando estado');
        const newState = { 
          ...state, 
          loading: { ...state.loading, rooms: false }, 
          rooms: action.payload,
          cache: { ...state.cache, roomsLastFetch: Date.now() }
        };
        
        console.log('📋 [REDUCER] Nuevo estado creado:', {
          roomsLength: newState.rooms.length,
          loading: newState.loading.rooms,
          cacheUpdated: newState.cache.roomsLastFetch
        });
        
        return newState;
      } else {
        console.error('❌ [REDUCER] Payload no es un array:', action.payload);
        return { 
          ...state, 
          loading: { ...state.loading, rooms: false }, 
          errors: { ...state.errors, rooms: 'Payload inválido' }
        };
      }
      
    case "GET_ROOMS_FAILURE":
      console.log('❌ [REDUCER] GET_ROOMS_FAILURE:', action.payload);
      return { 
        ...state, 
        loading: { ...state.loading, rooms: false }, 
        errors: { ...state.errors, rooms: action.payload }
      };

    // ⭐ TIPOS DE HABITACIÓN - OPTIMIZADO
    case "GET_ROOM_TYPES_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, roomTypes: true }, 
        errors: { ...state.errors, roomTypes: null } 
      };
    case "GET_ROOM_TYPES_SUCCESS":
      return { 
        ...state, 
        loading: { ...state.loading, roomTypes: false }, 
        roomTypes: action.payload,
        cache: { ...state.cache, roomTypesLastFetch: Date.now() }
      };
    case "GET_ROOM_TYPES_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, roomTypes: false }, 
        errors: { ...state.errors, roomTypes: action.payload }
      };

    // ⭐ HABITACIÓN INDIVIDUAL - OPTIMIZADO
    case "GET_ROOM_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, general: true }, 
        errors: { ...state.errors, general: null } 
      };
    case "GET_ROOM_SUCCESS":
      return { 
        ...state, 
        loading: { ...state.loading, general: false }, 
        selectedRoom: action.payload
      };
    case "GET_ROOM_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, general: false }, 
        errors: { ...state.errors, general: action.payload }
      };

    // ⭐ BÚSQUEDA DE HABITACIÓN - OPTIMIZADO
    case "SEARCH_ROOM_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, general: true }, 
        errors: { ...state.errors, general: null } 
      };
    case "SEARCH_ROOM_SUCCESS":
      return { 
        ...state, 
        loading: { ...state.loading, general: false }, 
        searchedRoom: action.payload
      };
    case "SEARCH_ROOM_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, general: false }, 
        errors: { ...state.errors, general: action.payload }
      };

    // ⭐ VERIFICAR DISPONIBILIDAD - OPTIMIZADO
    case "CHECK_AVAILABILITY_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, general: true }, 
        errors: { ...state.errors, general: null } 
      };
    case "CHECK_AVAILABILITY_SUCCESS":
      return { 
        ...state, 
        loading: { ...state.loading, general: false }, 
        rooms: action.payload
      };
    case "CHECK_AVAILABILITY_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, general: false }, 
        errors: { ...state.errors, general: action.payload }
      };

    // ⭐ CREAR HABITACIÓN - OPTIMIZADO
    case "CREATE_ROOM_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, rooms: true }, 
        errors: { ...state.errors, rooms: null } 
      };
    case "CREATE_ROOM_SUCCESS":
      return {
        ...state,
        loading: { ...state.loading, rooms: false }, // ⭐ DESACTIVAR LOADING
        errors: { ...state.errors, rooms: null },    // ⭐ LIMPIAR ERROR
        rooms: [...state.rooms, action.payload.data], // ⭐ USAR action.payload.data
        cache: { 
          ...state.cache, 
          roomsLastFetch: Date.now(),
          lastUpdated: Date.now()
        }
      };
    case "CREATE_ROOM_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, rooms: false }, // ⭐ DESACTIVAR LOADING
        errors: { ...state.errors, rooms: action.payload } // ⭐ GUARDAR ERROR
      };

    // ⭐ ACTUALIZAR HABITACIÓN - OPTIMIZADO
    case "UPDATE_ROOM_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, rooms: true }, 
        errors: { ...state.errors, rooms: null } 
      };
    case "UPDATE_ROOM_SUCCESS":
      return {
        ...state,
        loading: { ...state.loading, rooms: false },
        rooms: state.rooms.map((room) =>
          room.roomNumber === action.payload.roomNumber ? action.payload : room
        ),
        selectedRoom: state.selectedRoom?.roomNumber === action.payload.roomNumber 
          ? action.payload 
          : state.selectedRoom
      };
    case "UPDATE_ROOM_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, rooms: false }, 
        errors: { ...state.errors, rooms: action.payload }
      };

    // ⭐ ELIMINAR HABITACIÓN - OPTIMIZADO
    case "DELETE_ROOM_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, rooms: true }, 
        errors: { ...state.errors, rooms: null } 
      };
    case "DELETE_ROOM_SUCCESS":
      return {
        ...state,
        loading: { ...state.loading, rooms: false },
        rooms: state.rooms.filter(
          (room) => room.roomNumber !== action.payload.roomNumber
        ),
        // Limpiar datos relacionados con la habitación eliminada
        roomBasicsByRoom: {
          ...state.roomBasicsByRoom,
          [action.payload.roomNumber]: undefined
        },
        inventory: {
          ...state.inventory,
          availability: {
            ...state.inventory.availability,
            [action.payload.roomNumber]: undefined
          },
          history: {
            ...state.inventory.history,
            [action.payload.roomNumber]: undefined
          }
        }
      };
    case "DELETE_ROOM_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, rooms: false }, 
        errors: { ...state.errors, rooms: action.payload }
      };

    // ⭐ ACTUALIZAR ESTADO DE HABITACIÓN - OPTIMIZADO
    case "UPDATE_ROOM_STATUS_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, rooms: true }, 
        errors: { ...state.errors, rooms: null } 
      };
    case "UPDATE_ROOM_STATUS_SUCCESS":
      return {
        ...state,
        loading: { ...state.loading, rooms: false },
        rooms: state.rooms.map((room) =>
          room.roomNumber === action.payload.roomNumber ? action.payload : room
        ),
        selectedRoom: state.selectedRoom?.roomNumber === action.payload.roomNumber 
          ? action.payload 
          : state.selectedRoom
      };
    case "UPDATE_ROOM_STATUS_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, rooms: false }, 
        errors: { ...state.errors, rooms: action.payload }
      };

    // ⭐ AMENITIES - OPTIMIZADO
    case "GET_ROOM_AMENITIES_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, amenities: true }, 
        errors: { ...state.errors, amenities: null } 
      };
    case "GET_ROOM_AMENITIES_SUCCESS":
      return { 
        ...state, 
        loading: { ...state.loading, amenities: false }, 
        amenities: action.payload
      };
    case "GET_ROOM_AMENITIES_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, amenities: false }, 
        errors: { ...state.errors, amenities: action.payload }
      };

    case "UPDATE_ROOM_AMENITIES_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, amenities: true }, 
        errors: { ...state.errors, amenities: null } 
      };
    case "UPDATE_ROOM_AMENITIES_SUCCESS":
      return { 
        ...state, 
        loading: { ...state.loading, amenities: false }, 
        amenities: action.payload
      };
    case "UPDATE_ROOM_AMENITIES_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, amenities: false }, 
        errors: { ...state.errors, amenities: action.payload }
      };

    // ⭐ SERVICIOS - OPTIMIZADO
    case "GET_ROOM_SERVICES_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, services: true }, 
        errors: { ...state.errors, services: null } 
      };
    case "GET_ROOM_SERVICES_SUCCESS":
      return { 
        ...state, 
        loading: { ...state.loading, services: false }, 
        services: action.payload
      };
    case "GET_ROOM_SERVICES_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, services: false }, 
        errors: { ...state.errors, services: action.payload }
      };

    case "UPDATE_ROOM_SERVICES_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, services: true }, 
        errors: { ...state.errors, services: null } 
      };
    case "UPDATE_ROOM_SERVICES_SUCCESS":
      return { 
        ...state, 
        loading: { ...state.loading, services: false }, 
        services: action.payload
      };
    case "UPDATE_ROOM_SERVICES_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, services: false }, 
        errors: { ...state.errors, services: action.payload }
      };

    // ⭐ REPORTES - OPTIMIZADO
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
        occupancyReport: action.payload
      };
    case "GET_OCCUPANCY_REPORT_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, reports: false }, 
        errors: { ...state.errors, reports: action.payload }
      };

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
        revenueReport: action.payload
      };
    case "GET_REVENUE_REPORT_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, reports: false }, 
        errors: { ...state.errors, reports: action.payload }
      };

    // ⭐ HABITACIONES A PREPARAR - OPTIMIZADO
    case "GET_ROOMS_TO_PREPARE_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, reports: true }, 
        errors: { ...state.errors, reports: null } 
      };
    case "GET_ROOMS_TO_PREPARE_SUCCESS":
      return { 
        ...state, 
        loading: { ...state.loading, reports: false }, 
        roomsToPrepare: action.payload
      };
    case "GET_ROOMS_TO_PREPARE_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, reports: false }, 
        errors: { ...state.errors, reports: action.payload }
      };

    // ⭐ BÁSICOS DE HABITACIÓN - OPTIMIZADO
    case "GET_ROOM_BASICS_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, basics: true }, 
        errors: { ...state.errors, basics: null } 
      };
    case "GET_ROOM_BASICS_SUCCESS":
      console.log('🔄 Reducer recibió payload:', action.payload);
      return { 
        ...state, 
        loading: { ...state.loading, basics: false }, 
        roomBasics: action.payload.basics, // ⭐ Usar el array de básicos
        roomBasicsByRoom: {
          ...state.roomBasicsByRoom,
          [action.payload.roomNumber]: action.payload.basics // ⭐ Guardar por habitación
        },
        cache: {
          ...state.cache,
          basicsLastFetch: {
            ...state.cache.basicsLastFetch,
            [action.payload.roomNumber]: Date.now()
          }
        }
      };
    case "GET_ROOM_BASICS_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, basics: false }, 
        errors: { ...state.errors, basics: action.payload }
      };

    case "UPDATE_ROOM_BASICS_STOCK":
      return {
        ...state,
        roomBasics: Array.isArray(state.roomBasics) 
          ? state.roomBasics.map(item => 
              item.id === action.payload.itemId 
                ? { ...item, quantity: item.quantity - action.payload.quantity }
                : item
            )
          : state.roomBasics,
        roomBasicsByRoom: {
          ...state.roomBasicsByRoom,
          [action.payload.roomNumber]: (state.roomBasicsByRoom[action.payload.roomNumber] || []).map(item => 
            item.id === action.payload.itemId 
              ? { ...item, quantity: item.quantity - action.payload.quantity }
              : item
          )
        }
      };

    // ⭐ NUEVO: LIMPIAR BÁSICOS DE HABITACIÓN
    case "CLEAR_ROOM_BASICS":
      return {
        ...state,
        roomBasicsByRoom: {
          ...state.roomBasicsByRoom,
          [action.payload.roomNumber]: []
        }
      };

    // ⭐ VERIFICAR DISPONIBILIDAD DE INVENTARIO - NUEVO
    case "CHECK_INVENTORY_AVAILABILITY_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, inventory: true }, 
        errors: { ...state.errors, inventory: null },
        inventory: {
          ...state.inventory,
          currentCheck: action.payload?.roomNumber || null
        }
      };
    case "CHECK_INVENTORY_AVAILABILITY_SUCCESS":
      return { 
        ...state, 
        loading: { ...state.loading, inventory: false },
        inventory: {
          ...state.inventory,
          availability: {
            ...state.inventory.availability,
            [action.payload.roomNumber]: action.payload.availability
          },
          currentCheck: null
        }
      };
    case "CHECK_INVENTORY_AVAILABILITY_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, inventory: false }, 
        errors: { ...state.errors, inventory: action.payload },
        inventory: {
          ...state.inventory,
          currentCheck: null
        }
      };

    // ⭐ HISTORIAL DE INVENTARIO DE HABITACIÓN - NUEVO
    case "GET_ROOM_INVENTORY_HISTORY_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, inventory: true }, 
        errors: { ...state.errors, inventory: null } 
      };
    case "GET_ROOM_INVENTORY_HISTORY_SUCCESS":
      return { 
        ...state, 
        loading: { ...state.loading, inventory: false },
        inventory: {
          ...state.inventory,
          history: {
            ...state.inventory.history,
            [action.payload.roomNumber]: action.payload.history
          }
        }
      };
    case "GET_ROOM_INVENTORY_HISTORY_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, inventory: false }, 
        errors: { ...state.errors, inventory: action.payload }
      };

    // ⭐ CÁLCULO DE PRECIOS - OPTIMIZADO
    case "CALCULATE_ROOM_PRICE_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, pricing: true }, 
        errors: { ...state.errors, pricing: null } 
      };
    case "CALCULATE_ROOM_PRICE_SUCCESS":
      return {
        ...state,
        loading: { ...state.loading, pricing: false },
        priceCalculations: {
          ...state.priceCalculations,
          [action.payload.roomNumber]: action.payload.calculation
        }
      };
    case "CALCULATE_ROOM_PRICE_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, pricing: false }, 
        errors: { ...state.errors, pricing: action.payload }
      };

    case "CALCULATE_MULTIPLE_ROOM_PRICES_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, pricing: true }, 
        errors: { ...state.errors, pricing: null } 
      };
    case "CALCULATE_MULTIPLE_ROOM_PRICES_SUCCESS":
      return { 
        ...state, 
        loading: { ...state.loading, pricing: false }, 
        multipleRoomPrices: action.payload
      };
    case "CALCULATE_MULTIPLE_ROOM_PRICES_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, pricing: false }, 
        errors: { ...state.errors, pricing: action.payload }
      };

    // ⭐ ESTADO DE PREPARACIÓN DE HABITACIONES - OPTIMIZADO
    case "GET_ROOM_PREPARATION_STATUS_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, reports: true }, 
        errors: { ...state.errors, reports: null } 
      };
    case "GET_ROOM_PREPARATION_STATUS_SUCCESS":
      return {
        ...state,
        loading: { ...state.loading, reports: false },
        roomPreparationStatus: {
          ...state.roomPreparationStatus,
          [action.payload.roomNumber]: action.payload.status
        }
      };
    case "GET_ROOM_PREPARATION_STATUS_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, reports: false }, 
        errors: { ...state.errors, reports: action.payload }
      };

    // ⭐ PROMOCIONES - OPTIMIZADO
    case "GET_ACTIVE_PROMOTIONS_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, promotions: true }, 
        errors: { ...state.errors, promotions: null } 
      };
    case "GET_ACTIVE_PROMOTIONS_SUCCESS":
      return { 
        ...state, 
        loading: { ...state.loading, promotions: false }, 
        activePromotions: action.payload,
        cache: { ...state.cache, promotionsLastFetch: Date.now() }
      };
    case "GET_ACTIVE_PROMOTIONS_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, promotions: false }, 
        errors: { ...state.errors, promotions: action.payload }
      };

    case "GET_SPECIAL_OFFERS_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, promotions: true }, 
        errors: { ...state.errors, promotions: null } 
      };
    case "GET_SPECIAL_OFFERS_SUCCESS":
      return { 
        ...state, 
        loading: { ...state.loading, promotions: false }, 
        specialOffers: action.payload
      };
    case "GET_SPECIAL_OFFERS_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, promotions: false }, 
        errors: { ...state.errors, promotions: action.payload }
      };

    // ⭐ VALIDACIÓN DE CÓDIGOS PROMOCIONALES - OPTIMIZADO
    case "VALIDATE_PROMO_CODE_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, promotions: true }, 
        errors: { ...state.errors, promotions: null } 
      };
    case "VALIDATE_PROMO_CODE_SUCCESS":
      return { 
        ...state, 
        loading: { ...state.loading, promotions: false }, 
        promoCodeValidation: action.payload
      };
    case "VALIDATE_PROMO_CODE_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, promotions: false }, 
        errors: { ...state.errors, promotions: action.payload }, 
        promoCodeValidation: null
      };

    // ⭐ MANEJO DE PRECIOS TEMPORALES - OPTIMIZADO
    case "CLEAR_PRICE_CALCULATIONS":
      return {
        ...state,
        priceCalculations: {},
        multipleRoomPrices: null,
        tempPriceCalculation: null
      };

    case "SAVE_TEMP_PRICE_CALCULATION":
      return {
        ...state,
        tempPriceCalculation: action.payload
      };

    // ⭐ COTIZACIÓN COMPLETA - OPTIMIZADO
    case "GET_FULL_ROOM_QUOTE_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, pricing: true }, 
        errors: { ...state.errors, pricing: null } 
      };
    case "GET_FULL_ROOM_QUOTE_SUCCESS":
      return { 
        ...state, 
        loading: { ...state.loading, pricing: false }, 
        fullRoomQuote: action.payload
      };
    case "GET_FULL_ROOM_QUOTE_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, pricing: false }, 
        errors: { ...state.errors, pricing: action.payload }
      };

    // ⭐ DISPONIBILIDAD CON PRECIOS - OPTIMIZADO
    case "CHECK_AVAILABILITY_WITH_PRICING_REQUEST":
      return { 
        ...state, 
        loading: { ...state.loading, pricing: true }, 
        errors: { ...state.errors, pricing: null } 
      };
    case "CHECK_AVAILABILITY_WITH_PRICING_SUCCESS":
      return { 
        ...state, 
        loading: { ...state.loading, pricing: false }, 
        availabilityWithPricing: action.payload
      };
    case "CHECK_AVAILABILITY_WITH_PRICING_FAILURE":
      return { 
        ...state, 
        loading: { ...state.loading, pricing: false }, 
        errors: { ...state.errors, pricing: action.payload }
      };

    default:
      return state;
  }
};

export default roomReducer;