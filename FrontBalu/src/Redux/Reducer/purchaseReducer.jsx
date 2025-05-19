const initialState = {
    loading: false,
    purchases: [], // Cambié 'purchase' a 'purchases' para claridad
    currentPurchase: null, // Para detalles de una compra individual
    error: null
};

const purchaseReducer = (state = initialState, action) => {
    switch (action.type) {
      // Create Purchase - Estados
      case 'CREATE_PURCHASE_REQUEST':
        return {
          ...state,
          loading: true,
          error: null,
        };
      case 'CREATE_PURCHASE_SUCCESS':
        return {
          ...state,
          loading: false,
          purchases: [action.payload, ...state.purchases], // Añadir al inicio
          error: null,
        };
      case 'CREATE_PURCHASE_FAILURE':
        return {
          ...state,
          loading: false,
          error: action.payload,
        };
        
      // Fetch Purchases - Estados  
      case 'FETCH_PURCHASES_REQUEST':
        return {
          ...state,
          loading: true,
          error: null,
        };
      case 'FETCH_PURCHASES_SUCCESS':
        return {
          ...state,
          loading: false,
          purchases: action.payload,
          error: null,
        };
      case 'FETCH_PURCHASES_FAILURE':
        return {
          ...state,
          loading: false,
          error: action.payload,
        };
        
      // Fetch Purchase Details - Estados
      case 'FETCH_PURCHASE_DETAIL_REQUEST':
        return {
          ...state,
          loading: true,
          currentPurchase: null,
          error: null,
        };
      case 'FETCH_PURCHASE_DETAIL_SUCCESS':
        return {
          ...state,
          loading: false,
          currentPurchase: action.payload,
          error: null,
        };
      case 'FETCH_PURCHASE_DETAIL_FAILURE':
        return {
          ...state,
          loading: false,
          currentPurchase: null, 
          error: action.payload,
        };
      
      default:
        return state;
    }
};
  
export default purchaseReducer;