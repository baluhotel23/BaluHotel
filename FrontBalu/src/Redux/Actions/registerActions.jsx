import api from '../../utils/axios';
import { toast } from 'react-toastify';

// ⭐ OBTENER TODOS LOS REGISTROS - SINCRONIZADO CON TU REDUCER
export const getRegistrationPasses = (params = {}) => async (dispatch) => {
  dispatch({ type: 'GET_REGISTRATION_PASSES_REQUEST' });
  
  try {
    console.log('🔍 Obteniendo todos los registros de pasajeros...', params);
    
    const { data } = await api.get("/registrationPass", { params });
    
    console.log('✅ Registros obtenidos exitosamente:', data.data?.length || 0);
    
    // ⭐ DISPATCH SINCRONIZADO CON TU REDUCER
    dispatch({ 
      type: "GET_REGISTRATION_PASSES_SUCCESS", 
      payload: data.data || []
    });
    
    return { success: true, data: data.data };
    
  } catch (error) {
    console.error('❌ Error al obtener registros:', error);
    
    const errorMessage = error.response?.data?.message || "Error al obtener los registros de pasajeros";
    
    dispatch({ 
      type: 'GET_REGISTRATION_PASSES_FAILURE', 
      payload: errorMessage 
    });
    
    toast.error(errorMessage);
    return { success: false, error: errorMessage };
  }
};

// ⭐ CREAR REGISTRO - SINCRONIZADO CON TU REDUCER
export const createRegistrationPass = (registrationData) => async (dispatch) => {
  dispatch({ type: 'CREATE_REGISTRATION_PASS_REQUEST' });
  
  try {
    console.log('👥 Creando registro de pasajeros:', registrationData);
    
    const { data } = await api.post("/registrationPass", registrationData);
    
    // ⭐ PROCESAMIENTO ROBUSTO IGUAL QUE ANTES
    let passengers = [];
    
    if (data.data) {
      if (Array.isArray(data.data.passengers)) {
        passengers = data.data.passengers;
      } else if (data.data.passengers) {
        passengers = [data.data.passengers];
      } else if (Array.isArray(data.data)) {
        passengers = data.data;
      } else {
        passengers = [data.data];
      }
    }
    
    console.log('✅ Pasajeros creados exitosamente:', passengers.length);
    
    // ⭐ PAYLOAD EXACTO PARA TU REDUCER
    const payload = {
      passengers,
      bookingId: registrationData.bookingId
    };
    
    dispatch({ type: "CREATE_REGISTRATION_PASS_SUCCESS", payload });
    
    toast.success(`${passengers.length} registro(s) de pasajero creado(s) exitosamente`);
    
    return { success: true, data: payload };
    
  } catch (error) {
    console.error('❌ Error al crear registro:', error);
    
    const errorMessage = error.response?.data?.message || "Error al crear el registro de pasajero";
    
    dispatch({ 
      type: 'CREATE_REGISTRATION_PASS_FAILURE', 
      payload: errorMessage 
    });
    
    toast.error(errorMessage);
    return { success: false, error: errorMessage };
  }
};

// ⭐ ACTUALIZAR REGISTRO - SINCRONIZADO CON TU REDUCER
export const updateRegistrationPass = (registrationNumber, updatedData) => async (dispatch) => {
  dispatch({ type: 'UPDATE_REGISTRATION_PASS_REQUEST' });
  
  try {
    console.log('📝 Actualizando registro:', registrationNumber, updatedData);
    
    const { data } = await api.put(`/registrationPass/${registrationNumber}`, updatedData);
    
    console.log('✅ Registro actualizado exitosamente:', data.data);
    
    dispatch({ 
      type: "UPDATE_REGISTRATION_PASS_SUCCESS", 
      payload: data.data 
    });
    
    toast.success("Registro de pasajero actualizado exitosamente");
    
    return { success: true, data: data.data };
    
  } catch (error) {
    console.error('❌ Error al actualizar registro:', error);
    
    const errorMessage = error.response?.data?.message || "Error al actualizar el registro de pasajero";
    
    dispatch({ 
      type: 'UPDATE_REGISTRATION_PASS_FAILURE', 
      payload: errorMessage 
    });
    
    toast.error(errorMessage);
    return { success: false, error: errorMessage };
  }
};

// ⭐ ELIMINAR REGISTRO - SINCRONIZADO CON TU REDUCER
export const deleteRegistrationPass = (registrationNumber) => async (dispatch) => {
  dispatch({ type: 'DELETE_REGISTRATION_PASS_REQUEST' });
  
  try {
    console.log('🗑️ Eliminando registro:', registrationNumber);
    
    await api.delete(`/registrationPass/${registrationNumber}`);
    
    console.log('✅ Registro eliminado exitosamente');
    
    dispatch({ 
      type: "DELETE_REGISTRATION_PASS_SUCCESS", 
      payload: registrationNumber 
    });
    
    toast.success("Registro de pasajero eliminado exitosamente");
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error al eliminar registro:', error);
    
    const errorMessage = error.response?.data?.message || "Error al eliminar el registro de pasajero";
    
    dispatch({ 
      type: 'DELETE_REGISTRATION_PASS_FAILURE', 
      payload: errorMessage 
    });
    
    toast.error(errorMessage);
    return { success: false, error: errorMessage };
  }
};

// ⭐ OBTENER REGISTROS POR RESERVA - OPTIMIZADO PARA MANEJAR 404
export const getRegistrationPassesByBooking = (bookingId) => async (dispatch) => {
  dispatch({ type: 'GET_REGISTRATION_PASSES_BY_BOOKING_REQUEST' });
  
  try {
    console.log("🔍 Obteniendo pasajeros para booking:", bookingId);
    
    const { data } = await api.get(`/registrationPass/${bookingId}`);
    
    // ⭐ PROCESAMIENTO IGUAL QUE ANTES
    let passengers = [];
    if (data.data && Array.isArray(data.data) && data.data.length > 0) {
      data.data.forEach(booking => {
        if (booking.passengers && Array.isArray(booking.passengers)) {
          passengers = [...passengers, ...booking.passengers];
        }
      });
    } else if (data.data && Array.isArray(data.data)) {
      passengers = data.data;
    }
    
    console.log("✅ Pasajeros encontrados:", passengers.length);
    
    const payload = {
      bookingId,
      passengers
    };
    
    dispatch({ 
      type: "GET_REGISTRATION_PASSES_BY_BOOKING_SUCCESS", 
      payload 
    });
    
    return { success: true, passengers, data: passengers };
    
  } catch (error) {
    console.log("ℹ️ Información sobre pasajeros para booking", bookingId + ":");
    
    if (error.response?.status === 404) {
      // ⭐ 404 ES NORMAL - NO ES ERROR PARA EL REDUCER
      console.log("  📋 No hay pasajeros registrados (normal para reservas sin check-in)");
      
      const payload = { 
        bookingId, 
        passengers: [] 
      };
      
      // ⭐ DISPATCH SUCCESS CON ARRAY VACÍO, NO ERROR
      dispatch({ 
        type: "GET_REGISTRATION_PASSES_BY_BOOKING_SUCCESS", 
        payload 
      });
      
      return { 
        success: false, 
        isNotFound: true, 
        passengers: [],
        message: 'No hay pasajeros registrados (normal para reservas nuevas)' 
      };
      
    } else {
      // ⭐ ERRORES REALES
      console.error("❌ Error real al obtener pasajeros:", error.message);
      
      const errorMessage = error.response?.data?.message || "Error al obtener los pasajeros de la reserva";
      
      dispatch({ 
        type: "GET_REGISTRATION_PASSES_BY_BOOKING_FAILURE", 
        payload: errorMessage
      });
      
      toast.error(errorMessage);
      
      return { success: false, error: errorMessage };
    }
  }
};

// ⭐ ACTIONS ADICIONALES QUE TU REDUCER PUEDE MANEJAR

// Limpiar registros de una reserva específica
export const clearBookingRegistrations = (bookingId) => (dispatch) => {
  console.log('🧹 Limpiando registros de reserva:', bookingId);
  
  dispatch({
    type: 'CLEAR_BOOKING_REGISTRATIONS',
    payload: bookingId
  });
};

// Seleccionar registro actual
export const setCurrentRegistration = (registration) => (dispatch) => {
  dispatch({
    type: 'SET_CURRENT_REGISTRATION',
    payload: registration
  });
};

// Configurar filtros
export const setRegistrationFilters = (filters) => (dispatch) => {
  console.log('🔧 Configurando filtros:', filters);
  
  dispatch({
    type: 'SET_REGISTRATION_FILTERS',
    payload: filters
  });
};

// Limpiar filtros
export const clearRegistrationFilters = () => (dispatch) => {
  console.log('🧹 Limpiando filtros de registro');
  
  dispatch({ type: 'CLEAR_REGISTRATION_FILTERS' });
};

// Limpiar mensajes de éxito
export const clearRegistrationSuccess = () => (dispatch) => {
  dispatch({ type: 'CLEAR_REGISTRATION_SUCCESS' });
};

// Limpiar errores
export const clearRegistrationErrors = () => (dispatch) => {
  dispatch({ type: 'CLEAR_REGISTRATION_ERRORS' });
};

// Reset completo del estado
export const resetRegistrationState = (keepFilters = false) => (dispatch) => {
  console.log('🔄 Reseteando estado de registros, mantener filtros:', keepFilters);
  
  dispatch({
    type: 'RESET_REGISTRATION_STATE',
    payload: { keepFilters }
  });
};