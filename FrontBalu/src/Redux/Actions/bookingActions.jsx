import api from '../../utils/axios';



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
    const { data } = await api.get('/room-types');
    dispatch({ type: 'GET_ROOM_TYPES_SUCCESS', payload: data.data });
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al obtener tipos de habitación';
    dispatch({ type: 'GET_ROOM_TYPES_FAILURE', payload: errorMessage });
  }
};

// CREATE BOOKING
export const createBooking = (bookingData) => async (dispatch) => {
  dispatch({ type: 'CREATE_BOOKING_REQUEST' });
  try {
    const { data } = await api.post('/bookings', bookingData);
    dispatch({ type: 'CREATE_BOOKING_SUCCESS', payload: data.data });
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al crear reserva';
    dispatch({ type: 'CREATE_BOOKING_FAILURE', payload: errorMessage });
  }
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

// GET BOOKING DETAILS
export const getBookingById = (bookingId) => async (dispatch) => {
  dispatch({ type: 'GET_BOOKING_DETAILS_REQUEST' });
  try {
    const { data } = await api.get(`/bookings/${bookingId}`);
    dispatch({ type: 'GET_BOOKING_DETAILS_SUCCESS', payload: data.data });
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al obtener detalles de la reserva';
    dispatch({ type: 'GET_BOOKING_DETAILS_FAILURE', payload: errorMessage });
  }
};

// STAFF: GET ALL BOOKINGS
export const getAllBookings = (queryParams) => async (dispatch) => {
  dispatch({ type: 'GET_ALL_BOOKINGS_REQUEST' });
  try {
    const { data } = await api.get('/bookings', { params: queryParams });
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
export const addExtraCharges = (bookingId, chargeData) => async (dispatch) => {
  dispatch({ type: 'ADD_EXTRA_CHARGE_REQUEST' });
  try {
    const { data } = await api.post(`/bookings/${bookingId}/extra-charges`, chargeData);
    dispatch({ type: 'ADD_EXTRA_CHARGE_SUCCESS', payload: data.data });
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al agregar cargos extra';
    dispatch({ type: 'ADD_EXTRA_CHARGE_FAILURE', payload: errorMessage });
  }
};

// GENERATE BILL (GET /bookings/:id/bill)
export const generateBill = (bookingId) => async (dispatch) => {
  dispatch({ type: 'GENERATE_BILL_REQUEST' });
  try {
    const { data } = await api.get(`/bookings/${bookingId}/bill`);
    dispatch({ type: 'GENERATE_BILL_SUCCESS', payload: data.data });
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || 'Error al generar factura';
    dispatch({ type: 'GENERATE_BILL_FAILURE', payload: errorMessage });
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