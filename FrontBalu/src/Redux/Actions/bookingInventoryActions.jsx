import api from '../../utils/axios';
import { toast } from 'react-toastify';
// ⭐ IMPORTAR LAS ACTIONS DE BOOKING
import { 
  checkInBookingWithInventory, 
  checkOutBookingWithInventory 
} from './bookingActions';

// ⭐ ASIGNAR INVENTARIO A RESERVA (CHECK-IN)
export const assignInventoryToBooking = (assignmentData) => async (dispatch) => {
  dispatch({ type: 'ASSIGN_INVENTORY_TO_BOOKING_REQUEST' });
  try {
    const { bookingId } = assignmentData;
    const { data } = await api.post(`/booking-inventory/booking/${bookingId}/assign`, assignmentData);
    
    dispatch({ 
      type: 'ASSIGN_INVENTORY_TO_BOOKING_SUCCESS', 
      payload: {
        bookingId,
        assignments: data.data.assignments,
        errors: data.data.errors
      }
    });
    
    toast.success(data.message || 'Inventario asignado exitosamente');
    return { success: true, data: data.data };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al asignar inventario';
    dispatch({ 
      type: 'ASSIGN_INVENTORY_TO_BOOKING_FAILURE', 
      payload: errorMessage 
    });
    toast.error(errorMessage);
    return { success: false, error: errorMessage };
  }
};

// ⭐ PROCESAR CHECK-OUT DE INVENTARIO
export const processCheckoutInventory = (checkoutData) => async (dispatch) => {
  dispatch({ type: 'PROCESS_CHECKOUT_INVENTORY_REQUEST' });
  try {
    const { bookingId } = checkoutData;
    const { data } = await api.post(`/booking-inventory/booking/${bookingId}/checkout`, checkoutData);
    
    dispatch({ 
      type: 'PROCESS_CHECKOUT_INVENTORY_SUCCESS', 
      payload: {
        bookingId,
        processedReturns: data.data
      }
    });
    
    toast.success(data.message || 'Check-out de inventario procesado exitosamente');
    return { success: true, data: data.data };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al procesar check-out de inventario';
    dispatch({ 
      type: 'PROCESS_CHECKOUT_INVENTORY_FAILURE', 
      payload: errorMessage 
    });
    toast.error(errorMessage);
    return { success: false, error: errorMessage };
  }
};

// ⭐ OBTENER USO DE INVENTARIO POR RESERVA
export const getBookingInventoryUsage = (bookingId) => async (dispatch) => {
  dispatch({ type: 'GET_BOOKING_INVENTORY_USAGE_REQUEST' });
  try {
    const { data } = await api.get(`/booking-inventory/booking/${bookingId}`);
    
    dispatch({ 
      type: 'GET_BOOKING_INVENTORY_USAGE_SUCCESS', 
      payload: {
        bookingId,
        usage: data.data
      }
    });
    
    return { success: true, data: data.data };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener uso de inventario';
    dispatch({ 
      type: 'GET_BOOKING_INVENTORY_USAGE_FAILURE', 
      payload: errorMessage 
    });
    return { success: false, error: errorMessage };
  }
};

// ⭐ OBTENER USO DE INVENTARIO POR HABITACIÓN
export const getRoomInventoryUsage = (roomNumber, queryParams = {}) => async (dispatch) => {
  dispatch({ type: 'GET_ROOM_INVENTORY_USAGE_REQUEST' });
  try {
    const { data } = await api.get(`/booking-inventory/room/${roomNumber}/usage`, { params: queryParams });
    
    dispatch({ 
      type: 'GET_ROOM_INVENTORY_USAGE_SUCCESS', 
      payload: {
        roomNumber,
        usage: data.data
      }
    });
    
    return { success: true, data: data.data };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener uso de inventario por habitación';
    dispatch({ 
      type: 'GET_ROOM_INVENTORY_USAGE_FAILURE', 
      payload: errorMessage 
    });
    return { success: false, error: errorMessage };
  }
};

// ⭐ OBTENER ESTADO DE INVENTARIO DE RESERVA (desde bookingController)
export const getBookingInventoryStatus = (bookingId) => async (dispatch) => {
  dispatch({ type: 'GET_BOOKING_INVENTORY_STATUS_REQUEST' });
  try {
    const { data } = await api.get(`/bookings/${bookingId}/inventory/status`);
    
    dispatch({ 
      type: 'GET_BOOKING_INVENTORY_STATUS_SUCCESS', 
      payload: {
        bookingId,
        inventoryStatus: data.data
      }
    });
    
    return { success: true, data: data.data };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener estado de inventario';
    dispatch({ 
      type: 'GET_BOOKING_INVENTORY_STATUS_FAILURE', 
      payload: errorMessage 
    });
    return { success: false, error: errorMessage };
  }
};

// ⭐ OBTENER REPORTE DE USO DE INVENTARIO
export const getInventoryUsageReport = (queryParams = {}) => async (dispatch) => {
  dispatch({ type: 'GET_INVENTORY_USAGE_REPORT_REQUEST' });
  try {
    const { data } = await api.get('/bookings/reports/inventory-usage', { params: queryParams });
    
    dispatch({ 
      type: 'GET_INVENTORY_USAGE_REPORT_SUCCESS', 
      payload: data.data
    });
    
    return { success: true, data: data.data };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener reporte de uso de inventario';
    dispatch({ 
      type: 'GET_INVENTORY_USAGE_REPORT_FAILURE', 
      payload: errorMessage 
    });
    return { success: false, error: errorMessage };
  }
};

// ⭐ ACTIONS AUXILIARES

// Limpiar estado de inventario de reservas
export const clearBookingInventoryState = () => (dispatch) => {
  dispatch({ type: 'CLEAR_BOOKING_INVENTORY_STATE' });
};

// Actualizar estado local de inventario de reserva
export const updateBookingInventoryLocal = (bookingId, updates) => (dispatch) => {
  dispatch({ 
    type: 'UPDATE_BOOKING_INVENTORY_LOCAL', 
    payload: { bookingId, updates } 
  });
};

// ⭐ ACTION COMPUESTA PARA CHECK-IN COMPLETO (CORREGIDA)
export const performCompleteCheckIn = (checkInData) => async (dispatch) => {
  dispatch({ type: 'PERFORM_COMPLETE_CHECKIN_REQUEST' });
  
  try {
    const { bookingId, assignInventory = true, customItems = [] } = checkInData;
    
    // ⭐ 1. HACER CHECK-IN CON INVENTARIO USANDO LA FUNCIÓN CORRECTA
    const checkInResult = await dispatch(checkInBookingWithInventory({
      bookingId,
      assignInventory,
      customItems
    }));
    
    if (!checkInResult.success) {
      throw new Error('Error en check-in: ' + checkInResult.error);
    }
    
    // ⭐ 2. OPCIONAL: ASIGNAR INVENTARIO ADICIONAL SI ES NECESARIO
    let additionalInventoryResult = null;
    if (customItems && customItems.length > 0) {
      additionalInventoryResult = await dispatch(assignInventoryToBooking({
        bookingId,
        items: customItems
      }));
      
      if (!additionalInventoryResult.success) {
        console.warn('Advertencia: Check-in exitoso pero error en inventario adicional:', additionalInventoryResult.error);
      }
    }
    
    const completeResult = {
      booking: checkInResult.data,
      inventory: checkInResult.data.inventoryAssigned || null,
      additionalInventory: additionalInventoryResult?.data || null,
      inventoryWarnings: checkInResult.data.inventoryWarnings || null
    };
    
    dispatch({ 
      type: 'PERFORM_COMPLETE_CHECKIN_SUCCESS', 
      payload: completeResult
    });
    
    return { success: true, data: completeResult };
    
  } catch (error) {
    const errorMessage = error.message || 'Error al realizar check-in completo';
    dispatch({ 
      type: 'PERFORM_COMPLETE_CHECKIN_FAILURE', 
      payload: errorMessage 
    });
    return { success: false, error: errorMessage };
  }
};

// ⭐ ACTION COMPUESTA PARA CHECK-OUT COMPLETO (CORREGIDA)
export const performCompleteCheckOut = (checkOutData) => async (dispatch) => {
  dispatch({ type: 'PERFORM_COMPLETE_CHECKOUT_REQUEST' });
  
  try {
    const { bookingId, inventoryReturns = [] } = checkOutData;
    
    // ⭐ 1. PROCESAR CHECK-OUT CON INVENTARIO USANDO LA FUNCIÓN CORRECTA
    const checkOutResult = await dispatch(checkOutBookingWithInventory({
      bookingId,
      inventoryReturns
    }));
    
    if (!checkOutResult.success) {
      throw new Error('Error en check-out: ' + checkOutResult.error);
    }
    
    // ⭐ 2. OPCIONAL: PROCESAR INVENTARIO ADICIONAL SI ES NECESARIO
    let additionalInventoryResult = null;
    if (inventoryReturns.length > 0) {
      additionalInventoryResult = await dispatch(processCheckoutInventory({
        bookingId,
        returns: inventoryReturns
      }));
      
      if (!additionalInventoryResult.success) {
        console.warn('Advertencia: Check-out exitoso pero error en procesamiento adicional:', additionalInventoryResult.error);
      }
    }
    
    const completeResult = {
      booking: checkOutResult.data,
      inventory: checkOutResult.data.inventoryProcessed || null,
      laundryItems: checkOutResult.data.laundryItems || null,
      additionalProcessing: additionalInventoryResult?.data || null
    };
    
    dispatch({ 
      type: 'PERFORM_COMPLETE_CHECKOUT_SUCCESS', 
      payload: completeResult
    });
    
    return { success: true, data: completeResult };
    
  } catch (error) {
    const errorMessage = error.message || 'Error al realizar check-out completo';
    dispatch({ 
      type: 'PERFORM_COMPLETE_CHECKOUT_FAILURE', 
      payload: errorMessage 
    });
    return { success: false, error: errorMessage };
  }
};

// ⭐ ACTION PARA VERIFICAR DISPONIBILIDAD DE INVENTARIO
export const checkInventoryAvailability = (roomNumber, bookingId = null) => async (dispatch) => {
  dispatch({ type: 'CHECK_INVENTORY_AVAILABILITY_REQUEST' });
  try {
    const queryParams = bookingId ? { bookingId } : {};
    const { data } = await api.get(`/rooms/${roomNumber}/inventory/check`, { params: queryParams });
    
    dispatch({ 
      type: 'CHECK_INVENTORY_AVAILABILITY_SUCCESS', 
      payload: {
        roomNumber,
        availability: data.data
      }
    });
    
    return { success: true, data: data.data };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al verificar disponibilidad de inventario';
    dispatch({ 
      type: 'CHECK_INVENTORY_AVAILABILITY_FAILURE', 
      payload: errorMessage 
    });
    return { success: false, error: errorMessage };
  }
};

// ⭐ ACTION PARA OBTENER HISTORIAL DE INVENTARIO DE HABITACIÓN
export const getRoomInventoryHistory = (roomNumber, queryParams = {}) => async (dispatch) => {
  dispatch({ type: 'GET_ROOM_INVENTORY_HISTORY_REQUEST' });
  try {
    const { data } = await api.get(`/rooms/${roomNumber}/inventory/history`, { params: queryParams });
    
    dispatch({ 
      type: 'GET_ROOM_INVENTORY_HISTORY_SUCCESS', 
      payload: {
        roomNumber,
        history: data.data
      }
    });
    
    return { success: true, data: data.data };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener historial de inventario';
    dispatch({ 
      type: 'GET_ROOM_INVENTORY_HISTORY_FAILURE', 
      payload: errorMessage 
    });
    return { success: false, error: errorMessage };
  }
};

// ⭐ NUEVA ACTION: CHECK-IN SIMPLE CON INVENTARIO (MÁS DIRECTO)
export const performSimpleCheckInWithInventory = (bookingId, inventoryConfig = {}) => async (dispatch) => {
  dispatch({ type: 'SIMPLE_CHECKIN_WITH_INVENTORY_REQUEST' });
  
  try {
    // Llamar directamente al endpoint de check-in que ya maneja inventario
    const { data } = await api.put(`/bookings/${bookingId}/check-in`, {
      assignInventory: inventoryConfig.assignInventory !== false,
      customItems: inventoryConfig.customItems || []
    });
    
    dispatch({ 
      type: 'SIMPLE_CHECKIN_WITH_INVENTORY_SUCCESS', 
      payload: {
        bookingId,
        result: data.data
      }
    });
    
    toast.success(data.message || 'Check-in con inventario realizado exitosamente');
    return { success: true, data: data.data };
    
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al realizar check-in con inventario';
    dispatch({ 
      type: 'SIMPLE_CHECKIN_WITH_INVENTORY_FAILURE', 
      payload: errorMessage 
    });
    toast.error(errorMessage);
    return { success: false, error: errorMessage };
  }
};

// ⭐ NUEVA ACTION: CHECK-OUT SIMPLE CON INVENTARIO (MÁS DIRECTO)
export const performSimpleCheckOutWithInventory = (bookingId, inventoryReturns = []) => async (dispatch) => {
  dispatch({ type: 'SIMPLE_CHECKOUT_WITH_INVENTORY_REQUEST' });
  
  try {
    // Llamar directamente al endpoint de check-out que ya maneja inventario
    const { data } = await api.put(`/bookings/${bookingId}/check-out`, {
      inventoryReturns
    });
    
    dispatch({ 
      type: 'SIMPLE_CHECKOUT_WITH_INVENTORY_SUCCESS', 
      payload: {
        bookingId,
        result: data.data
      }
    });
    
    toast.success(data.message || 'Check-out con inventario realizado exitosamente');
    return { success: true, data: data.data };
    
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al realizar check-out con inventario';
    dispatch({ 
      type: 'SIMPLE_CHECKOUT_WITH_INVENTORY_FAILURE', 
      payload: errorMessage 
    });
    toast.error(errorMessage);
    return { success: false, error: errorMessage };
  }
};