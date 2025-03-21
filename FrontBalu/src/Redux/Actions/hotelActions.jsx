import api from '../../utils/axios';
import { toast } from 'react-toastify';

export const createHotelSettings = (hotelData) => async (dispatch) => {
    dispatch({ type: 'CREATE_HOTEL_SETTINGS_REQUEST' });

    try {
        const response = await api.post(`/admin/settings/hotel-settings`, hotelData); // Cambia a POST
        const data = response.data;

        if (response.status === 201 || response.status === 200) { // Maneja creación exitosa
            dispatch({ type: 'CREATE_HOTEL_SETTINGS_SUCCESS', payload: data });
            toast.success('Datos del hotel creados correctamente.');
            return data; // Devuelve los datos creados
        } else {
            dispatch({
                type: 'CREATE_HOTEL_SETTINGS_FAILURE',
                payload: data.error || "Error al crear los datos del hotel",
            });
            toast.error(data.error || "Error al crear los datos del hotel.");
            return false;
        }
    } catch (error) {
        dispatch({ type: 'CREATE_HOTEL_SETTINGS_FAILURE', payload: error.message });
        toast.error(error.message || "Ha ocurrido un error inesperado.");
        return false;
    }
};

export const updateHotelSettings = (hotelData) => async (dispatch) => {
    dispatch({ type: 'UPDATE_HOTEL_SETTINGS_REQUEST' });

    try {
        const response = await api.put(`/admin/settings/hotel-settings`, hotelData); // PUT para actualizar
        const data = response.data;

        if (response.status === 200) {
            dispatch({ type: 'UPDATE_HOTEL_SETTINGS_SUCCESS', payload: data });
            toast.success('Datos del hotel actualizados correctamente.');
            return true;
        } else {
            dispatch({
                type: 'UPDATE_HOTEL_SETTINGS_FAILURE',
                payload: data.error || "Error al actualizar los datos del hotel",
            });
            toast.error(data.error || "Error al actualizar los datos del hotel.");
            return false;
        }
    } catch (error) {
        dispatch({ type: 'UPDATE_HOTEL_SETTINGS_FAILURE', payload: error.message });
        toast.error(error.message || "Ha ocurrido un error inesperado.");
        return false;
    }
};

export const fetchHotelSettings = () => async (dispatch) => {
    dispatch({ type: 'FETCH_HOTEL_SETTINGS_REQUEST' });

    try {
        const response = await api.get('/admin/settings/hotel-settings');
        const data = response.data.data;

        if (response.status === 200) {
            dispatch({ type: 'FETCH_HOTEL_SETTINGS_SUCCESS', payload: data });
        }
    } catch (error) {
        if (error.response && error.response.status === 404) {
            // Si no hay datos, simplemente no cargues nada
            dispatch({ type: 'FETCH_HOTEL_SETTINGS_SUCCESS', payload: null });
        } else {
            dispatch({ type: 'FETCH_HOTEL_SETTINGS_FAILURE', payload: error.message });
        }
    }
};
