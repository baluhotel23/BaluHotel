const initialState = {
  rooms: [],
  roomTypes: [],
  selectedRoom: null,
  searchedRoom: null,
  amenities: [],
  services: [],
  occupancyReport: null,
  revenueReport: null,
  roomsToPrepare: [],
  roomBasics: [], // <-- NUEVO ESTADO
  activePromotions: [],
  specialOffers: [],
  priceCalculations: {},
  multipleRoomPrices: null,
  roomPreparationStatus: {},
  tempPriceCalculation: null,
  fullRoomQuote: null,
  availabilityWithPricing: null,
  promoCodeValidation: null,
  loading: false,
  error: null,
};

const roomReducer = (state = initialState, action) => {
  switch (action.type) {
    // Ejemplo para GET_ROOMS
    case "GET_ROOMS_REQUEST":
      return { ...state, loading: true, error: null };
    case "GET_ROOMS_SUCCESS":
      return { ...state, loading: false, rooms: action.payload };
    case "GET_ROOMS_FAILURE":
      return { ...state, loading: false, error: action.payload };

    // GET_ROOM_TYPES
    case "GET_ROOM_TYPES_REQUEST":
      return { ...state, loading: true, error: null };
    case "GET_ROOM_TYPES_SUCCESS":
      return { ...state, loading: false, roomTypes: action.payload };
    case "GET_ROOM_TYPES_FAILURE":
      return { ...state, loading: false, error: action.payload };

    // GET_ROOM
    case "GET_ROOM_REQUEST":
      return { ...state, loading: true, error: null };
    case "GET_ROOM_SUCCESS":
      return { ...state, loading: false, selectedRoom: action.payload };
    case "GET_ROOM_FAILURE":
      return { ...state, loading: false, error: action.payload };

    case "SEARCH_ROOM_REQUEST":
      return { ...state, loading: true, error: null };
    case "SEARCH_ROOM_SUCCESS":
      return { ...state, loading: false, searchedRoom: action.payload };
    case "SEARCH_ROOM_FAILURE":
      return { ...state, loading: false, error: action.payload };

    // CHECK_AVAILABILITY
    case "CHECK_AVAILABILITY_REQUEST":
      return { ...state, loading: true, error: null };
    case "CHECK_AVAILABILITY_SUCCESS":
      return { ...state, loading: false, rooms: action.payload };
    case "CHECK_AVAILABILITY_FAILURE":
      return { ...state, loading: false, error: action.payload };

    // CREATE_ROOM
    case "CREATE_ROOM_REQUEST":
      return { ...state, loading: true, error: null };
    case "CREATE_ROOM_SUCCESS":
      return {
        ...state,
        loading: false,
        rooms: [...state.rooms, action.payload],
      };
    case "CREATE_ROOM_FAILURE":
      return { ...state, loading: false, error: action.payload };

    // UPDATE_ROOM
    case "UPDATE_ROOM_REQUEST":
      return { ...state, loading: true, error: null };
    case "UPDATE_ROOM_SUCCESS":
      return {
        ...state,
        loading: false,
        rooms: state.rooms.map((room) =>
          room.roomNumber === action.payload.roomNumber ? action.payload : room
        ),
      };
    case "UPDATE_ROOM_FAILURE":
      return { ...state, loading: false, error: action.payload };

    // DELETE_ROOM
    case "DELETE_ROOM_REQUEST":
      return { ...state, loading: true, error: null };
    case "DELETE_ROOM_SUCCESS":
      return {
        ...state,
        loading: false,
        rooms: state.rooms.filter(
          (room) => room.roomNumber !== action.payload.roomNumber
        ),
      };
    case "DELETE_ROOM_FAILURE":
      return { ...state, loading: false, error: action.payload };

    // UPDATE_ROOM_STATUS
    case "UPDATE_ROOM_STATUS_REQUEST":
      return { ...state, loading: true, error: null };
    case "UPDATE_ROOM_STATUS_SUCCESS":
      return {
        ...state,
        loading: false,
        rooms: state.rooms.map((room) =>
          room.roomNumber === action.payload.roomNumber ? action.payload : room
        ),
      };
    case "UPDATE_ROOM_STATUS_FAILURE":
      return { ...state, loading: false, error: action.payload };

    // GET_ROOM_AMENITIES
    case "GET_ROOM_AMENITIES_REQUEST":
      return { ...state, loading: true, error: null };
    case "GET_ROOM_AMENITIES_SUCCESS":
      return { ...state, loading: false, amenities: action.payload };
    case "GET_ROOM_AMENITIES_FAILURE":
      return { ...state, loading: false, error: action.payload };

    // UPDATE_ROOM_AMENITIES
    case "UPDATE_ROOM_AMENITIES_REQUEST":
      return { ...state, loading: true, error: null };
    case "UPDATE_ROOM_AMENITIES_SUCCESS":
      return { ...state, loading: false, amenities: action.payload };
    case "UPDATE_ROOM_AMENITIES_FAILURE":
      return { ...state, loading: false, error: action.payload };

    // GET_ROOM_SERVICES
    case "GET_ROOM_SERVICES_REQUEST":
      return { ...state, loading: true, error: null };
    case "GET_ROOM_SERVICES_SUCCESS":
      return { ...state, loading: false, services: action.payload };
    case "GET_ROOM_SERVICES_FAILURE":
      return { ...state, loading: false, error: action.payload };

    // UPDATE_ROOM_SERVICES
    case "UPDATE_ROOM_SERVICES_REQUEST":
      return { ...state, loading: true, error: null };
    case "UPDATE_ROOM_SERVICES_SUCCESS":
      return { ...state, loading: false, services: action.payload };
    case "UPDATE_ROOM_SERVICES_FAILURE":
      return { ...state, loading: false, error: action.payload };

    // GET_OCCUPANCY_REPORT
    case "GET_OCCUPANCY_REPORT_REQUEST":
      return { ...state, loading: true, error: null };
    case "GET_OCCUPANCY_REPORT_SUCCESS":
      return { ...state, loading: false, occupancyReport: action.payload };
    case "GET_OCCUPANCY_REPORT_FAILURE":
      return { ...state, loading: false, error: action.payload };

    // GET_REVENUE_REPORT
    case "GET_REVENUE_REPORT_REQUEST":
      return { ...state, loading: true, error: null };
    case "GET_REVENUE_REPORT_SUCCESS":
      return { ...state, loading: false, revenueReport: action.payload };
    case "GET_REVENUE_REPORT_FAILURE":
      return { ...state, loading: false, error: action.payload };

    case "GET_ROOMS_TO_PREPARE_REQUEST":
      return { ...state, loading: true, error: null };
    case "GET_ROOMS_TO_PREPARE_SUCCESS":
      return { ...state, loading: false, roomsToPrepare: action.payload };
    case "GET_ROOMS_TO_PREPARE_FAILURE":
      return { ...state, loading: false, error: action.payload };

    case "GET_ROOM_BASICS_REQUEST":
      return { ...state, loading: true, error: null };
    case "GET_ROOM_BASICS_SUCCESS":
      return { ...state, loading: false, roomBasics: action.payload };
    case "GET_ROOM_BASICS_FAILURE":
      return { ...state, loading: false, error: action.payload };

      case "CALCULATE_ROOM_PRICE_REQUEST":
      return { ...state, loading: true, error: null };
    case "CALCULATE_ROOM_PRICE_SUCCESS":
      return {
        ...state,
        loading: false,
        priceCalculations: {
          ...state.priceCalculations,
          [action.payload.roomNumber]: action.payload.calculation
        }
      };
    case "CALCULATE_ROOM_PRICE_FAILURE":
      return { ...state, loading: false, error: action.payload };

    case "CALCULATE_MULTIPLE_ROOM_PRICES_REQUEST":
      return { ...state, loading: true, error: null };
    case "CALCULATE_MULTIPLE_ROOM_PRICES_SUCCESS":
      return { ...state, loading: false, multipleRoomPrices: action.payload };
    case "CALCULATE_MULTIPLE_ROOM_PRICES_FAILURE":
      return { ...state, loading: false, error: action.payload };

    // ⭐ ESTADO DE PREPARACIÓN DE HABITACIONES
    case "GET_ROOM_PREPARATION_STATUS_REQUEST":
      return { ...state, loading: true, error: null };
    case "GET_ROOM_PREPARATION_STATUS_SUCCESS":
      return {
        ...state,
        loading: false,
        roomPreparationStatus: {
          ...state.roomPreparationStatus,
          [action.payload.roomNumber]: action.payload.status
        }
      };
    case "GET_ROOM_PREPARATION_STATUS_FAILURE":
      return { ...state, loading: false, error: action.payload };

    // ⭐ MANEJO DE PRECIOS TEMPORALES
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

    // ⭐ COTIZACIÓN COMPLETA
    case "GET_FULL_ROOM_QUOTE_REQUEST":
      return { ...state, loading: true, error: null };
    case "GET_FULL_ROOM_QUOTE_SUCCESS":
      return { ...state, loading: false, fullRoomQuote: action.payload };
    case "GET_FULL_ROOM_QUOTE_FAILURE":
      return { ...state, loading: false, error: action.payload };

    // ⭐ DISPONIBILIDAD CON PRECIOS
    case "CHECK_AVAILABILITY_WITH_PRICING_REQUEST":
      return { ...state, loading: true, error: null };
    case "CHECK_AVAILABILITY_WITH_PRICING_SUCCESS":
      return { ...state, loading: false, availabilityWithPricing: action.payload };
    case "CHECK_AVAILABILITY_WITH_PRICING_FAILURE":
      return { ...state, loading: false, error: action.payload };

    // ⭐ VALIDACIÓN DE CÓDIGOS PROMOCIONALES
    case "VALIDATE_PROMO_CODE_REQUEST":
      return { ...state, loading: true, error: null };
    case "VALIDATE_PROMO_CODE_SUCCESS":
      return { ...state, loading: false, promoCodeValidation: action.payload };
    case "VALIDATE_PROMO_CODE_FAILURE":
      return { ...state, loading: false, error: action.payload, promoCodeValidation: null };


    default:
      return state;
  }
};

export default roomReducer;
