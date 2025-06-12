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
    console.log('🚀 [ACTION] getAllItems iniciado');
    const response = await api.get('/inventory');
    console.log('📥 [ACTION] Respuesta inventario:', response.data);
    
    // ⭐ MAPEAR CORRECTAMENTE - usar 'name' del backend
    const mappedItems = response.data.data.map(item => ({
      itemId: item.id,        // Mapear id a itemId para compatibilidad
      id: item.id,            // ⭐ MANTENER id original
      itemName: item.name,    // ⭐ MAPEAR name a itemName
      name: item.name,        // ⭐ MANTENER name original
      description: item.description,
      category: item.category,
      inventoryType: item.inventoryType,
      currentStock: item.currentStock,
      cleanStock: item.cleanStock || 0,
      dirtyStock: item.dirtyStock || 0,
      minStock: item.minStock,
      unitPrice: parseFloat(item.unitPrice),
      isSellable: item.salePrice !== null,
      salePrice: item.salePrice ? parseFloat(item.salePrice) : null,
      washingTime: item.washingTime,
      stockStatus: item.stockStatus,
      alerts: item.alerts || []
    }));
    
    console.log('🔄 [ACTION] Items mapeados:', mappedItems);
    dispatch({ type: 'GET_ALL_ITEMS', payload: mappedItems });
    return { success: true, data: mappedItems };
  } catch (error) {
    console.error('❌ [ACTION] Error en getAllItems:', error);
    toast.error(error.response?.data?.message || 'Error al obtener los items');
    return { success: false, error };
  }
};

export const getItemById = (id) => async (dispatch) => {
  try {
    const { data } = await api.get(`/inventory/${id}`);
    dispatch({ type: 'GET_ITEM', payload: data.data });
    return { success: true, data: data.data };
  } catch (error) {
    toast.error(error.response?.data?.message || 'Error al obtener el item');
    return { success: false, error };
  }
};

export const createItem = (itemData) => async (dispatch) => {
  try {
    // ⭐ DISPATCH DE LOADING
    dispatch({ type: 'CREATE_ITEM_REQUEST' });
    
    // Asegúrate de que si isSellable es false, salePrice sea null
    if (itemData.isSellable === false) {
      itemData.salePrice = null;
    }
    
    const { data } = await api.post('/inventory/', itemData);
    
    // ⭐ DISPATCH DE ÉXITO CON TIPO
    dispatch({ 
      type: 'CREATE_ITEM_SUCCESS', 
      payload: {
        item: data.data,
        message: 'Item creado exitosamente'
      }
    });
    
    toast.success('Item creado exitosamente');
    return { success: true, data: data.data };
  } catch (error) {
    // ⭐ DISPATCH DE ERROR
    dispatch({ 
      type: 'CREATE_ITEM_FAILURE', 
      payload: error.response?.data?.message || 'Error al crear el item'
    });
    
    toast.error(error.response?.data?.message || 'Error al crear el item');
    return { success: false, error };
  }
};

export const updateItem = (id, itemData) => async (dispatch) => {
  try {
    // Asegúrate de que si isSellable es false, salePrice sea null
    if (itemData.isSellable === false) {
      itemData.salePrice = null;
    }
    
    const { data } = await api.put(`/inventory/${id}/general`, itemData);
    dispatch({ type: 'UPDATE_ITEM', payload: data.data });
    toast.success('Item actualizado exitosamente');
    return { success: true, data: data.data };
  } catch (error) {
    toast.error(error.response?.data?.message || 'Error al actualizar el item');
    return { success: false, error };
  }
};

export const getSellableItems = () => async (dispatch) => {
  try {
    const response = await api.get('/inventory/');
    
    // Filtrar solo items vendibles y mapearlos
    const mappedItems = response.data.data
      .filter(item => item.isSellable && item.currentStock > 0)
      .map(item => ({
        itemId: item.id,
        itemName: item.name,
        description: item.description,
        category: item.category,
        currentStock: item.currentStock,
        minStock: item.minStock,
        unitPrice: parseFloat(item.unitPrice),
        salePrice: parseFloat(item.salePrice)
      }));
    
    dispatch({ type: 'GET_SELLABLE_ITEMS', payload: mappedItems });
    return { success: true, data: mappedItems };
  } catch (error) {
    toast.error(error.response?.data?.message || 'Error al obtener los items vendibles');
    return { success: false, error };
  }
};

export const deleteItem = (id) => async (dispatch) => {
  try {
    const { data } = await api.delete(`/inventory/${id}`);
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
    const { data } = await api.post(`/inventory/${id}/stock/add`, { quantity });
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
    const { data } = await api.post(`/inventory/${id}/stock/remove`, { quantity });
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

export const getInventoryByType = (type) => async (dispatch) => {
  dispatch({ type: 'GET_INVENTORY_BY_TYPE_REQUEST' });
  try {
    const { data } = await api.get(`/inventory/type/${type}`);
    dispatch({ 
      type: 'GET_INVENTORY_BY_TYPE_SUCCESS', 
      payload: { type, items: data.data } 
    });
    return { success: true, data: data.data };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener inventario por tipo';
    dispatch({ 
      type: 'GET_INVENTORY_BY_TYPE_FAILURE', 
      payload: errorMessage 
    });
    toast.error(errorMessage);
    return { success: false, error: errorMessage };
  }
};

// TRANSFERIR STOCK SUCIO A LIMPIO
export const transferDirtyToClean = (itemId, quantity) => async (dispatch) => {
  dispatch({ type: 'TRANSFER_DIRTY_TO_CLEAN_REQUEST' });
  try {
    const { data } = await api.post(`/inventory/${itemId}/transfer-clean`, { quantity });
    dispatch({ 
      type: 'TRANSFER_DIRTY_TO_CLEAN_SUCCESS', 
      payload: data.data 
    });
    toast.success('Stock transferido exitosamente');
    return { success: true, data: data.data };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al transferir stock';
    dispatch({ 
      type: 'TRANSFER_DIRTY_TO_CLEAN_FAILURE', 
      payload: errorMessage 
    });
    toast.error(errorMessage);
    return { success: false, error: errorMessage };
  }
};

// MARCAR COMO SUCIO
export const markInventoryAsDirty = (itemId, dirtyData) => async (dispatch) => {
  dispatch({ type: 'MARK_INVENTORY_AS_DIRTY_REQUEST' });
  try {
    const { data } = await api.post(`/inventory/${itemId}/mark-dirty`, dirtyData);
    dispatch({ 
      type: 'MARK_INVENTORY_AS_DIRTY_SUCCESS', 
      payload: data.data 
    });
    toast.success('Items marcados como sucios');
    return { success: true, data: data.data };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al marcar como sucio';
    dispatch({ 
      type: 'MARK_INVENTORY_AS_DIRTY_FAILURE', 
      payload: errorMessage 
    });
    toast.error(errorMessage);
    return { success: false, error: errorMessage };
  }
};

// OBTENER RESUMEN DE INVENTARIO
export const getInventorySummary = () => async (dispatch) => {
  dispatch({ type: 'GET_INVENTORY_SUMMARY_REQUEST' });
  try {
    const { data } = await api.get('/inventory/summary');
    dispatch({ 
      type: 'GET_INVENTORY_SUMMARY_SUCCESS', 
      payload: data.data 
    });
    return { success: true, data: data.data };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener resumen de inventario';
    dispatch({ 
      type: 'GET_INVENTORY_SUMMARY_FAILURE', 
      payload: errorMessage 
    });
    return { success: false, error: errorMessage };
  }
};