import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

// ⭐ ACTION TYPES
export const OPEN_SHIFT_REQUEST = 'OPEN_SHIFT_REQUEST';
export const OPEN_SHIFT_SUCCESS = 'OPEN_SHIFT_SUCCESS';
export const OPEN_SHIFT_FAILURE = 'OPEN_SHIFT_FAILURE';

export const GET_CURRENT_SHIFT_REQUEST = 'GET_CURRENT_SHIFT_REQUEST';
export const GET_CURRENT_SHIFT_SUCCESS = 'GET_CURRENT_SHIFT_SUCCESS';
export const GET_CURRENT_SHIFT_FAILURE = 'GET_CURRENT_SHIFT_FAILURE';

export const CLOSE_SHIFT_REQUEST = 'CLOSE_SHIFT_REQUEST';
export const CLOSE_SHIFT_SUCCESS = 'CLOSE_SHIFT_SUCCESS';
export const CLOSE_SHIFT_FAILURE = 'CLOSE_SHIFT_FAILURE';

export const GET_SHIFT_HISTORY_REQUEST = 'GET_SHIFT_HISTORY_REQUEST';
export const GET_SHIFT_HISTORY_SUCCESS = 'GET_SHIFT_HISTORY_SUCCESS';
export const GET_SHIFT_HISTORY_FAILURE = 'GET_SHIFT_HISTORY_FAILURE';

export const GET_SHIFT_REPORT_REQUEST = 'GET_SHIFT_REPORT_REQUEST';
export const GET_SHIFT_REPORT_SUCCESS = 'GET_SHIFT_REPORT_SUCCESS';
export const GET_SHIFT_REPORT_FAILURE = 'GET_SHIFT_REPORT_FAILURE';

export const CLEAR_SHIFT_ERROR = 'CLEAR_SHIFT_ERROR';

// ⭐ ABRIR TURNO
export const openShift = (shiftData) => async (dispatch) => {
  try {
    dispatch({ type: OPEN_SHIFT_REQUEST });

    const token = localStorage.getItem('token');
    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };

    const response = await axios.post(
      `${API_URL}/shifts/open`,
      shiftData,
      config
    );

    console.log('✅ [OPEN-SHIFT] Response completo:', response.data);

    // ⭐ El backend devuelve { error: false, data: { shift, user } }
    const shift = response.data.data?.shift || response.data.shift;

    // ⭐ PERSISTIR TURNO EN LOCALSTORAGE
    localStorage.setItem('currentShift', JSON.stringify(shift));
    localStorage.setItem('shiftLastSync', Date.now().toString());
    console.log('💾 [OPEN-SHIFT] Turno guardado en localStorage:', shift.shiftId);

    dispatch({
      type: OPEN_SHIFT_SUCCESS,
      payload: shift,
    });

    return { success: true, shift };
  } catch (error) {
    console.error('❌ [SHIFT-ACTION] Error al abrir turno:', error);
    console.error('📋 [SHIFT-ACTION] Response:', error.response);
    console.error('📊 [SHIFT-ACTION] Data:', error.response?.data);
    
    const errorData = error.response?.data || {};
    const errorMessage = errorData.message || 'Error al abrir turno';
    
    dispatch({
      type: OPEN_SHIFT_FAILURE,
      payload: errorMessage,
    });
    
    // ⭐ Retornar objeto con información completa del error
    return {
      success: false,
      error: errorMessage,
      status: error.response?.status,
      data: errorData.data, // Info adicional (ej: turno existente)
      isShiftAlreadyOpen: errorMessage.includes('Ya tienes un turno abierto')
    };
  }
};

// ⭐ OBTENER TURNO ACTUAL (con caché y reintento)
export const getCurrentShift = (useCache = true) => async (dispatch) => {
  try {
    dispatch({ type: GET_CURRENT_SHIFT_REQUEST });

    // ⭐ VERIFICAR CACHÉ LOCAL PRIMERO (si hay mala conexión)
    if (useCache) {
      const cachedShift = localStorage.getItem('currentShift');
      const lastSync = localStorage.getItem('shiftLastSync');
      
      if (cachedShift && lastSync) {
        const timeSinceSync = Date.now() - parseInt(lastSync);
        // Si la última sincronización fue hace menos de 2 minutos, usar caché
        if (timeSinceSync < 120000) {
          console.log('📦 [GET-CURRENT-SHIFT] Usando turno en caché (última sync hace', Math.floor(timeSinceSync/1000), 'segundos)');
          const shift = JSON.parse(cachedShift);
          dispatch({
            type: GET_CURRENT_SHIFT_SUCCESS,
            payload: { shift, summary: null, fromCache: true },
          });
          
          // Intentar actualizar en background sin bloquear
          setTimeout(() => {
            console.log('🔄 [GET-CURRENT-SHIFT] Actualizando turno en background...');
            getCurrentShift(false)(dispatch).catch(() => {
              console.log('⚠️ [GET-CURRENT-SHIFT] No se pudo actualizar en background, usando caché');
            });
          }, 1000);
          
          return { shift, summary: null, fromCache: true };
        }
      }
    }

    const token = localStorage.getItem('token');
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: 10000, // 10 segundos de timeout
    };

    // ⭐ REINTENTO CON BACKOFF EXPONENCIAL
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`🔍 [GET-CURRENT-SHIFT] Intento ${attempt}/3...`);
        const response = await axios.get(`${API_URL}/shifts/current`, config);
        
        console.log('✅ [GET-CURRENT-SHIFT] Response completo:', response.data);

        // ⭐ El backend devuelve { error: false, data: { shift, summary } }
        const responseData = response.data.data || response.data;
        const shiftData = responseData.shift || response.data.shift;
        const summary = responseData.summary || null;

        console.log('📊 [GET-CURRENT-SHIFT] Shift:', shiftData);
        console.log('📊 [GET-CURRENT-SHIFT] Summary:', summary);

        // ⭐ PERSISTIR EN LOCALSTORAGE
        if (shiftData) {
          localStorage.setItem('currentShift', JSON.stringify(shiftData));
          localStorage.setItem('shiftLastSync', Date.now().toString());
          console.log('💾 [GET-CURRENT-SHIFT] Turno guardado en localStorage');
        }

        dispatch({
          type: GET_CURRENT_SHIFT_SUCCESS,
          payload: { shift: shiftData, summary },
        });

        return { shift: shiftData, summary };
      } catch (error) {
        lastError = error;
        if (attempt < 3 && (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || !error.response)) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          console.log(`⚠️ [GET-CURRENT-SHIFT] Error de red, reintentando en ${delay/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
    
    throw lastError;
  } catch (error) {
    // Si no hay turno activo, no es un error crítico
    if (error.response?.status === 404) {
      console.log('ℹ️ [GET-CURRENT-SHIFT] No hay turno activo (404)');
      localStorage.removeItem('currentShift');
      localStorage.removeItem('shiftLastSync');
      dispatch({
        type: GET_CURRENT_SHIFT_SUCCESS,
        payload: null,
      });
      return null;
    }

    // ⭐ SI ES ERROR DE RED, INTENTAR USAR CACHÉ COMO FALLBACK
    if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || !error.response) {
      console.warn('⚠️ [GET-CURRENT-SHIFT] Error de conexión, verificando caché...');
      const cachedShift = localStorage.getItem('currentShift');
      if (cachedShift) {
        console.log('📦 [GET-CURRENT-SHIFT] Usando turno en caché por error de conexión');
        const shift = JSON.parse(cachedShift);
        dispatch({
          type: GET_CURRENT_SHIFT_SUCCESS,
          payload: { shift, summary: null, fromCache: true, connectionError: true },
        });
        return { shift, summary: null, fromCache: true, connectionError: true };
      }
    }

    const errorMessage = error.response?.data?.error || 'Error al obtener turno';
    console.error('❌ [GET-CURRENT-SHIFT] Error:', errorMessage);
    dispatch({
      type: GET_CURRENT_SHIFT_FAILURE,
      payload: errorMessage,
    });
    throw new Error(errorMessage);
  }
};

// ⭐ CERRAR TURNO
export const closeShift = (closingData) => async (dispatch) => {
  try {
    dispatch({ type: CLOSE_SHIFT_REQUEST });

    const token = localStorage.getItem('token');
    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };

    const response = await axios.post(
      `${API_URL}/shifts/close`,
      closingData,
      config
    );

    // ⭐ LIMPIAR LOCALSTORAGE AL CERRAR TURNO
    localStorage.removeItem('currentShift');
    localStorage.removeItem('shiftLastSync');
    console.log('🗑️ [CLOSE-SHIFT] Turno eliminado de localStorage');

    dispatch({
      type: CLOSE_SHIFT_SUCCESS,
      payload: response.data.shift,
    });

    return response.data.shift;
  } catch (error) {
    const errorMessage = error.response?.data?.error || 'Error al cerrar turno';
    dispatch({
      type: CLOSE_SHIFT_FAILURE,
      payload: errorMessage,
    });
    throw new Error(errorMessage);
  }
};

// ⭐ OBTENER HISTORIAL DE TURNOS (Solo Admin/Owner)
export const getShiftHistory = (filters = {}) => async (dispatch) => {
  try {
    dispatch({ type: GET_SHIFT_HISTORY_REQUEST });

    const token = localStorage.getItem('token');
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: filters, // { page, limit, startDate, endDate, userId, status }
    };

    const response = await axios.get(`${API_URL}/shifts/history`, config);

    dispatch({
      type: GET_SHIFT_HISTORY_SUCCESS,
      payload: response.data,
    });

    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.error || 'Error al obtener historial';
    dispatch({
      type: GET_SHIFT_HISTORY_FAILURE,
      payload: errorMessage,
    });
    throw new Error(errorMessage);
  }
};

// ⭐ OBTENER REPORTE DETALLADO DE TURNO
export const getShiftReport = (shiftId) => async (dispatch) => {
  try {
    dispatch({ type: GET_SHIFT_REPORT_REQUEST });

    const token = localStorage.getItem('token');
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    const response = await axios.get(
      `${API_URL}/shifts/${shiftId}/report`,
      config
    );

    dispatch({
      type: GET_SHIFT_REPORT_SUCCESS,
      payload: response.data,
    });

    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.error || 'Error al obtener reporte';
    dispatch({
      type: GET_SHIFT_REPORT_FAILURE,
      payload: errorMessage,
    });
    throw new Error(errorMessage);
  }
};

// ⭐ GENERAR Y DESCARGAR PDF
export const generateShiftPDF = (shiftId) => async () => {
  try {
    const token = localStorage.getItem('token');
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      responseType: 'blob', // Importante para recibir el PDF
    };

    const response = await axios.get(
      `${API_URL}/shifts/${shiftId}/pdf`,
      config
    );

    // Crear URL del blob y descargar
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `turno_${shiftId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    const errorMessage = 'Error al generar PDF';
    throw new Error(errorMessage);
  }
};

// ⭐ LIMPIAR ERRORES
export const clearShiftError = () => (dispatch) => {
  dispatch({ type: CLEAR_SHIFT_ERROR });
};
