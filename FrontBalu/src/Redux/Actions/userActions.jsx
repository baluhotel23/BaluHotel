import api from '../../utils/axios';

// Obtener todos los usuarios
export const getAllUsers = () => async (dispatch) => {
  dispatch({ type: 'GET_ALL_USERS_REQUEST' });
  try {
    const { data } = await api.get('/admin/users');
    console.log('Usuarios obtenidos:', data);
    dispatch({
      type: 'GET_ALL_USERS_SUCCESS',
      payload: data.data
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    dispatch({
      type: 'GET_ALL_USERS_FAILURE',
      payload: error.response?.data?.message || 'Error al obtener usuarios'
    });
  }
};

// Crear usuario staff
export const createStaffUser = (userData) => async (dispatch) => {
  dispatch({ type: 'CREATE_STAFF_USER_REQUEST' });
  try {
    const { data } = await api.post('/admin/users/staff', userData);
    console.log('Usuario staff creado:', data);
    dispatch({
      type: 'CREATE_STAFF_USER_SUCCESS',
      payload: data.data
    });
    return { success: true, data: data.data };
  } catch (error) {
    console.error('Error al crear usuario staff:', error);
    const errorMessage = error.response?.data?.message || 'Error al crear usuario';
    dispatch({
      type: 'CREATE_STAFF_USER_FAILURE',
      payload: errorMessage
    });
    return { success: false, message: errorMessage };
  }
};

// Actualizar usuario
export const updateUser = (userId, userData) => async (dispatch) => {
  dispatch({ type: 'UPDATE_USER_REQUEST' });
  try {
    const { data } = await api.put(`/admin/users/${userId}`, userData);
    console.log('Usuario actualizado:', data);
    dispatch({
      type: 'UPDATE_USER_SUCCESS',
      payload: data.data
    });
    return { success: true, data: data.data };
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    const errorMessage = error.response?.data?.message || 'Error al actualizar usuario';
    dispatch({
      type: 'UPDATE_USER_FAILURE',
      payload: errorMessage
    });
    return { success: false, message: errorMessage };
  }
};

// Desactivar usuario
export const deactivateUser = (userId) => async (dispatch) => {
  dispatch({ type: 'DEACTIVATE_USER_REQUEST' });
  try {
    const { data } = await api.patch(`/admin/users/${userId}/deactivate`);
    console.log('Usuario desactivado:', data);
    dispatch({
      type: 'DEACTIVATE_USER_SUCCESS',
      payload: userId
    });
    return { success: true, message: data.message };
  } catch (error) {
    console.error('Error al desactivar usuario:', error);
    const errorMessage = error.response?.data?.message || 'Error al desactivar usuario';
    dispatch({
      type: 'DEACTIVATE_USER_FAILURE',
      payload: errorMessage
    });
    return { success: false, message: errorMessage };
  }
};

// Reactivar usuario (opcional)
export const reactivateUser = (userId) => async (dispatch) => {
  dispatch({ type: 'REACTIVATE_USER_REQUEST' });
  try {
    const { data } = await api.patch(`/admin/users/${userId}/reactivate`);
    console.log('Usuario reactivado:', data);
    dispatch({
      type: 'REACTIVATE_USER_SUCCESS',
      payload: userId
    });
    return { success: true, message: data.message };
  } catch (error) {
    console.error('Error al reactivar usuario:', error);
    const errorMessage = error.response?.data?.message || 'Error al reactivar usuario';
    dispatch({
      type: 'REACTIVATE_USER_FAILURE',
      payload: errorMessage
    });
    return { success: false, message: errorMessage };
  }
};