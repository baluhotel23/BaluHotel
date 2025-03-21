const initialState = {
    loading: false,
    payment: null,
    error: null,
  };
  
  const paymentReducer = (state = initialState, action) => {
    switch (action.type) {
      case 'REGISTER_LOCAL_PAYMENT_REQUEST':
        return {
          ...state,
          loading: true,
          error: null,
        };
      case 'REGISTER_LOCAL_PAYMENT_SUCCESS':
        return {
          ...state,
          loading: false,
          payment: action.payload,
          error: null,
        };
      case 'REGISTER_LOCAL_PAYMENT_FAILURE':
        return {
          ...state,
          loading: false,
          payment: null,
          error: action.payload,
        };
      default:
        return state;
    }
  };
  
  export default paymentReducer;