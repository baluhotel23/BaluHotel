import api from '../../utils/axios';

// Acción para obtener el reporte de ocupación
export const getOccupancyReport = () => async (dispatch) => {
  dispatch({ type: 'GET_OCCUPANCY_REPORT_REQUEST' });
  try {
    const { data } = await api.get('/reports/occupancy');
    dispatch({ type: 'GET_OCCUPANCY_REPORT_SUCCESS', payload: data });
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener el reporte de ocupación';
    dispatch({ type: 'GET_OCCUPANCY_REPORT_FAILURE', payload: errorMessage });
  }
};

// Acción para obtener el reporte de ingresos
export const getRevenueReport = () => async (dispatch) => {
  dispatch({ type: 'GET_REVENUE_REPORT_REQUEST' });
  try {
    const { data } = await api.get('/reports/revenue');
    dispatch({ type: 'GET_REVENUE_REPORT_SUCCESS', payload: data });
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener el reporte de ingresos';
    dispatch({ type: 'GET_REVENUE_REPORT_FAILURE', payload: errorMessage });
  }
};

// Acción para obtener el reporte de uso del inventario
export const getInventoryUsageReport = () => async (dispatch) => {
  dispatch({ type: 'GET_INVENTORY_USAGE_REPORT_REQUEST' });
  try {
    const { data } = await api.get('/reports/inventory-usage');
    dispatch({ type: 'GET_INVENTORY_USAGE_REPORT_SUCCESS', payload: data });
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener el reporte de uso del inventario';
    dispatch({ type: 'GET_INVENTORY_USAGE_REPORT_FAILURE', payload: errorMessage });
  }
};

// Acción para obtener el reporte combinado
export const getCombinedReport = () => async (dispatch) => {
  dispatch({ type: 'GET_COMBINED_REPORT_REQUEST' });
  try {
    const { data } = await api.get('/reports/combined');
    dispatch({ type: 'GET_COMBINED_REPORT_SUCCESS', payload: data });
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener el reporte combinado';
    dispatch({ type: 'GET_COMBINED_REPORT_FAILURE', payload: errorMessage });
  }
};