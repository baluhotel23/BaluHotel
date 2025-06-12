import api from '../../utils/axios';
import { toast } from 'react-toastify';

export const createPurchase = (purchaseData) => async (dispatch) => {
  dispatch({ type: 'CREATE_PURCHASE_REQUEST' });
  
  try {
    console.log('🚀 Enviando datos de compra:', purchaseData); // ⭐ DEBUG
    
    const { data } = await api.post('/inventory/purchase', purchaseData);
    
    dispatch({ type: 'CREATE_PURCHASE_SUCCESS', payload: data.data });
    
    console.log('✅ Compra creada exitosamente:', data.data); // ⭐ DEBUG
    
    // ⭐ REMOVER TOAST AUTOMÁTICO PARA EVITAR DUPLICADOS
    // toast.success('Compra registrada exitosamente');
    
    return { success: true, data: data.data, message: 'Compra registrada exitosamente' };
  } catch (error) {
    console.error('❌ Error al crear compra:', error); // ⭐ DEBUG
    
    const errorMessage = error.response?.data?.message || 'Error al registrar la compra';
    
    dispatch({ 
      type: 'CREATE_PURCHASE_FAILURE', 
      payload: errorMessage 
    });
    
    // ⭐ REMOVER TOAST AUTOMÁTICO PARA EVITAR DUPLICADOS
    // toast.error(errorMessage);
    
    return { success: false, error: errorMessage };
  }
};

// Fetch All Purchases Action - ✅ MANTENER COMO ESTÁ
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
    toast.error(errorMessage); // ✅ Este toast sí está bien aquí
    return { success: false, error };
  }
};

// Fetch Purchase Detail Action - ✅ MANTENER COMO ESTÁ
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
    toast.error(errorMessage); // ✅ Este toast sí está bien aquí
    return { success: false, error };
  }
};