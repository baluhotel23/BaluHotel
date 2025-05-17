const initialState = {
    registrationPasses: [],
  };
  
  const registerReducer = (state = initialState, action) => {
    switch (action.type) {
      case 'GET_REGISTRATION_PASSES':
        return {
          ...state,
          registrationPasses: action.payload,
        };
        
  case 'GET_REGISTRATION_PASSES_BY_BOOKING':
  return {
    ...state,
    registrationPasses: action.payload,
  };
  case 'CLEAR_BOOKING_DETAILS':
  return { ...state, bookingDetails: null };

      case 'CREATE_REGISTRATION_PASS':
  return {
    ...state,
    registrationPasses: [
      ...state.registrationPasses,
      ...(Array.isArray(action.payload) ? action.payload : [action.payload])
    ],
  };
  
      case 'UPDATE_REGISTRATION_PASS':
        return {
          ...state,
          registrationPasses: state.registrationPasses.map((pass) =>
            pass.registrationNumber === action.payload.registrationNumber ? action.payload : pass
          ),
        };
  
      case 'DELETE_REGISTRATION_PASS':
        return {
          ...state,
          registrationPasses: state.registrationPasses.filter(
            (pass) => pass.registrationNumber !== action.payload
          ),
        };

        
  
      default:
        return state;
    }
  };
  
  export default registerReducer;