import api from '../../utils/axios';

// Acción para crear un servicio
export const createService = (serviceData) => async (dispatch) => {
  // Se despacha una acción para indicar que la solicitud ha iniciado.
  dispatch({ type: 'CREATE_SERVICE_REQUEST' });
  try {
    // Se realiza la petición POST al endpoint /services enviando serviceData.
    const { data } = await api.post('/admin/services', serviceData);
    // Al recibir respuesta, se despacha la acción de éxito con la data obtenida.
    dispatch({ type: 'CREATE_SERVICE_SUCCESS', payload: data });
  } catch (error) {
    // En caso de error, se captura el mensaje (usando el mensaje de la respuesta o uno por defecto)
    const errorMessage = error.response?.data?.message || 'Error al crear el servicio';
    // Se despacha la acción de error con el mensaje.
    dispatch({ type: 'CREATE_SERVICE_FAILURE', payload: errorMessage });
  }
};

// Acción para actualizar un servicio
export const updateService = (serviceId, serviceData) => async (dispatch) => {
  dispatch({ type: 'UPDATE_SERVICE_REQUEST' });
  try {
    // Se realiza una petición PUT al endpoint /services/:id, usando el ID del servicio y los datos actualizados.
    const { data } = await api.put(`/admin/services/${serviceId}`, serviceData);
    dispatch({ type: 'UPDATE_SERVICE_SUCCESS', payload: data });
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al actualizar el servicio';
    dispatch({ type: 'UPDATE_SERVICE_FAILURE', payload: errorMessage });
  }
};

// Acción para obtener todos los servicios
export const getAllServices = () => async (dispatch) => {
  dispatch({ type: 'GET_SERVICES_REQUEST' });
  try {
    // Se realiza una petición GET al endpoint /services para obtener la lista.
    const { data } = await api.get('/admin/services');
    dispatch({ type: 'GET_SERVICES_SUCCESS', payload: data.data });
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener los servicios';
    dispatch({ type: 'GET_SERVICES_FAILURE', payload: errorMessage });
  }
};

// Acción para eliminar un servicio
export const deleteService = (serviceId) => async (dispatch) => {
  dispatch({ type: 'DELETE_SERVICE_REQUEST' });
  try {
    // Se realiza una petición DELETE al endpoint /services/:id usando el ID.
    const { data } = await api.delete(`/admin/services/${serviceId}`);
    dispatch({ type: 'DELETE_SERVICE_SUCCESS', payload: data });
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al eliminar el servicio';
    dispatch({ type: 'DELETE_SERVICE_FAILURE', payload: errorMessage });
  }
};