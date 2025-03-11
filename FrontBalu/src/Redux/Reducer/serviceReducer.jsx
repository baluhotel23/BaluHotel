const initialState = {
    services: [],  // Lista de servicios almacenados
    loading: false, // Estado de carga
    error: null     // Error (si ocurre)
  };
  
  const serviceReducer = (state = initialState, action) => {
    switch (action.type) {
      // Crear servicio
      case 'CREATE_SERVICE_REQUEST':
        return { ...state, loading: true, error: null };
      case 'CREATE_SERVICE_SUCCESS':
        return { 
          ...state, 
          loading: false, 
          services: [...state.services, action.payload], // Agrega el nuevo servicio a la lista
          error: null 
        };
      case 'CREATE_SERVICE_FAILURE':
        return { ...state, loading: false, error: action.payload };
  
      // Actualizar servicio
      case 'UPDATE_SERVICE_REQUEST':
        return { ...state, loading: true, error: null };
      case 'UPDATE_SERVICE_SUCCESS':
        return {
          ...state,
          loading: false,
          services: state.services.map(service => 
            service.id === action.payload.id ? action.payload : service
          ),
          error: null
        };
      case 'UPDATE_SERVICE_FAILURE':
        return { ...state, loading: false, error: action.payload };
  
      // Obtener todos los servicios
      case 'GET_SERVICES_REQUEST':
        return { ...state, loading: true, error: null };
      case 'GET_SERVICES_SUCCESS':
        return { ...state, loading: false, services: action.payload, error: null };
      case 'GET_SERVICES_FAILURE':
        return { ...state, loading: false, error: action.payload };
  
      // Eliminar servicio
      case 'DELETE_SERVICE_REQUEST':
        return { ...state, loading: true, error: null };
      case 'DELETE_SERVICE_SUCCESS':
        return {
          ...state,
          loading: false,
          services: state.services.filter(service => service.id !== action.payload.id),
          error: null
        };
      case 'DELETE_SERVICE_FAILURE':
        return { ...state, loading: false, error: action.payload };
  
      default:
        return state;
    }
  };
  
  export default serviceReducer;