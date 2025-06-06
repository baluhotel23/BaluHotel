const initialState = {
  registrationPasses: [],
  registrationsByBooking: {}, // ⭐ AGREGAR ESTADO POR RESERVA
  loading: false,
  error: null
};

const registerReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'GET_REGISTRATION_PASSES_REQUEST':
      return { ...state, loading: true, error: null };
    case 'GET_REGISTRATION_PASSES':
      return {
        ...state,
        registrationPasses: action.payload,
        loading: false,
        error: null
      };
    case 'GET_REGISTRATION_PASSES_FAILURE':
      return { ...state, loading: false, error: action.payload };
      
    // ⭐ CORREGIR PARA MANTENER PASAJEROS POR RESERVA
    case 'GET_REGISTRATION_PASSES_BY_BOOKING_REQUEST':
      return { ...state, loading: true, error: null };
    case 'GET_REGISTRATION_PASSES_BY_BOOKING':
      return {
        ...state,
        registrationPasses: action.payload.passengers || action.payload,
        registrationsByBooking: {
          ...state.registrationsByBooking,
          [action.payload.bookingId]: action.payload.passengers || action.payload // ⭐ GUARDAR POR RESERVA
        },
        loading: false,
        error: null
      };
    case 'GET_REGISTRATION_PASSES_BY_BOOKING_FAILURE':
      return { ...state, loading: false, error: action.payload };

    case 'CLEAR_BOOKING_DETAILS':
      return { ...state, bookingDetails: null };

    // ⭐ CORREGIR CREATE_REGISTRATION_PASS
    case 'CREATE_REGISTRATION_PASS_REQUEST':
      return { ...state, loading: true, error: null };
    case 'CREATE_REGISTRATION_PASS': {
      const newPassengers = Array.isArray(action.payload.passengers) 
        ? action.payload.passengers 
        : [action.payload.passengers];
      
      return {
        ...state,
        registrationPasses: [
          ...state.registrationPasses,
          ...newPassengers
        ],
        registrationsByBooking: {
          ...state.registrationsByBooking,
          [action.payload.bookingId]: [
            ...(state.registrationsByBooking[action.payload.bookingId] || []),
            ...newPassengers // ⭐ ACUMULAR PASAJEROS POR RESERVA
          ]
        },
        loading: false,
        error: null
      };
    }
    case 'CREATE_REGISTRATION_PASS_FAILURE':
      return { ...state, loading: false, error: action.payload };

    case 'UPDATE_REGISTRATION_PASS':
      return {
        ...state,
        registrationPasses: state.registrationPasses.map((pass) =>
          pass.registrationNumber === action.payload.registrationNumber ? action.payload : pass
        ),
        // ⭐ TAMBIÉN ACTUALIZAR EN EL ESTADO POR RESERVA
        registrationsByBooking: Object.keys(state.registrationsByBooking).reduce((acc, bookingId) => {
          acc[bookingId] = state.registrationsByBooking[bookingId].map(pass =>
            pass.registrationNumber === action.payload.registrationNumber ? action.payload : pass
          );
          return acc;
        }, {})
      };

    case 'DELETE_REGISTRATION_PASS':
      return {
        ...state,
        registrationPasses: state.registrationPasses.filter(
          (pass) => pass.registrationNumber !== action.payload
        ),
        // ⭐ TAMBIÉN ELIMINAR DEL ESTADO POR RESERVA
        registrationsByBooking: Object.keys(state.registrationsByBooking).reduce((acc, bookingId) => {
          acc[bookingId] = state.registrationsByBooking[bookingId].filter(
            pass => pass.registrationNumber !== action.payload
          );
          return acc;
        }, {})
      };

    default:
      return state;
  }
};

export default registerReducer;