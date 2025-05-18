import api from '../../utils/axios';
import { toast } from 'react-toastify';

// Obtener todos los registros de pasajeros
export const getRegistrationPasses = () => async (dispatch) => {
    try {
      const { data } = await api.get("/registrationPass");
      dispatch({ type: "GET_REGISTRATION_PASSES", payload: data.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Error al obtener los registros de pasajeros");
    }
  };
  
  // Crear un nuevo registro de pasajero
  export const createRegistrationPass = (registrationData) => async (dispatch) => {
  try {
    const { data } = await api.post("/registrationPass", registrationData);
    // data.data.passengers puede ser un array, pero si solo envías uno, puede ser un objeto
    const passengers = Array.isArray(data.data.passengers)
      ? data.data.passengers
      : [data.data.passengers];
    dispatch({ type: "CREATE_REGISTRATION_PASS", payload: passengers });
    toast.success("Registro de pasajero creado exitosamente");
  } catch (error) {
    toast.error(error.response?.data?.message || "Error al crear el registro de pasajero");
  }
};
  
  // Actualizar un registro de pasajero
  export const updateRegistrationPass = (registrationNumber, updatedData) => async (dispatch) => {
    try {
      const { data } = await api.put(`/registrationPass/${registrationNumber}`, updatedData);
      dispatch({ type: "UPDATE_REGISTRATION_PASS", payload: data.data });
      toast.success("Registro de pasajero actualizado exitosamente");
    } catch (error) {
      toast.error(error.response?.data?.message || "Error al actualizar el registro de pasajero");
    }
  };
  
  // Eliminar un registro de pasajero
  export const deleteRegistrationPass = (registrationNumber) => async (dispatch) => {
    try {
      await api.delete(`/registrationPass/${registrationNumber}`);
      dispatch({ type: "DELETE_REGISTRATION_PASS", payload: registrationNumber });
      toast.success("Registro de pasajero eliminado exitosamente");
    } catch (error) {
      toast.error(error.response?.data?.message || "Error al eliminar el registro de pasajero");
    }
  };

  export const getRegistrationPassesByBooking = (bookingId) => async (dispatch) => {
  try {
    const { data } = await api.get(`/registrationPass/${bookingId}`);
    
    // Procesa la respuesta para extraer solo los pasajeros
    let passengers = [];
    if (data.data && Array.isArray(data.data) && data.data.length > 0) {
      // La API devuelve un array de bookings con pasajeros adentro
      // Extraemos solo los arrays de pasajeros de cada booking
      data.data.forEach(booking => {
        if (booking.passengers && Array.isArray(booking.passengers)) {
          passengers = [...passengers, ...booking.passengers];
        }
      });
    }
    
    dispatch({ type: "GET_REGISTRATION_PASSES_BY_BOOKING", payload: passengers });
    return { success: true };
  } catch (error) {
    toast.error(error.response?.data?.message || "Error al obtener los pasajeros de la reserva");
    dispatch({ type: "GET_REGISTRATION_PASSES_BY_BOOKING", payload: [] });
    return { success: false };
  }
};