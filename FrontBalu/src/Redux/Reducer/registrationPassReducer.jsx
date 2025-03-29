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
  
      case 'CREATE_REGISTRATION_PASS':
        return {
          ...state,
          registrationPasses: [...state.registrationPasses, action.payload],
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