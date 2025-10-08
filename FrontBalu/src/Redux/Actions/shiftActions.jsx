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

    dispatch({
      type: OPEN_SHIFT_SUCCESS,
      payload: response.data.shift,
    });

    return response.data.shift;
  } catch (error) {
    const errorMessage = error.response?.data?.error || 'Error al abrir turno';
    dispatch({
      type: OPEN_SHIFT_FAILURE,
      payload: errorMessage,
    });
    throw new Error(errorMessage);
  }
};

// ⭐ OBTENER TURNO ACTUAL
export const getCurrentShift = () => async (dispatch) => {
  try {
    dispatch({ type: GET_CURRENT_SHIFT_REQUEST });

    const token = localStorage.getItem('token');
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    const response = await axios.get(`${API_URL}/shifts/current`, config);

    dispatch({
      type: GET_CURRENT_SHIFT_SUCCESS,
      payload: response.data.shift,
    });

    return response.data.shift;
  } catch (error) {
    // Si no hay turno activo, no es un error crítico
    if (error.response?.status === 404) {
      dispatch({
        type: GET_CURRENT_SHIFT_SUCCESS,
        payload: null,
      });
      return null;
    }

    const errorMessage = error.response?.data?.error || 'Error al obtener turno';
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
