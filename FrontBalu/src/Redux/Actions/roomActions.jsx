import api from '../../utils/axios';

// Obtener todas las habitaciones
export const getAllRooms = () => async (dispatch) => {
  dispatch({ type: 'GET_ROOMS_REQUEST' });
  try {
    const { data } = await api.get('/rooms');
    dispatch({ type: 'GET_ROOMS_SUCCESS', payload: data.data });
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener habitaciones';
    dispatch({ type: 'GET_ROOMS_FAILURE', payload: errorMessage });
  }
};

// Obtener tipos de habitaciones
export const getRoomTypes = () => async (dispatch) => {
  dispatch({ type: 'GET_ROOM_TYPES_REQUEST' });
  try {
    const { data } = await api.get('/rooms/types');
    dispatch({ type: 'GET_ROOM_TYPES_SUCCESS', payload: data });
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener tipos de habitación';
    dispatch({ type: 'GET_ROOM_TYPES_FAILURE', payload: errorMessage });
  }
};

// Obtener una habitación por roomNumber
export const getRoomById = (roomNumber) => async (dispatch) => {
  dispatch({ type: 'GET_ROOM_REQUEST' });
  try {
    const { data } = await api.get(`/rooms/${roomNumber}`);
    dispatch({ type: 'GET_ROOM_SUCCESS', payload: data });
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener la habitación';
    dispatch({ type: 'GET_ROOM_FAILURE', payload: errorMessage });
  }
};

// Verificar disponibilidad (se espera que "dates" tenga el formato requerido)
export const checkAvailability = (dates) => async (dispatch) => {
  dispatch({ type: 'CHECK_AVAILABILITY_REQUEST' });
  try {
    const { data } = await api.get(`/rooms/availability/${dates}`);
    dispatch({ type: 'CHECK_AVAILABILITY_SUCCESS', payload: data });
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al verificar disponibilidad';
    dispatch({ type: 'CHECK_AVAILABILITY_FAILURE', payload: errorMessage });
  }
};

// Crear una habitación
export const createRoom = (roomData) => async (dispatch) => {
  dispatch({ type: 'CREATE_ROOM_REQUEST' });
  try {
    const { data } = await api.post('/rooms/create', roomData);
    dispatch({ type: 'CREATE_ROOM_SUCCESS', payload: data });
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al crear la habitación';
    dispatch({ type: 'CREATE_ROOM_FAILURE', payload: errorMessage });
  }
};

// Actualizar una habitación
export const updateRoom = (roomNumber, roomData) => async (dispatch) => {
  dispatch({ type: 'UPDATE_ROOM_REQUEST' });
  try {
    const { data } = await api.put(`/rooms/${roomNumber}`, roomData);
    dispatch({ type: 'UPDATE_ROOM_SUCCESS', payload: data });
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al actualizar la habitación';
    dispatch({ type: 'UPDATE_ROOM_FAILURE', payload: errorMessage });
  }
};

// Eliminar una habitación
export const deleteRoom = (roomNumber) => async (dispatch) => {
  dispatch({ type: 'DELETE_ROOM_REQUEST' });
  try {
    const { data } = await api.delete(`/rooms/${roomNumber}`);
    dispatch({ type: 'DELETE_ROOM_SUCCESS', payload: data });
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al eliminar la habitación';
    dispatch({ type: 'DELETE_ROOM_FAILURE', payload: errorMessage });
  }
};

// Actualizar el estado de una habitación
export const updateRoomStatus = (roomNumber, statusData) => async (dispatch) => {
  dispatch({ type: 'UPDATE_ROOM_STATUS_REQUEST' });
  try {
    const { data } = await api.put(`/rooms/status/${roomNumber}`, statusData);
    dispatch({ type: 'UPDATE_ROOM_STATUS_SUCCESS', payload: data });
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al actualizar el estado de la habitación';
    dispatch({ type: 'UPDATE_ROOM_STATUS_FAILURE', payload: errorMessage });
  }
};

// Obtener amenities de una habitación
export const getRoomAmenities = (roomNumber) => async (dispatch) => {
  dispatch({ type: 'GET_ROOM_AMENITIES_REQUEST' });
  try {
    const { data } = await api.get(`/rooms/${roomNumber}/amenities`);
    dispatch({ type: 'GET_ROOM_AMENITIES_SUCCESS', payload: data });
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener amenities';
    dispatch({ type: 'GET_ROOM_AMENITIES_FAILURE', payload: errorMessage });
  }
};

// Actualizar amenities de una habitación
export const updateRoomAmenities = (roomNumber, amenitiesData) => async (dispatch) => {
  dispatch({ type: 'UPDATE_ROOM_AMENITIES_REQUEST' });
  try {
    const { data } = await api.put(`/rooms/${roomNumber}/amenities`, amenitiesData);
    dispatch({ type: 'UPDATE_ROOM_AMENITIES_SUCCESS', payload: data });
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al actualizar amenities';
    dispatch({ type: 'UPDATE_ROOM_AMENITIES_FAILURE', payload: errorMessage });
  }
};

// Obtener servicios de una habitación
export const getRoomServices = (roomNumber) => async (dispatch) => {
  dispatch({ type: 'GET_ROOM_SERVICES_REQUEST' });
  try {
    const { data } = await api.get(`/rooms/${roomNumber}/services`);
    dispatch({ type: 'GET_ROOM_SERVICES_SUCCESS', payload: data });
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener servicios';
    dispatch({ type: 'GET_ROOM_SERVICES_FAILURE', payload: errorMessage });
  }
};

// Actualizar servicios de una habitación
export const updateRoomServices = (roomNumber, servicesData) => async (dispatch) => {
  dispatch({ type: 'UPDATE_ROOM_SERVICES_REQUEST' });
  try {
    const { data } = await api.put(`/rooms/${roomNumber}/services`, servicesData);
    dispatch({ type: 'UPDATE_ROOM_SERVICES_SUCCESS', payload: data });
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al actualizar servicios';
    dispatch({ type: 'UPDATE_ROOM_SERVICES_FAILURE', payload: errorMessage });
  }
};

// Obtener reporte de ocupación
export const getOccupancyReport = () => async (dispatch) => {
  dispatch({ type: 'GET_OCCUPANCY_REPORT_REQUEST' });
  try {
    const { data } = await api.get('/rooms/reports/occupancy');
    dispatch({ type: 'GET_OCCUPANCY_REPORT_SUCCESS', payload: data });
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener reporte de ocupación';
    dispatch({ type: 'GET_OCCUPANCY_REPORT_FAILURE', payload: errorMessage });
  }
};

// Obtener reporte de ingresos por tipo de habitación
export const getRevenueByRoomType = () => async (dispatch) => {
  dispatch({ type: 'GET_REVENUE_REPORT_REQUEST' });
  try {
    const { data } = await api.get('/rooms/reports/revenue');
    dispatch({ type: 'GET_REVENUE_REPORT_SUCCESS', payload: data });
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener reporte de ingresos';
    dispatch({ type: 'GET_REVENUE_REPORT_FAILURE', payload: errorMessage });
  }
};