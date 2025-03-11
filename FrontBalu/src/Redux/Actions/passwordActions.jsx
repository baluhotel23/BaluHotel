import api from '../../utils/axios';
import {
  forgotPasswordRequest,
  forgotPasswordSuccess,
  forgotPasswordFailure,
  resetPasswordRequest,
  resetPasswordSuccess,
  resetPasswordFailure,
  changePasswordRequest,
  changePasswordSuccess,
  changePasswordFailure,
} from '../Reducer/passwordReducer';

// Acción para solicitar la recuperación de contraseña
export const forgotPassword = (email) => async (dispatch) => {
  try {
    dispatch(forgotPasswordRequest());
    // Se espera que el endpoint reciba { email }
    const { data } = await api.post('/auth/forgot-password', { email });
    dispatch(forgotPasswordSuccess(data));
    return data;
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error en la solicitud de recuperación de contraseña';
    dispatch(forgotPasswordFailure(errorMessage));
    throw error;
  }
};

// Acción para reestablecer la contraseña usando el token recibido
export const resetPassword = (resetToken, newPassword) => async (dispatch) => {
  try {
    dispatch(resetPasswordRequest());
    // Se espera que el endpoint reciba { password: newPassword }
    const { data } = await api.post('/auth/reset-password', { password: newPassword, resetToken });
    dispatch(resetPasswordSuccess(data));
    return data;
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al reestablecer la contraseña';
    dispatch(resetPasswordFailure(errorMessage));
    throw error;
  }
};

// Acción para cambiar la contraseña cuando el usuario está autenticado
export const changePassword = (passwordData) => async (dispatch) => {
  try {
    dispatch(changePasswordRequest());
    const { data } = await api.put('/auth/change-password', passwordData);
    dispatch(changePasswordSuccess(data));
    return data;
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al cambiar la contraseña';
    dispatch(changePasswordFailure(errorMessage));
    throw error;
  }
};