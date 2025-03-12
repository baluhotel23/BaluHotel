import api from '../../utils/axios';

// Acción para obtener el inventario (GET /admin/)
export const getInventory = () => async (dispatch) => {
  dispatch({ type: 'GET_INVENTORY_REQUEST' });
  try {
    const { data } = await api.get('/admin/');
    // Se asume que los datos vienen en data.data (ajusta según necesites)
    dispatch({ type: 'GET_INVENTORY_SUCCESS', payload: data.data });
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener el inventario';
    dispatch({ type: 'GET_INVENTORY_FAILURE', payload: errorMessage });
  }
};

// Acción para crear una compra (POST /admin/purchase)
export const createPurchase = (purchaseData) => async (dispatch) => {
  dispatch({ type: 'CREATE_PURCHASE_REQUEST' });
  try {
    const { data } = await api.post('/admin/purchase', purchaseData);
    dispatch({ type: 'CREATE_PURCHASE_SUCCESS', payload: data.data });
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al crear la compra';
    dispatch({ type: 'CREATE_PURCHASE_FAILURE', payload: errorMessage });
  }
};

// Acción para actualizar el inventario (PUT /admin/:id)
export const updateInventory = (inventoryId, updateData) => async (dispatch) => {
  dispatch({ type: 'UPDATE_INVENTORY_REQUEST' });
  try {
    const { data } = await api.put(`/admin/${inventoryId}`, updateData);
    dispatch({ type: 'UPDATE_INVENTORY_SUCCESS', payload: data.data });
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al actualizar el inventario';
    dispatch({ type: 'UPDATE_INVENTORY_FAILURE', payload: errorMessage });
  }
};

// Acción para obtener los items con baja existencia (GET /admin/low-stock)
export const getLowStockItems = () => async (dispatch) => {
  dispatch({ type: 'GET_LOW_STOCK_REQUEST' });
  try {
    const { data } = await api.get('/admin/low-stock');
    dispatch({ type: 'GET_LOW_STOCK_SUCCESS', payload: data.data });
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener los items de bajo stock';
    dispatch({ type: 'GET_LOW_STOCK_FAILURE', payload: errorMessage });
  }
};