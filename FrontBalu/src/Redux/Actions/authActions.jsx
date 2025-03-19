import api from '../../utils/axios';
import {
  registerRequest,
  registerSuccess,
  registerFailure,
  loginRequest,
  loginSuccess,
  loginFailure,
  logoutRequest,
  logoutSuccess,
  logoutFailure,
  changePasswordRequest,
  changePasswordSuccess,
  changePasswordFailure,
} from '../Reducer/authReducer';

// Acción para registrar un usuario
export const register = (userData) => async (dispatch) => {
  try {
    dispatch(registerRequest());
    const { data } = await api.post('/auth/register', userData);
    // Se asume que el response incluye token y datos de usuario
    dispatch(registerSuccess(data));
    localStorage.setItem('token', data.token);
    return data;
  } catch (error) {
    const errMsg = error.response?.data?.message || 'Error en el registro';
    dispatch(registerFailure(errMsg));
    throw error;
  }
};

// Acción para hacer login
export const login = (credentials) => async (dispatch) => {
  try {
    dispatch(loginRequest());
    const { data } = await api.post('/auth/login', credentials);
    console.log('Respuesta de login:', data); // Debug: imprime la respuesta
     dispatch(loginSuccess(data.data));
    localStorage.setItem('token', data.data.token);
    return data;
  } catch (error) {
    const errMsg = error.response?.data?.message || 'Error en el login';
    dispatch(loginFailure(errMsg));
    throw error;
  }
};

// Acción para hacer logout
export const logout = () => async (dispatch) => {
  try {
    dispatch(logoutRequest());
    const { data } = await api.post('/auth/logout');
    dispatch(logoutSuccess(data));
    localStorage.removeItem('token');
    return data;
  } catch (error) {
    const errMsg = error.response?.data?.message || 'Error en el logout';
    dispatch(logoutFailure(errMsg));
    throw error;
  }
};

// Acción para cambiar la contraseña (sólo para staff, según backend)
export const changePassword = (passwordData) => async (dispatch) => {
  try {
    dispatch(changePasswordRequest());
    const { data } = await api.put('/auth/change-password', passwordData);
    dispatch(changePasswordSuccess(data));
    return data;
  } catch (error) {
    const errMsg = error.response?.data?.message || 'Error al cambiar la contraseña';
    dispatch(changePasswordFailure(errMsg));
    throw error;
  }
};

// Acción para recuperar contraseña