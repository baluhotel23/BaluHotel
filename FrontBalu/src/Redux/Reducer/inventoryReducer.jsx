const initialState = {
    inventory: [],    // Lista de items de inventario
    purchase: null,   // Última compra creada (si es necesario)
    lowStock: [],     // Lista de items con baja existencia
    loading: false,
    error: null
  };
  
  const inventoryReducer = (state = initialState, action) => {
    switch (action.type) {
      // Obtener inventario
      case 'GET_INVENTORY_REQUEST':
        return { ...state, loading: true, error: null };
      case 'GET_INVENTORY_SUCCESS':
        return { ...state, loading: false, inventory: action.payload, error: null };
      case 'GET_INVENTORY_FAILURE':
        return { ...state, loading: false, error: action.payload };
  
      // Crear compra
      case 'CREATE_PURCHASE_REQUEST':
        return { ...state, loading: true, error: null };
      case 'CREATE_PURCHASE_SUCCESS':
        return { ...state, loading: false, purchase: action.payload, error: null };
      case 'CREATE_PURCHASE_FAILURE':
        return { ...state, loading: false, error: action.payload };
  
      // Actualizar inventario
      case 'UPDATE_INVENTORY_REQUEST':
        return { ...state, loading: true, error: null };
      case 'UPDATE_INVENTORY_SUCCESS':
        return {
          ...state,
          loading: false,
          inventory: state.inventory.map(item => 
            // Ajusta 'id' según la propiedad que identifique al item,
            // por ejemplo: item.inventoryId === action.payload.inventoryId
            item.id === action.payload.id ? action.payload : item
          ),
          error: null
        };
      case 'UPDATE_INVENTORY_FAILURE':
        return { ...state, loading: false, error: action.payload };
  
      // Obtener items de bajo stock
      case 'GET_LOW_STOCK_REQUEST':
        return { ...state, loading: true, error: null };
      case 'GET_LOW_STOCK_SUCCESS':
        return { ...state, loading: false, lowStock: action.payload, error: null };
      case 'GET_LOW_STOCK_FAILURE':
        return { ...state, loading: false, error: action.payload };
  
      default:
        return state;
    }
  };
  
  export default inventoryReducer;