const initialState = {
    user: null,
    seller: null,
    invoice: null,
    loading: false,
    error: null,
    message: null,
  };
  
  const taxxaReducer = (state = initialState, action) => {
    switch (action.type) {
      case 'FETCH_USER_REQUEST':
      case 'FETCH_SELLER_REQUEST':
      case 'CREATE_SELLER_REQUEST':
      case 'UPDATE_SELLER_REQUEST':
      case 'SEND_INVOICE_REQUEST':
        return {
          ...state,
          loading: true,
          error: null,
          message: null,
        };
  
      case 'FETCH_USER_SUCCESS':
        return {
          ...state,
          loading: false,
          user: action.payload,
          error: null,
        };
  
      case 'FETCH_SELLER_SUCCESS':
        return {
          ...state,
          loading: false,
          seller: action.payload,
          error: null,
        };
  
      case 'CREATE_SELLER_SUCCESS':
        return {
          ...state,
          loading: false,
          seller: action.payload,
          error: null,
          message: 'Datos del comercio creados correctamente.',
        };
  
      case 'UPDATE_SELLER_SUCCESS':
        return {
          ...state,
          loading: false,
          seller: action.payload,
          error: null,
          message: 'Datos del comercio actualizados correctamente.',
        };
  
      case 'SEND_INVOICE_SUCCESS':
        return {
          ...state,
          loading: false,
          invoice: action.payload,
          error: null,
          message: 'Factura enviada exitosamente.',
        };
  
      case 'FETCH_USER_FAILURE':
      case 'FETCH_SELLER_FAILURE':
      case 'CREATE_SELLER_FAILURE':
      case 'UPDATE_SELLER_FAILURE':
      case 'SEND_INVOICE_FAILURE':
        return {
          ...state,
          loading: false,
          error: action.payload,
        };
  
      default:
        return state;
    }
  };
  
  export default taxxaReducer;