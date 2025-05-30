import api from '../../utils/axios';
import { toast } from 'react-toastify';



// CHECK AVAILABILITY
export const checkAvailability = (params) => async (dispatch) => {
  dispatch({ type: 'CHECK_AVAILABILITY_REQUEST' });
  try {
    const { data } = await api.get('/bookings/availability', { params });
    dispatch({ type: 'CHECK_AVAILABILITY_SUCCESS', payload: data.data });
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al consultar disponibilidad';
    dispatch({ type: 'CHECK_AVAILABILITY_FAILURE', payload: errorMessage });
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
export const checkInBooking = (bookingId) => async (dispatch) => {
  dispatch({ type: 'CHECKIN_BOOKING_REQUEST' });
  try {
    const { data } = await api.put(`/bookings/${bookingId}/checkin`);
    dispatch({ type: 'CHECKIN_BOOKING_SUCCESS', payload: data.data });
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al realizar el check-in';
    dispatch({ type: 'CHECKIN_BOOKING_FAILURE', payload: errorMessage });
  }
};

// CHECK-OUT (PUT /bookings/:id/checkout)
export const checkOutBooking = (bookingId) => async (dispatch) => {
  dispatch({ type: 'CHECKOUT_BOOKING_REQUEST' });
  try {
    const { data } = await api.put(`/bookings/${bookingId}/checkout`);
    dispatch({ type: 'CHECKOUT_BOOKING_SUCCESS', payload: data.data });
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al realizar el check-out';
    dispatch({ type: 'CHECKOUT_BOOKING_FAILURE', payload: errorMessage });
  }
};

// ADD EXTRA CHARGES (POST /bookings/:id/extra-charges)
export const addExtraCharge = (data) => async (dispatch) => {
  try {
    const { bookingId, extraCharge } = data;
    const response = await api.post(`/bookings/${bookingId}/extra-charges`, extraCharge);
    dispatch({ type: 'ADD_EXTRA_CHARGE_SUCCESS', payload: response.data.data });
    toast.success('Cargo extra añadido exitosamente');
    return response.data.data;
  } catch (error) {
    toast.error(error.response?.data?.message || 'Error al añadir cargo extra');
    throw error;
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

