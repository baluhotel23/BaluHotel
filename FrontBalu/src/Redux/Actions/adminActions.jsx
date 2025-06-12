import api from '../../utils/axios';
import { toast } from 'react-toastify';

// ⭐ GET ALL USERS
export const getAllUsers = () => async (dispatch) => {
    dispatch({ type: 'GET_ALL_USERS_REQUEST' });

    try {
        const response = await api.get('/admin/users');
        const data = response.data;

        if (response.status === 200) {
            dispatch({ type: 'GET_ALL_USERS_SUCCESS', payload: data.data });
            return data.data;
        } else {
            dispatch({
                type: 'GET_ALL_USERS_FAILURE',
                payload: data.error || "Error al obtener usuarios",
            });
            toast.error(data.error || "Error al obtener usuarios.");
            return false;
        }
    } catch (error) {
        dispatch({ type: 'GET_ALL_USERS_FAILURE', payload: error.message });
        toast.error(error.message || "Ha ocurrido un error inesperado.");
        return false;
    }
};

// ⭐ CREATE STAFF USER
export const createStaffUser = (userData) => async (dispatch) => {
    dispatch({ type: 'CREATE_STAFF_USER_REQUEST' });

    try {
        const response = await api.post('/admin/users', userData);
        const data = response.data;

        if (response.status === 201 || response.status === 200) {
            dispatch({ type: 'CREATE_STAFF_USER_SUCCESS', payload: data.data });
            toast.success('Usuario staff creado correctamente.');
            return data.data;
        } else {
            dispatch({
                type: 'CREATE_STAFF_USER_FAILURE',
                payload: data.error || "Error al crear usuario staff",
            });
            toast.error(data.error || "Error al crear usuario staff.");
            return false;
        }
    } catch (error) {
        dispatch({ type: 'CREATE_STAFF_USER_FAILURE', payload: error.message });
        toast.error(error.message || "Ha ocurrido un error inesperado.");
        return false;
    }
};

// ⭐ UPDATE USER
export const updateUser = (userId, updateData) => async (dispatch) => {
    dispatch({ type: 'UPDATE_USER_REQUEST' });

    try {
        const response = await api.put(`/admin/users/${userId}`, updateData);
        const data = response.data;

        if (response.status === 200) {
            dispatch({ type: 'UPDATE_USER_SUCCESS', payload: data.data });
            toast.success('Usuario actualizado correctamente.');
            return data.data;
        } else {
            dispatch({
                type: 'UPDATE_USER_FAILURE',
                payload: data.error || "Error al actualizar usuario",
            });
            toast.error(data.error || "Error al actualizar usuario.");
            return false;
        }
    } catch (error) {
        dispatch({ type: 'UPDATE_USER_FAILURE', payload: error.message });
        toast.error(error.message || "Ha ocurrido un error inesperado.");
        return false;
    }
};

// ⭐ DEACTIVATE USER
export const deactivateUser = (userId) => async (dispatch) => {
    dispatch({ type: 'DEACTIVATE_USER_REQUEST' });

    try {
        const response = await api.delete(`/admin/users/${userId}`);
        const data = response.data;

        if (response.status === 200) {
            dispatch({ type: 'DEACTIVATE_USER_SUCCESS', payload: userId });
            toast.success('Usuario desactivado correctamente.');
            return true;
        } else {
            dispatch({
                type: 'DEACTIVATE_USER_FAILURE',
                payload: data.error || "Error al desactivar usuario",
            });
            toast.error(data.error || "Error al desactivar usuario.");
            return false;
        }
    } catch (error) {
        dispatch({ type: 'DEACTIVATE_USER_FAILURE', payload: error.message });
        toast.error(error.message || "Ha ocurrido un error inesperado.");
        return false;
    }
};

// ⭐ GET USER BY ID
export const getUserById = (userId) => async (dispatch) => {
    dispatch({ type: 'GET_USER_BY_ID_REQUEST' });

    try {
        const response = await api.get(`/admin/users/${userId}`);
        const data = response.data;

        if (response.status === 200) {
            dispatch({ type: 'GET_USER_BY_ID_SUCCESS', payload: data.data });
            return data.data;
        } else {
            dispatch({
                type: 'GET_USER_BY_ID_FAILURE',
                payload: data.error || "Error al obtener usuario",
            });
            toast.error(data.error || "Error al obtener usuario.");
            return false;
        }
    } catch (error) {
        if (error.response && error.response.status === 404) {
            dispatch({ type: 'GET_USER_BY_ID_SUCCESS', payload: null });
            toast.warning("Usuario no encontrado.");
            return null;
        } else {
            dispatch({ type: 'GET_USER_BY_ID_FAILURE', payload: error.message });
            toast.error(error.message || "Ha ocurrido un error inesperado.");
            return false;
        }
    }
};

// ⭐ SEARCH USERS
export const searchUsers = (searchParams) => async (dispatch) => {
    dispatch({ type: 'SEARCH_USERS_REQUEST' });

    try {
        const queryString = new URLSearchParams(searchParams).toString();
        const response = await api.get(`/admin/users/search?${queryString}`);
        const data = response.data;

        if (response.status === 200) {
            dispatch({ type: 'SEARCH_USERS_SUCCESS', payload: data.data });
            return data.data;
        } else {
            dispatch({
                type: 'SEARCH_USERS_FAILURE',
                payload: data.error || "Error al buscar usuarios",
            });
            toast.error(data.error || "Error al buscar usuarios.");
            return false;
        }
    } catch (error) {
        dispatch({ type: 'SEARCH_USERS_FAILURE', payload: error.message });
        toast.error(error.message || "Ha ocurrido un error inesperado.");
        return false;
    }
};

// ⭐ REACTIVATE USER
export const reactivateUser = (userId) => async (dispatch) => {
    dispatch({ type: 'REACTIVATE_USER_REQUEST' });

    try {
        const response = await api.put(`/admin/users/${userId}`, { isActive: true });
        const data = response.data;

        if (response.status === 200) {
            dispatch({ type: 'REACTIVATE_USER_SUCCESS', payload: data.data });
            toast.success('Usuario reactivado correctamente.');
            return data.data;
        } else {
            dispatch({
                type: 'REACTIVATE_USER_FAILURE',
                payload: data.error || "Error al reactivar usuario",
            });
            toast.error(data.error || "Error al reactivar usuario.");
            return false;
        }
    } catch (error) {
        dispatch({ type: 'REACTIVATE_USER_FAILURE', payload: error.message });
        toast.error(error.message || "Ha ocurrido un error inesperado.");
        return false;
    }
};

// ⭐ GET USERS STATS
export const getUsersStats = () => async (dispatch) => {
    dispatch({ type: 'GET_USERS_STATS_REQUEST' });

    try {
        const response = await api.get('/admin/users/stats');
        const data = response.data;

        if (response.status === 200) {
            dispatch({ type: 'GET_USERS_STATS_SUCCESS', payload: data.data });
            return data.data;
        } else {
            dispatch({
                type: 'GET_USERS_STATS_FAILURE',
                payload: data.error || "Error al obtener estadísticas",
            });
            toast.error(data.error || "Error al obtener estadísticas.");
            return false;
        }
    } catch (error) {
        if (error.response && error.response.status === 404) {
            dispatch({ type: 'GET_USERS_STATS_SUCCESS', payload: null });
            return null;
        } else {
            dispatch({ type: 'GET_USERS_STATS_FAILURE', payload: error.message });
            toast.error(error.message || "Ha ocurrido un error inesperado.");
            return false;
        }
    }
};

// ⭐ BULK UPDATE USERS
export const bulkUpdateUsers = (userIds, updateData) => async (dispatch) => {
    dispatch({ type: 'BULK_UPDATE_USERS_REQUEST' });

    try {
        const response = await api.put('/admin/users/bulk', { userIds, updateData });
        const data = response.data;

        if (response.status === 200) {
            dispatch({ type: 'BULK_UPDATE_USERS_SUCCESS', payload: data.data });
            toast.success(`${data.data.updated} usuarios actualizados correctamente.`);
            return data.data;
        } else {
            dispatch({
                type: 'BULK_UPDATE_USERS_FAILURE',
                payload: data.error || "Error al actualizar usuarios en lote",
            });
            toast.error(data.error || "Error al actualizar usuarios en lote.");
            return false;
        }
    } catch (error) {
        dispatch({ type: 'BULK_UPDATE_USERS_FAILURE', payload: error.message });
        toast.error(error.message || "Ha ocurrido un error inesperado.");
        return false;
    }
};

