import api from '../../utils/axios';
import { toast } from 'react-toastify';




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
    console.log('📥 [GET-ALL-BOOKINGS] Solicitando bookings con params:', queryParams);
    
    const { data } = await api.get('/bookings/reservas/all', { params: queryParams });
    
    console.log('📊 [GET-ALL-BOOKINGS] Respuesta del backend:', {
      hasData: !!data,
      hasBookings: !!data?.data?.bookings,
      bookingsCount: data?.data?.bookings?.length || 0,
      hasPagination: !!data?.data?.pagination,
      hasStatistics: !!data?.data?.statistics
    });
    
    // ⭐ ENVIAR LA ESTRUCTURA COMPLETA AL REDUCER
    dispatch({ 
      type: 'GET_ALL_BOOKINGS_SUCCESS', 
      payload: data // Enviar toda la respuesta
    });
    
    return { success: true, data: data };
    
  } catch (error) {
    console.error('❌ [GET-ALL-BOOKINGS] Error:', error);
    const errorMessage = error.response?.data?.message || 'Error al obtener todas las reservas';
    dispatch({ type: 'GET_ALL_BOOKINGS_FAILURE', payload: errorMessage });
    return { success: false, error: errorMessage };
  }
};


// ⭐ CORREGIR LAS RUTAS PARA QUE COINCIDAN CON EL BACKEND
export const checkIn = (bookingId, checkInData) => async (dispatch) => {
  dispatch({ type: 'CHECKIN_REQUEST' });
  try {
    console.log(`🏨 [CHECKIN] Iniciando check-in para reserva: ${bookingId}`, checkInData);
    
    if (!bookingId) {
      throw new Error('bookingId es requerido');
    }
    
    const validBookingId = parseInt(bookingId) || bookingId;
    
    // ⭐ CORREGIR LA RUTA: usar 'check-in' con guión
    const { data } = await api.put(`/bookings/${validBookingId}/check-in`, checkInData);
    
    dispatch({ type: 'CHECKIN_SUCCESS', payload: data.data });
    console.log('✅ [CHECKIN] Check-in exitoso:', data.data);
    
    return { success: true, data: data.data };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al realizar check-in';
    console.error('❌ [CHECKIN] Error:', errorMessage);
    dispatch({ type: 'CHECKIN_FAILURE', payload: errorMessage });
    return { success: false, error: errorMessage };
  }
};

// ⭐ CORREGIR LA RUTA DE CHECK-OUT TAMBIÉN
export const checkOut = (bookingId, checkOutData) => async (dispatch) => {
  
  dispatch({ type: 'CHECKOUT_BOOKING_REQUEST' });
  try {
    console.log(`🏁 [CHECKOUT] Iniciando check-out para reserva: ${bookingId}`, checkOutData);

    if (!bookingId) {
      throw new Error('bookingId es requerido');
    }

    const validBookingId = parseInt(bookingId) || bookingId;

    // Usa la ruta correcta y pasa actualCheckOut si aplica
    const { data } = await api.put(`/bookings/${validBookingId}/check-out`, checkOutData);

    dispatch({ type: 'CHECKOUT_BOOKING_SUCCESS', payload: data.data });
    console.log('✅ [CHECKOUT] Check-out exitoso:', data.data);

    return { success: true, data: data.data };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al realizar check-out';
    console.error('❌ [CHECKOUT] Error:', errorMessage);
    dispatch({ type: 'CHECKOUT_BOOKING_FAILURE', payload: errorMessage });
    return { success: false, error: errorMessage };
  }
};

// ADD EXTRA CHARGES (POST /bookings/:id/extra-charges)
export const addExtraCharge = (chargeData) => async (dispatch) => {
  dispatch({ type: "ADD_EXTRA_CHARGE_REQUEST" });

  try {
    console.log("📤 Enviando cargo extra:", chargeData);

    // Verificar que los datos estén correctamente estructurados
    if (!chargeData.extraCharge || !chargeData.extraCharge.bookingId) {
      throw new Error("bookingId es requerido en chargeData.extraCharge");
    }

    const { bookingId } = chargeData.extraCharge;

    // Enviar los datos al backend
    const { data } = await api.post(`/bookings/${bookingId}/extra-charges`, chargeData);

    console.log("✅ Respuesta del servidor:", data);

    dispatch({
      type: "ADD_EXTRA_CHARGE_SUCCESS",
      payload: data.data,
    });

    return { error: false, data: data.data };
  } catch (error) {
    console.error("❌ Error en addExtraCharge:", error);

    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      "Error al agregar cargo extra";

    dispatch({
      type: "ADD_EXTRA_CHARGE_FAILURE",
      payload: errorMessage,
    });

    return { error: true, message: errorMessage };
  }
};

// GENERATE BILL (GET /bookings/:id/bill)
export const generateBill = (bookingId) => async (dispatch) => {
  dispatch({ type: 'GENERATE_BILL_REQUEST' });
  
  try {
    console.log(`🧾 [GENERATE-BILL] Iniciando generación para reserva: ${bookingId}`);
    
    // Generar la factura
    const { data: billData } = await api.get(`/bookings/${bookingId}/bill`);
    
    console.log('✅ [GENERATE-BILL] Factura generada:', billData.data);
    dispatch({ type: 'GENERATE_BILL_SUCCESS', payload: billData.data });

    // Enviar la factura a Taxxa
    try {
      const { data: taxxaResponse } = await api.post('/taxxa/invoice', { 
        idBill: billData.data.idBill 
      });
      
      console.log('✅ [TAXXA] Factura enviada a Taxxa:', taxxaResponse);
      dispatch({ type: 'SEND_BILL_TO_TAXXA_SUCCESS', payload: taxxaResponse });
      
      toast.success('🧾 Factura generada y enviada a Taxxa con éxito');
      
      return {
        success: true,
        bill: billData.data,
        taxxa: taxxaResponse
      };
      
    } catch (taxxaError) {
      console.warn('⚠️ [TAXXA] Error al enviar a Taxxa:', taxxaError);
      dispatch({ type: 'SEND_BILL_TO_TAXXA_FAILURE', payload: taxxaError.message });
      
      // La factura se generó pero falló Taxxa
      toast.warning('🧾 Factura generada correctamente, pero falló el envío a Taxxa');
      
      return {
        success: true,
        bill: billData.data,
        taxxa: null,
        taxxaError: taxxaError.message
      };
    }
    
  } catch (error) {
    console.error('❌ [GENERATE-BILL] Error:', error);
    
    const errorMessage =
      error.response?.data?.message || 
      error.response?.data?.details ||
      error.message ||
      'Error al generar la factura';
      
    dispatch({ type: 'GENERATE_BILL_FAILURE', payload: errorMessage });
    toast.error(`❌ ${errorMessage}`);
    
    return {
      success: false,
      error: errorMessage
    };
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
    // ⭐ CORRECCIÓN: Asegurar que bookingId sea válido
    console.log('🔄 [UPDATE-BOOKING-STATUS] bookingId:', bookingId, 'statusData:', statusData);
    
    if (!bookingId) {
      throw new Error('bookingId es requerido');
    }
    
    // ⭐ ASEGURAR QUE SEA UN NÚMERO O STRING VÁLIDO
    const validBookingId = parseInt(bookingId) || bookingId;
    
    const { data } = await api.put(`/bookings/${validBookingId}/status`, statusData);
    
    dispatch({ type: 'UPDATE_BOOKING_STATUS_SUCCESS', payload: data.data });
    return { success: true, data: data.data };
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al actualizar el estado de la reserva';
    dispatch({ type: 'UPDATE_BOOKING_STATUS_FAILURE', payload: errorMessage });
    return { success: false, error: errorMessage };
  }
};

// CANCEL BOOKING (PUT /bookings/:id/cancel)
export const getCancellationPolicies = (bookingId) => async (dispatch) => {
  dispatch({ type: 'GET_CANCELLATION_POLICIES_REQUEST' });
  try {
    console.log(`📋 [GET-CANCELLATION-POLICIES] Obteniendo políticas para reserva: ${bookingId}`);
    
    const { data } = await api.get(`/bookings/${bookingId}/cancellation-policies`);
    
    console.log('✅ [GET-CANCELLATION-POLICIES] Políticas obtenidas:', data.data);
    
    dispatch({ 
      type: 'GET_CANCELLATION_POLICIES_SUCCESS', 
      payload: data.data 
    });
    
    return { success: true, data: data.data };
    
  } catch (error) {
    console.error('❌ [GET-CANCELLATION-POLICIES] Error:', error);
    
    const errorMessage = error.response?.data?.message || 'Error al obtener políticas de cancelación';
    
    dispatch({ 
      type: 'GET_CANCELLATION_POLICIES_FAILURE', 
      payload: errorMessage 
    });
    
    return { success: false, error: errorMessage };
  }
};

// CANCEL BOOKING - VERSIÓN MEJORADA (PUT /bookings/:id/cancel)
export const cancelBooking = (bookingId, cancelData) => async (dispatch) => {
  dispatch({ type: 'CANCEL_BOOKING_REQUEST' });
  try {
    console.log(`🚨 [CANCEL-BOOKING] Cancelando reserva: ${bookingId}`, cancelData);
    
    // ⭐ VALIDAR DATOS DE ENTRADA
    if (!bookingId) {
      throw new Error('bookingId es requerido');
    }
    
    if (!cancelData?.reason) {
      throw new Error('La razón de cancelación es requerida');
    }
    
    // ⭐ ESTRUCTURA DE DATOS PARA EL BACKEND
    const requestData = {
      reason: cancelData.reason,
      cancelledBy: cancelData.cancelledBy || 'staff', // Usuario que cancela
      refundRequested: cancelData.refundRequested || false,
      notes: cancelData.notes || '',
      // ⭐ DATOS ADICIONALES PARA EL BACKEND
      processPartialRefund: cancelData.processPartialRefund || false,
      generateCreditVoucher: cancelData.generateCreditVoucher || false
    };
    
    console.log('📤 [CANCEL-BOOKING] Enviando datos:', requestData);
    
    const { data } = await api.put(`/bookings/${bookingId}/cancel`, requestData);
    
    console.log('✅ [CANCEL-BOOKING] Cancelación exitosa:', data.data);
    
    dispatch({ 
      type: 'CANCEL_BOOKING_SUCCESS', 
      payload: data.data 
    });
    
    // ⭐ MENSAJE CONTEXTUAL SEGÚN EL RESULTADO
    let successMessage = 'Reserva cancelada exitosamente';
    if (data.data.creditVoucher) {
      successMessage += ` 💳 Voucher de crédito generado: $${data.data.creditVoucher.amount.toLocaleString()}`;
    }
    
    toast.success(successMessage);
    return { success: true, data: data.data };
    
  } catch (error) {
    console.error('❌ [CANCEL-BOOKING] Error:', error);
    
    const errorMessage = error.response?.data?.message || 'Error al cancelar la reserva';
    
    dispatch({ 
      type: 'CANCEL_BOOKING_FAILURE', 
      payload: errorMessage 
    });
    
    toast.error(`❌ ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
};

// CLEAR CANCELLATION STATE
export const clearCancellationState = () => (dispatch) => {
  console.log('🧹 [CLEAR-CANCELLATION] Limpiando estado de cancelación');
  dispatch({ type: 'CLEAR_CANCELLATION_STATE' });
};

// ═══════════════════════════════════════════════════════════════
// 🗑️ ELIMINAR RESERVA PERMANENTEMENTE (Solo Owner)
// ═══════════════════════════════════════════════════════════════
export const deleteBookingPermanently = (bookingId) => async (dispatch) => {
  dispatch({ type: 'DELETE_BOOKING_PERMANENTLY_REQUEST' });
  
  try {
    console.log(`🗑️ [DELETE-BOOKING-PERMANENTLY] Eliminando reserva: ${bookingId}`);
    
    if (!bookingId) {
      throw new Error('bookingId es requerido');
    }
    
    const { data } = await api.delete(`/bookings/${bookingId}/permanent`);
    
    console.log('✅ [DELETE-BOOKING-PERMANENTLY] Reserva eliminada:', data.data);
    
    dispatch({ 
      type: 'DELETE_BOOKING_PERMANENTLY_SUCCESS', 
      payload: { bookingId, ...data.data }
    });
    
    toast.success('Reserva eliminada permanentemente');
    return { success: true, data: data.data };
    
  } catch (error) {
    console.error('❌ [DELETE-BOOKING-PERMANENTLY] Error:', error);
    
    const errorMessage = error.response?.data?.message || 'Error al eliminar la reserva permanentemente';
    
    dispatch({ 
      type: 'DELETE_BOOKING_PERMANENTLY_FAILURE', 
      payload: errorMessage 
    });
    
    toast.error(`❌ ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
};

// ⭐ NUEVAS FUNCIONES ADICIONALES PARA CANCELACIÓN

// VALIDATE CANCELLATION (POST /bookings/:id/validate-cancellation)
export const validateCancellation = (bookingId, validationData = {}) => async (dispatch) => {
  dispatch({ type: 'VALIDATE_CANCELLATION_REQUEST' }); // ⭐ AGREGAR ESTA LÍNEA
  
  try {
    console.log(`✅ [VALIDATE-CANCELLATION] Validando cancelación para reserva: ${bookingId}`);
    
    const { data } = await api.post(`/bookings/${bookingId}/validate-cancellation`, validationData);
    
    console.log('✅ [VALIDATE-CANCELLATION] Validación exitosa:', data.data);
    
    dispatch({ 
      type: 'VALIDATE_CANCELLATION_SUCCESS', 
      payload: data.data 
    });
    
    return { 
      success: true, 
      canCancel: data.data.canCancel,
      policies: data.data.policies,
      estimatedRefund: data.data.financial?.estimatedRefund || 0,
      estimatedCredit: data.data.financial?.estimatedCredit || 0,
      warnings: data.data.warnings || []
    };
    
  } catch (error) {
    console.error('❌ [VALIDATE-CANCELLATION] Error:', error);
    
    const errorMessage = error.response?.data?.message || 'Error al validar cancelación';
    
    dispatch({ 
      type: 'VALIDATE_CANCELLATION_FAILURE', 
      payload: errorMessage 
    });
    
    return { 
      success: false, 
      error: errorMessage,
      canCancel: false 
    };
  }
};

// GET CANCELLED BOOKINGS (GET /bookings/cancelled)
export const getCancelledBookings = (queryParams = {}) => async (dispatch) => {
  dispatch({ type: 'GET_CANCELLED_BOOKINGS_REQUEST' });
  try {
    console.log('📋 [GET-CANCELLED-BOOKINGS] Obteniendo reservas canceladas');
    
    const { data } = await api.get('/bookings/cancelled', { params: queryParams });
    
    console.log('✅ [GET-CANCELLED-BOOKINGS] Reservas canceladas obtenidas:', data.data?.length || 0);
    
    dispatch({ 
      type: 'GET_CANCELLED_BOOKINGS_SUCCESS', 
      payload: data.data 
    });
    
    return { success: true, data: data.data };
    
  } catch (error) {
    console.error('❌ [GET-CANCELLED-BOOKINGS] Error:', error);
    
    const errorMessage = error.response?.data?.message || 'Error al obtener reservas canceladas';
    
    dispatch({ 
      type: 'GET_CANCELLED_BOOKINGS_FAILURE', 
      payload: errorMessage 
    });
    
    return { success: false, error: errorMessage };
  }
};

// RESTORE BOOKING (PUT /bookings/:id/restore) - En caso de cancelación accidental
export const restoreBooking = (bookingId, restoreData = {}) => async (dispatch) => {
  dispatch({ type: 'RESTORE_BOOKING_REQUEST' });
  try {
    console.log(`🔄 [RESTORE-BOOKING] Restaurando reserva: ${bookingId}`);
    
    const { data } = await api.put(`/bookings/${bookingId}/restore`, restoreData);
    
    console.log('✅ [RESTORE-BOOKING] Reserva restaurada:', data.data);
    
    dispatch({ 
      type: 'RESTORE_BOOKING_SUCCESS', 
      payload: data.data 
    });
    
    toast.success('Reserva restaurada exitosamente');
    return { success: true, data: data.data };
    
  } catch (error) {
    console.error('❌ [RESTORE-BOOKING] Error:', error);
    
    const errorMessage = error.response?.data?.message || 'Error al restaurar la reserva';
    
    dispatch({ 
      type: 'RESTORE_BOOKING_FAILURE', 
      payload: errorMessage 
    });
    
    toast.error(`❌ ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
};

export const getAllVouchers = (queryParams = {}) => async (dispatch) => {
  dispatch({ type: 'GET_ALL_VOUCHERS_REQUEST' });
  try {
    console.log('📋 [GET-ALL-VOUCHERS] Obteniendo vouchers con params:', queryParams);
    
    const { data } = await api.get('/vouchers', { params: queryParams });
    
    console.log('✅ [GET-ALL-VOUCHERS] Vouchers obtenidos:', {
      available: data.data?.available?.length || 0,
      used: data.data?.used?.length || 0,
      hasStatistics: !!data.data?.statistics
    });
    
    dispatch({ 
      type: 'GET_ALL_VOUCHERS_SUCCESS', 
      payload: data.data 
    });
    
    return { success: true, data: data.data };
    
  } catch (error) {
    console.error('❌ [GET-ALL-VOUCHERS] Error:', error);
    
    const errorMessage = error.response?.data?.message || 'Error al obtener vouchers';
    
    dispatch({ 
      type: 'GET_ALL_VOUCHERS_FAILURE', 
      payload: errorMessage 
    });
    
    return { success: false, error: errorMessage };
  }
};

// VALIDATE VOUCHER (POST /vouchers/validate)
export const validateVoucher = (voucherCode, validationData = {}) => async (dispatch) => {
  dispatch({ type: 'VALIDATE_VOUCHER_REQUEST' });
  try {
    console.log(`💳 [VALIDATE-VOUCHER] Validando código: ${voucherCode}`, validationData);
    
    if (!voucherCode?.trim()) {
      throw new Error('Código de voucher es requerido');
    }
    
    const requestData = {
      voucherCode: voucherCode.trim().toUpperCase(),
      bookingId: validationData.bookingId || null,
      validateAmount: validationData.validateAmount || false,
      requiredAmount: validationData.requiredAmount || 0
    };
    
    const { data } = await api.post('/vouchers/validate', requestData);
    
    console.log('✅ [VALIDATE-VOUCHER] Validación exitosa:', data.data);
    
    dispatch({ 
      type: 'VALIDATE_VOUCHER_SUCCESS', 
      payload: data.data 
    });
    
    if (data.data.isValid) {
      toast.success(`💳 Voucher válido: $${data.data.voucher.amount.toLocaleString()}`);
    } else {
      toast.warning(`⚠️ ${data.data.reason || 'Voucher no válido'}`);
    }
    
    return { success: true, data: data.data };
    
  } catch (error) {
    console.error('❌ [VALIDATE-VOUCHER] Error:', error);
    
    const errorMessage = error.response?.data?.message || 'Error al validar voucher';
    
    dispatch({ 
      type: 'VALIDATE_VOUCHER_FAILURE', 
      payload: errorMessage 
    });
    
    toast.error(`❌ ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
};

// USE VOUCHER (PUT /vouchers/:id/use)
export const useVoucher = (voucherId, useData) => async (dispatch) => {
  dispatch({ type: 'USE_VOUCHER_REQUEST' });
  try {
    console.log(`🎫 [USE-VOUCHER] Usando voucher: ${voucherId}`, useData);
    
    if (!voucherId) {
      throw new Error('ID de voucher es requerido');
    }
    
    const requestData = {
      bookingId: useData.bookingId,
      usedBy: useData.usedBy || 'staff',
      notes: useData.notes || '',
      appliedAmount: useData.appliedAmount || null
    };
    
    const { data } = await api.put(`/vouchers/${voucherId}/use`, requestData);
    
    console.log('✅ [USE-VOUCHER] Voucher usado exitosamente:', data.data);
    
    dispatch({ 
      type: 'USE_VOUCHER_SUCCESS', 
      payload: data.data 
    });
    
    toast.success(`🎉 Voucher aplicado: $${data.data.voucher.amount.toLocaleString()}`);
    return { success: true, data: data.data };
    
  } catch (error) {
    console.error('❌ [USE-VOUCHER] Error:', error);
    
    const errorMessage = error.response?.data?.message || 'Error al usar voucher';
    
    dispatch({ 
      type: 'USE_VOUCHER_FAILURE', 
      payload: errorMessage 
    });
    
    toast.error(`❌ ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
};

// GET VOUCHER BY CODE (GET /vouchers/by-code/:code)
// GET VOUCHER BY CODE (GET /vouchers/by-code/:code)
export const getVoucherByCode = (voucherCode) => async (dispatch) => {
  dispatch({ type: 'GET_VOUCHER_BY_CODE_REQUEST' });  // ⭐ Usar dispatch
  
  try {
    console.log(`🔍 [GET-VOUCHER-BY-CODE] Buscando voucher: ${voucherCode}`);
    
    const { data } = await api.get(`/vouchers/by-code/${voucherCode.trim().toUpperCase()}`);
    
    console.log('✅ [GET-VOUCHER-BY-CODE] Voucher encontrado:', data.data);
    
    dispatch({ 
      type: 'GET_VOUCHER_BY_CODE_SUCCESS', 
      payload: data.data 
    });
    
    return { success: true, data: data.data };
    
  } catch (error) {
    console.error('❌ [GET-VOUCHER-BY-CODE] Error:', error);
    
    const errorMessage = error.response?.data?.message || 'Voucher no encontrado';
    
    dispatch({ 
      type: 'GET_VOUCHER_BY_CODE_FAILURE', 
      payload: errorMessage 
    });
    
    return { success: false, error: errorMessage };
  }
};

// CLEAR VOUCHER STATE
export const clearVoucherState = () => (dispatch) => {
  console.log('🧹 [CLEAR-VOUCHER-STATE] Limpiando estado de vouchers');
  dispatch({ type: 'CLEAR_VOUCHER_STATE' });
};

// GET VOUCHER STATISTICS (GET /vouchers/statistics)
export const getVoucherStatistics = (params = {}) => async (dispatch) => {
  dispatch({ type: 'GET_VOUCHER_STATISTICS' }); 
  try {
    console.log('📊 [GET-VOUCHER-STATISTICS] Obteniendo estadísticas...');
    
    const { data } = await api.get('/vouchers/statistics', { params });
    
    console.log('✅ [GET-VOUCHER-STATISTICS] Estadísticas obtenidas:', data.data);
    
    return { success: true, data: data.data };
    
  } catch (error) {
    console.error('❌ [GET-VOUCHER-STATISTICS] Error:', error);
    
    const errorMessage = error.response?.data?.message || 'Error al obtener estadísticas';
    
    return { success: false, error: errorMessage };
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

export const getCheckInStatus = (bookingId) => async (dispatch) => {
  dispatch({ type: 'GET_CHECKIN_STATUS_REQUEST' });
  
  try {
    console.log(`🔍 [CHECKIN-STATUS] Obteniendo estado para reserva: ${bookingId}`);
    
    const { data } = await api.get(`/bookings/${bookingId}/checkin-status`);
    
    console.log('✅ [CHECKIN-STATUS] Estado obtenido:', data.data);
    
    dispatch({ 
      type: 'GET_CHECKIN_STATUS_SUCCESS', 
      payload: data.data 
    });
    
    return { success: true, data: data.data };
    
  } catch (error) {
    console.error('❌ [CHECKIN-STATUS] Error:', error);
    
    const errorMessage = error.response?.data?.message || 'Error al obtener estado de check-in';
    
    dispatch({ 
      type: 'GET_CHECKIN_STATUS_FAILURE', 
      payload: errorMessage 
    });
    
    return { success: false, error: errorMessage };
  }
};

// ACTUALIZAR ESTADO DE INVENTARIO (PUT /bookings/:id/inventory-status)
export const updateInventoryStatus = (bookingId, inventoryData) => async (dispatch) => {
  dispatch({ type: 'UPDATE_INVENTORY_STATUS_REQUEST' });
  
  try {
    console.log(`📦 [INVENTORY-STATUS] Actualizando inventario para reserva: ${bookingId}`, inventoryData);
    
    // ⭐ VALIDACIÓN DE DATOS DE ENTRADA
    if (!bookingId) {
      throw new Error('bookingId es requerido');
    }
    
    if (!inventoryData || Object.keys(inventoryData).length === 0) {
      throw new Error('inventoryData es requerido');
    }
    
    // ⭐ VALIDAR CAMPOS PERMITIDOS
    const allowedFields = ['inventoryVerified', 'inventoryDelivered', 'inventoryVerifiedAt', 'inventoryDeliveredAt', 'inventoryDeliveredBy'];
    const validData = {};
    
    Object.keys(inventoryData).forEach(key => {
      if (allowedFields.includes(key)) {
        validData[key] = inventoryData[key];
      }
    });
    
    // ⭐ AGREGAR TIMESTAMPS AUTOMÁTICOS
    if (validData.inventoryVerified === true && !validData.inventoryVerifiedAt) {
      validData.inventoryVerifiedAt = new Date().toISOString();
    }
    
    if (validData.inventoryDelivered === true && !validData.inventoryDeliveredAt) {
      validData.inventoryDeliveredAt = new Date().toISOString();
    }
    
    console.log('📦 [INVENTORY-STATUS] Datos validados a enviar:', validData);
    
    const { data } = await api.put(`/bookings/${bookingId}/inventory-status`, validData);
    
    console.log('✅ [INVENTORY-STATUS] Estado actualizado:', data.data);
    
    dispatch({ 
      type: 'UPDATE_INVENTORY_STATUS_SUCCESS', 
      payload: { 
        bookingId, 
        inventoryData: data.data,
        timestamp: new Date().toISOString()
      }
    });
    
    // ⭐ ACTUALIZAR EL ESTADO DE LA RESERVA EN EL STORE
    dispatch({ 
      type: 'UPDATE_BOOKING_INVENTORY_IN_LIST', 
      payload: { 
        bookingId, 
        inventoryUpdates: data.data 
      }
    });
    
    // ⭐ MENSAJE ESPECÍFICO SEGÚN LA ACCIÓN
    let successMessage = 'Estado de inventario actualizado exitosamente';
    if (validData.inventoryVerified && validData.inventoryDelivered) {
      successMessage = '📦✅ Inventario verificado y entregado exitosamente';
    } else if (validData.inventoryVerified) {
      successMessage = '✅ Inventario verificado exitosamente';
    } else if (validData.inventoryDelivered) {
      successMessage = '📦 Inventario entregado exitosamente';
    }
    
    toast.success(successMessage);
    return { success: true, data: data.data };
    
  } catch (error) {
    console.error('❌ [INVENTORY-STATUS] Error:', error);
    
    const errorMessage = error.response?.data?.message || error.message || 'Error al actualizar estado de inventario';
    
    dispatch({ 
      type: 'UPDATE_INVENTORY_STATUS_FAILURE', 
      payload: errorMessage 
    });
    
    toast.error(errorMessage);
    return { success: false, error: errorMessage };
  }
};

// ACTUALIZAR ESTADO DE PASAJEROS (PUT /bookings/:id/passengers-status)
export const updatePassengersStatus = (bookingId, passengersData = {}) => async (dispatch) => {
  dispatch({ type: 'UPDATE_PASSENGERS_STATUS_REQUEST' });
  
  try {
    console.log(`👥 [PASSENGERS-STATUS] Actualizando pasajeros para reserva: ${bookingId}`, passengersData);
    
    // ⭐ VALIDACIÓN DE DATOS DE ENTRADA
    if (!bookingId) {
      throw new Error('bookingId es requerido');
    }
    
    // ⭐ VALIDAR CAMPOS PERMITIDOS
    const allowedFields = ['passengersCompleted', 'passengersCompletedAt', 'numberOfPassengers', 'passengersData'];
    const validData = {};
    
    Object.keys(passengersData).forEach(key => {
      if (allowedFields.includes(key)) {
        validData[key] = passengersData[key];
      }
    });
    
    // ⭐ AGREGAR TIMESTAMP AUTOMÁTICO SI SE MARCA COMO COMPLETADO
    if (validData.passengersCompleted === true && !validData.passengersCompletedAt) {
      validData.passengersCompletedAt = new Date().toISOString();
    }
    
    // ⭐ SI NO HAY DATOS ESPECÍFICOS, SOLO MARCAR COMO COMPLETADO
    if (Object.keys(validData).length === 0) {
      validData.passengersCompleted = true;
      validData.passengersCompletedAt = new Date().toISOString();
    }
    
    console.log('👥 [PASSENGERS-STATUS] Datos validados a enviar:', validData);
    
    const { data } = await api.put(`/bookings/${bookingId}/passengers-status`, validData);
    
    console.log('✅ [PASSENGERS-STATUS] Estado actualizado:', data.data);
    
    dispatch({ 
      type: 'UPDATE_PASSENGERS_STATUS_SUCCESS', 
      payload: { 
        bookingId, 
        passengersData: data.data,
        timestamp: new Date().toISOString()
      }
    });
    
    // ⭐ ACTUALIZAR EL ESTADO DE LA RESERVA EN EL STORE
    dispatch({ 
      type: 'UPDATE_BOOKING_PASSENGERS_IN_LIST', 
      payload: { 
        bookingId, 
        passengersUpdates: data.data 
      }
    });
    
    // ⭐ MENSAJE ESPECÍFICO SEGÚN LA ACCIÓN
    let successMessage = 'Estado de pasajeros actualizado exitosamente';
    if (validData.passengersCompleted === true) {
      successMessage = '👥✅ Registro de pasajeros completado exitosamente';
    }
    
    toast.success(successMessage);
    return { success: true, data: data.data };
    
  } catch (error) {
    console.error('❌ [PASSENGERS-STATUS] Error:', error);
    
    const errorMessage = error.response?.data?.message || error.message || 'Error al actualizar estado de pasajeros';
    
    dispatch({ 
      type: 'UPDATE_PASSENGERS_STATUS_FAILURE', 
      payload: errorMessage 
    });
    
    toast.error(errorMessage);
    return { success: false, error: errorMessage };
  }
};

// ACTUALIZAR PROGRESO DE CHECK-IN (PUT /bookings/:id/checkin-progress)
export const updateCheckInProgress = (bookingId, progressData) => async (dispatch) => {
  dispatch({ type: 'UPDATE_CHECKIN_PROGRESS_REQUEST' });
  
  try {
    console.log(`🚀 [CHECKIN-PROGRESS] Actualizando progreso para reserva: ${bookingId}`, progressData);
    
    const { data } = await api.put(`/bookings/${bookingId}/checkin-progress`, progressData);
    
    console.log('✅ [CHECKIN-PROGRESS] Progreso actualizado:', data.data);
    
    dispatch({ 
      type: 'UPDATE_CHECKIN_PROGRESS_SUCCESS', 
      payload: { bookingId, ...data.data }
    });
    
    // Actualizar también el estado general si está cargado
    dispatch({ 
      type: 'UPDATE_BOOKING_CHECKIN_PROGRESS', 
      payload: { bookingId, progressData: data.data }
    });
    
    const message = progressData.checkInProgress 
      ? 'Proceso de check-in iniciado' 
      : 'Proceso de check-in detenido';
      
    toast.success(data.message || message);
    return { success: true, data: data.data };
    
  } catch (error) {
    console.error('❌ [CHECKIN-PROGRESS] Error:', error);
    
    const errorMessage = error.response?.data?.message || 'Error al actualizar progreso de check-in';
    
    dispatch({ 
      type: 'UPDATE_CHECKIN_PROGRESS_FAILURE', 
      payload: errorMessage 
    });
    
    toast.error(errorMessage);
    return { success: false, error: errorMessage };
  }
};

// ⭐ ACTION HELPER: VERIFICAR TODOS LOS REQUISITOS DE CHECK-IN
// ⭐ VERIFICAR TODOS LOS REQUISITOS DE CHECK-IN - VERSIÓN OPTIMIZADA
export const checkAllCheckInRequirements = (bookingId, bookingData = null) => async (dispatch) => {
  dispatch({ type: 'CHECK_CHECKIN_REQUIREMENTS_REQUEST' });
  
  try {
    console.log(`✅ [CHECKIN-REQUIREMENTS] Verificando requisitos para reserva: ${bookingId}`);
    
    let booking = bookingData;
    
    // ⭐ OBTENER DATOS DE RESERVA SOLO SI NO SE PROPORCIONAN
    if (!booking) {
      console.log('📥 [CHECKIN-REQUIREMENTS] Obteniendo datos de reserva...');
      const bookingResult = await dispatch(getBookingById(bookingId));
      
      if (!bookingResult.success) {
        throw new Error('No se pudo obtener información de la reserva');
      }
      
      booking = bookingResult.data;
    }
    
    // ⭐ OBTENER EL ESTADO DE LA HABITACIÓN DE FORMA SEGURA
    const roomStatus = booking.room?.status || booking.Room?.status || booking.roomStatus || 'Sin estado';
    
    console.log('🔍 [CHECKIN-REQUIREMENTS] Analizando reserva:', {
      bookingId: booking.bookingId,
      status: booking.status,
      roomStatus: roomStatus,
      passengersCompleted: booking.passengersCompleted
    });
    
    // ⭐ SOLO VERIFICAR PASAJEROS - Inventario se descuenta automáticamente
    const requirements = {
      // Registro de pasajeros completado (ÚNICO REQUISITO)
      passengersCompleted: {
        status: booking.passengersCompleted === true,
        name: 'Completar registro de pasajeros',
        priority: 1
      }
      
      // ⭐ NOTA: El pago NO es requisito obligatorio para check-in
      // Los huéspedes pueden pagar durante la estadía o al hacer checkout
      // ⭐ INVENTARIO: Se descuenta automáticamente al completar check-in
    };
    
    // ⭐ CALCULAR PASOS COMPLETADOS Y PENDIENTES
    const completedSteps = [];
    const pendingSteps = [];
    
    Object.entries(requirements).forEach(([, requirement]) => {
      if (requirement.status) {
        completedSteps.push(requirement.name);
      } else {
        pendingSteps.push(requirement.name);
      }
    });
    
    // ⭐ ORDENAR PASOS PENDIENTES POR PRIORIDAD
    const orderedPendingSteps = Object.entries(requirements)
      .filter(([, req]) => !req.status)
      .sort(([, a], [, b]) => a.priority - b.priority)
      .map(([, req]) => req.name);
    
    // ⭐ DETERMINAR SI TODOS LOS REQUISITOS ESTÁN COMPLETOS
    const allRequirementsMet = pendingSteps.length === 0;
    
    // ⭐ CALCULAR PROGRESO
    const totalSteps = Object.keys(requirements).length;
    const completedCount = completedSteps.length;
    const progressPercentage = Math.round((completedCount / totalSteps) * 100);
    
    // ⭐ DETERMINAR ESTADO GENERAL
    let checkInReadiness = 'not_ready';
    let readinessMessage = 'No está listo para check-in';
    
    if (allRequirementsMet) {
      checkInReadiness = 'ready';
      readinessMessage = '¡Listo para check-in!';
    } else if (completedCount > 0) {
      checkInReadiness = 'in_progress';
      readinessMessage = `En progreso (${completedCount}/${totalSteps} completados)`;
    }
    
    // ⭐ CREAR RESULTADO COMPLETO
    const result = {
      bookingId: parseInt(bookingId),
      allRequirementsMet,
      checkInReadiness,
      readinessMessage,
      progressPercentage,
      totalSteps,
      completedSteps,
      pendingSteps: orderedPendingSteps,
      requirements,
      // ⭐ INFORMACIÓN ADICIONAL ÚTIL
      nextSteps: orderedPendingSteps.slice(0, 2), // Próximos 2 pasos
      estimatedTimeToComplete: orderedPendingSteps.length * 5, // 5 min por paso estimado
      lastUpdated: new Date().toISOString()
    };
    
    console.log('📊 [CHECKIN-REQUIREMENTS] Análisis completo:', {
      bookingId,
      allRequirementsMet,
      progressPercentage,
      completedCount,
      pendingCount: orderedPendingSteps.length,
      nextSteps: result.nextSteps
    });
    
    dispatch({ 
      type: 'CHECK_CHECKIN_REQUIREMENTS_SUCCESS', 
      payload: result
    });
    
    // ⭐ MENSAJES CONTEXTUALES
    if (allRequirementsMet) {
      toast.success('🎉 ¡Todos los requisitos de check-in están completos!');
    } else if (completedCount === 0) {
      toast.info('📋 Inicie el proceso de check-in completando los requisitos');
    } else {
      toast.info(`📊 Progreso: ${completedCount}/${totalSteps} pasos completados (${progressPercentage}%)`);
    }
    
    return { 
      success: true, 
      allRequirementsMet,
      missingSteps: orderedPendingSteps,
      data: result
    };
    
  } catch (error) {
    console.error('❌ [CHECKIN-REQUIREMENTS] Error:', error);
    
    const errorMessage = error.response?.data?.message || error.message || 'Error al verificar requisitos de check-in';
    
    dispatch({ 
      type: 'CHECK_CHECKIN_REQUIREMENTS_FAILURE', 
      payload: errorMessage 
    });
    
    toast.error(`❌ Error al verificar requisitos: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
};

// ⭐ ACTION HELPER: COMPLETAR PASO DE INVENTARIO (VERIFICAR + ENTREGAR)
export const completeInventoryStep = (bookingId, stepType = 'both') => async (dispatch) => {
  try {
    console.log(`📦 [COMPLETE-INVENTORY] Completando paso de inventario: ${stepType}`);
    
    let updateData = {};
    
    switch (stepType) {
      case 'verify':
        updateData = { inventoryVerified: true };
        break;
      case 'deliver':
        updateData = { inventoryDelivered: true };
        break;
      case 'both':
      default:
        updateData = { 
          inventoryVerified: true, 
          inventoryDelivered: true 
        };
        break;
    }
    
    const result = await dispatch(updateInventoryStatus(bookingId, updateData));
    
    if (result.success) {
      // Verificar si ahora están completos todos los requisitos
      await dispatch(checkAllCheckInRequirements(bookingId));
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ [COMPLETE-INVENTORY] Error:', error);
    return { success: false, error: error.message };
  }
};

// ⭐ ACTION HELPER: INICIAR PROCESO COMPLETO DE CHECK-IN
export const startCheckInProcess = (bookingId) => async (dispatch) => {
  try {
    console.log(`🚀 [START-CHECKIN] Iniciando proceso completo para reserva: ${bookingId}`);
    
    // 1. Marcar como en progreso
    const progressResult = await dispatch(updateCheckInProgress(bookingId, { checkInProgress: true }));
    
    if (!progressResult.success) {
      throw new Error(progressResult.error);
    }
    
    // 2. Verificar estado actual
    const requirementsResult = await dispatch(checkAllCheckInRequirements(bookingId));
    
    if (!requirementsResult.success) {
      throw new Error(requirementsResult.error);
    }
    
    console.log('✅ [START-CHECKIN] Proceso iniciado exitosamente');
    
    toast.success('🚀 Proceso de check-in iniciado');
    
    return { 
      success: true, 
      checkInStarted: true,
      requirements: requirementsResult 
    };
    
  } catch (error) {
    console.error('❌ [START-CHECKIN] Error:', error);
    toast.error(`Error al iniciar check-in: ${error.message}`);
    return { success: false, error: error.message };
  }
};
