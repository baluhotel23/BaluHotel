import api from '../../utils/axios';
import { toast } from 'react-toastify';



// CHECK AVAILABILITY
export const checkAvailability = (params) => async (dispatch) => {
  console.log('🚀 [ACTION] checkAvailability started with params:', params);
  
  // ⭐ MEJORAR VALIDACIÓN - HACER MÁS FLEXIBLE
  if (!params) {
    console.error('❌ [ACTION] No parameters provided');
    dispatch({ 
      type: 'CHECK_AVAILABILITY_FAILURE', 
      payload: 'Parámetros requeridos para búsqueda de disponibilidad' 
    });
    return { success: false, error: 'No parameters provided' };
  }

  // ⭐ PERMITIR BÚSQUEDA SIN FILTROS ESPECÍFICOS
  const hasFilters = params.checkIn || params.checkOut || params.roomType;
  if (!hasFilters) {
    console.log('ℹ️ [ACTION] No filters provided, fetching all rooms');
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
      dataType: typeof response.data,
      dataKeys: response.data ? Object.keys(response.data) : []
    });
    
    const { data } = response;
    
    // ⭐ VALIDACIÓN MEJORADA DE LA RESPUESTA
    console.log('🔍 [ACTION] Response validation:');
    console.log('  - API Response Structure:', {
      hasData: !!data,
      isError: data?.error,
      message: data?.message,
      hasRoomsArray: !!data?.data && Array.isArray(data.data),
      roomsCount: data?.data?.length || 0
    });
    
    // ⭐ PROCESAR DATOS DE HABITACIONES
    if (data?.data && Array.isArray(data.data)) {
      console.log('🏨 [ACTION] Processing room data:');
      
      const processedRooms = data.data.map((room, index) => {
        console.log(`  ${index + 1}. Room ${room.roomNumber}:`, {
          type: room.type,
          available: room.available,
          isActive: room.isActive,
          status: room.status,
          isAvailable: room.isAvailable,
          services: room.Services?.length || 0,
          inventory: room.BasicInventories?.length || 0
        });
        
        // ⭐ ASEGURAR CONSISTENCIA DE DATOS
        return {
          ...room,
          // Garantizar que los campos críticos estén presentes
          isAvailable: room.isAvailable !== undefined ? room.isAvailable : room.available,
          Services: room.Services || [],
          BasicInventories: room.BasicInventories || [],
          bookedDates: room.bookedDates || [],
          currentBookings: room.currentBookings || 0,
          availabilityReason: room.availabilityReason || 'Status unknown'
        };
      });
      
      const availableCount = processedRooms.filter(r => r.isAvailable).length;
      console.log(`📊 [ACTION] Availability summary: ${availableCount}/${processedRooms.length} rooms available`);
      
      // ⭐ DISPATCH SUCCESS CON DATOS PROCESADOS
      console.log('✅ [ACTION] Dispatching SUCCESS with processed rooms');
      dispatch({ 
        type: 'CHECK_AVAILABILITY_SUCCESS', 
        payload: {
          rooms: processedRooms,
          summary: {
            total: processedRooms.length,
            available: availableCount,
            occupied: processedRooms.filter(r => r.status === 'Ocupada').length,
            cleaning: processedRooms.filter(r => r.status === 'Para Limpiar').length,
            maintenance: processedRooms.filter(r => r.status === 'Mantenimiento').length
          },
          filters: params,
          timestamp: new Date().toISOString()
        }
      });
      
      return { 
        success: true, 
        data: processedRooms, 
        summary: {
          total: processedRooms.length,
          available: availableCount
        }
      };
      
    } else {
      console.warn('⚠️ [ACTION] No room data in response or invalid format');
      dispatch({ 
        type: 'CHECK_AVAILABILITY_SUCCESS', 
        payload: {
          rooms: [],
          summary: { total: 0, available: 0 },
          filters: params,
          timestamp: new Date().toISOString()
        }
      });
      
      return { success: true, data: [], summary: { total: 0, available: 0 } };
    }
    
  } catch (error) {
    console.error('❌ [ACTION] Error in checkAvailability:', error);
    console.error('❌ [ACTION] Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url
    });
    
    const errorMessage = error.response?.data?.message || error.message || 'Error al consultar disponibilidad de habitaciones';
    
    dispatch({ 
      type: 'CHECK_AVAILABILITY_FAILURE', 
      payload: {
        message: errorMessage,
        status: error.response?.status,
        timestamp: new Date().toISOString()
      }
    });
    
    return { success: false, error: errorMessage };
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
    
    // ⭐ VERIFICAR QUE bookingId EXISTE EN chargeData
    if (!chargeData.bookingId) {
      throw new Error("bookingId es requerido en chargeData");
    }
    
    // ⭐ USAR LA RUTA CORRECTA CON chargeData.bookingId
    const { data } = await api.post(`/bookings/${chargeData.bookingId}/extra-charges`, chargeData);
    
    console.log("✅ Respuesta del servidor:", data);
    
    // ⭐ VERIFICAR QUE LA RESPUESTA SEA EXITOSA
    if (data.error) {
      throw new Error(data.message || "Error en la respuesta del servidor");
    }
    
    // ⭐ ASEGURAR QUE EL PAYLOAD INCLUYA TODA LA INFORMACIÓN NECESARIA
    const payload = {
      bookingId: chargeData.bookingId,
      extraCharge: data.data, // El cargo extra creado
      message: data.message || "Cargo extra agregado exitosamente"
    };
    
    console.log("📦 Payload para dispatch:", payload);
    
    dispatch({ 
      type: "ADD_EXTRA_CHARGE_SUCCESS", 
      payload: payload
    });
    
    return { error: false, data: payload };
  } catch (error) {
    console.error("❌ Error en addExtraCharge:", error);
    
    // ⭐ MANEJO MEJORADO DE ERRORES
    const errorMessage = error.response?.data?.message || 
                        error.response?.data?.details || 
                        error.message || 
                        "Error al agregar cargo extra";
    
    console.error("❌ Error message:", errorMessage);
    console.error("❌ Error details:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      method: error.config?.method
    });
    
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

