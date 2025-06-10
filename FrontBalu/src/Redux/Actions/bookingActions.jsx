import api from '../../utils/axios';
import { toast } from 'react-toastify';



// CHECK AVAILABILITY
export const checkAvailability = (params) => async (dispatch) => {
  console.log('🚀 [ACTION] checkAvailability started with params:', params);
  
  // ⭐ VALIDAR PARÁMETROS ANTES DE ENVIAR
  if (!params || !params.checkIn || !params.checkOut || !params.roomType) {
    console.error('❌ [ACTION] Invalid parameters:', params);
    dispatch({ 
      type: 'CHECK_AVAILABILITY_FAILURE', 
      payload: 'Parámetros inválidos para búsqueda de disponibilidad' 
    });
    return;
  }
  
  dispatch({ type: 'CHECK_AVAILABILITY_REQUEST' });
  console.log('✅ [ACTION] REQUEST dispatched');
  
  try {
    console.log('📡 [ACTION] Making API call to /bookings/availability');
    console.log('📋 [ACTION] Request details:', {
      url: '/bookings/availability',
      method: 'GET',
      params: params,
      timestamp: new Date().toISOString()
    });
    
    const response = await api.get('/bookings/availability', { params });
    
    console.log('📥 [ACTION] Response received:', {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data
    });
    
    const { data } = response;
    
    // ⭐ VALIDACIÓN EXHAUSTIVA DE LA RESPUESTA
    console.log('🔍 [ACTION] Response validation:');
    console.log('  - data exists:', !!data);
    console.log('  - data.error:', data?.error);
    console.log('  - data.message:', data?.message);
    console.log('  - data.data exists:', !!data?.data);
    console.log('  - data.data is array:', Array.isArray(data?.data));
    console.log('  - data.data length:', data?.data?.length || 0);
    
    if (data?.data && Array.isArray(data.data)) {
      console.log('🏨 [ACTION] Rooms details:');
      data.data.forEach((room, index) => {
        console.log(`  ${index + 1}. Room ${room.roomNumber}:`, {
          type: room.type,
          available: room.available,
          isActive: room.isActive,
          status: room.status,
          isAvailable: room.isAvailable
        });
      });
      
      const availableCount = data.data.filter(r => r.isAvailable).length;
      console.log(`📊 [ACTION] Availability summary: ${availableCount}/${data.data.length} rooms available`);
    }
    
    // ⭐ DISPATCH SUCCESS
    if (data && !data.error && data.data && Array.isArray(data.data)) {
      console.log('✅ [ACTION] Dispatching SUCCESS with payload:', data.data);
      dispatch({ 
        type: 'CHECK_AVAILABILITY_SUCCESS', 
        payload: data.data 
      });
      console.log('🎯 [ACTION] SUCCESS dispatched successfully');
      
      // ⭐ VERIFICAR QUE SE HAYA ENVIADO CORRECTAMENTE
      setTimeout(() => {
        console.log('⏰ [ACTION] Delayed check - action should be in Redux now');
      }, 100);
      
    } else {
      console.warn('⚠️ [ACTION] Unexpected response structure, dispatching empty array');
      dispatch({ 
        type: 'CHECK_AVAILABILITY_SUCCESS', 
        payload: [] 
      });
    }
    
  } catch (error) {
    console.error('❌ [ACTION] Error caught:', error);
    console.error('❌ [ACTION] Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText,
      config: error.config
    });
    
    const errorMessage = error.response?.data?.message || error.message || 'Error al consultar disponibilidad';
    dispatch({ 
      type: 'CHECK_AVAILABILITY_FAILURE', 
      payload: errorMessage 
    });
    console.log('💥 [ACTION] FAILURE dispatched with error:', errorMessage);
  }
};

// GET ROOM TYPES
export const getRoomTypes = () => async (dispatch) => {
  dispatch({ type: 'GET_ROOM_TYPES_REQUEST' });
  try {
    const { data } = await api.get('/bookings/room-types');
    dispatch({ type: 'GET_ROOM_TYPES_SUCCESS', payload: data });
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al obtener tipos de habitación';
    dispatch({ type: 'GET_ROOM_TYPES_FAILURE', payload: errorMessage });
  }
};

// CREATE BOOKING
export const createBooking = (bookingData) => {
  return async (dispatch) => {
    dispatch({ type: 'CREATE_BOOKING_REQUEST' });
    try {
      const { data } = await api.post('/bookings/create', bookingData);
      if (data.error) {
        dispatch({
          type: 'CREATE_BOOKING_FAILURE',
          payload: data.message,
        });
        toast.error(data.message);
        return { success: false, message: data.message };
      }
      dispatch({
        type: 'CREATE_BOOKING_SUCCESS',
        payload: data.data,  // data.data debe incluir { booking, trackingLink }
      });
      toast.success('Reserva creada exitosamente');
      return { success: true, data: data.data };
    } catch (error) {
      console.error("Error en createBooking:", error);
      dispatch({
        type: 'CREATE_BOOKING_FAILURE',
        payload: error.message,
      });
      toast.error(error.message);
      return { success: false, message: error.message };
    }
  };
};

// GET BOOKINGS OF THE USER
export const getUserBookings = () => async (dispatch) => {
  dispatch({ type: 'GET_USER_BOOKINGS_REQUEST' });
  try {
    const { data } = await api.get('/my-bookings');
    dispatch({ type: 'GET_USER_BOOKINGS_SUCCESS', payload: data.data });
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al obtener reservas del usuario';
    dispatch({ type: 'GET_USER_BOOKINGS_FAILURE', payload: errorMessage });
  }
};

export const getBookingById = (bookingId) => async (dispatch) => {
  dispatch({ type: "GET_BOOKING_DETAILS_REQUEST" });
  try {
    const { data } = await api.get(`/bookings/${bookingId}`, {
      
    });
    dispatch({ type: "GET_BOOKING_DETAILS_SUCCESS", payload: data.data });
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || "Error al obtener detalles de la reserva";
    dispatch({ type: "GET_BOOKING_DETAILS_FAILURE", payload: errorMessage });
  }
};

// STAFF: GET ALL BOOKINGS
export const getAllBookings = (queryParams) => async (dispatch) => {
  dispatch({ type: 'GET_ALL_BOOKINGS_REQUEST' });
  try {
    const { data } = await api.get('/bookings/reservas/all', { params: queryParams });
    dispatch({ type: 'GET_ALL_BOOKINGS_SUCCESS', payload: data.data });
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al obtener todas las reservas';
    dispatch({ type: 'GET_ALL_BOOKINGS_FAILURE', payload: errorMessage });
  }
};

// CHECK-IN (PUT /bookings/:id/checkin)
export const checkIn = (bookingId) => async (dispatch) => {
  dispatch({ type: 'CHECKIN_REQUEST' });
  try {
    const { data } = await api.put(`/bookings/${bookingId}/checkin`);
    dispatch({ type: 'CHECKIN_SUCCESS', payload: data.data });
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al realizar el check-in';
    dispatch({ type: 'CHECKIN_FAILURE', payload: errorMessage });
  }
};

// CHECK-OUT (PUT /bookings/:id/checkout)
export const checkOut = (bookingId) => async (dispatch) => {
  dispatch({ type: 'CHECKOUT_REQUEST' });
  try {
    const { data } = await api.put(`/bookings/${bookingId}/checkout`);
    dispatch({ type: 'CHECKOUT_SUCCESS', payload: data.data });
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al realizar el check-out';
    dispatch({ type: 'CHECKOUTFAILURE', payload: errorMessage });
  }
};

// ADD EXTRA CHARGES (POST /bookings/:id/extra-charges)
export const addExtraCharge = (chargeData) => async (dispatch) => {
  dispatch({ type: "ADD_EXTRA_CHARGE_REQUEST" });
  
  try {
    console.log("📤 Enviando cargo extra:", chargeData);
    
    const { data } = await api.post("/bookings/extra-charges", chargeData);
    
    console.log("✅ Respuesta del servidor:", data);
    
    // ⭐ ASEGURAR QUE EL PAYLOAD INCLUYA TODA LA INFORMACIÓN NECESARIA
    const payload = {
      bookingId: chargeData.bookingId,
      extraCharge: data.data, // El cargo extra creado
      message: data.message
    };
    
    dispatch({ 
      type: "ADD_EXTRA_CHARGE_SUCCESS", 
      payload: payload
    });
    
    return { error: false, data: payload };
  } catch (error) {
    const errorMessage = error.response?.data?.message || "Error al agregar cargo extra";
    console.error("❌ Error en addExtraCharge:", errorMessage);
    
    dispatch({ 
      type: "ADD_EXTRA_CHARGE_FAILURE", 
      payload: errorMessage 
    });
    
    return { error: true, message: errorMessage };
  }
};

// GENERATE BILL (GET /bookings/:id/bill)
export const generateBill = (bookingId) => async (dispatch) => {
  dispatch({ type: 'GENERATE_BILL_REQUEST' });
  try {
    // Generar la factura
    const { data: billData } = await api.get(`/bookings/${bookingId}/bill`);
    dispatch({ type: 'GENERATE_BILL_SUCCESS', payload: billData.data });

    // Enviar la factura a Taxxa
    const { data: taxxaResponse } = await api.post('/taxxa/invoice', { idBill: billData.data.idBill });
    dispatch({ type: 'SEND_BILL_TO_TAXXA_SUCCESS', payload: taxxaResponse });
    toast.success('Factura generada y enviada a Taxxa con éxito');
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al generar o enviar la factura';
    dispatch({ type: 'GENERATE_BILL_FAILURE', payload: errorMessage });
    toast.error(errorMessage);
  }
};
export const getAllBills = (queryParams) => async (dispatch) => {
  dispatch({ type: 'GET_ALL_BILLS_REQUEST' });
  try {
    const { data } = await api.get('/bookings/facturas', { params: queryParams });
    console.log('Datos recibidos desde el backend (getAllBills):', data); // Log para verificar la respuesta
    dispatch({ type: 'GET_ALL_BILLS_SUCCESS', payload: data.data }); // Asegúrate de que sea data.data
    toast.success('Facturas obtenidas exitosamente');
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al obtener las facturas';
    console.error('Error en getAllBills:', errorMessage); // Log para errores
    dispatch({ type: 'GET_ALL_BILLS_FAILURE', payload: errorMessage });
    toast.error(errorMessage);
  }
};

export const sendBillToTaxxa = (idBill) => async (dispatch) => {
  dispatch({ type: 'SEND_BILL_TO_TAXXA_REQUEST' });
  try {
    const response = await fetch(`/api/taxxa/invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idBill }),
    });
    const data = await response.json();
    dispatch({ type: 'SEND_BILL_TO_TAXXA_SUCCESS', payload: data });
  } catch (error) {
    dispatch({ type: 'SEND_BILL_TO_TAXXA_FAILURE', payload: error.message });
    throw error;
  }
};


// UPDATE BOOKING STATUS (PUT /bookings/:id/status)
export const updateBookingStatus = (bookingId, statusData) => async (dispatch) => {
  dispatch({ type: 'UPDATE_BOOKING_STATUS_REQUEST' });
  try {
    const { data } = await api.put(`/bookings/${bookingId}/status`, statusData);
    dispatch({ type: 'UPDATE_BOOKING_STATUS_SUCCESS', payload: data.data });
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al actualizar el estado de la reserva';
    dispatch({ type: 'UPDATE_BOOKING_STATUS_FAILURE', payload: errorMessage });
  }
};

// CANCEL BOOKING (PUT /bookings/:id/cancel)
export const cancelBooking = (bookingId, cancelData) => async (dispatch) => {
  dispatch({ type: 'CANCEL_BOOKING_REQUEST' });
  try {
    const { data } = await api.put(`/bookings/${bookingId}/cancel`, cancelData);
    dispatch({ type: 'CANCEL_BOOKING_SUCCESS', payload: data.data });
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al cancelar la reserva';
    dispatch({ type: 'CANCEL_BOOKING_FAILURE', payload: errorMessage });
  }
};

// GET OCCUPANCY REPORT (GET /reports/occupancy)
export const getOccupancyReport = (params) => async (dispatch) => {
  dispatch({ type: 'GET_OCCUPANCY_REPORT_REQUEST' });
  try {
    const { data } = await api.get('/reports/occupancy', { params });
    dispatch({ type: 'GET_OCCUPANCY_REPORT_SUCCESS', payload: data.data });
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al obtener el reporte de ocupación';
    dispatch({ type: 'GET_OCCUPANCY_REPORT_FAILURE', payload: errorMessage });
  }
};

// GET REVENUE REPORT (GET /reports/revenue)
export const getRevenueReport = (params) => async (dispatch) => {
  dispatch({ type: 'GET_REVENUE_REPORT_REQUEST' });
  try {
    const { data } = await api.get('/reports/revenue', { params });
    dispatch({ type: 'GET_REVENUE_REPORT_SUCCESS', payload: data.data });
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al obtener el reporte de ingresos';
    dispatch({ type: 'GET_REVENUE_REPORT_FAILURE', payload: errorMessage });
  }
};

export const updateOnlinePayment = (paymentData) => async (dispatch) => {
  dispatch({ type: 'UPDATE_ONLINE_PAYMENT_REQUEST' });
  try {
    const { data } = await api.put('/bookings/online-payment', paymentData);
    dispatch({ type: 'UPDATE_ONLINE_PAYMENT_SUCCESS', payload: data.data });
    toast.success(data.message);
    return { success: true, data: data.data };
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al actualizar el pago online';
    dispatch({ type: 'UPDATE_ONLINE_PAYMENT_FAILURE', payload: errorMessage });
    toast.error(errorMessage);
    return { success: false, message: errorMessage };
  }
};

export const checkInBookingWithInventory = (checkInData) => async (dispatch) => {
  dispatch({ type: 'CHECKIN_BOOKING_WITH_INVENTORY_REQUEST' });
  try {
    const { bookingId, assignInventory = true, customItems = [] } = checkInData;
    
    const { data } = await api.put(`/bookings/${bookingId}/check-in`, {
      assignInventory,
      customItems
    });
    
    dispatch({ 
      type: 'CHECKIN_BOOKING_WITH_INVENTORY_SUCCESS', 
      payload: data.data 
    });
    
    toast.success(data.message || 'Check-in realizado exitosamente');
    return { success: true, data: data.data };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al realizar el check-in';
    dispatch({ 
      type: 'CHECKIN_BOOKING_WITH_INVENTORY_FAILURE', 
      payload: errorMessage 
    });
    toast.error(errorMessage);
    return { success: false, error: errorMessage };
  }
};

// CHECK-OUT ACTUALIZADO CON INVENTARIO
export const checkOutBookingWithInventory = (checkOutData) => async (dispatch) => {
  dispatch({ type: 'CHECKOUT_BOOKING_WITH_INVENTORY_REQUEST' });
  try {
    const { bookingId, inventoryReturns = [] } = checkOutData;
    
    const { data } = await api.put(`/bookings/${bookingId}/check-out`, {
      inventoryReturns
    });
    
    dispatch({ 
      type: 'CHECKOUT_BOOKING_WITH_INVENTORY_SUCCESS', 
      payload: data.data 
    });
    
    toast.success(data.message || 'Check-out realizado exitosamente');
    return { success: true, data: data.data };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al realizar el check-out';
    dispatch({ 
      type: 'CHECKOUT_BOOKING_WITH_INVENTORY_FAILURE', 
      payload: errorMessage 
    });
    toast.error(errorMessage);
    return { success: false, error: errorMessage };
  }
};

// OBTENER ESTADO DE INVENTARIO DE RESERVA
export const getBookingInventoryStatus = (bookingId) => async (dispatch) => {
  dispatch({ type: 'GET_BOOKING_INVENTORY_STATUS_REQUEST' });
  try {
    const { data } = await api.get(`/bookings/${bookingId}/inventory/status`);
    dispatch({ 
      type: 'GET_BOOKING_INVENTORY_STATUS_SUCCESS', 
      payload: data.data 
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

// REPORTE DE USO DE INVENTARIO
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

