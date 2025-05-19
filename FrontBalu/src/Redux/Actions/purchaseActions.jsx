import api from '../../utils/axios';
import { toast } from 'react-toastify';


export const createPurchase = (purchaseData) => async (dispatch) => {
  dispatch({ type: 'CREATE_PURCHASE_REQUEST' });
  
  try {
    const { data } = await api.post('/inventory/purchase', purchaseData);
    dispatch({ type: 'CREATE_PURCHASE_SUCCESS', payload: data.data });
    toast.success('Compra registrada exitosamente');
    return { success: true, data: data.data };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al registrar la compra';
    dispatch({ 
      type: 'CREATE_PURCHASE_FAILURE', 
      payload: errorMessage 
    });
    toast.error(errorMessage);
    return { success: false, error };
  }
};

// Fetch All Purchases Action
export const fetchPurchases = () => async (dispatch) => {
  dispatch({ type: 'FETCH_PURCHASES_REQUEST' });
  
  try {
    const { data } = await api.get('/inventory/purchases');
    dispatch({ type: 'FETCH_PURCHASES_SUCCESS', payload: data.data });
    return { success: true, data: data.data };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener las compras';
    dispatch({ 
      type: 'FETCH_PURCHASES_FAILURE', 
      payload: errorMessage 
    });
    toast.error(errorMessage);
    return { success: false, error };
  }
};

// Fetch Purchase Detail Action
export const fetchPurchaseDetail = (id) => async (dispatch) => {
  dispatch({ type: 'FETCH_PURCHASE_DETAIL_REQUEST' });
  
  try {
    const { data } = await api.get(`/inventory/purchases/${id}`);
    dispatch({ type: 'FETCH_PURCHASE_DETAIL_SUCCESS', payload: data.data });
    return { success: true, data: data.data };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener los detalles de la compra';
    dispatch({ 
      type: 'FETCH_PURCHASE_DETAIL_FAILURE', 
      payload: errorMessage 
    });
    toast.error(errorMessage);
    return { success: false, error };
  }
};