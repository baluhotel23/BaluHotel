// Estado inicial: define las propiedades que se actualizarán en función de cada reporte y el estado general de carga o error.
const initialState = {
    occupancyReport: null,         // Reporte de ocupación (total de habitaciones, ocupadas y tasa)
    revenueReport: null,           // Reporte de ingresos (totalRevenue)
    inventoryUsageReport: null,    // Reporte de uso del inventario (lista de items con stock)
    combinedReport: null,          // Reporte combinado que une varios datos en uno
    loading: false,                // Estado de carga
    error: null                    // Mensaje de error en caso de fallo
  };
  
  // Reducer que actualiza el estado según el tipo de acción despachada.
  const reportReducer = (state = initialState, action) => {
    switch (action.type) {
      // --- Reporte de ocupación ---
      case 'GET_OCCUPANCY_REPORT_REQUEST':
        return { ...state, loading: true, error: null };
      case 'GET_OCCUPANCY_REPORT_SUCCESS':
        return { 
          ...state, 
          loading: false, 
          occupancyReport: action.payload.data || action.payload, 
          error: null 
        };
      case 'GET_OCCUPANCY_REPORT_FAILURE':
        return { ...state, loading: false, error: action.payload };
  
      // --- Reporte de ingresos ---
      case 'GET_REVENUE_REPORT_REQUEST':
        return { ...state, loading: true, error: null };
      case 'GET_REVENUE_REPORT_SUCCESS':
        return { 
          ...state, 
          loading: false, 
          revenueReport: action.payload.data || action.payload, 
          error: null 
        };
      case 'GET_REVENUE_REPORT_FAILURE':
        return { ...state, loading: false, error: action.payload };
  
      // --- Reporte de uso del inventario ---
      case 'GET_INVENTORY_USAGE_REPORT_REQUEST':
        return { ...state, loading: true, error: null };
      case 'GET_INVENTORY_USAGE_REPORT_SUCCESS':
        return { 
          ...state, 
          loading: false, 
          inventoryUsageReport: action.payload.data || action.payload, 
          error: null 
        };
      case 'GET_INVENTORY_USAGE_REPORT_FAILURE':
        return { ...state, loading: false, error: action.payload };
  
      // --- Reporte combinado ---
      case 'GET_COMBINED_REPORT_REQUEST':
        return { ...state, loading: true, error: null };
      case 'GET_COMBINED_REPORT_SUCCESS':
        return { 
          ...state, 
          loading: false, 
          combinedReport: action.payload.data || action.payload, 
          error: null 
        };
      case 'GET_COMBINED_REPORT_FAILURE':
        return { ...state, loading: false, error: action.payload };
  
      // Por defecto, si no se reconoce la acción, no se cambia el estado.
      default:
        return state;
    }
  };
  
  export default reportReducer;