const initialState = {
    buyer: null,
    seller: null,
    invoice: null,
    loading: false,
    error: null,
    message: null,
  };
  
  const taxxaReducer = (state = initialState, action) => {
    switch (action.type) {
      // Request States
      case 'FETCH_BUYER_REQUEST':
        return {
          ...state,
          loading: true,
          error: null,
          message: null,
          buyer: null, // Clear previous buyer
        };
      case 'CREATE_BUYER_REQUEST':
        return {
          ...state,
          loading: true,
          error: null,
          message: null,
          // Optionally clear buyer if a "verified" buyer should be cleared before creating a new one
          // buyer: null, 
        };
      case 'FETCH_SELLER_REQUEST':
      case 'CREATE_SELLER_REQUEST':
      case 'UPDATE_SELLER_REQUEST':
      case 'SEND_INVOICE_REQUEST':
        return {
          ...state,
          loading: true,
          error: null,
          message: null,
          // Clear specific states if needed, e.g., seller: null for FETCH_SELLER_REQUEST
        };
  
      // Success States
      case 'FETCH_BUYER_SUCCESS':
        return {
          ...state,
          loading: false,
          buyer: action.payload,
          error: null,
        };
      case 'CREATE_BUYER_SUCCESS':
        return {
          ...state,
          loading: false,
          buyer: action.payload, // The newly created buyer
          error: null,
          message: 'Comprador creado exitosamente',
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
  
      // Failure States
      case 'FETCH_BUYER_FAILURE':
        return {
          ...state,
          loading: false,
          error: action.payload,
          buyer: null, // Clear buyer on failure
        };
      case 'CREATE_BUYER_FAILURE':
        return {
          ...state,
          loading: false,
          error: action.payload,
          message: null, // Clear message
          // Optionally clear buyer if a partially created/verified buyer state needs reset
          // buyer: null,
        };
      case 'FETCH_SELLER_FAILURE':
      case 'CREATE_SELLER_FAILURE':
      case 'UPDATE_SELLER_FAILURE':
      case 'SEND_INVOICE_FAILURE':
        return {
          ...state,
          loading: false,
          error: action.payload,
          // Clear specific states if needed, e.g., seller: null for FETCH_SELLER_FAILURE
        };
  
      default:
        return state;
    }
  };
  
  export default taxxaReducer;