const initialState = {
    hotelSettings: null, // Datos del hotel
    loading: false, // Estado de carga
    error: null, // Mensaje de error
};

const hotelReducer = (state = initialState, action) => {
    switch (action.type) {
        case 'CREATE_HOTEL_SETTINGS_REQUEST':
        case 'UPDATE_HOTEL_SETTINGS_REQUEST':
        case 'FETCH_HOTEL_SETTINGS_REQUEST':
            return {
                ...state,
                loading: true,
                error: null,
            };

        case 'CREATE_HOTEL_SETTINGS_SUCCESS':
        case 'UPDATE_HOTEL_SETTINGS_SUCCESS':
        case 'FETCH_HOTEL_SETTINGS_SUCCESS':
            return {
                ...state,
                loading: false,
                hotelSettings: action.payload, // Actualiza los datos del hotel
                error: null,
            };

        case 'CREATE_HOTEL_SETTINGS_FAILURE':
        case 'UPDATE_HOTEL_SETTINGS_FAILURE':
        case 'FETCH_HOTEL_SETTINGS_FAILURE':
            return {
                ...state,
                loading: false,
                error: action.payload, // Guarda el mensaje de error
            };

        default:
            return state;
    }
};

export default hotelReducer;