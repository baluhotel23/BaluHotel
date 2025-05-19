import api from '../../utils/axios';
import { toast } from 'react-toastify';

const handleRequestError = (error, defaultMessage) => {
  // Extrae el mensaje de error del backend si existe
  const errorMessage = error.response?.data?.message || defaultMessage;
  
  // Log para depuración en desarrollo
 {
    console.error('Error en la acción financiera:', error);
  }
  
  
  
  return errorMessage;
};

export const createExpense = (expenseData) => async (dispatch) => {
  dispatch({ type: 'CREATE_EXPENSE_REQUEST' });
  
  try {
    const { data } = await api.post('/financial/expenses', expenseData);
    
    dispatch({ 
      type: 'CREATE_EXPENSE_SUCCESS', 
      payload: data.data 
    });
    
    return { success: true, data: data.data };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al registrar el gasto';
    
    dispatch({ 
      type: 'CREATE_EXPENSE_FAILURE', 
      payload: errorMessage 
    });
    
    return { success: false, error: errorMessage };
  }
};

export const getAllExpenses = (filters = {}) => async (dispatch) => {
  dispatch({ type: 'FETCH_EXPENSES_REQUEST' });
  
  try {
    // Construir query params si hay filtros
    let queryParams = '';
    if (Object.keys(filters).length) {
      queryParams = '?' + new URLSearchParams(filters).toString();
    }
    
    const { data } = await api.get(`/financial/expenses${queryParams}`);
    
    dispatch({
      type: 'FETCH_EXPENSES_SUCCESS',
      payload: data.data
    });
    
    return { success: true, data: data.data };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener los gastos';
    
    dispatch({
      type: 'FETCH_EXPENSES_FAILURE',
      payload: errorMessage
    });
    
    return { success: false, error: errorMessage };
  }
};

export const getExpenseById = (id) => async (dispatch) => {
  dispatch({ type: 'FETCH_EXPENSE_DETAIL_REQUEST' });
  
  try {
    const { data } = await api.get(`/financial/expenses/${id}`);
    
    dispatch({
      type: 'FETCH_EXPENSE_DETAIL_SUCCESS',
      payload: data.data
    });
    
    return { success: true, data: data.data };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener el detalle del gasto';
    
    dispatch({
      type: 'FETCH_EXPENSE_DETAIL_FAILURE',
      payload: errorMessage
    });
    
    return { success: false, error: errorMessage };
  }
};

export const updateExpense = (id, expenseData) => async (dispatch) => {
  dispatch({ type: 'UPDATE_EXPENSE_REQUEST' });
  
  try {
    const { data } = await api.put(`/financial/expenses/${id}`, expenseData);
    
    dispatch({
      type: 'UPDATE_EXPENSE_SUCCESS',
      payload: data.data
    });
    
    toast.success('Gasto actualizado con éxito');
    return { success: true, data: data.data };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al actualizar el gasto';
    
    dispatch({
      type: 'UPDATE_EXPENSE_FAILURE',
      payload: errorMessage
    });
    
    toast.error(errorMessage);
    return { success: false, error: errorMessage };
  }
};

export const deleteExpense = (id) => async (dispatch) => {
  dispatch({ type: 'DELETE_EXPENSE_REQUEST' });
  
  try {
    await api.delete(`/financial/expenses/${id}`);
    
    dispatch({
      type: 'DELETE_EXPENSE_SUCCESS',
      payload: id
    });
    
    toast.success('Gasto eliminado con éxito');
    return { success: true };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al eliminar el gasto';
    
    dispatch({
      type: 'DELETE_EXPENSE_FAILURE',
      payload: errorMessage
    });
    
    toast.error(errorMessage);
    return { success: false, error: errorMessage };
  }
};

export const getExpenseCategories = () => async (dispatch) => {
  dispatch({ type: 'FETCH_EXPENSE_CATEGORIES_REQUEST' });
  
  try {
    const { data } = await api.get('/financial/expenses/categories');
    
    dispatch({
      type: 'FETCH_EXPENSE_CATEGORIES_SUCCESS',
      payload: data.data
    });
    
    return { success: true, data: data.data };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener categorías de gastos';
    
    dispatch({
      type: 'FETCH_EXPENSE_CATEGORIES_FAILURE',
      payload: errorMessage
    });
    
    return { success: false, error: errorMessage };
  }
};

// Acciones para reportes financieros
export const getFinancialDashboard = () => async (dispatch) => {
  dispatch({ type: 'FETCH_FINANCIAL_DASHBOARD_REQUEST' });
  
  try {
    const { data } = await api.get('/financial/dashboard');
    
    dispatch({
      type: 'FETCH_FINANCIAL_DASHBOARD_SUCCESS',
      payload: data.data
    });
    
    return { success: true, data: data.data };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener dashboard financiero';
    
    dispatch({
      type: 'FETCH_FINANCIAL_DASHBOARD_FAILURE',
      payload: errorMessage
    });
    
    return { success: false, error: errorMessage };
  }
};

export const getFinancialSummary = (period) => async (dispatch) => {
  dispatch({ type: 'FETCH_FINANCIAL_SUMMARY_REQUEST' });
  
  try {
    const { data } = await api.get(`/financial/summary?period=${period || 'month'}`);
    
    dispatch({
      type: 'FETCH_FINANCIAL_SUMMARY_SUCCESS',
      payload: data.data
    });
    
    return { success: true, data: data.data };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener resumen financiero';
    
    dispatch({
      type: 'FETCH_FINANCIAL_SUMMARY_FAILURE',
      payload: errorMessage
    });
    
    return { success: false, error: errorMessage };
  }
};

export const getRevenueByPeriod = (startDate, endDate) => async (dispatch) => {
  dispatch({ type: 'FETCH_REVENUE_BY_PERIOD_REQUEST' });
  
  // Validar que las fechas estén presentes
  if (!startDate || !endDate) {
    const errorMessage = 'Se requieren fechas de inicio y fin';
    dispatch({ 
      type: 'FETCH_REVENUE_BY_PERIOD_FAILURE', 
      payload: errorMessage 
    });
    return { success: false, error: errorMessage };
  }
  
  // Formatear fechas si son objetos Date
  const formattedStartDate = startDate instanceof Date 
    ? startDate.toISOString().split('T')[0] 
    : startDate;
    
  const formattedEndDate = endDate instanceof Date 
    ? endDate.toISOString().split('T')[0] 
    : endDate;
  
  try {
    console.log('Solicitando ingresos por período:', { startDate: formattedStartDate, endDate: formattedEndDate });
    
    const { data } = await api.get(`/financial/revenue?startDate=${formattedStartDate}&endDate=${formattedEndDate}`);
    
    dispatch({
      type: 'FETCH_REVENUE_BY_PERIOD_SUCCESS',
      payload: data.data
    });
    
    return { success: true, data: data.data };
  } catch (error) {
    // Usar la función handleRequestError existente
    const errorMessage = handleRequestError(error, 'Error al obtener ingresos por período');
    
    dispatch({
      type: 'FETCH_REVENUE_BY_PERIOD_FAILURE',
      payload: errorMessage
    });
    
    toast.error(errorMessage);
    return { success: false, error: errorMessage };
  }
};

export const getProfitLossReport = (period) => async (dispatch) => {
  dispatch({ type: 'FETCH_PROFIT_LOSS_REPORT_REQUEST' });
  
  try {
    // Añade un console.log para depuración
    console.log(`Solicitando reporte de PyG para periodo: ${period || 'month'}`);
    
    const { data } = await api.get(`/financial/reports/profit-loss?period=${period || 'month'}`);
    
    dispatch({
      type: 'FETCH_PROFIT_LOSS_REPORT_SUCCESS',
      payload: data.data
    });
    
    return { success: true, data: data.data };
  } catch (error) {
    // Usa la función handleRequestError para manejar errores de manera consistente
    const errorMessage = handleRequestError(error, 'Error al obtener reporte de ganancias y pérdidas');
    
    // Log más detallado para ayudar a identificar el problema
    console.error('Error detallado en getProfitLossReport:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url
    });
    
    dispatch({
      type: 'FETCH_PROFIT_LOSS_REPORT_FAILURE',
      payload: errorMessage
    });
    
    toast.error(errorMessage);
    return { success: false, error: errorMessage };
  }
};

