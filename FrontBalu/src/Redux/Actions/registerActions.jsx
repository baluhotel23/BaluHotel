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
  dispatch({ type: 'CREATE_REGISTRATION_PASS_REQUEST' });
  try {
    const { data } = await api.post("/registrationPass", registrationData);
    
    const passengers = Array.isArray(data.data.passengers)
      ? data.data.passengers
      : [data.data.passengers];
    
    // ⭐ INCLUIR bookingId EN EL PAYLOAD
    const payload = {
      passengers,
      bookingId: registrationData.bookingId
    };
    
    dispatch({ type: "CREATE_REGISTRATION_PASS", payload });
    toast.success("Registro de pasajero creado exitosamente");
    return { success: true, data: payload };
  } catch (error) {
    const errorMessage = error.response?.data?.message || "Error al crear el registro de pasajero";
    dispatch({ type: 'CREATE_REGISTRATION_PASS_FAILURE', payload: errorMessage });
    toast.error(errorMessage);
    return { success: false, error: errorMessage };
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
    console.log("🔍 Obteniendo pasajeros para booking:", bookingId);
    
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
    
    console.log("📦 Pasajeros encontrados:", passengers);
    
    // ⭐ INCLUIR bookingId EN EL PAYLOAD
    const payload = {
      bookingId,
      passengers
    };
    
    dispatch({ type: "GET_REGISTRATION_PASSES_BY_BOOKING", payload });
    return { success: true, passengers };
  } catch (error) {
    console.error("❌ Error al obtener pasajeros:", error);
    toast.error(error.response?.data?.message || "Error al obtener los pasajeros de la reserva");
    
    // ⭐ INCLUIR bookingId INCLUSO EN ERROR
    dispatch({ 
      type: "GET_REGISTRATION_PASSES_BY_BOOKING", 
      payload: { bookingId, passengers: [] } 
    });
    return { success: false };
  }
};