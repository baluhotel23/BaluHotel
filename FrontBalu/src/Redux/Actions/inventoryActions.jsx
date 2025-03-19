import api from '../../utils/axios';
import { toast } from 'react-toastify';
// Acción para obtener el inventario (GET /admin/)
export const getInventory = (filters = {}) => async (dispatch) => {
  try {
    const { data } = await api.get('/inventory', { params: filters });
    dispatch({ type: 'GET_INVENTORY', payload: data.data });
    return { success: true, data: data.data };
  } catch (error) {
    toast.error(error.response?.data?.message || 'Error al obtener el inventario');
    return { success: false, error };
  }
};

export const createPurchase = (purchaseData) => async (dispatch) => {
  try {
    const { data } = await api.post('/inventory/purchase', purchaseData);
    dispatch({ type: 'CREATE_PURCHASE', payload: data.data });
    toast.success('Compra registrada exitosamente');
    return { success: true, data: data.data };
  } catch (error) {
    toast.error(error.response?.data?.message || 'Error al registrar la compra');
    return { success: false, error };
  }
};

export const getLowStockItems = () => async (dispatch) => {
  try {
    const { data } = await api.get('/inventory/low-stock');
    dispatch({ type: 'GET_LOW_STOCK', payload: data.data });
    return { success: true, data: data.data };
  } catch (error) {
    toast.error(error.response?.data?.message || 'Error al obtener items con bajo stock');
    return { success: false, error };
  }
};

export const getAllItems = () => async (dispatch) => {
  try {
    const { data } = await api.get('/inventory/items');
    dispatch({ type: 'GET_ALL_ITEMS', payload: data.data });
    return { success: true, data: data.data };
  } catch (error) {
    toast.error(error.response?.data?.message || 'Error al obtener los items');
    return { success: false, error };
  }
};

export const getItemById = (id) => async (dispatch) => {
  try {
    const { data } = await api.get(`/inventory/items/${id}`);
    dispatch({ type: 'GET_ITEM', payload: data.data });
    return { success: true, data: data.data };
  } catch (error) {
    toast.error(error.response?.data?.message || 'Error al obtener el item');
    return { success: false, error };
  }
};

export const createItem = (itemData) => async (dispatch) => {
  try {
    const { data } = await api.post('/inventory/items', itemData);
    dispatch({ type: 'CREATE_ITEM', payload: data.data });
    toast.success('Item creado exitosamente');
    return { success: true, data: data.data };
  } catch (error) {
    toast.error(error.response?.data?.message || 'Error al crear el item');
    return { success: false, error };
  }
};

export const updateItem = (id, itemData) => async (dispatch) => {
  try {
    const { data } = await api.put(`/inventory/items/${id}`, itemData);
    dispatch({ type: 'UPDATE_ITEM', payload: data.data });
    toast.success('Item actualizado exitosamente');
    return { success: true, data: data.data };
  } catch (error) {
    toast.error(error.response?.data?.message || 'Error al actualizar el item');
    return { success: false, error };
  }
};

export const deleteItem = (id) => async (dispatch) => {
  try {
    const { data } = await api.delete(`/inventory/items/${id}`);
    dispatch({ type: 'DELETE_ITEM', payload: id });
    toast.success('Item eliminado exitosamente');
    return { success: true, data: data.data };
  } catch (error) {
    toast.error(error.response?.data?.message || 'Error al eliminar el item');
    return { success: false, error };
  }
};

// Additional actions for stock management
export const addStock = (id, quantity) => async (dispatch) => {
  try {
    const { data } = await api.post(`/inventory/items/${id}/add-stock`, { quantity });
    dispatch({ type: 'ADD_STOCK', payload: data.data });
    toast.success('Stock añadido exitosamente');
    return { success: true, data: data.data };
  } catch (error) {
    toast.error(error.response?.data?.message || 'Error al añadir stock');
    return { success: false, error };
  }
};

export const removeStock = (id, quantity) => async (dispatch) => {
  try {
    const { data } = await api.post(`/inventory/items/${id}/remove-stock`, { quantity });
    dispatch({ type: 'REMOVE_STOCK', payload: data.data });
    toast.success('Stock removido exitosamente');
    return { success: true, data: data.data };
  } catch (error) {
    toast.error(error.response?.data?.message || 'Error al remover stock');
    return { success: false, error };
  }
};

// Additional actions for purchases and suppliers
export const getAllPurchases = () => async (dispatch) => {
  try {
    const { data } = await api.get('/inventory/purchases');
    dispatch({ type: 'GET_ALL_PURCHASES', payload: data.data });
    return { success: true, data: data.data };
  } catch (error) {
    toast.error(error.response?.data?.message || 'Error al obtener las compras');
    return { success: false, error };
  }
};

export const getPurchaseDetails = (id) => async (dispatch) => {
  try {
    const { data } = await api.get(`/inventory/purchases/${id}`);
    dispatch({ type: 'GET_PURCHASE_DETAILS', payload: data.data });
    return { success: true, data: data.data };
  } catch (error) {
    toast.error(error.response?.data?.message || 'Error al obtener detalles de la compra');
    return { success: false, error };
  }
};

// Category management actions
export const getCategories = () => async (dispatch) => {
  try {
    const { data } = await api.get('/inventory/categories');
    dispatch({ type: 'GET_CATEGORIES', payload: data.data });
    return { success: true, data: data.data };
  } catch (error) {
    toast.error(error.response?.data?.message || 'Error al obtener las categorías');
    return { success: false, error };
  }
};

export const createCategory = (categoryData) => async (dispatch) => {
  try {
    const { data } = await api.post('/inventory/categories', categoryData);
    dispatch({ type: 'CREATE_CATEGORY', payload: data.data });
    toast.success('Categoría creada exitosamente');
    return { success: true, data: data.data };
  } catch (error) {
    toast.error(error.response?.data?.message || 'Error al crear la categoría');
    return { success: false, error };
  }
};

export const updateCategory = (id, categoryData) => async (dispatch) => {
  try {
    const { data } = await api.put(`/inventory/categories/${id}`, categoryData);
    dispatch({ type: 'UPDATE_CATEGORY', payload: data.data });
    toast.success('Categoría actualizada exitosamente');
    return { success: true, data: data.data };
  } catch (error) {
    toast.error(error.response?.data?.message || 'Error al actualizar la categoría');
    return { success: false, error };
  }
};