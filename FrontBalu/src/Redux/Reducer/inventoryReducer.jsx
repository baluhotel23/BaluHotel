const initialState = {
    inventory: [],
    sellableItems: [], // Nueva propiedad para items vendibles
    lowStockItems: [],
    currentItem: null,
    purchases: [],
    currentPurchase: null,
    suppliers: [],
    categories: [],
    loading: false,
    error: null
};
  
const inventoryReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'GET_INVENTORY':
      return {
        ...state,
        inventory: action.payload,
        loading: false
      };
    case 'GET_LOW_STOCK':
      return {
        ...state,
        lowStockItems: action.payload,
        loading: false
      };
    case 'GET_ALL_ITEMS':
      return {
        ...state,
        inventory: action.payload,
        loading: false
      };

      case 'GET_SELLABLE_ITEMS':
      return {
        ...state,
        sellableItems: action.payload,
        loading: false
      };
      
    case 'GET_ITEM':
      return {
        ...state,
        currentItem: action.payload,
        loading: false
      };
    case 'CREATE_ITEM':
      return {
        ...state,
        inventory: [...state.inventory, action.payload],
        loading: false
      };
    case 'UPDATE_ITEM':
      return {
        ...state,
        inventory: state.inventory.map(item => 
          item.id === action.payload.id ? action.payload : item
        ),
        loading: false
      };
    case 'DELETE_ITEM':
      return {
        ...state,
        inventory: state.inventory.filter(item => item.id !== action.payload),
        loading: false
      };
  
      default:
        return state;
    }
  };
  
  export default inventoryReducer;